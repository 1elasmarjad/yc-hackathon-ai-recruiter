import asyncio
import base64
import json
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import datetime, timezone
from inspect import isawaitable
from pathlib import Path
from typing import Any

from playwright.async_api import Browser, CDPSession, async_playwright

JsonDict = dict[str, Any]
ProfilePayloadCallback = Callable[[Any], Awaitable[None] | None]


@dataclass(slots=True)
class CaptureState:
    pending_profile_requests: dict[str, str] = field(default_factory=dict)
    api_request_count: int = 0
    profile_match_count: int = 0
    saved_profile_count: int = 0
    emitted_candidate_count: int = 0


def decode_response_body(result: JsonDict) -> str:
    body = result.get("body")
    if not isinstance(body, str):
        raise RuntimeError("Network.getResponseBody returned invalid body")
    if not result.get("base64Encoded"):
        return body
    return base64.b64decode(body).decode("utf-8")


class JuiceboxProfileCdpCapture:
    def __init__(
        self,
        *,
        cdp_url: str,
        output_dir: Path | None = None,
        profile_match_substring: str = "/api/profile",
        on_profile_payload: ProfilePayloadCallback | None = None,
    ) -> None:
        self.cdp_url = cdp_url
        self.output_dir = output_dir
        self.profile_match_substring = profile_match_substring
        self._on_profile_payload = on_profile_payload
        self.state = CaptureState()
        self._playwright = None
        self._browser: Browser | None = None
        self._session: CDPSession | None = None
        self._write_lock = asyncio.Lock()
        self._tasks: set[asyncio.Task[None]] = set()
        self._task_error: BaseException | None = None

    async def start(self) -> None:
        try:
            if self.output_dir is not None:
                self.output_dir.mkdir(parents=True, exist_ok=True)

            self._playwright = await async_playwright().start()
            self._browser = await self._playwright.chromium.connect_over_cdp(
                self.cdp_url
            )
            if not self._browser.contexts:
                raise RuntimeError(
                    "No browser context found over CDP. Open the Core page first."
                )

            context = self._browser.contexts[0]
            open_pages = [page for page in context.pages if not page.is_closed()]
            if not open_pages:
                raise RuntimeError(
                    "No open page found in first context. Open the Core page first."
                )

            page = open_pages[-1]
            self._session = await context.new_cdp_session(page)
            self._session.on("Network.responseReceived", self._on_response_received)
            self._session.on("Network.loadingFinished", self._on_loading_finished)
            self._session.on("Network.loadingFailed", self._on_loading_failed)
            await self._session.send("Network.enable")
        except Exception:
            await self._close_resources()
            raise

    async def stop(self) -> None:
        stop_error: Exception | None = None
        try:
            if self._tasks:
                await asyncio.gather(*self._tasks)
            self._tasks.clear()
            self.raise_if_failed()
        except Exception as error:
            stop_error = error
        finally:
            await self._close_resources()

        if stop_error is not None:
            raise stop_error

    def raise_if_failed(self) -> None:
        if self._task_error is not None:
            raise RuntimeError("CDP profile capture task failed") from self._task_error

    async def _close_resources(self) -> None:
        if self._browser is not None:
            await self._browser.close()
            self._browser = None

        if self._playwright is not None:
            await self._playwright.stop()
            self._playwright = None

    def _on_response_received(self, params: JsonDict) -> None:
        request_id = params.get("requestId")
        response = params.get("response")
        if not isinstance(request_id, str) or not isinstance(response, dict):
            return

        url = response.get("url")
        if not isinstance(url, str):
            return

        is_api_url = "/api/" in url
        if is_api_url:
            self.state.api_request_count += 1

        should_capture = self.profile_match_substring in url
        if should_capture:
            self.state.profile_match_count += 1
            self.state.pending_profile_requests[request_id] = url

    def _on_loading_finished(self, params: JsonDict) -> None:
        request_id = params.get("requestId")
        if not isinstance(request_id, str):
            return

        request_url = self.state.pending_profile_requests.pop(request_id, None)
        if request_url is None:
            return

        task = asyncio.create_task(self._save_profile_response(request_id, request_url))
        self._track_task(task)

    def _on_loading_failed(self, params: JsonDict) -> None:
        request_id = params.get("requestId")
        if isinstance(request_id, str):
            self.state.pending_profile_requests.pop(request_id, None)

    async def _save_profile_response(self, request_id: str, request_url: str) -> None:
        if self._session is None:
            raise RuntimeError("CDP capture is not started")

        try:
            result = await self._session.send(
                "Network.getResponseBody", {"requestId": request_id}
            )
            text = decode_response_body(result)
        except Exception:
            return

        try:
            parsed_json: Any = json.loads(text)
        except json.JSONDecodeError:
            return

        captured_at = datetime.now(timezone.utc)
        profile_payloads = find_profile_payloads(parsed_json)

        if self._on_profile_payload is not None:
            for payload in profile_payloads:
                callback_result = self._on_profile_payload(payload)
                if isawaitable(callback_result):
                    await callback_result
                self.state.emitted_candidate_count += 1

        if self.output_dir is not None:
            record: JsonDict = {
                "capturedAt": captured_at.isoformat(),
                "requestId": request_id,
                "url": request_url,
                "json": parsed_json,
            }

            safe_request_id = "".join(
                character if (character.isalnum() or character in {"_", "-"}) else "_"
                for character in request_id
            )
            filename = (
                f"{captured_at.strftime('%Y%m%dT%H%M%S_%fZ')}_{safe_request_id}.json"
            )
            output_path = self.output_dir / filename

            async with self._write_lock:
                with output_path.open("x", encoding="utf-8") as output_file:
                    output_file.write(json.dumps(record, ensure_ascii=True))
                    output_file.write("\n")

        self.state.saved_profile_count += 1

    def _track_task(self, task: asyncio.Task[None]) -> None:
        self._tasks.add(task)
        task.add_done_callback(self._on_task_done)

    def _on_task_done(self, task: asyncio.Task[None]) -> None:
        self._tasks.discard(task)
        if task.cancelled():
            return
        error = task.exception()
        if error is not None and self._task_error is None:
            self._task_error = error


PREFERRED_CANDIDATE_KEYS = (
    "pageResults",
    "profiles",
    "candidates",
    "results",
    "contacts",
    "items",
)
CANDIDATE_HINT_KEYS = {
    "name",
    "fullName",
    "firstName",
    "lastName",
    "headline",
    "title",
    "company",
    "linkedin",
    "linkedinUrl",
    "email",
    "location",
}


def list_looks_like_candidates(items: list[Any]) -> bool:
    candidate_dict_count = 0
    for item in items:
        if not isinstance(item, dict):
            continue
        if any(key in item for key in CANDIDATE_HINT_KEYS):
            return True
        candidate_dict_count += 1
    return candidate_dict_count > 0


def find_page_results(payload: Any) -> list[Any] | None:
    if isinstance(payload, dict):
        for key in PREFERRED_CANDIDATE_KEYS:
            maybe_items = payload.get(key)
            if isinstance(maybe_items, list) and list_looks_like_candidates(maybe_items):
                return maybe_items

        for nested_value in payload.values():
            nested_page_results = find_page_results(nested_value)
            if nested_page_results is not None:
                return nested_page_results
        return None

    if isinstance(payload, list):
        if list_looks_like_candidates(payload):
            return payload
        for item in payload:
            nested_page_results = find_page_results(item)
            if nested_page_results is not None:
                return nested_page_results
        return None

    return None


PROFILE_WRAPPER_KEYS = (
    "profile",
    "candidate",
    "person",
    "contact",
    "result",
    "item",
)


def looks_like_candidate_dict(payload: Any) -> bool:
    if not isinstance(payload, dict):
        return False
    return any(key in payload for key in CANDIDATE_HINT_KEYS) or "id" in payload


def find_profile_payloads(payload: Any) -> list[dict[str, Any]]:
    if looks_like_candidate_dict(payload):
        return [payload]

    if isinstance(payload, dict):
        for key in PROFILE_WRAPPER_KEYS:
            nested_payload = payload.get(key)
            if looks_like_candidate_dict(nested_payload):
                return [nested_payload]

        page_results = find_page_results(payload)
        if isinstance(page_results, list):
            return [item for item in page_results if isinstance(item, dict)]

        for nested_value in payload.values():
            nested_payloads = find_profile_payloads(nested_value)
            if nested_payloads:
                return nested_payloads

        return []

    if isinstance(payload, list):
        if list_looks_like_candidates(payload):
            return [item for item in payload if isinstance(item, dict)]
        for item in payload:
            nested_payloads = find_profile_payloads(item)
            if nested_payloads:
                return nested_payloads

    return []


# Backward compatibility for any existing imports.
CoreProfileCdpCapture = JuiceboxProfileCdpCapture
