"""
Academic Publishers scraper.

Sources:
1. Beall's list of predatory publishers (community-maintained CSV):
   https://raw.githubusercontent.com/stop-predatory-journals/stop-predatory-journals.github.io/refs/heads/master/_data/publishers.csv
2. Hard-coded list of reputable top academic publishers.
3. Recent open-access publishers (Frontiers, MDPI, Hindawi, etc.) — hand-curated.

Output: data/reference_data/academic_publishers.json  (replaces static stub)
Schedule: quarterly
"""

import csv
import io
import logging

from app.services.scrapers.base import make_http_client, update_metadata, write_reference_json

logger = logging.getLogger(__name__)

BEALLS_CSV_URL = (
    "https://raw.githubusercontent.com/stop-predatory-journals/"
    "stop-predatory-journals.github.io/refs/heads/master/_data/publishers.csv"
)

# ─── Hard-coded reputable publishers ─────────────────────────────────────────
_REPUTABLE: list[dict] = [
    {
        "name": "Elsevier",
        "aliases": ["Elsevier", "Elsevier Science", "Elsevier B.V.", "North-Holland", "Pergamon"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "Springer",
        "aliases": ["Springer", "Springer Nature", "Springer-Verlag", "Springer Berlin",
                    "Springer International", "LNCS", "Lecture Notes in Computer Science"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "IEEE",
        "aliases": ["IEEE", "Institute of Electrical and Electronics Engineers",
                    "IEEE Press", "IEEE Xplore", "IEEE Transactions"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "ACM",
        "aliases": ["ACM", "Association for Computing Machinery", "ACM Press", "ACM Digital Library"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "Wiley",
        "aliases": ["Wiley", "John Wiley", "Wiley-Blackwell", "Wiley-IEEE Press", "Wiley-Interscience"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "Oxford University Press",
        "aliases": ["OUP", "Oxford University Press", "Oxford Academic"],
        "credibility": "top_academic",
        "type": "university_press",
    },
    {
        "name": "Cambridge University Press",
        "aliases": ["CUP", "Cambridge University Press", "Cambridge Core"],
        "credibility": "top_academic",
        "type": "university_press",
    },
    {
        "name": "Taylor & Francis",
        "aliases": ["Taylor & Francis", "Taylor and Francis", "Routledge", "CRC Press"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "SAGE Publications",
        "aliases": ["SAGE", "Sage Publications", "SAGE Journals"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "World Scientific",
        "aliases": ["World Scientific", "WSPC"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "IET",
        "aliases": ["IET", "Institution of Engineering and Technology", "IEE"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "American Chemical Society",
        "aliases": ["ACS", "American Chemical Society Publications"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "Royal Society of Chemistry",
        "aliases": ["RSC", "Royal Society of Chemistry"],
        "credibility": "top_academic",
        "type": "academic",
    },
    {
        "name": "Nature Portfolio",
        "aliases": ["Nature", "Nature Publishing Group", "NPG", "Springer Nature", "Nature Research"],
        "credibility": "top_academic",
        "type": "academic",
    },
    # ── Open-access publishers (legitimate but vary in quality) ──
    {
        "name": "MDPI",
        "aliases": ["MDPI", "Multidisciplinary Digital Publishing Institute"],
        "credibility": "open_access",
        "type": "open_access",
        "note": "Large OA publisher; quality varies by journal; indexed in Scopus/WoS",
    },
    {
        "name": "Frontiers",
        "aliases": ["Frontiers", "Frontiers Media", "Frontiers in …"],
        "credibility": "open_access",
        "type": "open_access",
        "note": "OA publisher; peer-reviewed; some journals highly cited",
    },
    {
        "name": "Hindawi",
        "aliases": ["Hindawi", "Hindawi Publishing Corporation", "Hindawi Limited"],
        "credibility": "open_access",
        "type": "open_access",
        "note": "OA publisher owned by Wiley; quality concerns raised post-2020",
    },
    {
        "name": "PLOS",
        "aliases": ["PLOS", "Public Library of Science", "PLoS ONE", "PLOS ONE"],
        "credibility": "open_access",
        "type": "open_access",
        "note": "Nonprofit OA; rigorous peer review",
    },
    {
        "name": "Biomed Central",
        "aliases": ["BioMed Central", "BMC", "BioMedCentral"],
        "credibility": "open_access",
        "type": "open_access",
        "note": "Springer Nature OA imprint",
    },
    {
        "name": "IGI Global",
        "aliases": ["IGI Global", "Information Science Reference"],
        "credibility": "questionable",
        "type": "academic",
        "note": "Frequently cited in predatory-publisher concerns",
    },
]


def _fetch_bealls_csv() -> list[dict]:
    """Fetch Beall's publisher list and return predatory entries."""
    try:
        with make_http_client(timeout=30.0) as client:
            resp = client.get(BEALLS_CSV_URL)
            resp.raise_for_status()
    except Exception as e:
        logger.warning(f"Publishers scraper: could not fetch Beall's list: {e}")
        return []

    records: list[dict] = []
    reader = csv.DictReader(io.StringIO(resp.text))
    for row in reader:
        name = (row.get("Name") or row.get("name") or row.get("publisher", "")).strip()
        url = (row.get("URL") or row.get("url") or row.get("website", "")).strip()
        if not name:
            continue
        records.append(
            {
                "name": name,
                "aliases": [name],
                "credibility": "predatory",
                "type": "predatory",
                "source": "bealls_list",
                "url": url,
            }
        )
    return records


def run() -> int:
    """Build academic_publishers.json from hard-coded list + Beall's CSV."""
    logger.info("Publishers scraper: building publisher list …")

    # Start with reputable publishers
    publishers: list[dict] = list(_REPUTABLE)

    # Add predatory publishers from Beall's list
    # Avoid overwriting reputable publishers with predatory tag
    reputable_names_lower = {p["name"].lower() for p in _REPUTABLE}
    bealls = _fetch_bealls_csv()
    for entry in bealls:
        if entry["name"].lower() not in reputable_names_lower:
            publishers.append(entry)

    write_reference_json("academic_publishers.json", publishers)
    update_metadata("publishers", len(publishers))
    logger.info(f"Publishers scraper: wrote {len(publishers)} publishers")
    return len(publishers)
