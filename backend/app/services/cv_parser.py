"""
CV Parser — Milestone 1 Core Service
Handles:
  1. PDF text extraction  (PyMuPDF primary, pdfplumber fallback)
  2. Structured field extraction (Ollama LLM primary, rule-based fallback)
  3. Missing-field detection
  4. CSV export
"""

import csv
import io
import json
import logging
import os
import re
from pathlib import Path
from typing import Optional

import fitz          # PyMuPDF
import pdfplumber

from app.models.candidate import (
    Book,
    CandidateDocument,
    EducationRecord,
    ExperienceRecord,
    Patent,
    PersonalInfo,
    Publication,
    Supervision,
)
from app.services.llm_client import extract_with_llm, is_ollama_available

logger = logging.getLogger(__name__)


# ─── PDF text extraction ──────────────────────────────────────────────────────

def extract_text_pymupdf(pdf_path: str) -> str:
    """Extract text from PDF using PyMuPDF (preferred)."""
    text = ""
    try:
        doc = fitz.open(pdf_path)
        for page in doc:
            text += page.get_text("text") + "\n"
        doc.close()
    except Exception as e:
        logger.warning(f"PyMuPDF extraction failed: {e}")
    return text.strip()


def extract_text_pdfplumber(pdf_path: str) -> str:
    """Extract text from PDF using pdfplumber (fallback for complex layouts).
    Also attempts table extraction to capture structured/tabular CV data."""
    text = ""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                # Try table extraction first — captures tabular CVs much better
                tables = page.extract_tables()
                if tables:
                    for table in tables:
                        for row in table:
                            if row:
                                # Join non-None cells with a tab separator
                                row_text = "\t".join(cell.strip() if cell else "" for cell in row)
                                if row_text.strip():
                                    text += row_text + "\n"
                    text += "\n"
                else:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
    except Exception as e:
        logger.warning(f"pdfplumber extraction failed: {e}")
    return text.strip()


def extract_pdf_text(pdf_path: str) -> str:
    """
    Extract text from a PDF file.
    Uses both PyMuPDF and pdfplumber and returns the richer result.
    pdfplumber's table extraction handles structured/tabular CVs much better.
    """
    pymupdf_text = extract_text_pymupdf(pdf_path)
    plumber_text = extract_text_pdfplumber(pdf_path)

    # Choose the longer/richer extraction, preferring pdfplumber when it adds tables
    if len(plumber_text) > len(pymupdf_text) * 0.7:
        # Combine both: pdfplumber tables + pymupdf prose
        combined = plumber_text
        if pymupdf_text and len(pymupdf_text) > len(plumber_text):
            combined = pymupdf_text + "\n\n--- TABLE EXTRACTION ---\n\n" + plumber_text
        text = combined
    else:
        text = pymupdf_text if len(pymupdf_text) >= len(plumber_text) else plumber_text

    if len(text) < 100:
        logger.warning(f"Both extractors yielded minimal text for {pdf_path}. PDF may be image-based.")
    return text


# ─── Rule-based extraction (fallback when Ollama unavailable) ─────────────────

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_PHONE_RE = re.compile(r"(?:\+92|0092|0)?[\s\-]?3\d{2}[\s\-]?\d{7}|(?:\+\d{1,3}[\s\-]?)?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}")
_URL_RE = re.compile(r"https?://[^\s]+|linkedin\.com/in/[^\s]+")
_YEAR_RE = re.compile(r"\b(19|20)\d{2}\b")
_CGPA_RE = re.compile(r"(?:CGPA|GPA|C\.G\.P\.A)[\s:]*([0-9]+\.?[0-9]*)\s*/\s*([0-9]+\.?[0-9]*)", re.IGNORECASE)
_PERCENT_RE = re.compile(r"(\d{2,3}(?:\.\d+)?)\s*%")
_DOI_RE = re.compile(r"10\.\d{4,9}/[^\s]+")

EDUCATION_KEYWORDS = ["b.s", "bs", "bachelor", "m.s", "ms", "master", "ph.d", "phd", "doctorate",
                       "b.e", "m.e", "b.tech", "m.tech", "mba", "matric", "ssc", "hssc",
                       "sse", "intermediate", "fsc", "fa", "bsc", "msc", "mphil"]
EXPERIENCE_KEYWORDS = ["lecturer", "professor", "researcher", "engineer", "developer", "manager",
                        "director", "assistant", "associate", "analyst", "consultant", "intern",
                        "faculty", "scientist", "officer", "coordinator", "head", "lead"]
SKILLS_SECTION_RE = re.compile(r"(skills?|expertise|competenc|proficienc|tools?|technologies|programming)", re.IGNORECASE)
PUB_SECTION_RE = re.compile(r"(publications?|journal|conference papers?|research papers?|articles?)", re.IGNORECASE)
EDU_SECTION_RE = re.compile(r"(education|academic|qualification|degree)", re.IGNORECASE)
EXP_SECTION_RE = re.compile(r"(experience|employment|work history|career|position|appointment)", re.IGNORECASE)


def _extract_name(lines: list[str]) -> str:
    """Heuristic: the name is usually in the first few lines in large text."""
    for line in lines[:8]:
        line = line.strip()
        if len(line) > 3 and len(line) < 60 and not _EMAIL_RE.search(line) and not _PHONE_RE.search(line):
            if re.match(r"^[A-Za-z\s\.]{3,50}$", line):
                return line
    return ""


def _normalize_score(raw: str) -> Optional[float]:
    """Convert a raw marks/CGPA string to a 0-100 percentage.

    Pakistani academic CV heuristic (integer-part digit count):
      - Explicit "CGPA X/Y" or "X/Y" → proportional conversion
      - Explicit "X%"               → direct percentage
      - Bare value, int-part 1 digit (0.x – 9.99) → GPA out of 4.0
      - Bare value, int-part 2 digits (10 – 99.x)  → direct percentage
      - Bare value == 100               → 100%
      - Bare value > 100                → raw marks out of 1100 (SSC/HSSC boards)
    """
    if not raw:
        return None
    cgpa_match = _CGPA_RE.search(raw)
    if cgpa_match:
        score = float(cgpa_match.group(1))
        scale = float(cgpa_match.group(2))
        if scale > 0:
            return round((score / scale) * 100, 2)
    pct_match = _PERCENT_RE.search(raw)
    if pct_match:
        return float(pct_match.group(1))
    # Bare number — classify by magnitude of integer part
    bare = re.search(r"\b(\d{1,4}(?:\.\d{1,2})?)\b", raw)
    if bare:
        val = float(bare.group(1))
        if val == 0:
            return None
        if val <= 9.99:       # 1-digit integer part → GPA/4.0
            return round((val / 4.0) * 100, 2)
        if val <= 100.0:      # 2-digit integer part → direct percentage
            return round(val, 2)
        # 3+-digit → raw marks assumed out of 1100 (Pakistani board scale)
        return round((val / 1100.0) * 100, 2)
    return None


def rule_based_extract(text: str) -> dict:
    """
    Regex + heuristic extraction of common CV fields.
    Used as fallback when Ollama is unavailable.
    """
    lines = [l.strip() for l in text.splitlines() if l.strip()]

    # Personal info
    email = _EMAIL_RE.findall(text)
    phone = _PHONE_RE.findall(text)
    urls = _URL_RE.findall(text)
    linkedin = next((u for u in urls if "linkedin" in u), "")

    # Present Employment line (e.g. "Present Employment: Unemployed")
    _present_emp_match = re.search(
        r"Present\s+Employment\s*:\s*([^\n]{1,120})", text, re.IGNORECASE
    )
    present_employment = _present_emp_match.group(1).strip() if _present_emp_match else ""

    personal_info = {
        "name": _extract_name(lines),
        "email": email[0] if email else "",
        "phone": phone[0] if phone else "",
        "location": "",
        "linkedin": linkedin,
        "website": next((u for u in urls if "linkedin" not in u), ""),
        "present_employment": present_employment,
    }

    # ── Education ──────────────────────────────────────────────────────────────
    education: list[dict] = []
    edu_section_start = None
    for i, line in enumerate(lines):
        if EDU_SECTION_RE.search(line) and len(line) < 50:
            edu_section_start = i
            break

    if edu_section_start is not None:
        edu_lines = lines[edu_section_start: edu_section_start + 50]
        current_rec: dict = {}
        for line in edu_lines:
            lower = line.lower()
            # Degree detection
            for kw in EDUCATION_KEYWORDS:
                if kw in lower:
                    if current_rec:
                        education.append(current_rec)
                    level = _map_degree_level(lower)
                    current_rec = {
                        "level": level,
                        "degree": line,
                        "specialization": "",
                        "institution": "",
                        "start_year": None,
                        "end_year": None,
                        "marks_or_cgpa": "",
                        "board_or_affiliation": "",
                    }
                    break
            # Year extraction for current record
            if current_rec:
                years = _YEAR_RE.findall(line)
                if years:
                    if not current_rec["start_year"]:
                        current_rec["start_year"] = int(years[0])
                    if len(years) > 1:
                        current_rec["end_year"] = int(years[-1])
                # CGPA / % extraction
                if _CGPA_RE.search(line) or _PERCENT_RE.search(line):
                    current_rec["marks_or_cgpa"] = line
                    current_rec["normalized_score"] = _normalize_score(line)
                # Institution heuristic: lines with "university", "college", "institute"
                if re.search(r"(university|college|institute|school|nust|lums|pu |ku |uts)", line, re.IGNORECASE):
                    current_rec["institution"] = line
        if current_rec:
            education.append(current_rec)

    # ── Experience ─────────────────────────────────────────────────────────────
    experience: list[dict] = []
    exp_section_start = None
    for i, line in enumerate(lines):
        if EXP_SECTION_RE.search(line) and len(line) < 60:
            exp_section_start = i
            break

    if exp_section_start is not None:
        exp_lines = lines[exp_section_start: exp_section_start + 60]
        current_exp: dict = {}
        for line in exp_lines:
            lower = line.lower()
            for kw in EXPERIENCE_KEYWORDS:
                if kw in lower:
                    if current_exp:
                        experience.append(current_exp)
                    current_exp = {
                        "title": line,
                        "organization": "",
                        "employment_type": "",
                        "start_date": "",
                        "end_date": "",
                        "description": "",
                    }
                    break
            if current_exp:
                years = _YEAR_RE.findall(line)
                if years:
                    current_exp["start_date"] = years[0]
                    if len(years) > 1:
                        current_exp["end_date"] = years[-1]
                if re.search(r"(university|college|institute|ltd|pvt|inc|corp|department)", line, re.IGNORECASE):
                    current_exp["organization"] = line
        if current_exp:
            experience.append(current_exp)

    # ── Skills ─────────────────────────────────────────────────────────────────
    skills: list[str] = []
    skills_section_start = None
    for i, line in enumerate(lines):
        if SKILLS_SECTION_RE.search(line) and len(line) < 50:
            skills_section_start = i
            break

    if skills_section_start is not None:
        skills_lines = lines[skills_section_start + 1: skills_section_start + 20]
        for line in skills_lines:
            # Stop at next section
            if EDU_SECTION_RE.search(line) or EXP_SECTION_RE.search(line) or PUB_SECTION_RE.search(line):
                break
            parts = re.split(r"[,•|/\t]+", line)
            for p in parts:
                p = p.strip()
                if 2 < len(p) < 50:
                    skills.append(p)

    # ── Publications ───────────────────────────────────────────────────────────
    publications: list[dict] = []
    pub_section_start = None
    for i, line in enumerate(lines):
        if PUB_SECTION_RE.search(line) and len(line) < 60:
            pub_section_start = i
            break

    if pub_section_start is not None:
        pub_lines = lines[pub_section_start + 1: pub_section_start + 80]
        for line in pub_lines:
            if len(line) > 40:
                doi = _DOI_RE.search(line)
                years = _YEAR_RE.findall(line)
                pub_type = "journal"
                if re.search(r"(conference|proc\.|proceedings|workshop|symposium)", line, re.IGNORECASE):
                    pub_type = "conference"
                publications.append({
                    "pub_type": pub_type,
                    "title": line[:200],
                    "authors": [],
                    "venue": "",
                    "year": int(years[0]) if years else None,
                    "doi": doi.group(0) if doi else "",
                    "issn": "",
                })

    return {
        "personal_info": personal_info,
        "education": education,
        "experience": experience,
        "publications": publications[:30],
        "skills": skills[:40],
        "books": [],
        "patents": [],
        "supervision": [],
    }


def _map_degree_level(text: str) -> str:
    text = text.lower()
    if any(k in text for k in ["ph.d", "phd", "doctorate"]):
        return "PhD"
    if any(k in text for k in ["m.s", "ms", "master", "mphil", "m.phil", "msc"]):
        return "PG"
    if any(k in text for k in ["b.s", "bs", "b.e", "bsc", "be ", "bachelor", "b.tech", "mba"]):
        return "UG"
    if any(k in text for k in ["hssc", "fsc", "fa ", "intermediate", "12th", "sse", "a-level"]):
        return "HSSC"
    if any(k in text for k in ["matric", "ssc ", "10th", "o-level", "sse"]):
        return "SSE"
    return "Other"


# ─── Missing field detection ──────────────────────────────────────────────────

def detect_missing_fields(doc: CandidateDocument) -> list[str]:
    missing = []
    pi = doc.personal_info
    if not pi.name:
        missing.append("personal_info.name")
    if not pi.email:
        missing.append("personal_info.email")
    if not doc.education:
        missing.append("education")
    else:
        for i, edu in enumerate(doc.education):
            if not edu.marks_or_cgpa:
                missing.append(f"education[{i}].marks_or_cgpa")
            # For HSSC/SSC, board_or_affiliation often serves as the institution
            if not edu.institution and not edu.board_or_affiliation:
                missing.append(f"education[{i}].institution")
    if not doc.experience:
        missing.append("experience")
    for i, pub in enumerate(doc.publications):
        if not pub.year:
            missing.append(f"publications[{i}].year")
        if not pub.venue:
            missing.append(f"publications[{i}].venue")
    return missing


# ─── Skills inference fallback ──────────────────────────────────────────────

def _infer_skills_from_content(doc: CandidateDocument) -> list[str]:
    """Derive technical skills from education specializations and publication topics
    when no dedicated Skills section was found in the CV."""
    inferred: list[str] = []
    seen: set[str] = set()

    def _add(term: str) -> None:
        t = term.strip()
        if 2 < len(t) < 60 and t.lower() not in seen:
            seen.add(t.lower())
            inferred.append(t)

    # From education specializations
    for edu in doc.education:
        if edu.specialization:
            for part in re.split(r"[,/;]+", edu.specialization):
                _add(part.strip())

    # From publication titles — extract noun phrases that look like techniques/topics
    _TECH_STOPWORDS = {
        "a", "an", "the", "of", "in", "on", "for", "with", "and", "or", "to",
        "using", "based", "via", "by", "from", "into", "its", "their", "this",
        "novel", "new", "improved", "efficient", "hybrid", "joint", "adaptive",
        "approach", "method", "framework", "system", "scheme", "technique",
        "paper", "study", "analysis", "survey", "review", "towards",
    }
    _TECH_TERMS_RE = re.compile(
        r"\b(NOMA|OFDMA?|MIMO|LTE|5G|6G|HetNets?|IoT|WSN|ANN|CNN|RNN|LSTM|"
        r"machine learning|deep learning|neural network|reinforcement learning|"
        r"wireless communication|signal processing|resource allocation|"
        r"convex optimization|beamforming|spectrum|backhaul|satellite|"
        r"Python|MATLAB|C\+\+|Java|TensorFlow|PyTorch|Keras|Simulink|"
        r"antenna|radar|image processing|computer vision|NLP|data mining)\b",
        re.IGNORECASE,
    )
    for pub in doc.publications:
        for m in _TECH_TERMS_RE.finditer(pub.title):
            _add(m.group(0))

    return inferred[:30]


# ─── CSV export ───────────────────────────────────────────────────────────────

def export_to_csv(doc: CandidateDocument, output_dir: str) -> str:
    """Export key candidate fields to a CSV file. Returns the path to the CSV."""
    os.makedirs(output_dir, exist_ok=True)
    safe_name = re.sub(r"[^\w\-]", "_", doc.personal_info.name or doc.filename)
    csv_path = os.path.join(output_dir, f"{safe_name}.csv")

    rows = []

    # Personal info
    rows.append(["Section", "Field", "Value"])
    rows.append(["Personal", "Name", doc.personal_info.name])
    rows.append(["Personal", "Email", doc.personal_info.email])
    rows.append(["Personal", "Phone", doc.personal_info.phone])
    rows.append(["Personal", "Location", doc.personal_info.location])
    rows.append(["Personal", "LinkedIn", doc.personal_info.linkedin])

    # Education
    for edu in doc.education:
        rows.append(["Education", "Level", edu.level])
        rows.append(["Education", "Degree", edu.degree])
        rows.append(["Education", "Institution", edu.institution])
        rows.append(["Education", "Specialization", edu.specialization])
        rows.append(["Education", "Years", f"{edu.start_year} - {edu.end_year}"])
        rows.append(["Education", "Marks/CGPA", edu.marks_or_cgpa])
        rows.append(["Education", "Normalized Score", str(edu.normalized_score or "")])
        rows.append(["Education", "---", ""])

    # Experience
    for exp in doc.experience:
        rows.append(["Experience", "Title", exp.title])
        rows.append(["Experience", "Organization", exp.organization])
        rows.append(["Experience", "Type", exp.employment_type])
        rows.append(["Experience", "Period", f"{exp.start_date} - {exp.end_date}"])
        rows.append(["Experience", "---", ""])

    # Publications
    for pub in doc.publications:
        rows.append(["Publication", "Type", pub.pub_type])
        rows.append(["Publication", "Title", pub.title])
        rows.append(["Publication", "Venue", pub.venue])
        rows.append(["Publication", "Year", str(pub.year or "")])
        rows.append(["Publication", "DOI", pub.doi])
        rows.append(["Publication", "---", ""])

    # Skills
    rows.append(["Skills", "List", ", ".join(doc.skills)])

    # Missing fields
    rows.append(["Missing Fields", "List", ", ".join(doc.missing_fields)])

    with open(csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerows(rows)

    return csv_path


# ─── Main parse function ──────────────────────────────────────────────────────

async def parse_cv(pdf_path: str, processed_dir: str) -> CandidateDocument:
    """
    Full CV parsing pipeline:
      1. Extract raw text from PDF
      2. Structured extraction (LLM if available, else rule-based)
      3. Build CandidateDocument
      4. Detect missing fields
      5. Export CSV
    """
    filename = Path(pdf_path).name
    logger.info(f"Parsing CV: {filename}")

    # Step 1 — Raw text extraction
    raw_text = extract_pdf_text(pdf_path)
    logger.info(f"Extracted {len(raw_text)} characters from {filename}")

    # Step 2 — Structured extraction
    extraction_method = "rule_based"
    extracted: dict = {}

    llm_ok = await is_ollama_available()  # alias for is_llm_available()
    if llm_ok:
        try:
            extracted = await extract_with_llm(raw_text)
            extraction_method = "llm"
            logger.info(f"LLM extraction succeeded for {filename}")
        except Exception as e:
            logger.warning(f"LLM extraction failed ({e}), falling back to rule-based")
            extracted = rule_based_extract(raw_text)
    else:
        logger.info(f"LLM unavailable, using rule-based extraction for {filename}")
        extracted = rule_based_extract(raw_text)

    # Step 3 — Build CandidateDocument
    pi_data = extracted.get("personal_info", {})
    personal_info = PersonalInfo(
        name=pi_data.get("name", ""),
        email=pi_data.get("email", ""),
        phone=pi_data.get("phone", ""),
        location=pi_data.get("location", ""),
        linkedin=pi_data.get("linkedin", ""),
        website=pi_data.get("website", ""),
        present_employment=pi_data.get("present_employment", ""),
    )

    education = [EducationRecord(**e) for e in extracted.get("education", []) if isinstance(e, dict)]
    # Post-process: fill normalized_score for records extracted by LLM (which doesn't compute it)
    for edu in education:
        if edu.normalized_score is None and edu.marks_or_cgpa:
            edu.normalized_score = _normalize_score(edu.marks_or_cgpa)

    experience = [ExperienceRecord(**e) for e in extracted.get("experience", []) if isinstance(e, dict)]
    publications = [Publication(**p) for p in extracted.get("publications", []) if isinstance(p, dict)]
    skills = [s for s in extracted.get("skills", []) if isinstance(s, str) and s.strip()]
    books = [Book(**b) for b in extracted.get("books", []) if isinstance(b, dict)]
    patents = [Patent(**p) for p in extracted.get("patents", []) if isinstance(p, dict)]
    supervision = [Supervision(**s) for s in extracted.get("supervision", []) if isinstance(s, dict)]

    doc = CandidateDocument(
        filename=filename,
        file_path=pdf_path,
        processing_status="done",
        raw_text=raw_text,
        extraction_method=extraction_method,
        personal_info=personal_info,
        education=education,
        experience=experience,
        publications=publications,
        skills=skills,
        books=books,
        patents=patents,
        supervision=supervision,
    )

    # Step 3b — Infer skills from content if LLM returned none
    if not doc.skills:
        doc.skills = _infer_skills_from_content(doc)
        if doc.skills:
            logger.info(f"Inferred {len(doc.skills)} skills from content for {filename}")

    # Step 4 — Missing field detection
    doc.missing_fields = detect_missing_fields(doc)

    # Step 5 — CSV export
    try:
        export_to_csv(doc, processed_dir)
    except Exception as e:
        logger.warning(f"CSV export failed: {e}")

    logger.info(f"Parsing complete for {filename}. Method: {extraction_method}. Missing: {doc.missing_fields}")
    return doc
