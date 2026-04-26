"""
Experience Analyzer — Module 3.8 Professional Experience and Employment History

Evaluates:
  - Timeline consistency (education vs employment, job overlaps)
  - Professional gaps detection
  - Gap justification
  - Career continuity and progression
  - Overall professional assessment
"""

import json
import logging
import re
from datetime import datetime
from typing import Optional

from app.models.candidate import (
    CandidateDocument,
    EducationRecord,
    ExperienceAnalysis,
    ExperienceGap,
    ExperienceRecord,
    TimelineOverlap,
)
from app.services.llm_client import extract_with_llm_custom, is_llm_available

logger = logging.getLogger(__name__)

# ─── Date parsing utilities ───────────────────────────────────────────────────

_MONTH_MAP = {
    "jan": 1, "feb": 2, "mar": 3, "apr": 4, "may": 5, "jun": 6,
    "jul": 7, "aug": 8, "sep": 9, "oct": 10, "nov": 11, "dec": 12,
    "january": 1, "february": 2, "march": 3, "april": 4,
    "june": 6, "july": 7, "august": 8, "september": 9,
    "october": 10, "november": 11, "december": 12,
}


def _parse_date(date_str: str) -> Optional[tuple[int, int]]:
    """Parse a date string to (year, month). Returns None if unparseable."""
    if not date_str:
        return None

    date_str = date_str.strip().lower()

    if date_str in ("present", "current", "ongoing", "till date", "to date"):
        return (2026, 4)  # Current date

    # Try "Month-Year" or "Month Year" patterns
    for month_name, month_num in _MONTH_MAP.items():
        if month_name in date_str:
            year_match = re.search(r"(19|20)\d{2}", date_str)
            if year_match:
                return (int(year_match.group()), month_num)

    # Try just a year
    year_match = re.search(r"(19|20)\d{2}", date_str)
    if year_match:
        return (int(year_match.group()), 1)

    return None


def _date_to_months(d: tuple[int, int]) -> int:
    """Convert (year, month) to absolute months for comparison."""
    return d[0] * 12 + d[1]


def _months_between(start: tuple[int, int], end: tuple[int, int]) -> int:
    return _date_to_months(end) - _date_to_months(start)


# ─── Timeline overlap detection ──────────────────────────────────────────────

def _detect_overlaps(
    education: list[EducationRecord],
    experience: list[ExperienceRecord],
) -> list[TimelineOverlap]:
    """Detect overlaps between education-employment and job-job."""
    overlaps: list[TimelineOverlap] = []

    # Build edu timeline
    edu_timeline = []
    for edu in education:
        if edu.start_year and edu.end_year:
            edu_timeline.append({
                "label": f"{edu.degree} at {edu.institution}",
                "start": (edu.start_year, 1),
                "end": (edu.end_year, 12),
            })

    # Build exp timeline
    exp_timeline = []
    for exp in experience:
        start = _parse_date(exp.start_date)
        end = _parse_date(exp.end_date)
        if start:
            exp_timeline.append({
                "label": f"{exp.title} at {exp.organization}",
                "start": start,
                "end": end or (2026, 4),
            })

    # Education-Employment overlaps
    for edu in edu_timeline:
        for exp in exp_timeline:
            edu_start_m = _date_to_months(edu["start"])
            edu_end_m = _date_to_months(edu["end"])
            exp_start_m = _date_to_months(exp["start"])
            exp_end_m = _date_to_months(exp["end"])

            if edu_start_m < exp_end_m and exp_start_m < edu_end_m:
                overlap_start = max(edu_start_m, exp_start_m)
                overlap_end = min(edu_end_m, exp_end_m)
                overlap_months = overlap_end - overlap_start
                if overlap_months > 3:  # Significant overlap > 3 months
                    overlaps.append(TimelineOverlap(
                        type="education-employment",
                        item_a=edu["label"],
                        item_b=exp["label"],
                        overlap_period=f"~{overlap_months} months overlap",
                        assessment="legitimate" if "part-time" in exp.get("label", "").lower()
                        or "research" in exp.get("label", "").lower()
                        or "assistant" in exp.get("label", "").lower()
                        else "needs_clarification",
                    ))

    # Job-Job overlaps
    for i in range(len(exp_timeline)):
        for j in range(i + 1, len(exp_timeline)):
            a = exp_timeline[i]
            b = exp_timeline[j]
            a_start = _date_to_months(a["start"])
            a_end = _date_to_months(a["end"])
            b_start = _date_to_months(b["start"])
            b_end = _date_to_months(b["end"])

            if a_start < b_end and b_start < a_end:
                overlap_start = max(a_start, b_start)
                overlap_end = min(a_end, b_end)
                overlap_months = overlap_end - overlap_start
                if overlap_months > 1:
                    overlaps.append(TimelineOverlap(
                        type="job-job",
                        item_a=a["label"],
                        item_b=b["label"],
                        overlap_period=f"~{overlap_months} months overlap",
                        assessment="needs_clarification",
                    ))

    return overlaps


# ─── Experience gap detection ─────────────────────────────────────────────────

def _detect_experience_gaps(
    experience: list[ExperienceRecord],
    education: list[EducationRecord],
    publications: list | None = None,
) -> list[ExperienceGap]:
    """Identify gaps between consecutive employment periods."""
    parsed = []
    for exp in experience:
        start = _parse_date(exp.start_date)
        end = _parse_date(exp.end_date)
        if start and end:
            parsed.append({
                "label": f"{exp.title} at {exp.organization}",
                "start": start,
                "end": end,
            })

    if len(parsed) < 2:
        return []

    parsed.sort(key=lambda x: _date_to_months(x["start"]))

    gaps: list[ExperienceGap] = []
    for i in range(len(parsed) - 1):
        curr_end = _date_to_months(parsed[i]["end"])
        next_start = _date_to_months(parsed[i + 1]["start"])
        gap_months = next_start - curr_end

        if gap_months > 3:  # More than 3 months gap is flagged
            justified, justification = _check_exp_gap_justification(
                parsed[i]["end"], parsed[i + 1]["start"], education, publications
            )
            gaps.append(ExperienceGap(
                from_role=parsed[i]["label"],
                to_role=parsed[i + 1]["label"],
                from_date=f"{parsed[i]['end'][0]}-{parsed[i]['end'][1]:02d}",
                to_date=f"{parsed[i + 1]['start'][0]}-{parsed[i + 1]['start'][1]:02d}",
                gap_months=gap_months,
                justified=justified,
                justification=justification,
            ))

    return gaps


def _check_exp_gap_justification(
    gap_start: tuple[int, int],
    gap_end: tuple[int, int],
    education: list[EducationRecord],
    publications: list | None = None,
) -> tuple[bool, str]:
    """Check if a professional gap is justified by education enrollment or publications."""
    gap_start_m = _date_to_months(gap_start)
    gap_end_m = _date_to_months(gap_end)
    gap_start_year = gap_start[0]
    gap_end_year = gap_end[0]
    justifications = []

    # Estimated enrollment duration per degree level (in months, used when start_year is missing)
    _DEGREE_DURATION = {"PhD": 48, "PG": 24, "UG": 48, "HSSC": 12, "SSE": 12}

    for edu in education:
        if not edu.end_year:
            continue
        edu_end = edu.end_year * 12 + 12
        if edu.start_year:
            edu_start = edu.start_year * 12 + 1
        else:
            # start_year unknown — estimate backwards from end_year by degree duration
            est_duration = _DEGREE_DURATION.get(edu.level, 36)
            edu_start = edu_end - est_duration

        if edu_start <= gap_end_m and edu_end >= gap_start_m:
            year_range = (
                f"{edu.start_year}–{edu.end_year}"
                if edu.start_year
                else f"completed {edu.end_year}"
            )
            justifications.append(
                f"Pursuing {edu.degree} at {edu.institution} ({year_range})"
            )

    # Check publications during the gap period
    if publications:
        pub_years_in_gap = sorted(
            {p.year for p in publications if p.year and gap_start_year <= p.year <= gap_end_year}
        )
        if pub_years_in_gap:
            justifications.append(
                f"Published research during this period ({', '.join(str(y) for y in pub_years_in_gap)})"
            )

    if justifications:
        return True, "Justified by: " + "; ".join(justifications)
    return False, "No educational or professional activity found during this gap."


# ─── Career progression analysis ─────────────────────────────────────────────

_SENIORITY_KEYWORDS = {
    1: ["intern", "trainee", "student", "assistant", "junior"],
    2: ["lecturer", "analyst", "developer", "engineer", "researcher", "officer", "coordinator"],
    3: ["senior", "lead", "specialist", "assistant professor", "consultant"],
    4: ["manager", "associate professor", "principal", "head"],
    5: ["director", "professor", "vp", "vice president", "chief", "dean", "chair"],
}


def _estimate_seniority(title: str) -> int:
    title_lower = title.lower()
    for level in sorted(_SENIORITY_KEYWORDS.keys(), reverse=True):
        for kw in _SENIORITY_KEYWORDS[level]:
            if kw in title_lower:
                return level
    return 2  # Default mid-level


def _analyze_career_trajectory(experience: list[ExperienceRecord]) -> str:
    """Determine if career shows ascending, lateral, or descending trajectory."""
    parsed = []
    for exp in experience:
        start = _parse_date(exp.start_date)
        if start:
            parsed.append({
                "seniority": _estimate_seniority(exp.title),
                "start": _date_to_months(start),
            })

    if len(parsed) < 2:
        return "insufficient_data"

    parsed.sort(key=lambda x: x["start"])
    seniorities = [p["seniority"] for p in parsed]

    increases = sum(1 for i in range(1, len(seniorities)) if seniorities[i] > seniorities[i - 1])
    decreases = sum(1 for i in range(1, len(seniorities)) if seniorities[i] < seniorities[i - 1])

    if increases > decreases:
        return "ascending"
    if decreases > increases:
        return "descending"
    if increases == decreases and increases > 0:
        return "mixed"
    return "lateral"


# ─── Total experience calculation ────────────────────────────────────────────

def _calculate_total_experience(experience: list[ExperienceRecord]) -> Optional[float]:
    """Calculate total years of experience, accounting for overlaps."""
    intervals = []
    for exp in experience:
        start = _parse_date(exp.start_date)
        end = _parse_date(exp.end_date)
        if start and end:
            intervals.append((_date_to_months(start), _date_to_months(end)))

    if not intervals:
        return None

    # Merge overlapping intervals
    intervals.sort()
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], end))
        else:
            merged.append((start, end))

    total_months = sum(end - start for start, end in merged)
    return round(total_months / 12.0, 1)


# ─── Rule-based experience analysis ──────────────────────────────────────────

def analyze_experience_rule_based(doc: CandidateDocument) -> ExperienceAnalysis:
    """Perform experience analysis without LLM."""
    experience = doc.experience
    education = doc.education

    total_years = _calculate_total_experience(experience)
    trajectory = _analyze_career_trajectory(experience)

    # Current role
    current_role = ""
    for exp in experience:
        if exp.end_date.lower() in ("present", "current", "ongoing", "till date", "to date", ""):
            current_role = f"{exp.title} at {exp.organization}"
            break
    if not current_role and experience:
        current_role = f"{experience[0].title} at {experience[0].organization}"

    # Gaps
    gaps = _detect_experience_gaps(experience, education, doc.publications)

    # Overlaps
    overlaps = _detect_overlaps(education, experience)

    # Career progression detail
    career_progression = []
    for exp in experience:
        career_progression.append({
            "title": exp.title,
            "organization": exp.organization,
            "period": f"{exp.start_date} - {exp.end_date}",
            "employment_type": exp.employment_type,
            "seniority_level": _estimate_seniority(exp.title),
        })

    # Consistency
    if len(experience) < 2:
        consistency = "insufficient_data"
    else:
        types = set(exp.employment_type.lower() for exp in experience if exp.employment_type)
        if len(types) <= 1:
            consistency = "consistent"
        elif len(types) <= 2:
            consistency = "varied"
        else:
            consistency = "inconsistent"

    # Overall assessment
    parts = []
    if total_years:
        parts.append(f"Total professional experience: ~{total_years} years.")
    parts.append(f"Career trajectory: {trajectory}.")
    if current_role:
        parts.append(f"Current/most recent role: {current_role}.")
    if gaps:
        unjustified = [g for g in gaps if not g.justified]
        parts.append(f"{len(gaps)} gap(s) detected, {len(unjustified)} unjustified.")
    if overlaps:
        parts.append(f"{len(overlaps)} timeline overlap(s) detected.")

    # Score
    experience_score = _compute_experience_score(experience, gaps, overlaps, trajectory, total_years)

    return ExperienceAnalysis(
        total_experience_years=total_years,
        career_trajectory=trajectory,
        current_role=current_role,
        experience_gaps=gaps,
        timeline_overlaps=overlaps,
        career_progression=career_progression,
        experience_consistency=consistency,
        overall_assessment=" ".join(parts),
        experience_score=experience_score,
    )


def _compute_experience_score(
    experience: list[ExperienceRecord],
    gaps: list[ExperienceGap],
    overlaps: list[TimelineOverlap],
    trajectory: str,
    total_years: Optional[float],
) -> float:
    """Compute professional experience score (0-100)."""
    score = 0.0

    # Experience years (up to 30 points)
    if total_years:
        if total_years >= 15:
            score += 30
        elif total_years >= 10:
            score += 25
        elif total_years >= 5:
            score += 20
        elif total_years >= 2:
            score += 12
        else:
            score += 5

    # Career trajectory (up to 20 points)
    trajectory_bonus = {"ascending": 20, "lateral": 12, "mixed": 10, "descending": 5}
    score += trajectory_bonus.get(trajectory, 10)

    # Number of roles (up to 15 points)
    n_roles = len(experience)
    if n_roles >= 5:
        score += 15
    elif n_roles >= 3:
        score += 12
    elif n_roles >= 2:
        score += 8
    elif n_roles >= 1:
        score += 5

    # Seniority bonus (up to 15 points)
    if experience:
        max_seniority = max(_estimate_seniority(exp.title) for exp in experience)
        score += min(max_seniority * 3, 15)

    # Gap penalty (up to -15 points)
    unjustified = sum(1 for g in gaps if not g.justified)
    score -= min(unjustified * 5, 15)

    # Overlap penalty (up to -10 points)
    suspicious = sum(1 for o in overlaps if o.assessment == "needs_clarification")
    score -= min(suspicious * 3, 10)

    # Base points for having any experience (5 points)
    if experience:
        score += 5

    return round(max(0, min(100, score)), 1)


# ─── LLM-enhanced experience analysis ────────────────────────────────────────

_EXP_ANALYSIS_PROMPT = """Analyze this candidate's professional experience and employment history for a university recruitment assessment.

EDUCATION DATA:
{education_json}

EXPERIENCE DATA:
{experience_json}

Provide analysis as JSON:
{{
  "career_trajectory": "ascending|lateral|mixed|descending",
  "experience_consistency": "consistent|varied|inconsistent",
  "overall_assessment": "A comprehensive 3-5 sentence assessment of the candidate's professional profile, career progression, timeline consistency, and suitability for academic roles.",
  "experience_score": 0-100
}}

Consider:
1. Career progression (promotions, increasing responsibility)
2. Timeline consistency (gaps, overlaps between jobs/education)
3. Relevance to academic/research positions
4. Professional maturity and continuity
5. Employment types and their appropriateness

Return ONLY valid JSON."""


async def analyze_experience_with_llm(doc: CandidateDocument) -> ExperienceAnalysis:
    """Use LLM for richer experience analysis, merged with rule-based metrics."""
    analysis = analyze_experience_rule_based(doc)

    try:
        edu_json = json.dumps(
            [e.model_dump() for e in doc.education], indent=2, default=str
        )
        exp_json = json.dumps(
            [e.model_dump() for e in doc.experience], indent=2, default=str
        )

        prompt = _EXP_ANALYSIS_PROMPT.format(
            education_json=edu_json, experience_json=exp_json
        )

        result = await extract_with_llm_custom(
            "You are an expert HR professional evaluating candidate employment history for academic recruitment.",
            prompt,
        )

        if isinstance(result, dict):
            if result.get("overall_assessment"):
                analysis.overall_assessment = result["overall_assessment"]
            if result.get("career_trajectory"):
                analysis.career_trajectory = result["career_trajectory"]
            if result.get("experience_consistency"):
                analysis.experience_consistency = result["experience_consistency"]
            if result.get("experience_score") is not None:
                llm_score = float(result["experience_score"])
                if analysis.experience_score is not None:
                    analysis.experience_score = round(
                        (analysis.experience_score + llm_score) / 2, 1
                    )
                else:
                    analysis.experience_score = llm_score
    except Exception as e:
        logger.warning(f"LLM experience analysis failed, using rule-based only: {e}")

    return analysis


# ─── Main entry point ─────────────────────────────────────────────────────────

async def analyze_experience(doc: CandidateDocument) -> ExperienceAnalysis:
    """Analyze candidate's professional experience. Uses LLM if available."""
    if not doc.experience:
        return ExperienceAnalysis(overall_assessment="No experience records available for analysis.")

    llm_ok = await is_llm_available()
    if llm_ok:
        return await analyze_experience_with_llm(doc)
    return analyze_experience_rule_based(doc)
