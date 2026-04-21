"""
Education Analyzer — Module 3.1 Educational Profile Analysis

Evaluates:
  - SSE/HSSC and UG/PG performance extraction & normalization
  - Degree & institution extraction
  - Educational progression and consistency
  - Educational gap detection
  - Gap justification via professional experience
  - Overall educational strength interpretation
"""

import json
import logging
from typing import Optional

from app.models.candidate import (
    CandidateDocument,
    EducationAnalysis,
    EducationGap,
    EducationRecord,
    ExperienceRecord,
)
from app.services.llm_client import extract_with_llm_custom, is_llm_available

logger = logging.getLogger(__name__)

# ─── Education level ordering for progression analysis ────────────────────────

LEVEL_ORDER = {"SSE": 1, "HSSC": 2, "UG": 3, "PG": 4, "PhD": 5, "Other": 0}


def _level_rank(level: str) -> int:
    return LEVEL_ORDER.get(level, 0)


# ─── Gap detection ────────────────────────────────────────────────────────────

def _detect_education_gaps(
    education: list[EducationRecord],
    experience: list[ExperienceRecord],
) -> list[EducationGap]:
    """Identify gaps between consecutive education stages."""
    if len(education) < 2:
        return []

    sorted_edu = sorted(
        [e for e in education if e.end_year],
        key=lambda e: e.end_year or 0,
    )

    gaps: list[EducationGap] = []
    for i in range(len(sorted_edu) - 1):
        curr = sorted_edu[i]
        nxt = sorted_edu[i + 1]

        if not curr.end_year or not nxt.start_year:
            continue

        gap_years = nxt.start_year - curr.end_year
        if gap_years > 1:  # More than 1 year gap is flagged
            justified, justification = _check_gap_justification(
                curr.end_year, nxt.start_year, experience
            )
            gaps.append(
                EducationGap(
                    from_level=curr.level or curr.degree,
                    to_level=nxt.level or nxt.degree,
                    from_year=curr.end_year,
                    to_year=nxt.start_year,
                    gap_years=gap_years,
                    justified=justified,
                    justification=justification,
                )
            )

    return gaps


def _check_gap_justification(
    gap_start_year: int,
    gap_end_year: int,
    experience: list[ExperienceRecord],
) -> tuple[bool, str]:
    """Check if an educational gap is justified by professional experience."""
    justifications = []

    for exp in experience:
        exp_start = _parse_year(exp.start_date)
        exp_end = _parse_year(exp.end_date) if exp.end_date.lower() != "present" else 2026

        if exp_start is None:
            continue

        # Check if experience overlaps with the education gap
        if exp_start <= gap_end_year and (exp_end or 2026) >= gap_start_year:
            justifications.append(
                f"{exp.title} at {exp.organization} ({exp.start_date} - {exp.end_date})"
            )

    if justifications:
        return True, "Justified by: " + "; ".join(justifications)
    return False, "No professional activity found during this gap period."


def _parse_year(date_str: str) -> Optional[int]:
    """Extract a year from various date formats."""
    if not date_str:
        return None
    import re
    match = re.search(r"(19|20)\d{2}", date_str)
    return int(match.group(0)) if match else None


# ─── Performance trend analysis ──────────────────────────────────────────────

def _analyze_performance_trend(education: list[EducationRecord]) -> str:
    """Analyze whether academic performance is improving, declining, or stable."""
    scored = [
        (e.level, e.normalized_score)
        for e in education
        if e.normalized_score is not None
    ]
    if len(scored) < 2:
        return "insufficient_data"

    scored.sort(key=lambda x: _level_rank(x[0]))
    scores = [s[1] for s in scored]

    improvements = sum(1 for i in range(1, len(scores)) if scores[i] > scores[i - 1])
    declines = sum(1 for i in range(1, len(scores)) if scores[i] < scores[i - 1])

    if improvements > declines:
        return "improving"
    if declines > improvements:
        return "declining"
    return "stable"


# ─── Specialization consistency ──────────────────────────────────────────────

def _check_specialization_consistency(education: list[EducationRecord]) -> str:
    """Check if specializations across degrees are consistent."""
    specs = [
        e.specialization.lower().strip()
        for e in education
        if e.specialization and e.level in ("UG", "PG", "PhD")
    ]
    if len(specs) < 2:
        return "insufficient_data"

    # Simple word overlap heuristic
    from itertools import combinations
    overlaps = 0
    total = 0
    for a, b in combinations(specs, 2):
        words_a = set(a.split())
        words_b = set(b.split())
        if words_a & words_b:
            overlaps += 1
        total += 1

    if total == 0:
        return "insufficient_data"

    ratio = overlaps / total
    if ratio >= 0.7:
        return "consistent"
    if ratio >= 0.3:
        return "varied"
    return "unrelated"


# ─── Rule-based education analysis ───────────────────────────────────────────

def analyze_education_rule_based(doc: CandidateDocument) -> EducationAnalysis:
    """Perform education analysis without LLM, using structured data."""
    education = doc.education
    experience = doc.experience

    # Academic performance summary
    academic_performance = []
    for edu in education:
        academic_performance.append({
            "level": edu.level,
            "degree": edu.degree,
            "institution": edu.institution,
            "specialization": edu.specialization,
            "marks_or_cgpa": edu.marks_or_cgpa,
            "normalized_score": edu.normalized_score,
            "years": f"{edu.start_year or '?'} - {edu.end_year or '?'}",
        })

    # Highest qualification
    highest = "Unknown"
    for level in ["PhD", "PG", "UG", "HSSC", "SSE"]:
        if any(e.level == level for e in education):
            highest = level
            break

    # Performance trend
    trend = _analyze_performance_trend(education)

    # Specialization consistency
    spec_consistency = _check_specialization_consistency(education)

    # Institution quality (basic — just extract names)
    institution_quality = []
    for edu in education:
        if edu.institution:
            institution_quality.append({
                "institution": edu.institution,
                "degree": edu.degree,
                "level": edu.level,
                "ranking_info": "Ranking data not yet available",
            })

    # Education gaps
    gaps = _detect_education_gaps(education, experience)
    gap_justifications = [g.justification for g in gaps]

    # Overall assessment
    avg_score = None
    scored = [e.normalized_score for e in education if e.normalized_score]
    if scored:
        avg_score = round(sum(scored) / len(scored), 1)

    assessment_parts = []
    assessment_parts.append(f"Highest qualification: {highest}.")
    if avg_score:
        assessment_parts.append(f"Average academic score: {avg_score}%.")
    assessment_parts.append(f"Performance trend: {trend}.")
    assessment_parts.append(f"Specialization consistency: {spec_consistency}.")
    if gaps:
        unjustified = [g for g in gaps if not g.justified]
        assessment_parts.append(
            f"{len(gaps)} educational gap(s) detected, {len(unjustified)} unjustified."
        )
    else:
        assessment_parts.append("No significant educational gaps detected.")

    # Compute education score (0-100)
    education_score = _compute_education_score(education, gaps, trend)

    return EducationAnalysis(
        academic_performance=academic_performance,
        performance_trend=trend,
        highest_qualification=highest,
        specialization_consistency=spec_consistency,
        institution_quality=institution_quality,
        education_gaps=gaps,
        gap_justifications=gap_justifications,
        overall_assessment=" ".join(assessment_parts),
        education_score=education_score,
    )


def _compute_education_score(
    education: list[EducationRecord],
    gaps: list[EducationGap],
    trend: str,
) -> float:
    """Compute a composite education score (0-100)."""
    score = 0.0

    # Base: average normalized score (up to 40 points)
    scored = [e.normalized_score for e in education if e.normalized_score]
    if scored:
        avg = sum(scored) / len(scored)
        score += min(avg * 0.4, 40.0)

    # Highest qualification bonus (up to 25 points)
    level_bonus = {"PhD": 25, "PG": 20, "UG": 15, "HSSC": 8, "SSE": 4}
    for level in ["PhD", "PG", "UG", "HSSC", "SSE"]:
        if any(e.level == level for e in education):
            score += level_bonus.get(level, 0)
            break

    # Trend bonus (up to 10 points)
    trend_bonus = {"improving": 10, "stable": 7, "declining": 3, "mixed": 5}
    score += trend_bonus.get(trend, 5)

    # Gap penalty (up to -15 points)
    unjustified_gaps = sum(1 for g in gaps if not g.justified)
    score -= min(unjustified_gaps * 5, 15)

    # Education record completeness (up to 10 points)
    if len(education) >= 4:
        score += 10
    elif len(education) >= 3:
        score += 7
    elif len(education) >= 2:
        score += 5
    elif len(education) >= 1:
        score += 3

    return round(max(0, min(100, score)), 1)


# ─── LLM-enhanced education analysis ─────────────────────────────────────────

_EDU_ANALYSIS_PROMPT = """Analyze this candidate's educational profile and provide a detailed assessment.

CANDIDATE EDUCATION DATA:
{education_json}

CANDIDATE EXPERIENCE DATA (for gap justification):
{experience_json}

Provide your analysis as a JSON object:
{{
  "performance_trend": "improving|declining|stable|mixed",
  "specialization_consistency": "consistent|varied|unrelated",
  "overall_assessment": "A comprehensive 3-5 sentence assessment of the candidate's educational profile, including academic strength, progression, institutional quality, and any concerns.",
  "institution_quality_notes": [
    {{"institution": "...", "notes": "Any known ranking or reputation info"}}
  ],
  "education_score": 0-100
}}

Consider:
1. Academic performance at each level (SSE, HSSC, UG, PG, PhD)
2. Whether scores improve or decline across levels
3. Consistency of specialization across degrees
4. Quality/reputation of institutions
5. Completeness of educational profile
6. Any educational gaps (years between degrees)
7. Whether the candidate's education path is standard or non-standard

Return ONLY valid JSON."""


async def analyze_education_with_llm(doc: CandidateDocument) -> EducationAnalysis:
    """Use LLM to provide richer educational analysis, combined with rule-based metrics."""
    # Start with rule-based analysis as the foundation
    analysis = analyze_education_rule_based(doc)

    try:
        edu_json = json.dumps(
            [e.model_dump() for e in doc.education], indent=2, default=str
        )
        exp_json = json.dumps(
            [e.model_dump() for e in doc.experience], indent=2, default=str
        )

        prompt = _EDU_ANALYSIS_PROMPT.format(
            education_json=edu_json, experience_json=exp_json
        )

        result = await extract_with_llm_custom(
            "You are an expert academic profile evaluator for university recruitment.",
            prompt,
        )

        # Merge LLM insights with rule-based analysis
        if isinstance(result, dict):
            if result.get("overall_assessment"):
                analysis.overall_assessment = result["overall_assessment"]
            if result.get("performance_trend"):
                analysis.performance_trend = result["performance_trend"]
            if result.get("specialization_consistency"):
                analysis.specialization_consistency = result["specialization_consistency"]
            if result.get("education_score") is not None:
                # Average LLM score with rule-based score
                llm_score = float(result["education_score"])
                if analysis.education_score is not None:
                    analysis.education_score = round(
                        (analysis.education_score + llm_score) / 2, 1
                    )
                else:
                    analysis.education_score = llm_score
            if result.get("institution_quality_notes"):
                for note in result["institution_quality_notes"]:
                    for iq in analysis.institution_quality:
                        if note.get("institution", "").lower() in iq.get("institution", "").lower():
                            iq["ranking_info"] = note.get("notes", "")
    except Exception as e:
        logger.warning(f"LLM education analysis failed, using rule-based only: {e}")

    return analysis


# ─── Main entry point ─────────────────────────────────────────────────────────

async def analyze_education(doc: CandidateDocument) -> EducationAnalysis:
    """Analyze candidate's educational profile. Uses LLM if available, else rule-based."""
    if not doc.education:
        return EducationAnalysis(overall_assessment="No education records available for analysis.")

    llm_ok = await is_llm_available()
    if llm_ok:
        return await analyze_education_with_llm(doc)
    return analyze_education_rule_based(doc)
