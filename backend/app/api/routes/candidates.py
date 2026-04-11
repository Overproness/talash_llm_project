"""Candidates routes — GET /api/candidates, GET /api/candidates/{id}"""

import logging
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.database import get_db
from app.models.candidate import CandidateListItem

logger = logging.getLogger(__name__)
router = APIRouter()


def _doc_to_list_item(doc: dict) -> CandidateListItem:
    pi = doc.get("personal_info", {})
    return CandidateListItem(
        id=str(doc["_id"]),
        name=pi.get("name", "") or doc.get("filename", "Unknown"),
        filename=doc.get("filename", ""),
        uploaded_at=doc.get("uploaded_at"),
        processing_status=doc.get("processing_status", "unknown"),
        overall_score=doc.get("overall_score"),
        skills_count=len(doc.get("skills", [])),
        publications_count=len(doc.get("publications", [])),
        missing_fields_count=len(doc.get("missing_fields", [])),
    )


@router.get("/candidates", response_model=list[CandidateListItem])
async def list_candidates(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    status: Optional[str] = Query(None),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return paginated list of candidates."""
    filter_q = {}
    if status:
        filter_q["processing_status"] = status

    cursor = db.candidates.find(filter_q).sort("uploaded_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)
    return [_doc_to_list_item(d) for d in docs]


@router.get("/candidates/{candidate_id}")
async def get_candidate(
    candidate_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Return full structured data for a single candidate."""
    try:
        oid = ObjectId(candidate_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid candidate ID format.")

    doc = await db.candidates.find_one({"_id": oid})
    if not doc:
        raise HTTPException(status_code=404, detail="Candidate not found.")

    doc["id"] = str(doc.pop("_id"))
    return doc


@router.delete("/candidates/{candidate_id}")
async def delete_candidate(
    candidate_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """Delete a candidate record."""
    try:
        oid = ObjectId(candidate_id)
    except InvalidId:
        raise HTTPException(status_code=400, detail="Invalid candidate ID format.")

    result = await db.candidates.delete_one({"_id": oid})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return {"message": "Candidate deleted successfully."}
