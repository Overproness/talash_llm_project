"""Dashboard stats route — GET /api/dashboard/stats"""

from collections import Counter

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.services.auth_service import get_current_user

router = APIRouter()


@router.get("/dashboard/stats")
async def dashboard_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    docs = await db.candidates.find({}).to_list(length=None)

    total_candidates = len(docs)

    status_distribution: dict[str, int] = Counter(
        d.get("processing_status", "unknown") for d in docs
    )

    edu_levels: dict[str, int] = Counter()
    for d in docs:
        for rec in d.get("education", []):
            if isinstance(rec, dict) and rec.get("level"):
                edu_levels[rec["level"].upper()] += 1

    pub_types: dict[str, int] = Counter()
    for d in docs:
        for pub in d.get("publications", []):
            if isinstance(pub, dict) and pub.get("pub_type"):
                pub_types[pub["pub_type"]] += 1

    skills_counter: Counter = Counter()
    for d in docs:
        for skill in d.get("skills", []):
            if skill:
                skills_counter[skill] += 1
    top_skills = [{"skill": s, "count": c} for s, c in skills_counter.most_common(10)]

    score_data = []
    for d in docs:
        pi = d.get("personal_info", {})
        name = pi.get("name", "") or d.get("filename", "Unknown")
        edu_analysis = d.get("education_analysis") or {}
        exp_analysis = d.get("experience_analysis") or {}
        research_summary = d.get("research_summary") or {}
        score_data.append(
            {
                "name": name,
                "overall_score": d.get("overall_score"),
                "education_score": edu_analysis.get("education_score") if isinstance(edu_analysis, dict) else None,
                "experience_score": exp_analysis.get("experience_score") if isinstance(exp_analysis, dict) else None,
                "research_score": research_summary.get("research_score") if isinstance(research_summary, dict) else None,
            }
        )

    missing_info_candidates = [
        {
            "name": (d.get("personal_info") or {}).get("name", "") or d.get("filename", "Unknown"),
            "missing_count": len(d.get("missing_fields", [])),
        }
        for d in docs
        if d.get("missing_fields")
    ]

    drafted_emails_count = sum(1 for d in docs if d.get("email_draft"))

    return {
        "total_candidates": total_candidates,
        "status_distribution": dict(status_distribution),
        "education_levels": dict(edu_levels),
        "publication_types": dict(pub_types),
        "top_skills": top_skills,
        "score_data": score_data,
        "missing_info_candidates": missing_info_candidates,
        "drafted_emails_count": drafted_emails_count,
    }
