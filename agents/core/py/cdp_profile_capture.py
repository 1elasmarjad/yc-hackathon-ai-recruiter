import argparse
import asyncio
import sys
from pathlib import Path

from cdp_capture import CoreProfileCdpCapture


async def capture_profiles(
    cdp_url: str,
    profile_match_substring: str,
    duration_seconds: int,
    max_profiles: int | None,
    output_dir: Path,
) -> None:
    capture = CoreProfileCdpCapture(
        cdp_url=cdp_url,
        output_dir=output_dir,
        profile_match_substring=profile_match_substring,
    )
    await capture.start()
    print(
        f"[CDP] Connected and listening on {cdp_url}. OutputDir={output_dir}",
        file=sys.stderr,
        flush=True,
    )

    loop = asyncio.get_running_loop()
    deadline = loop.time() + duration_seconds if duration_seconds > 0 else None
    try:
        while True:
            capture.raise_if_failed()
            if (
                max_profiles is not None
                and capture.state.saved_profile_count >= max_profiles
            ):
                break

            if deadline is not None and loop.time() >= deadline:
                break

            await asyncio.sleep(0.25)
    finally:
        await capture.stop()
        print(
            (
                f"[CDP] Finished. apiRequests={capture.state.api_request_count} "
                f"searchMatches={capture.state.profile_match_count} "
                f"savedSearchResponses={capture.state.saved_profile_count} "
                f"emittedCandidates={capture.state.emitted_candidate_count}"
            ),
            file=sys.stderr,
            flush=True,
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--cdp-url", required=True, help="WebSocket CDP URL")
    parser.add_argument(
        "--match",
        default="/api/profile",
        help="Substring to match profile API responses",
    )
    parser.add_argument(
        "--duration-seconds",
        type=int,
        default=120,
        help="Capture duration in seconds. Set 0 to wait until --max-profiles is reached.",
    )
    parser.add_argument(
        "--max-profiles",
        type=int,
        default=None,
        help="Stop automatically after this many saved profile responses.",
    )
    parser.add_argument(
        "--output-dir",
        required=True,
        help="Directory for captured JSON files (one file per matched response).",
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(
        capture_profiles(
            cdp_url=args.cdp_url,
            profile_match_substring=args.match,
            duration_seconds=args.duration_seconds,
            max_profiles=args.max_profiles,
            output_dir=Path(args.output_dir),
        )
    )
