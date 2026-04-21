"""Upload route — POST /api/upload"""

import os
import shutil
import logging
from pathlib import Path

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import get_settings
from app.core.database import get_db
from app.models.candidate import CandidateDocument, UploadResponse
from app.services.cv_parser import parse_cv
from app.services.candidate_analyzer import run_full_analysis

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/upload", response_model=UploadResponse)
async def upload_cv(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    settings = get_settings()

    # Validate file type
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Check file size
    file.file.seek(0, 2)
    size_bytes = file.file.tell()
    file.file.seek(0)
    if size_bytes > settings.max_file_size_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail=f"File exceeds {settings.max_file_size_mb} MB limit.")

    # Save to upload dir
    os.makedirs(settings.cv_upload_dir, exist_ok=True)
    safe_name = Path(file.filename).name
    dest_path = os.path.join(settings.cv_upload_dir, safe_name)
    # Avoid overwriting — append counter if exists
    counter = 1
    while os.path.exists(dest_path):
        stem = Path(file.filename).stem
        suffix = Path(file.filename).suffix
        dest_path = os.path.join(settings.cv_upload_dir, f"{stem}_{counter}{suffix}")
        counter += 1

    with open(dest_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    logger.info(f"Saved uploaded file to {dest_path}")

    # Insert a pending record so we can return an ID immediately
    pending_doc = {
        "filename": Path(dest_path).name,
        "file_path": dest_path,
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
    result = await db.candidates.insert_one(pending_doc)
    candidate_id = str(result.inserted_id)

    # Parse CV synchronously (M1 — simple, no background task)
    try:
        parsed: CandidateDocument = await parse_cv(dest_path, settings.processed_dir)
        update_data = parsed.model_dump(exclude={"filename", "file_path"})
        # Convert Pydantic sub-models to plain dicts for MongoDB
        await db.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": update_data},
        )

        # M2: Run full analysis pipeline (education, experience, research, summary)
        try:
            analysis_results = await run_full_analysis(parsed)
            await db.candidates.update_one(
                {"_id": ObjectId(candidate_id)},
                {"$set": analysis_results},
            )
            logger.info(f"Analysis completed for {dest_path}")
        except Exception as ae:
            logger.warning(f"Analysis failed for {dest_path} (parsing still succeeded): {ae}")

        status = "done"
        score_info = f" Overall score: {analysis_results.get('overall_score', 'N/A')}." if 'analysis_results' in dir() else ""
        message = f"CV parsed and analyzed successfully. Found {len(parsed.education)} education records, {len(parsed.publications)} publications.{score_info}"
    except Exception as e:
        logger.error(f"Parsing failed for {dest_path}: {e}")
        await db.candidates.update_one(
            {"_id": ObjectId(candidate_id)},
            {"$set": {"processing_status": "failed", "processing_error": str(e)}},
        )
        status = "failed"
        message = f"Parsing failed: {e}"

    return UploadResponse(
        candidate_id=candidate_id,
        filename=Path(dest_path).name,
        status=status,
        message=message,
    )
