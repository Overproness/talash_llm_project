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
    present_employment: str = ""   # Raw "Present Employment" value from CV (e.g. "Unemployed")


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


# ─── Analysis sub-models (Milestone 2) ───────────────────────────────────────

class EducationGap(BaseModel):
    from_level: str = ""
    to_level: str = ""
    from_year: Optional[int] = None
    to_year: Optional[int] = None
    gap_years: Optional[float] = None
    justified: bool = False
    justification: str = ""


class EducationAnalysis(BaseModel):
    """Results of educational profile analysis (Module 3.1)."""
    academic_performance: list[dict] = []         # per-level summary (level, score, institution)
    performance_trend: str = ""                    # improving / declining / stable / mixed
    highest_qualification: str = ""
    specialization_consistency: str = ""           # consistent / varied / unrelated
    institution_quality: list[dict] = []           # institution, ranking_info
    education_gaps: list[EducationGap] = []
    gap_justifications: list[str] = []
    overall_assessment: str = ""
    education_score: Optional[float] = None        # 0-100


class ExperienceGap(BaseModel):
    from_role: str = ""
    to_role: str = ""
    from_date: str = ""
    to_date: str = ""
    gap_months: Optional[int] = None
    justified: bool = False
    justification: str = ""


class TimelineOverlap(BaseModel):
    type: str = ""        # education-employment / job-job
    item_a: str = ""
    item_b: str = ""
    overlap_period: str = ""
    assessment: str = ""  # legitimate / suspicious / needs_clarification


class ExperienceAnalysis(BaseModel):
    """Results of professional experience analysis (Module 3.8)."""
    total_experience_years: Optional[float] = None
    career_trajectory: str = ""             # ascending / lateral / mixed / descending
    current_role: str = ""
    experience_gaps: list[ExperienceGap] = []
    timeline_overlaps: list[TimelineOverlap] = []
    career_progression: list[dict] = []     # ordered list of roles with analysis
    experience_consistency: str = ""        # consistent / inconsistent / varied
    overall_assessment: str = ""
    experience_score: Optional[float] = None  # 0-100


class ResearchProfileSummary(BaseModel):
    """Partial research profile analysis (Module 3.2 partial for M2)."""
    total_publications: int = 0
    journal_count: int = 0
    conference_count: int = 0
    book_chapter_count: int = 0
    publication_years_range: str = ""
    primary_research_areas: list[str] = []
    publication_trend: str = ""       # increasing / stable / decreasing
    overall_assessment: str = ""


# ─── Research quality models (Milestone 3) ───────────────────────────────────

class JournalQualityInfo(BaseModel):
    """Quality assessment for a journal publication venue."""
    scopus_indexed: bool = False
    wos_indexed: bool = False
    quartile: str = "unknown"           # Q1 / Q2 / Q3 / Q4 / unknown
    sjr: Optional[float] = None
    cite_score: Optional[float] = None
    impact_factor: Optional[float] = None
    is_predatory: bool = False
    data_source: str = "unknown"        # scopus_api / publisher_inference / llm / unknown


class ConferenceQualityInfo(BaseModel):
    """Quality assessment for a conference publication venue."""
    core_rank: str = "unknown"          # A* / A / B / C / unknown
    proceedings_publisher: str = "unknown"  # IEEE / ACM / Springer / etc.
    is_indexed: bool = False
    series_number: Optional[int] = None    # e.g. 13 for "13th International ..."
    estimated_maturity: str = "unknown"    # established (>10) / growing (5-10) / recent (<5) / unknown
    data_source: str = "unknown"           # local_db / publisher_inference / unknown


class BookQualityInfo(BaseModel):
    """Quality assessment for a book."""
    publisher_credibility: str = "unknown"   # top_academic / reputable / known / predatory / unknown
    publisher_type: str = "unknown"          # academic / trade / self_published / unknown
    matched_publisher: str = ""


class PublicationQualityItem(BaseModel):
    """Per-publication quality enrichment linked back to doc.publications[pub_index]."""
    pub_index: int = 0
    authorship_role: str = "unknown"     # first_author / corresponding_author / first_and_corresponding / co_author / sole_author / unknown
    author_position: int = -1            # 0-based position in authors list (-1 = not found)
    total_authors: int = 0
    quality_label: str = "unknown"       # High / Medium / Low / Unknown
    journal_quality: Optional[JournalQualityInfo] = None
    conference_quality: Optional[ConferenceQualityInfo] = None


class CoAuthorStats(BaseModel):
    """Co-authorship collaboration analysis (Module 3.7)."""
    unique_co_authors: int = 0
    most_frequent_collaborators: list[dict] = []   # [{name, count}]
    avg_team_size: float = 0.0
    single_author_papers: int = 0
    collaboration_diversity_score: float = 0.0     # unique_co_authors / total_co_author_appearances


class TopicVariabilityResult(BaseModel):
    """Topic variability across publications (Module 3.6)."""
    topic_breakdown: list[dict] = []    # [{area, count, percentage}]
    dominant_area: str = ""
    diversity_score: float = 0.0        # Shannon entropy normalized 0-1
    is_specialist: bool = False         # True if >70% in single area


class FullResearchProfile(BaseModel):
    """Complete research profile (Milestone 3 — Modules 3.2, 3.6, 3.7)."""
    # ── Basic counts (from ResearchProfileSummary) ───────────────────────────
    total_publications: int = 0
    journal_count: int = 0
    conference_count: int = 0
    book_chapter_count: int = 0
    publication_years_range: str = ""
    primary_research_areas: list[str] = []
    publication_trend: str = ""
    overall_assessment: str = ""

    # ── Quality analysis ─────────────────────────────────────────────────────
    publication_quality: list[PublicationQualityItem] = []
    book_quality: list[BookQualityInfo] = []

    # ── Aggregate quality metrics ─────────────────────────────────────────────
    high_quality_journal_count: int = 0    # Q1 + Q2 journals
    top_conference_count: int = 0          # CORE A* + A conferences
    first_author_count: int = 0
    scopus_indexed_count: int = 0

    # ── Topic variability (Module 3.6) ────────────────────────────────────────
    topic_variability: Optional[TopicVariabilityResult] = None

    # ── Co-author analysis (Module 3.7) ──────────────────────────────────────
    co_author_analysis: Optional[CoAuthorStats] = None

    # ── Score ─────────────────────────────────────────────────────────────────
    research_score: Optional[float] = None  # 0-100


class MissingInfoItem(BaseModel):
    field: str = ""
    description: str = ""
    severity: str = "medium"   # low / medium / high / critical


class EmailDraft(BaseModel):
    candidate_name: str = ""
    candidate_email: str = ""
    subject: str = ""
    body: str = ""
    missing_items: list[str] = []


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

    # Analysis results (Milestone 2)
    missing_fields: list[str] = []
    missing_info_detailed: list[MissingInfoItem] = []
    education_analysis: Optional[EducationAnalysis] = None
    experience_analysis: Optional[ExperienceAnalysis] = None
    research_summary: Optional[ResearchProfileSummary] = None
    # Full research profile (Milestone 3)
    research_profile: Optional[FullResearchProfile] = None
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
    education_score: Optional[float] = None
    experience_score: Optional[float] = None
    skills_count: int
    publications_count: int
    missing_fields_count: int
    edu_level: Optional[str] = None


class UploadResponse(BaseModel):
    candidate_id: str
    filename: str
    status: str
    message: str
