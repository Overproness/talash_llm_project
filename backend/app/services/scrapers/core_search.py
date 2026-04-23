"""
CORE conference rankings search scraper  (portal.core.edu.au).

Two operating modes:
  1. LOCAL fuzzy search  – fast, offline, against the already-downloaded
     core_conferences.json produced by core_conferences.py.
  2. LIVE HTTP search    – hits the CORE portal when the local data returns
     no good match, or when the local dataset has not been downloaded yet.

Both paths cache their results in:
    data/reference_data/cache/core_search_cache.json

Public API:
    from app.services.scrapers import core_search

    results = core_search.search("machine learning")           # returns list[dict]
    best    = core_search.best_match("ICSE")                   # returns dict | None
"""

import json
import logging
import os
import time
from typing import Any

from bs4 import BeautifulSoup
from rapidfuzz import fuzz

from app.core.config import get_settings
from app.services.scrapers.base import make_http_client

logger = logging.getLogger(__name__)

_PORTAL_URL = (
    "https://portal.core.edu.au/conf-ranks/"
    "?search={query}&by=all&source=CORE2023&sort=arank&page=1"
)
_LOCAL_JSON = "core_conferences.json"
_CACHE_FILE = "core_search_cache.json"
_CACHE_TTL_DAYS = 7
_MIN_FUZZY_SCORE = 70  # local threshold below which we also do a live search


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
        logger.warning(f"core_search: cache load error: {e}")
        return {}


def _save_cache(cache: dict[str, Any]) -> None:
    try:
        with open(_cache_path(), "w", encoding="utf-8") as f:
            json.dump(cache, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.warning(f"core_search: cache save error: {e}")


def _cache_key(query: str) -> str:
    return query.strip().lower()


def _is_fresh(entry: dict) -> bool:
    age_days = (time.time() - entry.get("ts", 0)) / 86400
    return age_days < _CACHE_TTL_DAYS


# ── local data helpers ─────────────────────────────────────────────────────────

def _load_local() -> list[dict]:
    """Load the bulk-downloaded core_conferences.json, if it exists."""
    path = os.path.join(get_settings().reference_data_dir, _LOCAL_JSON)
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except Exception as e:
        logger.warning(f"core_search: could not load local core_conferences.json: {e}")
        return []


def _local_search(query: str, local: list[dict], top_n: int = 10) -> list[dict]:
    """Fuzzy search against locally-cached conferences. Returns top_n results."""
    if not local:
        return []

    q = query.strip().lower()

    scored: list[tuple[int, float, int]] = []  # (placeholder, score, idx)
    for idx, c in enumerate(local):
        name = (c.get("name") or c.get("title") or "").lower()
        acronym = (c.get("acronym") or "").lower()
        aliases = " ".join(c.get("aliases") or []).lower()

        # Score against full name: use token_sort_ratio (good for word-order changes)
        name_score = fuzz.token_sort_ratio(q, name)
        # Score against acronym: partial_ratio (handles short queries well)
        acronym_score = fuzz.ratio(q, acronym) if acronym else 0
        # Score against aliases composite
        alias_score = max(
            (fuzz.partial_ratio(q, a.lower()) for a in (c.get("aliases") or [])),
            default=0,
        )
        score = max(name_score, acronym_score, alias_score)
        scored.append((idx, score, idx))

    # Sort by descending score, take top_n
    scored.sort(key=lambda x: -x[1])
    results = []
    for _, score, idx in scored[:top_n]:
        rec = dict(local[idx])
        rec["_match_score"] = score
        rec["_source"] = "local"
        results.append(rec)
    return results


# ── live HTTP helpers ──────────────────────────────────────────────────────────

_RANK_COL = "rank"

def _parse_portal_html(html: str) -> list[dict]:
    """Parse the CORE portal results table into list[dict]."""
    soup = BeautifulSoup(html, "lxml")
    results: list[dict] = []

    table = soup.find("table")
    if not table:
        return results

    headers: list[str] = []
    thead = table.find("thead")
    if thead:
        headers = [th.get_text(strip=True).lower().replace(" ", "_")
                   for th in thead.find_all("th")]

    for row in (table.find("tbody") or table).find_all("tr"):
        cells = row.find_all("td")
        if not cells:
            continue
        rec: dict[str, str] = {}
        for i, cell in enumerate(cells):
            key = headers[i] if i < len(headers) else f"col_{i}"
            # Grab link text or plain text
            a = cell.find("a")
            rec[key] = (a.get_text(strip=True) if a else cell.get_text(strip=True))
        if rec:
            rec["_source"] = "live"
            results.append(rec)

    return results


def _live_search(query: str) -> list[dict]:
    """Perform a live HTTP search against the CORE portal."""
    url = _PORTAL_URL.format(query=query.replace(" ", "+"))
    logger.info(f"core_search: live search for '{query}' → {url}")
    try:
        with make_http_client(timeout=30.0) as client:
            resp = client.get(url)
            resp.raise_for_status()
        return _parse_portal_html(resp.text)
    except Exception as e:
        logger.error(f"core_search: live search failed: {e}")
        return []


# ── public API ─────────────────────────────────────────────────────────────────

def search(query: str, force_live: bool = False) -> list[dict]:
    """
    Search CORE conference rankings for *query*.

    Strategy:
      1. Return cached results if fresh.
      2. Run local fuzzy search against core_conferences.json.
      3. If local top score < _MIN_FUZZY_SCORE OR local dataset is empty,
         also run a live CORE portal search and merge results.
      4. Cache and return results.

    Results are sorted by _match_score (descending) then by rank (ascending).
    """
    key = _cache_key(query)
    cache = _load_cache()
    if not force_live and key in cache and _is_fresh(cache[key]):
        logger.debug(f"core_search: cache hit for '{query}'")
        return cache[key]["results"]

    local = _load_local()
    local_results = _local_search(query, local) if not force_live else []

    top_local_score = (
        max((r.get("_match_score", 0) for r in local_results), default=0)
    )

    live_results: list[dict] = []
    if force_live or not local or top_local_score < _MIN_FUZZY_SCORE:
        live_results = _live_search(query)

    # Merge: local results take priority; add live results that aren't already present
    seen_titles: set[str] = set()
    merged: list[dict] = []

    for rec in local_results:
        title = (rec.get("title") or rec.get("col_0") or "").lower()
        seen_titles.add(title)
        merged.append(rec)

    for rec in live_results:
        title = (rec.get("title") or rec.get("col_0") or "").lower()
        if title and title not in seen_titles:
            rec.setdefault("_match_score", 0)
            merged.append(rec)
            seen_titles.add(title)

    # Sort: highest match score first; ties broken by rank
    def _sort_key(r: dict):
        try:
            rank_raw = r.get(_RANK_COL) or r.get("core_rank") or r.get("arank") or "Z"
            rank_val = {"A*": 0, "A": 1, "B": 2, "C": 3}.get(rank_raw, 9999)
        except (ValueError, TypeError):
            rank_val = 9999
        return (-r.get("_match_score", 0), rank_val)

    merged.sort(key=_sort_key)

    cache[key] = {"ts": time.time(), "results": merged}
    _save_cache(cache)
    logger.info(
        f"core_search: '{query}' → {len(local_results)} local, "
        f"{len(live_results)} live, {len(merged)} total"
    )
    return merged


def best_match(query: str, min_score: int = 75) -> dict | None:
    """
    Return the single best-matching conference for *query*.
    Returns None if the top result's match score is below *min_score*.
    """
    results = search(query)
    if results and results[0].get("_match_score", 0) >= min_score:
        return results[0]
    return None
