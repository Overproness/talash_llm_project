#!/usr/bin/env python3
"""
==============================================================================
  BOILERPLATE SCRAPER — SeleniumBase + Undetected Chrome + CF bypass
==============================================================================
  Adapt this file for any website you need to scrape.
  Search for all TODO: comments to find every place you need to change.

  Supports three browser modes:
    1. GUI mode      — visible browser window (default, great for development)
    2. Headless mode — --headless  (may get blocked by Cloudflare)
    3. Xvfb mode     — --xvfb     (Linux VPS: virtual display, bypasses CF
                                   headless detection while staying invisible)

  Persistent Chrome profile (.sb_profile/) keeps cookies/sessions alive across
  restarts so you rarely hit Cloudflare re-challenges.

  Usage examples:
    python scraper.py                            # GUI
    python scraper.py --headless                 # headless
    python scraper.py --xvfb                     # Xvfb (Linux VPS)
    python scraper.py --output-dir ./data        # custom output dir
==============================================================================
"""

import argparse
import csv
import datetime as dt
import os
import random
import subprocess
import time
from dataclasses import dataclass, field
from typing import Dict, List

from seleniumbase import Driver

# Root of the repository — all scrapers share the same profile and output dirs.
_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# ==============================================================================
# TODO: Define your target URLs here.
#       Add as many entries as you need. The scraper will cycle through all of
#       them in order on every poll cycle.
#
# Format:  "logical_name": "https://..."
# ==============================================================================
URLS: Dict[str, str] = {
    "page_one": "https://example.com/page1",
    # "page_two": "https://example.com/page2",
}


# ==============================================================================
# TODO: Define the CSS selectors used to find the rows on each page.
#       Must match the keys in URLS above.
#       You can also use a single fallback selector if all pages share one.
# ==============================================================================
ROW_SELECTORS: Dict[str, str] = {
    "page_one": "div.some-row-class",
    # "page_two": "tr.another-row-class",
}

# Fallback selector tried when the primary one finds nothing.
# TODO: Update this if the website has a more general row class.
FALLBACK_SELECTOR = "div.row"


# ==============================================================================
# TODO: Define the data fields you want to capture per row.
#       Edit the RowRecord dataclass to match what your target site exposes.
# ==============================================================================
@dataclass
class RowRecord:
    # --- Identity / key fields ---
    source: str          # which page/URL this row came from
    row_id: str          # unique identifier for deduplication (e.g. an ID attribute, URL slug, etc.)
    row_url: str         # full URL for this row (or empty string if not applicable)

    # TODO: Add or remove fields below to match your target site.
    field_one: str = ""
    field_two: str = ""
    field_three: str = ""
    field_four: str = ""

    # --- Timestamp (managed automatically, do not remove) ---
    scraped_at: str = ""


# ==============================================================================
# TODO: List the CSV column headers in the order you want them written.
#       Must match the field names in RowRecord above.
# ==============================================================================
CSV_FIELDS: List[str] = [
    "source",
    "row_id",
    "row_url",
    "field_one",
    "field_two",
    "field_three",
    "field_four",
    "scraped_at",
]


# ==============================================================================
#  In-memory store — tracks all rows seen this session and deduplicates them.
#  You generally do not need to change this section.
# ==============================================================================
@dataclass
class RowStore:
    records: Dict[str, RowRecord] = field(default_factory=dict)

    def upsert(self, row: RowRecord) -> None:
        """Insert a row, ignoring duplicates (same source+row_id)."""
        key = f"{row.source}:{row.row_id}"
        if key not in self.records:
            self.records[key] = row


# ==============================================================================
#  Row extraction — the piece that reads data out of the live DOM.
#  TODO: Update the JavaScript inside extract_rows() to pull the right fields
#        from your target website's HTML structure.
# ==============================================================================
def extract_rows(driver: Driver, source: str) -> List[dict]:
    """
    Navigate to the page for `source` (already loaded in `driver`) and extract
    rows using JavaScript. Returns a list of plain dicts, one per row.
    """
    selector = ROW_SELECTORS.get(source, FALLBACK_SELECTOR)

    # Wait up to 45 seconds for rows to appear.
    deadline = time.time() + 45
    used_selector = selector
    while time.time() < deadline:
        rows = driver.find_elements("css selector", selector)
        if rows:
            break
        rows = driver.find_elements("css selector", FALLBACK_SELECTOR)
        if rows:
            used_selector = FALLBACK_SELECTOR
            break
        time.sleep(0.5)
    else:
        # Neither selector found anything. Dump debug info.
        try:
            print(
                f"[DEBUG] {source}: No rows found with selector '{selector}' or "
                f"fallback '{FALLBACK_SELECTOR}'.\n"
                f"  title={driver.title!r}  url={driver.current_url}"
            )
        except Exception:
            pass
        return []

    # ===========================================================================
    # TODO: Replace the JavaScript below with code that reads the correct fields
    #       from each row element on your target site.
    #
    #       The script receives `arguments[0]` = the CSS selector string.
    #       It must return an array of plain JSON objects (one per row).
    #       Each object's keys should match the fields in RowRecord (except source
    #       and the timestamp fields, which are filled in by Python code below).
    #
    # Example approach:
    #   - Use document.querySelectorAll(selector) to get row elements.
    #   - For each row, use .querySelector() / .textContent / .getAttribute()
    #     to extract the individual field values.
    #   - Return the array.
    # ===========================================================================
    script = """
    const selector = arguments[0];
    const text = (root, sel) => {
        const el = root.querySelector(sel);
        return el ? el.textContent.trim().replace(/\\s+/g, ' ') : '';
    };
    const attr = (root, sel, attrName) => {
        const el = root.querySelector(sel);
        return el ? (el.getAttribute(attrName) || '') : '';
    };

    const rows = Array.from(document.querySelectorAll(selector));
    return rows.map((row) => {
        // TODO: Replace these with real selectors for your site.
        const href = row.getAttribute('href') || row.querySelector('a')?.getAttribute('href') || '';
        const fullUrl = href.startsWith('http') ? href : (href ? `https://example.com${href}` : '');
        const parts = href.split('/').filter(Boolean);
        const rowId = parts.length ? parts[parts.length - 1] : '';

        return {
            row_id:     rowId,
            row_url:    fullUrl,
            field_one:  text(row, '.field-one-class'),    // TODO: real selector
            field_two:  text(row, '.field-two-class'),    // TODO: real selector
            field_three: text(row, '.field-three-class'), // TODO: real selector
            field_four:  attr(row, 'img.some-icon', 'title'), // TODO: real selector/attr
        };
    });
    """
    return driver.execute_script(script, used_selector) or []


# ==============================================================================
#  CSV output helpers — generally no changes needed here.
# ==============================================================================
def write_snapshot(path: str, records: Dict[str, RowRecord]) -> None:
    """Overwrite the active snapshot CSV with all currently tracked rows."""
    rows = sorted(records.values(), key=lambda r: (r.source, r.row_id))
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDS)
        writer.writeheader()
        for row in rows:
            writer.writerow(row.__dict__)


# ==============================================================================
#  Browser helpers
# ==============================================================================
def _get_chrome_version() -> str:
    """Detect installed Chrome major version to build a matching user-agent."""
    for cmd in (
        "google-chrome --version",
        "google-chrome-stable --version",
        "chromium-browser --version",
        "chromium --version",
    ):
        try:
            out = subprocess.check_output(cmd, shell=True, stderr=subprocess.DEVNULL).decode().strip()
            return out.split()[-1]
        except Exception:
            continue
    return "131.0.0.0"  # safe fallback


def _is_cf(driver: Driver) -> bool:
    """Return True if the current page is showing a Cloudflare challenge."""
    try:
        return "just a moment" in (driver.title or "").lower()
    except Exception:
        return True


def _wait_for_cf_cleared(driver: Driver, label: str, timeout: int = 60) -> bool:
    """
    Wait for Cloudflare's 'Just a moment…' page to clear.
    Tries GUI-based bypass methods (works on Xvfb/VPS or a real display),
    then falls back to polling.
    Returns True when the page is accessible, False if timeout exceeded.
    """
    # Quick poll — the challenge sometimes resolves on its own.
    quick_deadline = time.time() + 5
    while time.time() < quick_deadline:
        if not _is_cf(driver):
            return True
        time.sleep(1.0)

    # GUI-based bypass methods (most reliable with Xvfb or a real display).
    for method_name in (
        "uc_gui_handle_cf",
        "uc_gui_click_cf",
        "uc_gui_handle_captcha",
        "uc_gui_click_captcha",
    ):
        if not _is_cf(driver):
            return True
        fn = getattr(driver, method_name, None)
        if fn is None:
            continue
        try:
            fn()
            time.sleep(5)
            if not _is_cf(driver):
                print(f"[INFO] {label}: Cloudflare cleared via {method_name}.")
                return True
        except Exception:
            pass

    # Final poll — wait the remaining timeout.
    deadline = time.time() + timeout
    while time.time() < deadline:
        if not _is_cf(driver):
            print(f"[INFO] {label}: Cloudflare challenge cleared (delayed).")
            return True
        time.sleep(2.0)

    print(f"[WARN] {label}: Cloudflare challenge did not clear after {timeout}s.")
    return False


def soft_activity(driver: Driver) -> None:
    """Simulate gentle scroll activity to appear human-like."""
    try:
        driver.execute_script(
            "window.scrollTo(0,0); window.scrollTo(0,Math.min(800,document.body.scrollHeight)); window.scrollTo(0,0);"
        )
    except Exception:
        pass


# ==============================================================================
#  CLI arguments
# ==============================================================================
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Scrape a website once and store results in CSV."
    )
    parser.add_argument(
        "--output-dir", default=os.path.join(_ROOT_DIR, "downloaded_files"),
        help="Directory to write CSV output files (default: <repo_root>/downloaded_files).",
    )
    parser.add_argument(
        "--headless", action="store_true", default=False,
        help="Run browser in headless mode. May be blocked by Cloudflare.",
    )
    parser.add_argument(
        "--xvfb", action="store_true", default=False,
        help=(
            "Run in a virtual display via Xvfb (Linux VPS only). "
            "Bypasses Cloudflare headless detection while remaining invisible. "
            "Requires: sudo apt install xvfb && pip install pyvirtualdisplay. "
            "Do NOT combine with --headless."
        ),
    )
    parser.add_argument(
        "--profile-dir", default=os.path.join(_ROOT_DIR, ".sb_profile"),
        help=(
            "Persistent Chrome profile directory. Keeps cookies/session state "
            "across restarts to reduce Cloudflare re-challenges "
            "(default: <repo_root>/.sb_profile)."
        ),
    )
    return parser.parse_args()


def ensure_dir(path: str) -> None:
    if path:
        os.makedirs(path, exist_ok=True)


# ==============================================================================
#  Main scrape function
# ==============================================================================
def scrape(args: argparse.Namespace) -> None:
    ensure_dir(args.output_dir)
    ensure_dir(args.profile_dir)

    output_csv = os.path.join(args.output_dir, "output.csv")

    store = RowStore()

    # ── Start virtual display (Linux Xvfb — bypasses CF headless detection) ──
    _vdisplay = None
    if args.xvfb:
        try:
            from pyvirtualdisplay import Display
            _vdisplay = Display(visible=False, size=(1920, 1080))
            _vdisplay.start()
            print("[INFO] Xvfb virtual display started.")
        except ImportError:
            print("[WARN] pyvirtualdisplay not installed; falling back to headless.")
            print("[WARN]  Install with: pip install pyvirtualdisplay")

    # ── Build user-agent that matches the installed Chrome version ──
    chrome_ver = _get_chrome_version()
    user_agent = (
        f"Mozilla/5.0 (X11; Linux x86_64) "
        f"AppleWebKit/537.36 (KHTML, like Gecko) "
        f"Chrome/{chrome_ver} Safari/537.36"
    )

    # ── Launch undetected Chrome with persistent profile ──
    driver = Driver(
        uc=True,
        headless=args.headless or (args.xvfb and _vdisplay is None),
        user_data_dir=args.profile_dir,
        agent=user_agent,
        chromium_arg="--no-sandbox --disable-dev-shm-usage --disable-gpu",
    )

    ordered_sources = list(URLS.keys())

    try:
        # ── Initial page load: clear CF on the first URL (the cookie then covers
        #    the whole domain for subsequent URLs). ──────────────────────────────
        first_url = URLS[ordered_sources[0]]
        driver.uc_open_with_reconnect(first_url, reconnect_time=10)
        if not _wait_for_cf_cleared(driver, ordered_sources[0]):
            print("[INFO] Retrying initial load with longer reconnect time...")
            driver.uc_open_with_reconnect(first_url, reconnect_time=14)
            _wait_for_cf_cleared(driver, ordered_sources[0])
        soft_activity(driver)
        time.sleep(random.uniform(2.0, 3.5))

        for source in ordered_sources:
            url = URLS[source]
            now_iso = dt.datetime.now(dt.timezone.utc).isoformat()
            try:
                driver.get(url)
                time.sleep(random.uniform(1.5, 2.5))
                soft_activity(driver)

                # Re-check for CF on each page (can appear mid-session).
                if _is_cf(driver):
                    print(f"[INFO] {source}: CF challenge detected, attempting bypass...")
                    if not _wait_for_cf_cleared(driver, source):
                        driver.uc_open_with_reconnect(url, reconnect_time=12)
                        _wait_for_cf_cleared(driver, source)

                raw_rows = extract_rows(driver, source)
            except Exception as exc:
                print(f"[{now_iso}] {source}: extraction failed: {exc}")
                continue

            if not raw_rows:
                print(f"[DEBUG] {source}: extract_rows returned 0 items")

            # ── Build RowRecord objects and upsert into store ──
            for item in raw_rows:
                # TODO: If you need to filter rows (e.g. by age, status, category),
                #       add your filter conditions here before constructing the record.
                # Example:
                #   if item.get("status") != "active":
                #       continue

                row = RowRecord(
                    source=source,
                    row_id=item.get("row_id", ""),
                    row_url=item.get("row_url", ""),
                    field_one=item.get("field_one", ""),
                    field_two=item.get("field_two", ""),
                    field_three=item.get("field_three", ""),
                    field_four=item.get("field_four", ""),
                    scraped_at=now_iso,
                )

                if not row.row_id:
                    continue  # skip rows we can't uniquely identify

                store.upsert(row)

            time.sleep(random.uniform(0.9, 1.6))

        write_snapshot(output_csv, store.records)
        print(
            f"[{dt.datetime.now(dt.timezone.utc).isoformat()}] "
            f"Done. total={len(store.records)} | saved to {output_csv}"
        )

    finally:
        try:
            driver.quit()
        except Exception:
            pass
        if _vdisplay is not None:
            try:
                _vdisplay.stop()
            except Exception:
                pass


# ==============================================================================
#  TODO: If you need to send newly discovered rows to downstream HTTP services,
#        uncomment and adapt the section below.
#        This pattern uses a background thread + queue so network calls never
#        block the main scrape loop.
# ==============================================================================
# import json
# import threading
# import urllib.error
# import urllib.request
# from collections import deque
#
# _dispatch_queue: deque = deque()
# _dispatch_lock = threading.Lock()
# _dispatch_event = threading.Event()
# _dispatch_stats = {"sent": 0, "pending": 0}
#
# DOWNSTREAM_ENDPOINTS = [
#     "http://localhost:3000/ingest",
#     # Add more endpoints here.
# ]
#
# def enqueue_for_dispatch(rows: List[RowRecord]) -> None:
#     with _dispatch_lock:
#         _dispatch_queue.append(rows)
#         _dispatch_stats["pending"] += len(rows)
#     _dispatch_event.set()
#
# def notify_downstream(rows: List[RowRecord]) -> None:
#     payload = json.dumps([row.__dict__ for row in rows]).encode("utf-8")
#     for url in DOWNSTREAM_ENDPOINTS:
#         try:
#             req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"})
#             with urllib.request.urlopen(req, timeout=10) as resp:
#                 resp.read()
#         except Exception as exc:
#             print(f"[ERROR] Downstream {url}: {exc}")
#
# def _dispatcher_loop() -> None:
#     while True:
#         _dispatch_event.wait(timeout=30)
#         _dispatch_event.clear()
#         while True:
#             with _dispatch_lock:
#                 if not _dispatch_queue:
#                     break
#                 batch = _dispatch_queue.popleft()
#             try:
#                 notify_downstream(batch)
#                 with _dispatch_lock:
#                     _dispatch_stats["sent"] += len(batch)
#                     _dispatch_stats["pending"] -= len(batch)
#             except Exception as exc:
#                 print(f"[DISPATCH ERROR] {exc}")
#                 with _dispatch_lock:
#                     _dispatch_stats["pending"] -= len(batch)


def main() -> None:
    args = parse_args()
    try:
        scrape(args)
    except KeyboardInterrupt:
        print("\nStopped by user.")


if __name__ == "__main__":
    main()
