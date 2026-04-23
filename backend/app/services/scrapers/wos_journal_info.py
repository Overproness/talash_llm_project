"""
Web of Science Journal Info scraper  (wos-journal.info).

Provides an on-demand search function: search(query) -> list[dict]

Results are cached in data/reference_data/cache/wos_journal_info_cache.json
so repeated lookups for the same journal don't hit the website.

Fuzzy matching (rapidfuzz) is used to find the best match when the exact
title isn't found verbatim.

Usage example:
    from app.services.scrapers import wos_journal_info
    results = wos_journal_info.search("Measurement")   # returns list of journal dicts
    best   = wos_journal_info.best_match("Measurement Science and Technology")
"""

import json
import logging
import os
import re
import time
from typing import Any

from bs4 import BeautifulSoup
from rapidfuzz import fuzz, process

from app.core.config import get_settings
from app.services.scrapers.base import make_http_client

logger = logging.getLogger(__name__)

_BASE_URL = "https://wos-journal.info"
_SEARCH_URL = _BASE_URL + "/?jsearch={query}"
_DETAIL_URL = _BASE_URL + "/journalid/{journal_id}"
_CACHE_FILE = "wos_journal_info_cache.json"
_CACHE_TTL_DAYS = 30  # cache entries expire after 30 days


# ── cache helpers ──────────────────────────────────────────────────────────────

def _cache_path() -> str:
    cache_dir = os.path.join(get_settings().reference_data_dir, "cache")
    os.makedirs(cache_dir, exist_ok=True)
    return os.path.join(cache_dir, _CACHE_FILE)


def _load_cache() -> dict[str, Any]:
    path = _cache_path()
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except Exception as e:
        logger.warning(f"wos_journal_info: cache load error: {e}")
        return {}


def _save_cache(cache: dict[str, Any]) -> None:
    try:
        with open(_cache_path(), "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"wos_journal_info: cache save error: {e}")


def _cache_key(query: str) -> str:
    return query.strip().lower()


def _cache_entry(results: list[dict]) -> dict:
    return {"ts": time.time(), "results": results}


def _is_fresh(entry: dict) -> bool:
    age_days = (time.time() - entry.get("ts", 0)) / 86400
    return age_days < _CACHE_TTL_DAYS


# ── HTML parsing helpers ───────────────────────────────────────────────────────

def _text(element) -> str:
    return element.get_text(strip=True) if element else ""


def _parse_card(card) -> dict:
    """Parse a single div.cardj element into a dict."""
    result: dict[str, str] = {}
    titles = card.find_all("div", class_="title")
    contents = card.find_all("div", class_="content")
    for t, c in zip(titles, contents):
        key = _text(t).rstrip(":")
        val = _text(c)
        if key:
            result[key] = val

    # Extract journal ID from the More Details link
    link = card.find("a", href=re.compile(r"/journalid/"))
    if link:
        m = re.search(r"/journalid/(\d+)", link["href"])
        if m:
            result["journal_id"] = m.group(1)

    return result


def _parse_search_page(html: str) -> tuple[int, list[dict]]:
    """Return (total_results, list_of_partial_dicts)."""
    soup = BeautifulSoup(html, "lxml")

    # Total count
    total = 0
    count_div = soup.find("div", class_=re.compile(r"text-danger"))
    if count_div:
        m = re.search(r"matched\s+(\d+)\s+journals", _text(count_div), re.I)
        if m:
            total = int(m.group(1))

    cards = soup.find_all("div", class_=re.compile(r"\bcardj\b"))
    results = [_parse_card(card) for card in cards]
    return total, results


def _parse_detail_page(html: str) -> dict:
    """Parse extra fields from a /journalid/<id> page."""
    soup = BeautifulSoup(html, "lxml")
    extra: dict[str, str] = {}
    # Detail pages also use div.title + div.content pairs
    titles = soup.find_all("div", class_="title")
    contents = soup.find_all("div", class_="content")
    for t, c in zip(titles, contents):
        key = _text(t).rstrip(":")
        val = _text(c)
        if key:
            extra[key] = val
    return extra


# ── HTTP helpers ───────────────────────────────────────────────────────────────

def _http_search(query: str) -> tuple[int, list[dict]]:
    """Perform an HTTP search and return (total, partial_records)."""
    url = _SEARCH_URL.format(query=query.replace(" ", "+"))
    with make_http_client(timeout=30.0) as client:
        resp = client.get(url)
        resp.raise_for_status()
    return _parse_search_page(resp.text)


def _http_detail(journal_id: str) -> dict:
    """Fetch extra fields from the detail page."""
    url = _DETAIL_URL.format(journal_id=journal_id)
    try:
        with make_http_client(timeout=30.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
        return _parse_detail_page(resp.text)
    except Exception as e:
        logger.debug(f"wos_journal_info: detail fetch failed for id={journal_id}: {e}")
        return {}


# ── public API ─────────────────────────────────────────────────────────────────

def search(query: str, fetch_details: bool = False) -> list[dict]:
    """
    Search wos-journal.info for *query*. Returns list of journal dicts.

    Each dict includes keys from the search card (Journal Title, ISSN, eISSN,
    WoS Core Citation Indexes, Journal Impact Factor (JIF)) plus journal_id.
    If fetch_details=True, each entry is enriched with fields from the detail
    page (Category, Publisher, Country, Best ranking, …).

    Results are cached. Subsequent calls with the same query (case-insensitive)
    return cached data until the cache entry expires (_CACHE_TTL_DAYS).
    """
    key = _cache_key(query)
    cache = _load_cache()
    if key in cache and _is_fresh(cache[key]):
        logger.debug(f"wos_journal_info: cache hit for '{query}'")
        return cache[key]["results"]

    logger.info(f"wos_journal_info: searching for '{query}'")
    try:
        total, results = _http_search(query)
        logger.info(f"wos_journal_info: '{query}' → {total} matches, {len(results)} returned on first page")

        if fetch_details:
            for i, rec in enumerate(results):
                jid = rec.get("journal_id")
                if jid:
                    extra = _http_detail(jid)
                    rec.update({k: v for k, v in extra.items() if k not in rec})
                    if i < len(results) - 1:
                        time.sleep(0.5)  # be polite

    except Exception as e:
        logger.error(f"wos_journal_info: search failed: {e}")
        results = []

    cache[key] = _cache_entry(results)
    _save_cache(cache)
    return results


def best_match(journal_title: str, min_score: int = 75) -> dict | None:
    """
    Return the single best-matching journal for *journal_title* using
    rapidfuzz similarity against the Journal Title field.

    Searches the website if the exact title is not cached, then ranks all
    cached results for the query by fuzzy similarity and returns the top
    result if its score >= min_score (0-100). Returns None on no match.
    """
    candidates = search(journal_title)
    if not candidates:
        # Broaden query to first few words
        short = " ".join(journal_title.split()[:3])
        if short != journal_title:
            candidates = search(short)

    if not candidates:
        return None

    choices = {c.get("Journal Title", ""): c for c in candidates if c.get("Journal Title")}
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
