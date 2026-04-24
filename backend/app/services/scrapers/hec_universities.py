"""
HEC Universities scraper.

Source: https://www.hec.gov.pk/english/universities/pages/recognised.aspx
Scrapes the card-based listing of Pakistani universities recognised by HEC.

The old W/X/Y/Z category classification is no longer present on the page.
We derive a synthetic tier from the `sector` data-attribute embedded on
each card (Public Federal → national_top, Public Provincial → national_good,
Private → national_average).

Output: merges Pakistan subset into data/reference_data/university_rankings.json
Schedule: quarterly
"""

import json
import logging
import os
import re

from bs4 import BeautifulSoup

from app.core.config import get_settings
from app.services.scrapers.base import make_http_client, update_metadata, write_reference_json

logger = logging.getLogger(__name__)

HEC_URL = "https://www.hec.gov.pk/english/universities/pages/recognised.aspx"


def _derive_tier(sector: str, chartered_by: str) -> str:
    sector_l = sector.lower()
    chartered_l = chartered_by.lower()
    if "public" in sector_l:
        if "government of pakistan" in chartered_l or "federal" in chartered_l:
            return "national_top"
        return "national_good"
    if "private" in sector_l:
        return "national_average"
    return "national_unknown"


def _extract_aliases(name: str) -> list[str]:
    """
    Extract an acronym from a name that contains it in parentheses, e.g.
    "Abbottabad University of Science and Technology (AUST)" → ["AUST"]
    Also applies a hard-coded map of well-known Pakistani university acronyms.
    """
    aliases: list[str] = []
    # Explicit parenthetical acronym
    m = re.search(r"\(([A-Z]{2,10})\)", name)
    if m:
        aliases.append(m.group(1))

    # Normalize name: replace & → and, strip commas/extra spaces
    name_lower = name.lower()
    clean = re.sub(r"\s*\([^)]+\)\s*$", "", name_lower).strip()
    name_norm = re.sub(r"&", " and ", name_lower)
    name_norm = re.sub(r"[,.]", " ", name_norm)
    name_norm = re.sub(r"\s+", " ", name_norm).strip()
    clean_norm = re.sub(r"&", " and ", clean)
    clean_norm = re.sub(r"[,.]", " ", clean_norm)
    clean_norm = re.sub(r"\s+", " ", clean_norm).strip()

    # Well-known acronyms for prominent Pakistani universities
    _KNOWN_ALIASES: dict[str, list[str]] = {
        "lahore university of management sciences": ["LUMS"],
        "national university of sciences and technology": ["NUST"],
        "national university of computer and emerging sciences": ["FAST", "NUCES"],
        "fast national university of computer and emerging sciences": ["FAST", "NUCES"],
        "ghulam ishaq khan institute of engineering sciences and technology": ["GIKI"],
        "ghulam ishaq khan institute of engineering sciences": ["GIKI"],
        "comsats university": ["COMSATS", "CUI"],
        "ned university of engineering and technology": ["NED"],
        "mehran university of engineering and technology": ["MUET"],
        "institute of business administration": ["IBA"],
        "sukkur iba university": ["IBA Sukkur"],
        "institute of space technology": ["IST"],
        "shaheed zulfikar ali bhutto institute of science and technology": ["SZABIST"],
        "aga khan university": ["AKU"],
        "air university": ["AU"],
        "forman christian college": ["FCC"],
        "quaid-i-azam university": ["QAU"],
        "quaid-e-azam university": ["QAU"],
        "university of karachi": ["KU"],
        "university of the punjab": ["PU"],
        "university of peshawar": ["UoP"],
    }
    for pattern, extra_aliases in _KNOWN_ALIASES.items():
        # Use exact phrase match (startswith, endswith, or equals) to avoid substring false positives
        if (
            name_norm == pattern
            or clean_norm == pattern
            or name_norm.startswith(pattern + " ")
            or clean_norm.startswith(pattern + " ")
        ):
            for alias in extra_aliases:
                if alias not in aliases:
                    aliases.append(alias)

    return aliases


def _load_existing_rankings() -> list[dict]:
    path = os.path.join(get_settings().reference_data_dir, "university_rankings.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []
    except Exception as e:
        logger.warning(f"Could not load existing university_rankings.json: {e}")
        return []


def _merge_pakistan_universities(existing: list[dict], new_pak: list[dict]) -> list[dict]:
    """Replace all Pakistan entries scraped from HEC; keep non-Pakistan entries."""
    non_pak = [u for u in existing if u.get("country", "") != "Pakistan"]
    return non_pak + new_pak


def run() -> int:
    """Scrape HEC and merge Pakistan universities into university_rankings.json."""
    logger.info("HEC scraper: fetching page …")
    with make_http_client(timeout=60.0, verify=False) as client:
        response = client.get(HEC_URL)
        response.raise_for_status()

    soup = BeautifulSoup(response.text, "lxml")
    universities: list[dict] = []

    # The HEC page now uses a card-based layout.
    # Pattern: <li class="card ... university-content-control" data-position="Name">
    #              <div class="desc">Name</div>
    #              <ul class="card-actions">
    #                  <li sector="Public" charteredby="..." city="..." province="...">Province</li>
    #              </ul>
    #          </li>
    cards = soup.find_all("li", class_=lambda c: c and "university-content-control" in c)

    if not cards:
        # Fallback: try <div class='desc'> only (still gives us names)
        desc_divs = soup.find_all("div", class_="desc")
        logger.info(f"HEC scraper: card selector found 0 cards, fallback to {len(desc_divs)} desc divs")
        for div in desc_divs:
            name = div.get_text(strip=True)
            if not name or len(name) < 5:
                continue
            if any(u["name"] == name for u in universities):
                continue
            universities.append({
                "name": name,
                "aliases": [],
                "country": "Pakistan",
                "hec_category": "N/A",
                "qs_rank": "unranked",
                "the_rank": "unranked",
                "tier": "national_unknown",
                "province": "",
                "sector": "",
            })
    else:
        for card in cards:
            name_div = card.find("div", class_="desc")
            if not name_div:
                name = card.get("data-position", "").strip()
            else:
                name = name_div.get_text(strip=True)

            if not name or len(name) < 5:
                continue
            if any(u["name"] == name for u in universities):
                continue

            # Extract attributes from the inner <li> inside card-actions
            info_li = card.find("li", attrs={"sector": True})
            sector = ""
            chartered_by = ""
            province = ""
            city = ""
            if info_li:
                sector = info_li.get("sector", "")
                chartered_by = info_li.get("charteredby", "")
                province = info_li.get("province", "")
                city = info_li.get("city", "")

            aliases = _extract_aliases(name)
            # Strip the parenthetical acronym from the stored name for cleanliness
            clean_name = re.sub(r"\s*\([A-Z]{2,10}\)\s*$", "", name).strip()

            universities.append({
                "name": clean_name,
                "aliases": aliases,
                "country": "Pakistan",
                "hec_category": "N/A",
                "qs_rank": "unranked",
                "the_rank": "unranked",
                "tier": _derive_tier(sector, chartered_by),
                "province": province,
                "city": city,
                "sector": sector,
            })

    if not universities:
        logger.warning("HEC scraper: no universities found — page structure may have changed")
        return 0

    existing = _load_existing_rankings()
    merged = _merge_pakistan_universities(existing, universities)
    write_reference_json("university_rankings.json", merged)
    update_metadata("hec_universities", len(universities))
    logger.info(f"HEC scraper: merged {len(universities)} Pakistani universities")
    return len(universities)
