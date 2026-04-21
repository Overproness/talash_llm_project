"""
Candidate Analyzer — Orchestrates all analysis modules.

Handles:
  - Candidate summary generation
  - Partial research profile analysis (M2)
  - Overall score computation
  - Full analysis pipeline coordination
"""

import json
import logging
from typing import Optional

from app.models.candidate import (
    CandidateDocument,
    EducationAnalysis,
    ExperienceAnalysis,
    ResearchProfileSummary,
)
from app.services.education_analyzer import analyze_education
from app.services.experience_analyzer import analyze_experience
from app.services.email_generator import detect_missing_info_detailed
from app.services.llm_client import generate_with_llm_text, is_llm_available

logger = logging.getLogger(__name__)


# ─── Research profile summary (partial for M2) ───────────────────────────────

def analyze_research_profile(doc: CandidateDocument) -> ResearchProfileSummary:
    """Basic research profile analysis — counts, trends, areas."""
    pubs = doc.publications
    if not pubs:
        return ResearchProfileSummary(
            overall_assessment="No publications found in the candidate's profile."
        )

    journal_count = sum(1 for p in pubs if p.pub_type == "journal")
    conference_count = sum(1 for p in pubs if p.pub_type == "conference")
    book_chapter_count = sum(1 for p in pubs if p.pub_type == "book_chapter")

    # Publication years range
    years = [p.year for p in pubs if p.year]
    years_range = f"{min(years)}-{max(years)}" if years else "Unknown"

    # Research areas from venues and titles
    areas = set()
    area_keywords = {
        "machine learning": ["machine learning", "deep learning", "neural network", "ml ", "ai ", "ann", "cnn", "lstm", "rnn", "reinforcement learning", "prediction", "classification"],
        "computer vision": ["vision", "image processing", "visual", "object detection", "segmentation"],
        "natural language processing": ["nlp", "natural language", "language model", "text mining"],
        "wireless communications": ["wireless", "noma", "oma", "5g", "6g", "lte", "ofdm", "ofdma", "mimo", "hetnets", "heterogeneous network", "backhaul", "beamforming", "spectrum", "resource allocation", "small cell", "relay", "d2d", "phy layer", "channel", "fading"],
        "networking & IoT": ["network", "iot", "sensor", "wsn", "routing", "protocol", "bandwidth", "latency", "throughput", "topology"],
        "signal processing": ["signal processing", "dsp", "frequency", "filter", "modulation", "demodulation", "coding", "decoding"],
        "optimization": ["optimization", "convex", "genetic algorithm", "particle swarm", "heuristic", "scheduling", "metaheuristic"],
        "software engineering": ["software", "testing", "agile", "devops", "architecture"],
        "data science": ["data science", "analytics", "big data", "mining", "statistics"],
        "cybersecurity": ["security", "cyber", "cryptograph", "privacy", "authentication"],
        "education technology": ["education", "teaching", "pedagogy", "e-learning", "curriculum"],
        "electrical engineering": ["electrical", "power system", "circuit", "antenna", "radar", "satellite", "electromagnetic"],
        "energy efficiency": ["energy", "power consumption", "green", "leach", "energy-efficient", "low-power"],
    }

    all_text = " ".join(p.title.lower() + " " + p.venue.lower() for p in pubs)
    for area, keywords in area_keywords.items():
        if any(kw in all_text for kw in keywords):
            areas.add(area)

    primary_areas = list(areas)[:5] if areas else ["General"]

    # Publication trend
    if len(years) >= 3:
        sorted_years = sorted(years)
        mid = len(sorted_years) // 2
        first_half_count = mid
        second_half_count = len(sorted_years) - mid
        if second_half_count > first_half_count * 1.3:
            pub_trend = "increasing"
        elif second_half_count < first_half_count * 0.7:
            pub_trend = "decreasing"
        else:
            pub_trend = "stable"
    else:
        pub_trend = "insufficient_data"

    # Assessment
    parts = [f"Total publications: {len(pubs)}."]
    if journal_count:
        parts.append(f"Journal papers: {journal_count}.")
    if conference_count:
        parts.append(f"Conference papers: {conference_count}.")
    if book_chapter_count:
        parts.append(f"Book chapters: {book_chapter_count}.")
    parts.append(f"Publication period: {years_range}.")
    if primary_areas:
        parts.append(f"Primary research areas: {', '.join(primary_areas)}.")
    parts.append(f"Publication trend: {pub_trend}.")

    return ResearchProfileSummary(
        total_publications=len(pubs),
        journal_count=journal_count,
        conference_count=conference_count,
        book_chapter_count=book_chapter_count,
        publication_years_range=years_range,
        primary_research_areas=primary_areas,
        publication_trend=pub_trend,
        overall_assessment=" ".join(parts),
    )


# ─── Candidate summary generation ────────────────────────────────────────────

def _generate_summary_rule_based(
    doc: CandidateDocument,
    edu_analysis: Optional[EducationAnalysis],
    exp_analysis: Optional[ExperienceAnalysis],
    research: Optional[ResearchProfileSummary],
) -> str:
    """Generate a candidate summary without LLM."""
    name = doc.personal_info.name or "The candidate"
    parts = []

    # Education summary
    if edu_analysis and edu_analysis.highest_qualification:
        parts.append(
            f"{name} holds a {edu_analysis.highest_qualification} degree"
            + (f" with {edu_analysis.performance_trend} academic performance." if edu_analysis.performance_trend != "insufficient_data" else ".")
        )

    # Experience summary
    if exp_analysis:
        if exp_analysis.total_experience_years:
            parts.append(
                f"Has approximately {exp_analysis.total_experience_years} years of professional experience"
                + (f" with an {exp_analysis.career_trajectory} career trajectory." if exp_analysis.career_trajectory != "insufficient_data" else ".")
            )
        if exp_analysis.current_role:
            parts.append(f"Currently serving as {exp_analysis.current_role}.")

    # Research summary
    if research and research.total_publications > 0:
        parts.append(
            f"Has {research.total_publications} publications"
            + (f" ({research.journal_count} journal, {research.conference_count} conference)" if research.journal_count or research.conference_count else "")
            + (f" in areas including {', '.join(research.primary_research_areas[:3])}." if research.primary_research_areas else ".")
        )

    # Skills
    if doc.skills:
        parts.append(f"Key skills include {', '.join(doc.skills[:5])}.")

    # Missing info warning
    if doc.missing_fields:
        parts.append(f"Note: {len(doc.missing_fields)} field(s) are missing or incomplete in the CV.")

    return " ".join(parts) if parts else f"Profile for {name} — analysis pending."


_SUMMARY_PROMPT = """Generate a concise candidate assessment summary for university recruitment.

CANDIDATE: {name}

EDUCATION ANALYSIS:
{edu_assessment}

EXPERIENCE ANALYSIS:
{exp_assessment}

RESEARCH PROFILE:
{research_assessment}

SKILLS: {skills}

MISSING INFORMATION: {missing_count} field(s)

Write a 4-6 sentence professional summary that:
1. Highlights the candidate's key strengths
2. Notes any concerns (gaps, missing info, inconsistencies)
3. Assesses overall suitability for an academic position
4. Is factual and evidence-based (no speculation)

Write ONLY the summary paragraph, no headers or formatting."""


async def _generate_summary_with_llm(
    doc: CandidateDocument,
    edu_analysis: Optional[EducationAnalysis],
    exp_analysis: Optional[ExperienceAnalysis],
    research: Optional[ResearchProfileSummary],
) -> str:
    """Generate candidate summary using LLM."""
    try:
        prompt = _SUMMARY_PROMPT.format(
            name=doc.personal_info.name or "Unknown",
            edu_assessment=edu_analysis.overall_assessment if edu_analysis else "Not analyzed",
            exp_assessment=exp_analysis.overall_assessment if exp_analysis else "Not analyzed",
            research_assessment=research.overall_assessment if research else "Not analyzed",
            skills=", ".join(doc.skills[:15]) if doc.skills else "Not listed",
            missing_count=len(doc.missing_fields),
        )

        summary = await generate_with_llm_text(
            "You are a senior academic recruitment evaluator providing concise candidate assessments.",
            prompt,
        )
        return summary
    except Exception as e:
        logger.warning(f"LLM summary generation failed: {e}")
        return _generate_summary_rule_based(doc, edu_analysis, exp_analysis, research)


# ─── Overall score computation ────────────────────────────────────────────────

def compute_overall_score(
    edu_analysis: Optional[EducationAnalysis],
    exp_analysis: Optional[ExperienceAnalysis],
    research: Optional[ResearchProfileSummary],
    doc: CandidateDocument,
) -> float:
    """Compute a weighted overall candidate score (0-100)."""
    score = 0.0
    weights_used = 0.0

    # Education: 30% weight
    if edu_analysis and edu_analysis.education_score is not None:
        score += edu_analysis.education_score * 0.30
        weights_used += 0.30

    # Experience: 25% weight
    if exp_analysis and exp_analysis.experience_score is not None:
        score += exp_analysis.experience_score * 0.25
        weights_used += 0.25

    # Research: 25% weight
    if research and research.total_publications > 0:
        research_score = min(research.total_publications * 5, 50)
        if research.journal_count > 0:
            research_score += min(research.journal_count * 8, 30)
        if research.conference_count > 0:
            research_score += min(research.conference_count * 4, 20)
        research_score = min(research_score, 100)
        score += research_score * 0.25
        weights_used += 0.25

    # Skills: 10% weight
    if doc.skills:
        skills_score = min(len(doc.skills) * 5, 100)
        score += skills_score * 0.10
        weights_used += 0.10

    # Completeness: 10% weight
    missing_penalty = min(len(doc.missing_fields) * 3, 50)
    completeness_score = max(100 - missing_penalty, 0)
    score += completeness_score * 0.10
    weights_used += 0.10

    # Normalize if not all weights were used
    if weights_used > 0:
        score = score / weights_used * 1.0

    return round(max(0, min(100, score)), 1)


# ─── Main analysis pipeline ──────────────────────────────────────────────────

async def run_full_analysis(doc: CandidateDocument) -> dict:
    """
    Run the complete Milestone 2 analysis pipeline on a candidate.
    Returns dict with all analysis results to store in MongoDB.
    """
    logger.info(f"Running full analysis for {doc.personal_info.name or doc.filename}")

    # Run analyses
    edu_analysis = await analyze_education(doc)
    exp_analysis = await analyze_experience(doc)
    research = analyze_research_profile(doc)
    missing_detailed = detect_missing_info_detailed(doc)

    # Generate summary
    llm_ok = await is_llm_available()
    if llm_ok:
        summary = await _generate_summary_with_llm(doc, edu_analysis, exp_analysis, research)
    else:
        summary = _generate_summary_rule_based(doc, edu_analysis, exp_analysis, research)

    # Compute overall score
    overall_score = compute_overall_score(edu_analysis, exp_analysis, research, doc)

    return {
        "education_analysis": edu_analysis.model_dump(),
        "experience_analysis": exp_analysis.model_dump(),
        "research_summary": research.model_dump(),
        "missing_info_detailed": [m.model_dump() for m in missing_detailed],
        "summary": summary,
        "overall_score": overall_score,
    }
