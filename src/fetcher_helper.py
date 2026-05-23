#!/usr/bin/env python3
"""
Bridge script called by the Node.js CloudflareFetcher to fetch HTML pages
that are behind Cloudflare challenge protection.

Uses curl_cffi's TLS impersonation to mimic a real Chrome browser's
TLS/JA3 fingerprint, which reliably bypasses Cloudflare challenge pages
without needing a full browser (Playwright).

Usage:
    python3 src/fetcher_helper.py <url>

Outputs the page HTML to stdout. Exits with code 0 on success,
1 on failure (error message to stderr).
"""
import sys
import time
from curl_cffi import requests


def fetch_url(url: str) -> str:
    """Fetch a URL using curl_cffi with Chrome TLS impersonation."""
    headers = {
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/110.0.0.0 Safari/537.36"
        ),
        "Accept": (
            "text/html,application/xhtml+xml,application/xml;"
            "q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8"
        ),
        "Accept-Language": "en-US,en;q=0.9",
    }

    for attempt in range(3):
        resp = requests.get(
            url,
            impersonate="chrome",
            headers=headers,
            timeout=30,
        )
        resp.raise_for_status()
        content = resp.text

        # Cloudflare challenge pages contain the text "Just a moment"
        # in the HTML body. Legitimate pages never have this string.
        if "Just a moment" not in content:
            return content

        if attempt < 2:
            time.sleep(2)

    raise RuntimeError("Cloudflare challenge could not be resolved")


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: fetcher_helper.py <url>", file=sys.stderr)
        sys.exit(1)

    url = sys.argv[1]

    try:
        html = fetch_url(url)
        print(html)
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
