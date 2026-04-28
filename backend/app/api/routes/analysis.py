"""Analysis routes — POST /api/candidates/{id}/analyze, GET /api/candidates/{id}/email-draft, GET /api/dashboard/stats"""

import logging

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.models.candidate import (
    CandidateDocument,
    EducationAnalysis,
    ExperienceAnalysis,
    PersonalInfo,
    EducationRecord,
    ExperienceRecord,
    Publication,
    Book,
    Patent,
    Supervision,
)
from app.services.candidate_analyzer import run_full_analysis
from app.services.email_generator import detect_missing_info_detailed, generate_email_draft

logger = logging.getLogger(__name__)
router = APIRouter()


def _doc_to_candidate(doc: dict) -> CandidateDocument:
    """Convert a MongoDB document to a CandidateDocument model."""
    pi = doc.get("personal_info", {})
    return CandidateDocument(
        filename=doc.get("filename", ""),
        file_path=doc.get("file_path", ""),
        uploaded_at=doc.get("uploaded_at"),
        processing_status=doc.get("processing_status", "unknown"),
        processing_error=doc.get("processing_error", ""),
        raw_text=doc.get("raw_text", ""),
        extraction_method=doc.get("extraction_method", ""),
        personal_info=PersonalInfo(**pi) if isinstance(pi, dict) else PersonalInfo(),
        education=[EducationRecord(**e) for e in doc.get("education", []) if isinstance(e, dict)],
        experience=[ExperienceRecord(**e) for e in doc.get("experience", []) if isinstance(e, dict)],
        publications=[Publication(**p) for p in doc.get("publications", []) if isinstance(p, dict)],
        skills=[s for s in doc.get("skills", []) if isinstance(s, str)],
        books=[Book(**b) for b in doc.get("books", []) if isinstance(b, dict)],
        patents=[Patent(**p) for p in doc.get("patents", []) if isinstance(p, dict)],
        supervision=[Supervision(**s) for s in doc.get("supervision", []) if isinstance(s, dict)],
        missing_fields=doc.get("missing_fields", []),
    )


@router.post("/candidates/{candidate_id}/analyze")
async def analyze_candidate(
    candidate_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Run full analysis pipeline on a candidate (education, experience, research, summary)."""
    try:
        oid = ObjectId(candidate_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid candidate ID format.")

    doc = await db.candidates.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    if doc.get("processing_status") != "done":
        raise HTTPException(status_code=400, detail="Candidate CV has not been parsed yet.")

    candidate = _doc_to_candidate(doc)

    try:
        analysis_results = await run_full_analysis(candidate)
        await db.candidates.update_one(
            {"_id": oid},
            {"$set": analysis_results},
        )
        return {
            "message": "Analysis completed successfully.",
            "candidate_id": candidate_id,
            "overall_score": analysis_results.get("overall_score"),
            "summary": analysis_results.get("summary", ""),
        }
    except Exception as e:
        logger.error(f"Analysis failed for {candidate_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@router.post("/candidates/{candidate_id}/email-draft")
async def generate_candidate_email(
    candidate_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Generate a personalized email draft for a candidate with missing information."""
    try:
        oid = ObjectId(candidate_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid candidate ID format.")

    doc = await db.candidates.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    candidate = _doc_to_candidate(doc)
    missing = detect_missing_info_detailed(candidate)

    if not missing:
        return {
            "candidate_id": candidate_id,
            "has_missing_info": False,
            "email_draft": None,
            "message": "No missing information detected.",
        }

    email_draft = await generate_email_draft(candidate, missing)

    return {
        "candidate_id": candidate_id,
        "has_missing_info": True,
        "email_draft": email_draft.model_dump(),
        "missing_count": len(missing),
    }


@router.get("/dashboard/stats")
async def get_dashboard_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return aggregate statistics for the dashboard."""
    pipeline_total = [{"$count": "total"}]
    pipeline_status = [{"$group": {"_id": "$processing_status", "count": {"$sum": 1}}}]
    pipeline_edu_levels = [
        {"$unwind": "$education"},
        {"$group": {"_id": "$education.level", "count": {"$sum": 1}}},
    ]
    pipeline_pub_types = [
        {"$unwind": "$publications"},
        {"$group": {"_id": "$publications.pub_type", "count": {"$sum": 1}}},
    ]
    pipeline_skills = [
        {"$unwind": "$skills"},
        {"$group": {"_id": "$skills", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 20},
    ]
    pipeline_scores = [
        {"$match": {"overall_score": {"$ne": None}}},
        {"$project": {
            "name": "$personal_info.name",
            "overall_score": 1,
            "education_score": "$education_analysis.education_score",
            "experience_score": "$experience_analysis.experience_score",
            "research_score": "$research_profile.research_score",
        }},
    ]
    pipeline_missing = [
        {"$match": {"missing_fields": {"$exists": True, "$ne": []}}},
        {"$project": {
            "name": "$personal_info.name",
            "missing_count": {"$size": "$missing_fields"},
        }},
    ]

    total_result = await db.candidates.aggregate(pipeline_total).to_list(1)
    total = total_result[0]["total"] if total_result else 0

    status_dist = {}
    async for doc in db.candidates.aggregate(pipeline_status):
        status_dist[doc["_id"] or "unknown"] = doc["count"]

    edu_dist = {}
    async for doc in db.candidates.aggregate(pipeline_edu_levels):
        edu_dist[doc["_id"] or "Other"] = doc["count"]

    pub_dist = {}
    async for doc in db.candidates.aggregate(pipeline_pub_types):
        pub_dist[doc["_id"] or "other"] = doc["count"]

    top_skills = []
    async for doc in db.candidates.aggregate(pipeline_skills):
        top_skills.append({"skill": doc["_id"], "count": doc["count"]})

    score_data = []
    async for doc in db.candidates.aggregate(pipeline_scores):
        score_data.append({
            "name": doc.get("name", "Unknown"),
            "overall_score": doc.get("overall_score"),
            "education_score": doc.get("education_score"),
            "experience_score": doc.get("experience_score"),
            "research_score": doc.get("research_score"),
        })

    missing_info = []
    async for doc in db.candidates.aggregate(pipeline_missing):
        missing_info.append({
            "name": doc.get("name", "Unknown"),
            "missing_count": doc.get("missing_count", 0),
        })

    return {
        "total_candidates": total,
        "status_distribution": status_dist,
        "education_levels": edu_dist,
        "publication_types": pub_dist,
        "top_skills": top_skills,
        "score_data": score_data,
        "missing_info_candidates": missing_info,
    }


# ─── Candidate Ranking (Milestone 3 — Extra Credit) ──────────────────────────

@router.get("/candidates/rank")
async def rank_candidates(
    limit: int = 50,
    min_score: float = 0.0,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return analyzed candidates ranked by overall_score (descending).

    Implements the quantifiable candidate ranking module — combines education,
    experience, and research quality scores into a single rankable list.
    """
    pipeline = [
        {"$match": {
            "processing_status": "done",
            "overall_score": {"$ne": None, "$gte": min_score},
        }},
        {"$project": {
            "name": "$personal_info.name",
            "filename": 1,
            "overall_score": 1,
            "education_score": "$education_analysis.education_score",
            "experience_score": "$experience_analysis.experience_score",
            "research_score": "$research_profile.research_score",
            "publications_count": {"$size": {"$ifNull": ["$publications", []]}},
            "skills_count": {"$size": {"$ifNull": ["$skills", []]}},
            "missing_fields_count": {"$size": {"$ifNull": ["$missing_fields", []]}},
            "primary_research_areas": {
                "$ifNull": ["$research_profile.primary_research_areas", []]
            },
            "highest_qualification": {
                "$ifNull": ["$education_analysis.highest_qualification", ""]
            },
            "summary": 1,
        }},
        {"$sort": {"overall_score": -1}},
        {"$limit": max(1, min(limit, 200))},
    ]

    ranked: list[dict] = []
    position = 0
    async for doc in db.candidates.aggregate(pipeline):
        position += 1
        ranked.append({
            "rank_position": position,
            "id": str(doc["_id"]),
            "name": doc.get("name") or doc.get("filename", "Unknown"),
            "filename": doc.get("filename", ""),
            "overall_score": doc.get("overall_score"),
            "education_score": doc.get("education_score"),
            "experience_score": doc.get("experience_score"),
            "research_score": doc.get("research_score"),
            "publications_count": doc.get("publications_count", 0),
            "skills_count": doc.get("skills_count", 0),
            "missing_fields_count": doc.get("missing_fields_count", 0),
            "edu_level": doc.get("highest_qualification", ""),
            "primary_research_areas": doc.get("primary_research_areas", []),
            "summary": doc.get("summary", ""),
        })

    return {"total": len(ranked), "rankings": ranked}
