#!/usr/bin/env python3
"""
==============================================================================
  DIAGNOSTIC HTML FETCHER — SeleniumBase + Cloudflare Bypass Debug Tool
==============================================================================
  Use this script BEFORE writing your scraper to:
    1. Test whether you can reach the target URL at all.
    2. Test which Cloudflare bypass strategy works for this site/IP.
    3. Dump the full page HTML so you can inspect element class names and
       figure out the right CSS selectors for scraper.py.
    4. View cookies (including CF cookies) after a successful load.

  Usage:
    python fetch_html.py                         # GUI mode (default)
    python fetch_html.py --xvfb                  # Xvfb virtual display (Linux VPS)
    python fetch_html.py --headless              # headless (often blocked by CF)
    python fetch_html.py --url https://site.com  # custom target URL
    python fetch_html.py --output dump.html      # custom output file

  After running, open the saved HTML file in a browser or text editor to
  inspect the DOM and find the correct selectors for your scraper.
==============================================================================
"""

import argparse
import os
import subprocess
import time

from seleniumbase import Driver

# Root of the repository — all scrapers share the same profile and output dirs.
_ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


# TODO: Change this to your target URL.
DEFAULT_URL = "https://example.com"
PROFILE_DIR = os.path.join(_ROOT_DIR, ".sb_profile_debug")


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
    return "131.0.0.0"


def _is_cf(driver) -> bool:
    """Return True if the current page is a Cloudflare challenge page."""
    try:
        return "just a moment" in (driver.title or "").lower()
    except Exception:
        return True


def _dump_page(driver, output: str) -> None:
    """Print diagnostics and save the full page HTML to a file."""
    title = driver.title
    url = driver.current_url
    html = driver.page_source

    print(f"\n{'=' * 60}")
    print(f"  Title : {title}")
    print(f"  URL   : {url}")
    print(f"  HTML  : {len(html):,} chars")
    print(f"{'=' * 60}")
    print(f"\n--- First 3000 chars ---\n{html[:3000]}\n--- End snippet ---\n")

    if "just a moment" in html.lower():
        print("[RESULT] Cloudflare challenge page is still showing.")
    else:
        print("[RESULT] Page loaded — check the saved HTML for your selectors.")

    with open(output, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"[INFO] Full HTML saved to: {output}")

    cookies = driver.get_cookies()
    cf_cookies = [c for c in cookies if "cf" in c.get("name", "").lower()]
    print(f"[INFO] Total cookies: {len(cookies)}, CF-related: {len(cf_cookies)}")
    for c in cf_cookies:
        print(f"  {c['name']} = {str(c['value'])[:60]}...")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Fetch page HTML for debugging — tests CF bypass and dumps DOM."
    )
    parser.add_argument("--url", default=DEFAULT_URL, help="URL to fetch.")
    parser.add_argument("--headless", action="store_true", default=False)
    parser.add_argument("--xvfb", action="store_true", default=False)
    parser.add_argument("--profile-dir", default=PROFILE_DIR)
    parser.add_argument("--output", default=os.path.join(_ROOT_DIR, "downloaded_files", "page_dump.html"),
                        help="File to save the fetched HTML (default: <repo_root>/downloaded_files/page_dump.html).")
    args = parser.parse_args()

    # ── Virtual display ──────────────────────────────────────────────────────
    _vdisplay = None
    if args.xvfb:
        try:
            from pyvirtualdisplay import Display
            _vdisplay = Display(visible=False, size=(1920, 1080))
            _vdisplay.start()
            print("[INFO] Xvfb virtual display started.")
        except ImportError:
            print("[WARN] pyvirtualdisplay not installed; falling back to headless.")
            args.headless = True

    os.makedirs(args.profile_dir, exist_ok=True)

    chrome_ver = _get_chrome_version()
    user_agent = (
        f"Mozilla/5.0 (X11; Linux x86_64) "
        f"AppleWebKit/537.36 (KHTML, like Gecko) "
        f"Chrome/{chrome_ver} Safari/537.36"
    )
    print(f"[INFO] Detected Chrome {chrome_ver}")

    driver = Driver(
        uc=True,
        headless=args.headless or (args.xvfb and _vdisplay is None),
        user_data_dir=args.profile_dir,
        agent=user_agent,
        chromium_arg="--no-sandbox --disable-dev-shm-usage --disable-gpu",
    )

    try:
        # ════════════════════════════════════════════════════════════════
        # STRATEGY 1: uc_open_with_reconnect — increasing reconnect times
        # ════════════════════════════════════════════════════════════════
        for reconnect_time in (6, 10, 16):
            print(f"\n[STRATEGY 1] uc_open_with_reconnect (reconnect_time={reconnect_time})...")
            driver.uc_open_with_reconnect(args.url, reconnect_time=reconnect_time)
            time.sleep(3)
            if not _is_cf(driver):
                print(f"[OK] CF cleared with reconnect_time={reconnect_time}")
                break
            print(f"  title={driver.title!r} — still CF")
        else:
            print("[INFO] Strategy 1 did not clear CF.")

        # ════════════════════════════════════════════════════════════════
        # STRATEGY 2: GUI click methods (uc_gui_handle_cf / uc_gui_click_cf)
        # ════════════════════════════════════════════════════════════════
        if _is_cf(driver):
            print("\n[STRATEGY 2] uc_gui_handle_cf / uc_gui_click_cf...")
            driver.uc_open_with_reconnect(args.url, reconnect_time=12)
            time.sleep(2)
            for attempt, method_name in enumerate([
                "uc_gui_handle_cf",
                "uc_gui_click_cf",
                "uc_gui_handle_captcha",
                "uc_gui_click_captcha",
            ], 1):
                if not _is_cf(driver):
                    break
                fn = getattr(driver, method_name, None)
                if fn is None:
                    continue
                print(f"  Attempt {attempt}: {method_name}()...")
                try:
                    fn()
                    time.sleep(6)
                    if not _is_cf(driver):
                        print(f"[OK] CF cleared via {method_name}")
                        break
                    print(f"    title={driver.title!r} — still CF")
                except Exception as exc:
                    print(f"    {method_name} failed: {exc}")

        # ════════════════════════════════════════════════════════════════
        # STRATEGY 3: Manual disconnect / reconnect cycles
        # ════════════════════════════════════════════════════════════════
        if _is_cf(driver):
            print("\n[STRATEGY 3] Manual disconnect/reconnect cycles...")
            for cycle in range(1, 4):
                print(f"  Cycle {cycle}: disconnect → sleep 12s → reconnect...")
                driver.disconnect()
                time.sleep(12)
                driver.reconnect(0.1)
                time.sleep(4)
                if not _is_cf(driver):
                    print(f"[OK] CF cleared on reconnect cycle {cycle}")
                    break
                try:
                    driver.uc_gui_click_cf()
                    time.sleep(5)
                    if not _is_cf(driver):
                        print(f"[OK] CF cleared via GUI click on cycle {cycle}")
                        break
                except Exception:
                    pass

        # ════════════════════════════════════════════════════════════════
        # STRATEGY 4: Switch to turnstile iframe and click checkbox
        # ════════════════════════════════════════════════════════════════
        if _is_cf(driver):
            print("\n[STRATEGY 4] Trying uc_switch_to_frame for turnstile iframe...")
            driver.uc_open_with_reconnect(args.url, reconnect_time=10)
            time.sleep(3)
            try:
                driver.uc_switch_to_frame("iframe")
                time.sleep(4)
                try:
                    driver.uc_click("span.mark")
                except Exception:
                    try:
                        driver.uc_click("input[type='checkbox']")
                    except Exception:
                        pass
                driver.switch_to.default_content()
                time.sleep(6)
                if not _is_cf(driver):
                    print("[OK] CF cleared via turnstile iframe click")
            except Exception as exc:
                print(f"  uc_switch_to_frame failed: {exc}")

        # ════════════════════════════════════════════════════════════════
        # STRATEGY 5: Very long reconnect as last resort
        # ════════════════════════════════════════════════════════════════
        if _is_cf(driver):
            print("\n[STRATEGY 5] Very long reconnect (25s)...")
            driver.uc_open_with_reconnect(args.url, reconnect_time=25)
            time.sleep(5)
            if _is_cf(driver):
                try:
                    driver.uc_gui_handle_cf()
                    time.sleep(6)
                except Exception:
                    pass
            if not _is_cf(driver):
                print("[OK] CF cleared with long reconnect")

        # ── Final result ─────────────────────────────────────────────────────
        print(f"\n{'#' * 60}")
        if _is_cf(driver):
            print("#  FAILED: Could not bypass Cloudflare challenge.")
            print("#  Your IP may be blocked. Try: residential proxy,")
            print("#  a different VPS IP, or the site's direct API.")
        else:
            print("#  SUCCESS: Page loaded successfully!")
        print(f"{'#' * 60}\n")

        if not _is_cf(driver):
            print("[INFO] Waiting 8s for dynamic content to fully render...")
            time.sleep(8)

        _dump_page(driver, args.output)

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


if __name__ == "__main__":
    main()
