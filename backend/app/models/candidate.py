from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# ─── Sub-models ──────────────────────────────────────────────────────────────

class PersonalInfo(BaseModel):
    name: str = ""
    email: str = ""
    phone: str = ""
    location: str = ""
    linkedin: str = ""
    website: str = ""


class EducationRecord(BaseModel):
    level: str = ""          # SSE / HSSC / UG / PG / PhD
    degree: str = ""
    specialization: str = ""
    institution: str = ""
    start_year: Optional[int] = None
    end_year: Optional[int] = None
    marks_or_cgpa: str = ""
    normalized_score: Optional[float] = None   # 0-100 scale after normalization
    board_or_affiliation: str = ""


class ExperienceRecord(BaseModel):
    title: str = ""
    organization: str = ""
    employment_type: str = ""   # Full-time / Part-time / Contract / Research
    start_date: str = ""
    end_date: str = ""          # "Present" if current
    description: str = ""


class Publication(BaseModel):
    pub_type: str = ""          # journal / conference / book_chapter
    title: str = ""
    authors: list[str] = []
    venue: str = ""             # Journal or conference name
    year: Optional[int] = None
    doi: str = ""
    issn: str = ""


class Book(BaseModel):
    title: str = ""
    authors: list[str] = []
    publisher: str = ""
    year: Optional[int] = None
    isbn: str = ""
    url: str = ""


class Patent(BaseModel):
    title: str = ""
    patent_number: str = ""
    inventors: list[str] = []
    country: str = ""
    date: str = ""
    url: str = ""


class Supervision(BaseModel):
    student_name: str = ""
    degree: str = ""        # MS / PhD
    role: str = ""          # main / co
    year: Optional[int] = None
    thesis_title: str = ""


# ─── Main candidate document ─────────────────────────────────────────────────

class CandidateDocument(BaseModel):
    """MongoDB document shape for a processed candidate."""

    # Metadata
    filename: str
    file_path: str
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    processing_status: str = "pending"   # pending / processing / done / failed
    processing_error: str = ""

    # Raw extraction
    raw_text: str = ""
    extraction_method: str = ""  # "llm" | "rule_based"

    # Structured fields
    personal_info: PersonalInfo = Field(default_factory=PersonalInfo)
    education: list[EducationRecord] = []
    experience: list[ExperienceRecord] = []
    publications: list[Publication] = []
    skills: list[str] = []
    books: list[Book] = []
    patents: list[Patent] = []
    supervision: list[Supervision] = []

    # Analysis results (populated in later milestones)
    missing_fields: list[str] = []
    overall_score: Optional[float] = None
    summary: str = ""


# ─── API response shapes ─────────────────────────────────────────────────────

class CandidateListItem(BaseModel):
    id: str
    name: str
    filename: str
    uploaded_at: datetime
    processing_status: str
    overall_score: Optional[float]
    skills_count: int
    publications_count: int
    missing_fields_count: int


class UploadResponse(BaseModel):
    candidate_id: str
    filename: str
    status: str
    message: str
