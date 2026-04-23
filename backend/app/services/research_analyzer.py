"""
Research Analyzer — Full Milestone 3 Research Profile Analysis

Handles:
  - Publication quality assessment per paper
    * Journals: Scopus API lookup (ISSN / title), publisher inference, LLM fallback
    * Conferences: CORE ranking lookup (local DB + rapidfuzz), publisher inference
    * Books: Publisher credibility classification
  - Authorship role detection (first / corresponding / co-author)
  - Topic variability analysis with Shannon entropy (Module 3.6)
  - Co-author collaboration analysis (Module 3.7)
  - Composite research score computation
"""

import json
import logging
import math
import os
import re
from functools import lru_cache
from typing import Optional

import httpx
from rapidfuzz import fuzz, process as rf_process

from app.core.config import get_settings
from app.models.candidate import (
    BookQualityInfo,
    CandidateDocument,
    CoAuthorStats,
    ConferenceQualityInfo,
    FullResearchProfile,
    JournalQualityInfo,
    Publication,
    PublicationQualityItem,
    TopicVariabilityResult,
)
from app.services.llm_client import extract_with_llm_custom, is_llm_available

logger = logging.getLogger(__name__)

# ─── Reference data loading ───────────────────────────────────────────────────

@lru_cache(maxsize=1)
def _load_conferences() -> list[dict]:
    path = os.path.join(get_settings().reference_data_dir, "core_conferences.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Could not load core_conferences.json: {e}")
        return []


@lru_cache(maxsize=1)
def _load_publishers() -> list[dict]:
    path = os.path.join(get_settings().reference_data_dir, "academic_publishers.json")
    try:
        with open(path, encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Could not load academic_publishers.json: {e}")
        return []


@lru_cache(maxsize=1)
def _load_journal_quality() -> dict[str, dict]:
    """Load Scimago journal index keyed by ISSN (primary) and lower-case title."""
    path = os.path.join(get_settings().reference_data_dir, "journal_quality.json")
    try:
        with open(path, encoding="utf-8") as f:
            records: list[dict] = json.load(f)
    except FileNotFoundError:
        return {}
    except Exception as e:
        logger.warning(f"Could not load journal_quality.json: {e}")
        return {}

    index: dict[str, dict] = {}
    for rec in records:
        for issn in rec.get("issn_all", []):
            if issn:
                index[issn] = rec
        primary_issn = rec.get("issn", "")
        if primary_issn:
            index[primary_issn] = rec
        title = rec.get("title", "").lower().strip()
        if title:
            index.setdefault(title, rec)
    return index


def _lookup_scimago(issn: str = "", title: str = "") -> Optional[dict]:
    """Look up a journal in the local Scimago index by ISSN or title."""
    index = _load_journal_quality()
    if not index:
        return None
    if issn:
        clean = issn.replace("-", "").strip()
        hit = index.get(clean)
        if hit:
            return hit
    if title:
        hit = index.get(title.lower().strip())
        if hit:
            return hit
    return None


# Build flat index of conference names → entry dict (once, cached)
@lru_cache(maxsize=1)
def _build_conference_index() -> tuple[list[str], list[dict]]:
    """Returns (all_names, entries) where all_names includes acronyms + aliases."""
    conferences = _load_conferences()
    all_names: list[str] = []
    entries: list[dict] = []
    for conf in conferences:
        for label in [conf.get("acronym", ""), conf.get("name", "")] + conf.get("aliases", []):
            if label:
                all_names.append(label.lower())
                entries.append(conf)
    return all_names, entries


def cache_clear() -> None:
    """Clear all lru_cache loaders so updated reference data is reloaded on next access."""
    _load_conferences.cache_clear()
    _load_publishers.cache_clear()
    _load_journal_quality.cache_clear()
    _build_conference_index.cache_clear()
    logger.info("research_analyzer: reference data caches cleared")


# ─── Authorship role detection ────────────────────────────────────────────────

def _normalize_name(name: str) -> str:
    """Strip titles and normalize for fuzzy matching."""
    name = re.sub(r"\b(Dr|Prof|Mr|Ms|Mrs|Ir|Engr)\.?\s*", "", name, flags=re.IGNORECASE)
    return name.strip().lower()


def detect_authorship_role(candidate_name: str, authors: list[str]) -> tuple[str, int]:
    """
    Determine the candidate's authorship role and position.
    Returns (role_str, 0-based_position). Position -1 if not found.
    """
    if not authors or not candidate_name:
        return "unknown", -1

    norm_candidate = _normalize_name(candidate_name)
    norm_authors = [_normalize_name(a) for a in authors]
    total = len(authors)

    # Find best match using rapidfuzz
    result = rf_process.extractOne(
        norm_candidate,
        norm_authors,
        scorer=fuzz.token_set_ratio,
        score_cutoff=70,
    )
    if result is None:
        return "unknown", -1

    _, _, position = result

    if total == 1:
        return "sole_author", 0

    is_first = position == 0
    # In CS convention last author is often corresponding, but we can't determine
    # corresponding author from author list alone — we flag first + last separately
    is_last = position == total - 1

    if is_first and is_last:
        return "sole_author", position
    if is_first:
        return "first_author", position
    if is_last and total >= 3:
        return "corresponding_author", position  # CS convention heuristic
    return "co_author", position


# ─── Publisher inference ──────────────────────────────────────────────────────

_PUBLISHER_KEYWORDS = {
    "IEEE": ["ieee", "institute of electrical and electronics"],
    "ACM": ["acm", "association for computing machinery"],
    "Springer": ["springer", "lncs", "lecture notes in computer science", "lecture notes"],
    "Elsevier": ["elsevier", "science direct", "sciencedirect"],
    "Wiley": ["wiley"],
    "Taylor & Francis": ["taylor", "taylor & francis", "taylor and francis"],
    "MDPI": ["mdpi", "multidisciplinary digital publishing"],
    "SAGE": ["sage publications", "sage journals"],
    "World Scientific": ["world scientific"],
    "IET": ["iet", "institution of engineering and technology"],
}


def _infer_publisher_from_venue(venue: str) -> str:
    """Identify publisher from venue string keywords."""
    venue_lower = venue.lower()
    for publisher, keywords in _PUBLISHER_KEYWORDS.items():
        if any(kw in venue_lower for kw in keywords):
            return publisher
    return "unknown"


# ─── Scopus API ───────────────────────────────────────────────────────────────

_SCOPUS_BASE = "https://api.elsevier.com/content/serial/title"
_scopus_cache: dict[str, Optional[dict]] = {}


async def _scopus_lookup(*, issn: str = "", title: str = "") -> Optional[dict]:
    """
    Call Scopus Serial Title API by ISSN or title.
    Returns parsed quality info dict or None on failure.
    """
    api_key = get_settings().elseivier_api_key
    if not api_key:
        return None

    cache_key = issn or title
    if cache_key in _scopus_cache:
        return _scopus_cache[cache_key]

    params: dict = {"apiKey": api_key, "httpAccept": "application/json", "field": "Title,ISSN,SJRList,citeScoreYearInfoList,rankList"}
    if issn:
        params["issn"] = issn
    elif title:
        params["title"] = title
    else:
        return None

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(_SCOPUS_BASE, params=params)
            if resp.status_code != 200:
                _scopus_cache[cache_key] = None
                return None
            data = resp.json()
    except Exception as e:
        logger.debug(f"Scopus API call failed: {e}")
        _scopus_cache[cache_key] = None
        return None

    try:
        entries = data.get("serial-metadata-response", {}).get("entry", [])
        if not entries:
            _scopus_cache[cache_key] = None
            return None

        entry = entries[0]

        # SJR
        sjr_val: Optional[float] = None
        sjr_list = entry.get("SJRList", {}).get("SJR", [])
        if sjr_list:
            try:
                sjr_val = float(sjr_list[0].get("$", 0))
            except (ValueError, TypeError):
                pass

        # CiteScore
        cite_score: Optional[float] = None
        cs_raw = entry.get("citeScoreYearInfoList", {}).get("citeScoreCurrentMetric")
        if cs_raw:
            try:
                cite_score = float(cs_raw)
            except (ValueError, TypeError):
                pass

        # Quartile — from rankList
        quartile = "unknown"
        rank_list = entry.get("rankList", {}).get("rank", [])
        if isinstance(rank_list, dict):
            rank_list = [rank_list]
        for rank_item in rank_list:
            q = rank_item.get("quartile", "")
            if q in ("Q1", "Q2", "Q3", "Q4"):
                quartile = q
                break

        result = {
            "scopus_indexed": True,
            "quartile": quartile,
            "sjr": sjr_val,
            "cite_score": cite_score,
        }
        _scopus_cache[cache_key] = result
        return result

    except Exception as e:
        logger.debug(f"Scopus response parse error: {e}")
        _scopus_cache[cache_key] = None
        return None


# ─── LLM journal quality fallback ────────────────────────────────────────────

_JOURNAL_QUALITY_PROMPT = """Given the journal venue name and optional ISSN below, determine its academic quality.

Journal venue: "{venue}"
ISSN: "{issn}"

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{{
  "scopus_indexed": true or false,
  "wos_indexed": true or false,
  "quartile": "Q1" or "Q2" or "Q3" or "Q4" or "unknown",
  "is_predatory": true or false
}}

Rules:
- Only mark scopus_indexed=true for journals you are certain are Scopus indexed.
- Only mark wos_indexed=true for journals you are certain are Web of Science indexed.
- If you are unsure about quartile, use "unknown".
- IEEE Transactions journals are typically Q1 or Q2. ACM Transactions are typically Q1.
- Open-access-only journals with article processing charges and questionable peer review may be predatory."""


async def _llm_journal_quality(venue: str, issn: str) -> Optional[JournalQualityInfo]:
    """Use LLM to estimate journal quality when Scopus API fails."""
    if not await is_llm_available():
        return None
    try:
        result = await extract_with_llm_custom(
            "You are a research quality assessor. Respond ONLY with valid JSON.",
            _JOURNAL_QUALITY_PROMPT.format(venue=venue[:200], issn=issn or "N/A"),
        )
        if isinstance(result, dict):
            return JournalQualityInfo(
                scopus_indexed=bool(result.get("scopus_indexed", False)),
                wos_indexed=bool(result.get("wos_indexed", False)),
                quartile=result.get("quartile", "unknown"),
                is_predatory=bool(result.get("is_predatory", False)),
                data_source="llm",
            )
    except Exception as e:
        logger.debug(f"LLM journal quality failed: {e}")
    return None


# ─── Journal quality check ────────────────────────────────────────────────────

async def check_journal_quality(venue: str, issn: str) -> JournalQualityInfo:
    """
    Determine journal quality via:
      1. Scopus API by ISSN (if available)
      2. Scopus API by title
      3. Publisher-based inference
      4. LLM fallback
    """
    if not venue and not issn:
        return JournalQualityInfo()

    # Step 1: Scopus by ISSN
    if issn:
        clean_issn = issn.replace("-", "").strip()
        if clean_issn:
            data = await _scopus_lookup(issn=clean_issn)
            if data:
                return JournalQualityInfo(
                    scopus_indexed=True,
                    wos_indexed=_infer_wos_from_publisher(_infer_publisher_from_venue(venue)),
                    quartile=data.get("quartile", "unknown"),
                    sjr=data.get("sjr"),
                    cite_score=data.get("cite_score"),
                    data_source="scopus_api",
                )

    # Step 1.5: Local Scimago index (offline, always available)
    scimago_hit = _lookup_scimago(issn=issn or "", title=venue or "")
    if scimago_hit:
        return JournalQualityInfo(
            scopus_indexed=True,
            wos_indexed=_infer_wos_from_publisher(_infer_publisher_from_venue(venue)),
            quartile=scimago_hit.get("quartile", "unknown"),
            sjr=scimago_hit.get("sjr"),
            data_source="scimago_local",
        )

    # Step 2: Scopus by title (for well-known journals)
    if venue and len(venue) > 5:
        data = await _scopus_lookup(title=venue[:100])
        if data:
            return JournalQualityInfo(
                scopus_indexed=True,
                wos_indexed=_infer_wos_from_publisher(_infer_publisher_from_venue(venue)),
                quartile=data.get("quartile", "unknown"),
                sjr=data.get("sjr"),
                cite_score=data.get("cite_score"),
                data_source="scopus_api",
            )

    # Step 3: Publisher-based inference
    publisher = _infer_publisher_from_venue(venue)
    if publisher != "unknown":
        inferred = _infer_quality_from_publisher(publisher, venue)
        if inferred:
            return inferred

    # Step 4: LLM fallback
    llm_result = await _llm_journal_quality(venue, issn)
    if llm_result:
        return llm_result

    return JournalQualityInfo(data_source="unknown")


def _infer_wos_from_publisher(publisher: str) -> bool:
    """Heuristic: top publishers are generally WoS-indexed."""
    return publisher in ("IEEE", "ACM", "Elsevier", "Springer", "Wiley", "Taylor & Francis")


def _infer_quality_from_publisher(publisher: str, venue: str) -> Optional[JournalQualityInfo]:
    """Infer journal quality tier from publisher and venue name patterns."""
    venue_lower = venue.lower()

    # IEEE Transactions → generally Q1/Q2
    if publisher == "IEEE" and "transaction" in venue_lower:
        return JournalQualityInfo(
            scopus_indexed=True,
            wos_indexed=True,
            quartile="Q1",
            data_source="publisher_inference",
        )
    # ACM Transactions → Q1
    if publisher == "ACM" and "transaction" in venue_lower:
        return JournalQualityInfo(
            scopus_indexed=True,
            wos_indexed=True,
            quartile="Q1",
            data_source="publisher_inference",
        )
    # IEEE Access / Letters / Communications → Q2-Q3
    if publisher == "IEEE" and any(kw in venue_lower for kw in ["access", "letter", "communications magazine"]):
        return JournalQualityInfo(
            scopus_indexed=True,
            wos_indexed=True,
            quartile="Q2",
            data_source="publisher_inference",
        )
    # Elsevier / Springer / Wiley journals — indexed but quartile unknown
    if publisher in ("Elsevier", "Springer", "Wiley", "Taylor & Francis"):
        return JournalQualityInfo(
            scopus_indexed=True,
            wos_indexed=True,
            quartile="unknown",
            data_source="publisher_inference",
        )
    # MDPI — Scopus indexed, typically Q2-Q4
    if publisher == "MDPI":
        return JournalQualityInfo(
            scopus_indexed=True,
            wos_indexed=False,
            quartile="unknown",
            data_source="publisher_inference",
        )

    return None


# ─── Conference quality check ─────────────────────────────────────────────────

_SERIES_NUM_RE = re.compile(
    r"\b(\d+)(?:st|nd|rd|th)\b",
    re.IGNORECASE,
)


def _extract_series_number(venue: str) -> Optional[int]:
    """Extract ordinal series number from a venue name like '13th International ...'"""
    match = _SERIES_NUM_RE.search(venue)
    if match:
        return int(match.group(1))
    return None


def _maturity_from_series(series_num: Optional[int]) -> str:
    if series_num is None:
        return "unknown"
    if series_num >= 10:
        return "established"
    if series_num >= 5:
        return "growing"
    return "recent"


def check_conference_quality(venue: str) -> ConferenceQualityInfo:
    """
    Determine conference quality via:
      1. Fuzzy match against CORE conference DB
      2. Publisher keyword inference (proceedings publisher + indexed status)
    """
    if not venue:
        return ConferenceQualityInfo()

    conf_names, conf_entries = _build_conference_index()
    venue_lower = venue.lower()
    series_num = _extract_series_number(venue)
    maturity = _maturity_from_series(series_num)

    # Step 1: fuzzy match against CORE DB
    result = rf_process.extractOne(
        venue_lower,
        conf_names,
        scorer=fuzz.token_set_ratio,
        score_cutoff=72,
    )
    if result is not None:
        _, score, idx = result
        matched_conf = conf_entries[idx]
        proceedings_pub = matched_conf.get("proceedings_publisher", "unknown")
        return ConferenceQualityInfo(
            core_rank=matched_conf.get("core_rank", "unknown"),
            proceedings_publisher=proceedings_pub,
            is_indexed=proceedings_pub in ("IEEE", "ACM", "Springer", "USENIX", "PMLR", "Curran Associates"),
            series_number=series_num,
            estimated_maturity=maturity,
            data_source="local_db",
        )

    # Step 2: Publisher inference only
    publisher = _infer_publisher_from_venue(venue)
    is_indexed = publisher in ("IEEE", "ACM", "Springer", "Wiley", "Elsevier")
    return ConferenceQualityInfo(
        core_rank="unknown",
        proceedings_publisher=publisher,
        is_indexed=is_indexed,
        series_number=series_num,
        estimated_maturity=maturity,
        data_source="publisher_inference" if publisher != "unknown" else "unknown",
    )


# ─── Book publisher assessment ────────────────────────────────────────────────

def assess_book_publisher(publisher: str) -> BookQualityInfo:
    """Classify a book publisher by credibility using fuzzy matching."""
    if not publisher:
        return BookQualityInfo()

    publishers = _load_publishers()
    all_aliases: list[str] = []
    alias_to_entry: list[dict] = []
    for pub in publishers:
        for alias in [pub.get("name", "")] + pub.get("aliases", []):
            if alias:
                all_aliases.append(alias.lower())
                alias_to_entry.append(pub)

    result = rf_process.extractOne(
        publisher.lower(),
        all_aliases,
        scorer=fuzz.token_set_ratio,
        score_cutoff=70,
    )
    if result is not None:
        _, _, idx = result
        matched = alias_to_entry[idx]
        return BookQualityInfo(
            publisher_credibility=matched.get("credibility", "unknown"),
            publisher_type=matched.get("type", "unknown"),
            matched_publisher=matched.get("name", ""),
        )

    return BookQualityInfo(
        publisher_credibility="unknown",
        publisher_type="unknown",
        matched_publisher="",
    )


# ─── Topic variability (Module 3.6) ──────────────────────────────────────────

_TOPIC_KEYWORDS: dict[str, list[str]] = {
    "machine learning": ["machine learning", "deep learning", "neural network", "lstm", "rnn", "cnn", "transformer", "bert", "gpt", "reinforcement learning", "federated learning", "transfer learning", "ann", "gan", "autoencoder"],
    "computer vision": ["computer vision", "image processing", "object detection", "segmentation", "visual recognition", "scene understanding", "image classification", "face recognition", "optical flow"],
    "natural language processing": ["natural language", "nlp", "text classification", "named entity", "sentiment analysis", "language model", "machine translation", "question answering", "text mining", "information extraction"],
    "wireless communications": ["wireless", "noma", "oma", "5g", "6g", "lte", "ofdm", "ofdma", "mimo", "heterogeneous network", "beamforming", "spectrum", "resource allocation", "small cell", "relay", "d2d", "fading", "channel estimation"],
    "networking & IoT": ["network", "iot", "internet of things", "sensor", "wsn", "routing", "protocol", "bandwidth", "latency", "throughput", "topology", "software-defined", "sdn", "nfv"],
    "signal processing": ["signal processing", "dsp", "frequency", "filter", "modulation", "demodulation", "adaptive filtering", "wavelet", "fourier"],
    "optimization": ["optimization", "convex", "genetic algorithm", "particle swarm", "heuristic", "scheduling", "metaheuristic", "convex optimization", "stochastic"],
    "software engineering": ["software engineering", "software testing", "agile", "devops", "microservices", "design pattern", "software architecture", "code quality", "refactoring"],
    "data science": ["data science", "data analysis", "analytics", "big data", "data mining", "statistics", "prediction", "classification", "clustering", "regression"],
    "cybersecurity": ["security", "cybersecurity", "cyber security", "cryptography", "privacy", "authentication", "intrusion detection", "malware", "cyber attack", "vulnerability"],
    "education technology": ["education", "teaching", "e-learning", "curriculum", "pedagogy", "lms", "moodle", "blended learning", "educational technology"],
    "electrical engineering": ["electrical", "power system", "circuit", "antenna", "radar", "satellite", "electromagnetic", "power electronics", "motor control"],
    "energy efficiency": ["energy efficiency", "power consumption", "green computing", "leach", "energy harvesting", "low-power", "renewable energy", "smart grid"],
    "biomedical": ["biomedical", "medical imaging", "eeg", "ecg", "clinical", "brain", "health", "disease detection", "drug"],
}


def _assign_pub_topics(pub: Publication) -> list[str]:
    """Assign topic labels to a single publication based on title + venue."""
    text = (pub.title + " " + pub.venue).lower()
    matched = []
    for area, keywords in _TOPIC_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            matched.append(area)
    return matched if matched else ["other"]


def _shannon_entropy(counts: list[int], total: int) -> float:
    """Compute normalized Shannon entropy (0 = monothematic, 1 = fully diverse)."""
    if total == 0 or len(counts) <= 1:
        return 0.0
    entropy = 0.0
    for c in counts:
        if c > 0:
            p = c / total
            entropy -= p * math.log2(p)
    max_entropy = math.log2(len(counts))
    return round(entropy / max_entropy, 3) if max_entropy > 0 else 0.0


def analyze_topic_variability(publications: list[Publication]) -> TopicVariabilityResult:
    """Per-publication topic tagging with Shannon diversity score."""
    if not publications:
        return TopicVariabilityResult()

    topic_counts: dict[str, int] = {}
    for pub in publications:
        topics = _assign_pub_topics(pub)
        for t in topics:
            topic_counts[t] = topic_counts.get(t, 0) + 1

    total_assignments = sum(topic_counts.values())
    sorted_topics = sorted(topic_counts.items(), key=lambda x: x[1], reverse=True)

    topic_breakdown = [
        {"area": area, "count": count, "percentage": round(count / total_assignments * 100, 1)}
        for area, count in sorted_topics
    ]

    dominant_area = sorted_topics[0][0] if sorted_topics else ""
    dominant_pct = sorted_topics[0][1] / total_assignments if sorted_topics else 0

    diversity_score = _shannon_entropy(
        [c for _, c in sorted_topics], total_assignments
    )

    return TopicVariabilityResult(
        topic_breakdown=topic_breakdown,
        dominant_area=dominant_area,
        diversity_score=diversity_score,
        is_specialist=dominant_pct >= 0.70,
    )


# ─── Co-author analysis (Module 3.7) ─────────────────────────────────────────

def analyze_co_authors(
    publications: list[Publication], candidate_name: str
) -> CoAuthorStats:
    """Analyse co-authorship patterns across all publications."""
    if not publications:
        return CoAuthorStats()

    norm_candidate = _normalize_name(candidate_name)
    co_author_freq: dict[str, int] = {}
    team_sizes: list[int] = []
    single_author_count = 0

    for pub in publications:
        authors = pub.authors
        team_sizes.append(len(authors))

        if len(authors) <= 1:
            single_author_count += 1
            continue

        for author in authors:
            norm_author = _normalize_name(author)
            # Skip if this looks like the candidate themselves
            if fuzz.token_set_ratio(norm_author, norm_candidate) >= 75:
                continue
            co_author_freq[norm_author] = co_author_freq.get(norm_author, 0) + 1

    total_co_appearances = sum(co_author_freq.values())
    unique_co_authors = len(co_author_freq)

    top_collaborators = sorted(
        co_author_freq.items(), key=lambda x: x[1], reverse=True
    )[:10]

    avg_team = round(sum(team_sizes) / len(team_sizes), 1) if team_sizes else 0.0
    diversity = (
        round(unique_co_authors / total_co_appearances, 3)
        if total_co_appearances > 0
        else 0.0
    )

    return CoAuthorStats(
        unique_co_authors=unique_co_authors,
        most_frequent_collaborators=[
            {"name": name, "count": count} for name, count in top_collaborators
        ],
        avg_team_size=avg_team,
        single_author_papers=single_author_count,
        collaboration_diversity_score=diversity,
    )


# ─── Research score computation ───────────────────────────────────────────────

def _compute_research_score(profile: FullResearchProfile) -> float:
    """Compute a quality-weighted composite research score (0-100)."""
    score = 0.0

    # Publication volume — up to 20 pts
    score += min(profile.total_publications * 2.0, 20.0)

    # Journal quality — up to 30 pts
    score += min(profile.high_quality_journal_count * 8.0, 30.0)  # Q1/Q2

    # Conference quality — up to 20 pts
    score += min(profile.top_conference_count * 7.0, 20.0)  # CORE A*/A

    # First / sole authorship — up to 20 pts
    if profile.total_publications > 0:
        first_ratio = (profile.first_author_count) / profile.total_publications
        score += first_ratio * 20.0

    # Topic diversity — up to 5 pts
    if profile.topic_variability:
        score += profile.topic_variability.diversity_score * 5.0

    # Collaboration breadth — up to 5 pts
    if profile.co_author_analysis and profile.co_author_analysis.unique_co_authors > 0:
        score += min(profile.co_author_analysis.collaboration_diversity_score * 5.0, 5.0)

    return round(max(0.0, min(100.0, score)), 1)


# ─── Quality label helper ─────────────────────────────────────────────────────

def _quality_label(
    pub: Publication,
    jq: Optional[JournalQualityInfo],
    cq: Optional[ConferenceQualityInfo],
) -> str:
    if pub.pub_type == "journal":
        if jq is None:
            return "Unknown"
        if jq.quartile in ("Q1", "Q2"):
            return "High"
        if jq.quartile in ("Q3", "Q4"):
            return "Medium"
        if jq.scopus_indexed:
            return "Medium"
        return "Unknown"
    elif pub.pub_type == "conference":
        if cq is None:
            return "Unknown"
        if cq.core_rank in ("A*", "A"):
            return "High"
        if cq.core_rank in ("B", "C"):
            return "Medium"
        if cq.is_indexed:
            return "Medium"
        return "Unknown"
    return "Unknown"


# ─── Main orchestration function ─────────────────────────────────────────────

async def analyze_full_research_profile(
    doc: CandidateDocument,
) -> FullResearchProfile:
    """
    Build the complete FullResearchProfile for a candidate.
    Includes per-publication quality, topic variability, co-author analysis, and score.
    """
    pubs = doc.publications
    candidate_name = doc.personal_info.name or ""

    if not pubs:
        return FullResearchProfile(
            overall_assessment="No publications found in the candidate's profile."
        )

    journal_count = sum(1 for p in pubs if p.pub_type == "journal")
    conference_count = sum(1 for p in pubs if p.pub_type == "conference")
    book_chapter_count = sum(1 for p in pubs if p.pub_type == "book_chapter")

    years = [p.year for p in pubs if p.year]
    years_range = f"{min(years)}-{max(years)}" if years else "Unknown"

    # ── Publication trend ─────────────────────────────────────────────────────
    if len(years) >= 3:
        sorted_years = sorted(years)
        mid = len(sorted_years) // 2
        first_half = mid
        second_half = len(sorted_years) - mid
        if second_half > first_half * 1.3:
            pub_trend = "increasing"
        elif second_half < first_half * 0.7:
            pub_trend = "decreasing"
        else:
            pub_trend = "stable"
    else:
        pub_trend = "insufficient_data"

    # ── Per-publication quality enrichment ───────────────────────────────────
    pub_quality_items: list[PublicationQualityItem] = []
    high_quality_journals = 0
    top_conferences = 0
    first_author_count = 0
    scopus_count = 0

    for i, pub in enumerate(pubs):
        role, pos = detect_authorship_role(candidate_name, pub.authors)
        total_authors = len(pub.authors)

        jq: Optional[JournalQualityInfo] = None
        cq: Optional[ConferenceQualityInfo] = None

        if pub.pub_type == "journal":
            jq = await check_journal_quality(pub.venue, pub.issn)
            if jq.quartile in ("Q1", "Q2"):
                high_quality_journals += 1
            if jq.scopus_indexed:
                scopus_count += 1

        elif pub.pub_type == "conference":
            cq = check_conference_quality(pub.venue)
            if cq.core_rank in ("A*", "A"):
                top_conferences += 1
            if cq.is_indexed:
                scopus_count += 1

        if role in ("first_author", "sole_author", "first_and_corresponding"):
            first_author_count += 1

        label = _quality_label(pub, jq, cq)

        pub_quality_items.append(
            PublicationQualityItem(
                pub_index=i,
                authorship_role=role,
                author_position=pos,
                total_authors=total_authors,
                quality_label=label,
                journal_quality=jq,
                conference_quality=cq,
            )
        )

    # ── Book quality ──────────────────────────────────────────────────────────
    book_quality_items: list[BookQualityInfo] = [
        assess_book_publisher(book.publisher) for book in doc.books
    ]

    # ── Topic variability ─────────────────────────────────────────────────────
    topic_result = analyze_topic_variability(pubs)

    # ── Co-author analysis ────────────────────────────────────────────────────
    co_author_result = analyze_co_authors(pubs, candidate_name)

    # ── Research areas (keyword-based, same as M2) ────────────────────────────
    primary_areas = [
        item["area"]
        for item in topic_result.topic_breakdown[:5]
        if item["area"] != "other"
    ]
    if not primary_areas:
        primary_areas = ["General"]

    # ── Overall assessment text ───────────────────────────────────────────────
    assessment_parts = [f"Total publications: {len(pubs)}."]
    if journal_count:
        assessment_parts.append(
            f"Journal papers: {journal_count} ({high_quality_journals} Q1/Q2)."
        )
    if conference_count:
        assessment_parts.append(
            f"Conference papers: {conference_count} ({top_conferences} CORE A*/A)."
        )
    if book_chapter_count:
        assessment_parts.append(f"Book chapters: {book_chapter_count}.")
    assessment_parts.append(f"Publication period: {years_range}.")
    if primary_areas:
        assessment_parts.append(
            f"Primary research areas: {', '.join(primary_areas)}."
        )
    assessment_parts.append(f"Publication trend: {pub_trend}.")
    if first_author_count:
        assessment_parts.append(
            f"First/sole author on {first_author_count} of {len(pubs)} papers."
        )

    profile = FullResearchProfile(
        total_publications=len(pubs),
        journal_count=journal_count,
        conference_count=conference_count,
        book_chapter_count=book_chapter_count,
        publication_years_range=years_range,
        primary_research_areas=primary_areas,
        publication_trend=pub_trend,
        overall_assessment=" ".join(assessment_parts),
        publication_quality=pub_quality_items,
        book_quality=book_quality_items,
        high_quality_journal_count=high_quality_journals,
        top_conference_count=top_conferences,
        first_author_count=first_author_count,
        scopus_indexed_count=scopus_count,
        topic_variability=topic_result,
        co_author_analysis=co_author_result,
    )

    profile.research_score = _compute_research_score(profile)
    return profile
