"""
Clarivate Master Journal List (MJL) scraper.

Uses Playwright to:
  1. Log in via https://access.clarivate.com/login?app=censub
  2. Navigate to https://mjl.clarivate.com/home
  3. Search for a journal by name
  4. Paginate through mat-card results
  5. Return structured journal dicts

Results are cached in data/reference_data/cache/clarivate_mjl_cache.json.
Fuzzy matching (rapidfuzz) is used to find the best result for a query.

Public API:
    from app.services.scrapers import clarivate_mjl

    results = clarivate_mjl.search("Measurement")       # list[dict]
    best    = clarivate_mjl.best_match("Measurement")   # dict | None

Credentials are pulled from the app's settings (or environment):
    MJL_EMAIL    default: texibag558@mugstock.com
    MJL_PASSWORD default: @Talashllm12
"""

import json
import logging
import os
import time
from typing import Any

from rapidfuzz import fuzz, process

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_MJL_HOME = "https://mjl.clarivate.com/home"
_LOGIN_URL = "https://access.clarivate.com/login?app=censub"
_SEARCH_RESULTS_PATH = "/search-results"
_CACHE_FILE = "clarivate_mjl_cache.json"
_CACHE_TTL_DAYS = 14

# Fallback credentials (overridden by env / settings if provided)
_DEFAULT_EMAIL = "texibag558@mugstock.com"
_DEFAULT_PASSWORD = "@Talashllm12"


# ── credential helpers ─────────────────────────────────────────────────────────

def _credentials() -> tuple[str, str]:
    settings = get_settings()
    email = getattr(settings, "mjl_email", None) or os.environ.get("MJL_EMAIL", _DEFAULT_EMAIL)
    pwd = getattr(settings, "mjl_password", None) or os.environ.get("MJL_PASSWORD", _DEFAULT_PASSWORD)
    return email, pwd


# ── cache helpers ──────────────────────────────────────────────────────────────

def _cache_path() -> str:
    cache_dir = os.path.join(get_settings().reference_data_dir, "cache")
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, _CACHE_FILE)


def _load_cache() -> dict[str, Any]:
    try:
        with open(_cache_path(), encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except Exception as e:
        logger.warning(f"clarivate_mjl: cache load error: {e}")
        return {}


def _save_cache(cache: dict[str, Any]) -> None:
    try:
        with open(_cache_path(), "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"clarivate_mjl: cache save error: {e}")


def _cache_key(query: str) -> str:
    return query.strip().lower()


def _is_fresh(entry: dict) -> bool:
    age_days = (time.time() - entry.get("ts", 0)) / 86400
    return age_days < _CACHE_TTL_DAYS


# ── Playwright helpers ─────────────────────────────────────────────────────────

_JS_EXTRACT_CARDS = """
() => {
    const cards = Array.from(document.querySelectorAll('mat-card'));
    const results = [];
    for (const card of cards) {
        // Skip UI / banner cards that don't represent a journal
        if (!card.querySelector('.has_profile_btn, [class*="profile"], a[href*="/collection-list-page"]')) {
            const titleEl = card.querySelector('mat-card-title, [class*="title"]');
            if (!titleEl) continue;
        }
        const titleEl = card.querySelector('mat-card-title');
        if (!titleEl) continue;

        const rec = {};
        rec['title'] = titleEl.textContent.trim();

        // Extract all label:value pairs from the card
        const rows = card.querySelectorAll('[class*="field"], p, .info-row, li');
        for (const row of rows) {
            const text = row.textContent.trim();
            if (!text || text === rec['title']) continue;
            // Try label: value split
            const colonIdx = text.indexOf(':');
            if (colonIdx > 0 && colonIdx < 60) {
                const label = text.slice(0, colonIdx).trim();
                const value = text.slice(colonIdx + 1).trim();
                if (label && value) rec[label] = value;
            }
        }

        // Also grab any visible text in content divs
        const contentDivs = card.querySelectorAll('mat-card-content, [class*="content"]');
        for (const div of contentDivs) {
            const spans = div.querySelectorAll('span, p, div');
            for (const span of spans) {
                const text = span.textContent.trim();
                if (!text || text === rec['title'] || text.length > 200) continue;
                const colonIdx = text.indexOf(':');
                if (colonIdx > 0 && colonIdx < 60) {
                    const label = text.slice(0, colonIdx).trim();
                    const value = text.slice(colonIdx + 1).trim();
                    if (label && value && !rec[label]) rec[label] = value;
                }
            }
        }
        if (rec['title']) results.push(rec);
    }
    return results;
}
"""

_JS_TOTAL = """
() => {
    const el = document.querySelector('app-journal-search-results') ||
                document.querySelector('[class*="result-count"]');
    return el ? el.textContent.trim() : '';
}
"""

_JS_HAS_NEXT = """
() => {
    const btn = document.querySelector('button[aria-label="Next page"]');
    return btn ? !btn.disabled : false;
}
"""

_JS_CLICK_NEXT = """
() => {
    const btn = document.querySelector('button[aria-label="Next page"]');
    if (btn && !btn.disabled) { btn.click(); return true; }
    return false;
}
"""

_JS_REMOVE_CONSENT = """
() => {
    const el = document.getElementById('onetrust-consent-sdk');
    if (el) el.remove();
    const overlay = document.getElementById('onetrust-accept-btn-handler');
    if (overlay) overlay.remove();
}
"""


def _scrape_with_playwright(query: str, max_pages: int = 20) -> list[dict]:
    """
    Use Playwright to log in to Clarivate, search for *query* on MJL, and
    collect all result pages. Returns a list of journal dicts.
    """
    try:
        from playwright.sync_api import sync_playwright, TimeoutError as PwTimeout
    except ImportError:
        logger.error("clarivate_mjl: playwright not installed; run: playwright install chromium")
        return []

    email, password = _credentials()
    results: list[dict] = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/120.0.0.0 Safari/537.36"
            )
        )
        page = context.new_page()

        try:
            # ── Step 1: Log in ───────────────────────────────────────────────
            logger.info("clarivate_mjl: navigating to login page …")
            page.goto(_LOGIN_URL, wait_until="networkidle", timeout=30000)
            page.fill('input[name="email"]', email)
            page.fill('input[name="password"]', password)
            page.press('input[name="password"]', "Enter")

            # Wait for redirect away from login
            try:
                page.wait_for_url(lambda u: "access.clarivate.com" not in u, timeout=20000)
            except PwTimeout:
                # May already be on MJL home after login
                pass

            # ── Step 2: Navigate to MJL home ─────────────────────────────────
            if "mjl.clarivate.com" not in page.url:
                logger.info("clarivate_mjl: navigating to MJL home …")
                page.goto(_MJL_HOME, wait_until="networkidle", timeout=30000)

            # Remove consent popup if present
            page.evaluate(_JS_REMOVE_CONSENT)
            page.wait_for_timeout(500)

            # ── Step 3: Search ────────────────────────────────────────────────
            logger.info(f"clarivate_mjl: searching for '{query}' …")
            try:
                page.wait_for_selector("#search-box", timeout=15000)
            except PwTimeout:
                logger.warning("clarivate_mjl: #search-box not found, trying alternate selector")
                page.wait_for_selector('input[type="search"], input[placeholder*="search" i]', timeout=10000)
                search_el = page.query_selector('input[type="search"], input[placeholder*="search" i]')
                if search_el:
                    search_el.click()
                    search_el.fill(query)
                    search_el.press("Enter")
            else:
                page.evaluate(_JS_REMOVE_CONSENT)
                page.click("#search-box")
                page.fill("#search-box", query)
                page.press("#search-box", "Enter")

            # Wait for results to load
            try:
                page.wait_for_url(lambda u: _SEARCH_RESULTS_PATH in u, timeout=20000)
            except PwTimeout:
                pass

            try:
                page.wait_for_selector("mat-card", timeout=20000)
            except PwTimeout:
                logger.warning("clarivate_mjl: no mat-card elements found — no results?")
                return []

            # ── Step 4: Paginate and extract ──────────────────────────────────
            page_num = 1
            while page_num <= max_pages:
                page.evaluate(_JS_REMOVE_CONSENT)
                page.wait_for_timeout(800)  # let Angular stabilise

                page_results: list[dict] = page.evaluate(_JS_EXTRACT_CARDS)
                if page_results:
                    results.extend(page_results)
                    logger.info(
                        f"clarivate_mjl: page {page_num}: {len(page_results)} cards "
                        f"(total so far: {len(results)})"
                    )

                has_next: bool = page.evaluate(_JS_HAS_NEXT)
                if not has_next:
                    break

                page.evaluate(_JS_CLICK_NEXT)
                try:
                    page.wait_for_selector("mat-card", timeout=15000)
                except PwTimeout:
                    break
                page_num += 1

        except PwTimeout as e:
            logger.error(f"clarivate_mjl: Playwright timeout: {e}")
        except Exception as e:
            logger.error(f"clarivate_mjl: Playwright error: {e}", exc_info=True)
        finally:
            browser.close()

    # Deduplicate by title
    seen: set[str] = set()
    unique: list[dict] = []
    for r in results:
        t = r.get("title", "").lower()
        if t and t not in seen:
            seen.add(t)
            unique.append(r)

    return unique


# ── public API ─────────────────────────────────────────────────────────────────

def search(query: str, max_pages: int = 20) -> list[dict]:
    """
    Search Clarivate MJL for *query*. Returns list of journal dicts.

    Results are cached for _CACHE_TTL_DAYS days. Subsequent calls with the
    same query return cached data without hitting the website.
    """
    key = _cache_key(query)
    cache = _load_cache()
    if key in cache and _is_fresh(cache[key]):
        logger.debug(f"clarivate_mjl: cache hit for '{query}'")
        return cache[key]["results"]

    logger.info(f"clarivate_mjl: starting Playwright scrape for '{query}' …")
    results = _scrape_with_playwright(query, max_pages=max_pages)

    cache[key] = {"ts": time.time(), "results": results}
    _save_cache(cache)
    logger.info(f"clarivate_mjl: '{query}' → {len(results)} results cached")
    return results


def best_match(journal_title: str, min_score: int = 75) -> dict | None:
    """
    Return the single best-matching journal for *journal_title*.
    Searches MJL and ranks all results using rapidfuzz token_sort_ratio.
    Returns None if top score < *min_score*.
    """
    candidates = search(journal_title)
    if not candidates:
        short = " ".join(journal_title.split()[:3])
        if short != journal_title:
            candidates = search(short)
    if not candidates:
        return None

    choices = {c.get("title", ""): c for c in candidates if c.get("title")}
    if not choices:
        return None

    match = process.extractOne(
        journal_title,
        list(choices.keys()),
        scorer=fuzz.token_sort_ratio,
        processor=str.lower,
    )
    if match and match[1] >= min_score:
        return choices[match[0]]
    return None
