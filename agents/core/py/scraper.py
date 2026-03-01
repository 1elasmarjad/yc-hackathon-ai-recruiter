import argparse
import asyncio
import json
import os
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from browser_use import Agent, Browser, ChatBrowserUse
from playwright.async_api import async_playwright
from cdp_capture import JuiceboxProfileCdpCapture

CDP_CONNECT_MAX_ATTEMPTS = 5
CDP_CONNECT_RETRY_SECONDS = 1
NEXT_BUTTON_STABILIZATION_WAIT_MS = 2_000
CAPTURE_DIRNAME = "captures"
SAVE_CDP_ENV_VAR = "SAVE_JUICEBOX_CDP_LOCALLY_DEV"
BROWSER_USE_URL_PREFIX = "SCRAPER_BROWSER_USE_URL="
BROWSER_CAPTURE_STATS_PREFIX = "SCRAPER_CAPTURE_STATS="
BROWSER_USE_URL_MAX_ATTEMPTS = 4
BROWSER_USE_URL_RETRY_SECONDS = 0.5


def require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


def is_local_cdp_save_enabled() -> bool:
    value = os.getenv(SAVE_CDP_ENV_VAR, "").strip().lower()
    return value in {"1", "true", "yes", "on"}


def resolve_browser_use_live_url(session_id: str) -> str | None:
    api_key = os.getenv("BROWSER_USE_API_KEY", "").strip()
    if not api_key:
        return None

    request = urllib.request.Request(
        f"https://api.browser-use.com/api/v2/browsers/{session_id}",
        headers={
            "X-Browser-Use-API-Key": api_key,
            "Content-Type": "application/json",
        },
        method="GET",
    )

    for attempt in range(1, BROWSER_USE_URL_MAX_ATTEMPTS + 1):
        try:
            with urllib.request.urlopen(request, timeout=10) as response:
                if response.status < 200 or response.status >= 300:
                    return None
                payload_text = response.read().decode("utf-8")
                payload = json.loads(payload_text)
                live_url = payload.get("liveUrl")
                if isinstance(live_url, str) and live_url:
                    return live_url
                return None
        except urllib.error.HTTPError as error:
            if error.code == 404 and attempt < BROWSER_USE_URL_MAX_ATTEMPTS:
                time.sleep(BROWSER_USE_URL_RETRY_SECONDS)
                continue
            print(f"[Scraper] Failed to resolve Browser Use live URL: {error}", flush=True)
            return None
        except (urllib.error.URLError, json.JSONDecodeError) as error:
            print(f"[Scraper] Failed to resolve Browser Use live URL: {error}", flush=True)
            return None

    return None


def get_login_prompt(target_url: str) -> str:
    return f"""Follow these steps to navigate to Juicebox search results and log in.

1. Go to: {target_url}

2. Login (if prompted):
   - Click "continue with email"
   - Click "login" beside "Already have an account?"
   - Enter email: x_user
   - Enter password: x_pass
   - Submit the login form

3. Once logged in (or if already logged in), confirm you can see the search results page with candidate profile cards.

IMPORTANT OUTPUT INSTRUCTIONS:
- Return ONLY a JSON object: {{ "loginReady": true }}
- Do not include any extra text outside of the JSON object.""".strip()


def get_scrape_prompt() -> str:
    return """Follow these steps to click through all candidate profiles on the current Juicebox search results page.

NOTE: START AT TOP OF THE PAGE YOU LOAD INTO BY DEFAULT AND COUNT UP.

For each profile card visible in the list:
  - Skip any profiles marked as "hidden"
  - Click the profile card to open the right sidebar (DO NOT CLICK THE HIDE BUTTON IN ANY CIRCUMSTANCES)

Once you have clicked through all profile cards on the current page, you are done.""".strip()


async def get_active_context_page(context) -> object:
    open_pages = [page for page in context.pages if not page.is_closed()]
    if not open_pages:
        raise RuntimeError("No open pages available in the browser context")

    for page in reversed(open_pages):
        if page.url and page.url != "about:blank":
            return page

    return open_pages[-1]


async def click_first_usable_next_control(page) -> bool:
    candidate_locators = [
        page.get_by_role("button", name="Next"),
        page.get_by_role("link", name="Next"),
        page.locator("button:has-text('Next')"),
        page.locator("a:has-text('Next')"),
        page.locator("[aria-label='Next'], [aria-label*='Next']"),
    ]

    for locator in candidate_locators:
        candidate_count = await locator.count()
        for candidate_index in range(candidate_count):
            candidate = locator.nth(candidate_index)
            try:
                if not await candidate.is_visible():
                    continue

                if await candidate.get_attribute("disabled") is not None:
                    continue

                if (await candidate.get_attribute("aria-disabled")) == "true":
                    continue

                await candidate.scroll_into_view_if_needed()
                try:
                    await candidate.click(timeout=5_000)
                except Exception:
                    await candidate.click(timeout=5_000, force=True)
                return True
            except Exception:
                continue

    return False


async def click_next_page(cdp_url: str, current_page: int) -> None:
    async with async_playwright() as playwright:
        pw_browser = None
        connect_errors: list[str] = []

        for attempt in range(1, CDP_CONNECT_MAX_ATTEMPTS + 1):
            try:
                pw_browser = await playwright.chromium.connect_over_cdp(cdp_url)
                break
            except Exception as error:
                connect_errors.append(f"attempt {attempt}: {error}")
                if attempt < CDP_CONNECT_MAX_ATTEMPTS:
                    await asyncio.sleep(CDP_CONNECT_RETRY_SECONDS)

        if pw_browser is None:
            raise RuntimeError(
                "Failed to connect over CDP after retries: "
                + " | ".join(connect_errors)
            )

        try:
            if not pw_browser.contexts:
                raise RuntimeError("No browser contexts available over CDP")

            context = pw_browser.contexts[0]
            page = await get_active_context_page(context)
            await page.wait_for_load_state("domcontentloaded")
            print(
                f"[Scraper] Attempting Next navigation from URL: {page.url}",
                flush=True,
            )

            clicked_next = await click_first_usable_next_control(page)
            if not clicked_next:
                await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
                await page.wait_for_timeout(500)
                clicked_next = await click_first_usable_next_control(page)

            if not clicked_next:
                raise RuntimeError(
                    "Next control not found or not clickable "
                    f"after scraping page {current_page}"
                )

            print(
                f"[Scraper] Clicked Next to move from page {current_page} to page {current_page + 1}",
                flush=True,
            )
            try:
                await page.wait_for_load_state("networkidle", timeout=10_000)
            except Exception:
                pass
            await page.wait_for_load_state("domcontentloaded")
            await page.wait_for_timeout(NEXT_BUTTON_STABILIZATION_WAIT_MS)
            print(f"[Scraper] After Next click URL: {page.url}", flush=True)
        finally:
            await pw_browser.close()


async def main(juicebox_url: str, profile_id: str, total_pages: int):
    print(f"[Scraper] Starting for {juicebox_url}", flush=True)
    email = require_env("CORE_EMAIL")
    password = require_env("CORE_PASSWORD")
    browser_use_api_key = require_env("BROWSER_USE_API_KEY")
    scrape_prompt = get_scrape_prompt()

    llm = ChatBrowserUse(model="bu-2-0", api_key=browser_use_api_key)

    browser = Browser(
        use_cloud=True,
        cloud_profile_id=profile_id,
        keep_alive=True,
    )

    await browser.start()

    print(f"[Scraper] Browser started: {browser.id}", flush=True)
    cloud_session_id = (
        browser._cloud_browser_client.current_session_id
        if browser.browser_profile.use_cloud
        else browser.id
    )
    if cloud_session_id:
        print(f"SCRAPER_BROWSER_ID={cloud_session_id}", flush=True)
        live_url = resolve_browser_use_live_url(cloud_session_id)
        if live_url:
            print(f"{BROWSER_USE_URL_PREFIX}{live_url}", flush=True)
    else:
        print(
            "[Scraper] Missing cloud session ID; falling back to browser ID for SCRAPER_BROWSER_ID",
            flush=True,
        )
        print(f"SCRAPER_BROWSER_ID={browser.id}", flush=True)
        live_url = resolve_browser_use_live_url(browser.id)
        if live_url:
            print(f"{BROWSER_USE_URL_PREFIX}{live_url}", flush=True)

    agent = Agent(
        task=get_login_prompt(juicebox_url),
        browser=browser,
        llm=llm,
        sensitive_data={
            "x_user": email,
            "x_pass": password,
        },
    )
    should_save_local_cdp = is_local_cdp_save_enabled()
    capture_run_dir: Path | None = None
    if should_save_local_cdp:
        capture_dir = Path(__file__).resolve().parent / CAPTURE_DIRNAME
        capture_run_dir = capture_dir / (
            f"profiles_{datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S_%fZ')}"
        )
        print(f"SCRAPER_PROFILE_CAPTURE_DIR={capture_run_dir}", flush=True)

    def emit_user_payload(payload: Any) -> None:
        print(
            f"SCRAPER_USER_PAYLOAD={json.dumps(payload, ensure_ascii=True)}", flush=True
        )

    cdp_capture: JuiceboxProfileCdpCapture | None = None
    try:
        await agent.run()
        print("[Scraper] Login complete", flush=True)

        cdp_url = browser.cdp_url
        if not cdp_url:
            raise RuntimeError("Browser CDP URL is missing after login")

        cdp_capture = JuiceboxProfileCdpCapture(
            cdp_url=cdp_url,
            output_dir=capture_run_dir,
            profile_match_substring="/api/profile",
            on_profile_payload=emit_user_payload,
        )
        await cdp_capture.start()
        if capture_run_dir is not None:
            print(
                f"[Scraper] CDP profile capture enabled: {capture_run_dir}",
                flush=True,
            )
        else:
            print(
                (
                    "[Scraper] CDP payload streaming enabled without local file save. "
                    f"Set {SAVE_CDP_ENV_VAR}=1 to save files."
                ),
                flush=True,
            )

        sensitive_data: dict[str, str] = {
            "x_user": email,
            "x_pass": password,
        }
        for current_page in range(1, total_pages + 1):
            print(f"[Scraper] Scraping page {current_page}/{total_pages}", flush=True)
            scrape_agent = Agent(
                task=scrape_prompt,
                browser=browser,
                llm=llm,
                sensitive_data=sensitive_data,
            )
            await scrape_agent.run()
            if cdp_capture is not None:
                cdp_capture.raise_if_failed()
            print(
                f"[Scraper] Finished scraping page {current_page}/{total_pages}",
                flush=True,
            )

            if current_page < total_pages:
                await click_next_page(
                    cdp_url=cdp_url,
                    current_page=current_page,
                )
                if cdp_capture is not None:
                    cdp_capture.raise_if_failed()

        if cdp_capture is not None:
            cdp_capture.raise_if_failed()
    finally:
        capture_stop_error: Exception | None = None
        if cdp_capture is not None:
            try:
                await cdp_capture.stop()
                capture_stats = {
                    "apiRequests": cdp_capture.state.api_request_count,
                    "searchMatches": cdp_capture.state.profile_match_count,
                    "savedSearchResponses": cdp_capture.state.saved_profile_count,
                    "emittedCandidates": cdp_capture.state.emitted_candidate_count,
                }
                print(
                    f"{BROWSER_CAPTURE_STATS_PREFIX}{json.dumps(capture_stats, ensure_ascii=True)}",
                    flush=True,
                )
                print(
                    (
                        "[Scraper] CDP capture stopped. "
                        f"apiRequests={cdp_capture.state.api_request_count} "
                        f"profileMatches={cdp_capture.state.profile_match_count} "
                        f"savedProfiles={cdp_capture.state.saved_profile_count} "
                        f"emittedCandidates={cdp_capture.state.emitted_candidate_count}"
                    ),
                    flush=True,
                )
            except Exception as error:
                capture_stop_error = error
        if browser.browser_profile.use_cloud:
            try:
                await browser._cloud_browser_client.stop_browser()
            except Exception as error:
                print(f"[Scraper] Cloud browser stop failed: {error}", flush=True)
        else:
            await browser.stop()
        if capture_stop_error is not None:
            raise capture_stop_error


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--target-url", required=True)
    parser.add_argument("--profile-id", required=True)
    parser.add_argument("--total-pages", type=int, required=True)
    args = parser.parse_args()
    asyncio.run(main(args.target_url, args.profile_id, args.total_pages))
