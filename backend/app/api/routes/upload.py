"""Upload route — POST /api/upload"""

import os
import logging
from datetime import datetime
from pathlib import Path

from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.database import get_db
from app.models.candidate import BulkCandidateInfo, CandidateDocument, UploadResponse
from app.services.auth_service import get_current_user
from app.services.cv_parser import count_cvs_in_bytes, parse_cv, split_pdf_bytes
from app.services.candidate_analyzer import run_full_analysis
from app.services.email_generator import detect_missing_info_detailed, generate_email_draft
from app.services.llm_client import llm_config_from_user, use_llm_config

logger = logging.getLogger(__name__)
router = APIRouter()


async def _process_cv_background(
    dest_path: str,
    candidate_id: str,
    db: AsyncIOMotorDatabase,
    settings,
    llm_config,
) -> None:
    """Parse and analyse a CV in the background, updating MongoDB when done."""
    try:
        with use_llm_config(llm_config):
            parsed: CandidateDocument = await parse_cv(dest_path, settings.processed_dir)
        update_data = parsed.model_dump(exclude={"filename", "file_path"})
        # Keep status as "processing" so the frontend continues polling while analysis runs
        update_data["processing_status"] = "processing"
        await db.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": update_data},
        )

        try:
            with use_llm_config(llm_config):
                analysis_results = await run_full_analysis(parsed)
            analysis_results["processing_status"] = "done"
            await db.candidates.update_one(
                {"_id": ObjectId(candidate_id)},
                {"$set": analysis_results},
            )
            logger.info(f"Analysis completed for {dest_path}")

            # Auto-generate email draft and save to DB
            try:
                missing = detect_missing_info_detailed(parsed)
                if missing:
                    with use_llm_config(llm_config):
                        email_draft = await generate_email_draft(parsed, missing)
                    await db.candidates.update_one(
                        {"_id": ObjectId(candidate_id)},
                        {"$set": {"email_draft": email_draft.model_dump()}},
                    )
                    logger.info(f"Email draft saved for {dest_path}")
            except Exception as ee:
                logger.warning(f"Email draft generation failed for {dest_path}: {ee}")
        except Exception as ae:
            logger.warning(f"Analysis failed for {dest_path}: {ae}")
            await db.candidates.update_one(
                {"_id": ObjectId(candidate_id)},
                {"$set": {"processing_status": "done", "processing_error": str(ae)}},
            )
    except Exception as e:
        logger.error(f"Parsing failed for {dest_path}: {e}")
        await db.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"processing_status": "failed", "processing_error": str(e)}},
        )


@router.post("/upload", response_model=UploadResponse)
async def upload_cv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    settings = get_settings()
    llm_config = llm_config_from_user(current_user)

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Read entire file into memory so we can (a) check size and (b) detect multi-CV
    file_bytes = await file.read()
    size_bytes = len(file_bytes)
    if size_bytes > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_file_size_mb} MB limit.")

    os.makedirs(settings.cv_upload_dir, exist_ok=True)
    safe_name = Path(file.filename).name

    # Multi-CV path
    num_cvs = count_cvs_in_bytes(file_bytes)
    if num_cvs > 1:
        logger.info(f"Multi-CV PDF detected: {safe_name} contains {num_cvs} CVs. Splitting…")
        split_paths = split_pdf_bytes(file_bytes, safe_name, settings.cv_upload_dir)

        bulk_candidates: list[BulkCandidateInfo] = []
        for split_path in split_paths:
            split_filename = Path(split_path).name
            pending_doc = _make_pending_doc(split_filename, split_path)
            result = await db.candidates.insert_one(pending_doc)
            cid = str(result.inserted_id)
            background_tasks.add_task(_process_cv_background, split_path, cid, db, settings, llm_config)
            bulk_candidates.append(BulkCandidateInfo(candidate_id=cid, filename=split_filename))
            logger.info(f"Queued split CV: {split_filename} → {cid}")

        return UploadResponse(
            candidate_id=bulk_candidates[0].candidate_id,
            filename=safe_name,
            status="processing",
            message=f"Multi-CV PDF split into {len(bulk_candidates)} candidates. All are being processed.",
            is_bulk=True,
            candidates=bulk_candidates,
        )

    # Single-CV path (original behaviour)
    # Deduplicate: if a non-failed candidate with this filename already exists, return it
    existing = await db.candidates.find_one(
        {"filename": safe_name, "processing_status": {"$ne": "failed"}}
    )
    if existing:
        existing_id = str(existing["_id"])
        logger.info(f"Duplicate upload detected for {safe_name}, returning existing candidate {existing_id}")
        return UploadResponse(
            candidate_id=existing_id,
            filename=safe_name,
            status=existing.get("processing_status", "processing"),
            message="CV already exists. Returning existing candidate.",
        )

    dest_path = os.path.join(settings.cv_upload_dir, safe_name)
    counter = 1
    while os.path.exists(dest_path):
        stem = Path(file.filename).stem
        suffix = Path(file.filename).suffix
        dest_path = os.path.join(settings.cv_upload_dir, f"{stem}_{counter}{suffix}")
        counter += 1

    final_filename = Path(dest_path).name

    # Insert the DB record BEFORE writing the file to disk so the folder watcher
    # will always find an existing record and skip this file when it fires.
    pending_doc = _make_pending_doc(final_filename, dest_path)
    result = await db.candidates.insert_one(pending_doc)
    candidate_id = str(result.inserted_id)

    with open(dest_path, "wb") as f:
        f.write(file_bytes)
    logger.info(f"Saved uploaded file to {dest_path}")

    background_tasks.add_task(_process_cv_background, dest_path, candidate_id, db, settings, llm_config)

    return UploadResponse(
        candidate_id=candidate_id,
        filename=final_filename,
        status="processing",
        message="CV uploaded successfully. Analysis is running in the background.",
    )


def _make_pending_doc(filename: str, file_path: str) -> dict:
    """Return a blank pending-state MongoDB document for a candidate."""
    return {
        "filename": filename,
        "file_path": file_path,
        "uploaded_at": datetime.utcnow(),
        "processing_status": "processing",
        "processing_error": "",
        "raw_text": "",
        "extraction_method": "",
        "personal_info": {},
        "education": [],
        "experience": [],
        "publications": [],
        "skills": [],
        "books": [],
        "patents": [],
        "supervision": [],
        "missing_fields": [],
        "overall_score": None,
        "summary": "",
    }


@router.get("/upload/stats")
async def get_upload_stats(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
):
    """Return aggregate upload counters sourced from the candidates collection."""
    pipeline = [
        {
            "$group": {
                "_id": "$processing_status",
                "count": {"$sum": 1},
            }
        }
    ]
    rows = await db.candidates.aggregate(pipeline).to_list(length=None)
    counts = {row["_id"]: row["count"] for row in rows}

    total = sum(counts.values())
    return {
        "total": total,
        "processing": counts.get("processing", 0),
        "completed": counts.get("done", 0),
        "failed": counts.get("failed", 0),
    }
