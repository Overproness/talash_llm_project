"""
Tests for CV Parser — Milestone 1
Covers: PDF text extraction, rule-based extraction, missing field detection,
        CSV export, normalization.
"""

import os
import pytest
from pathlib import Path

# Ensure imports work from tests/
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.cv_parser import (
    extract_text_pymupdf,
    extract_text_pdfplumber,
    rule_based_extract,
    detect_missing_fields,
    export_to_csv,
    _normalize_score,
    _map_degree_level,
)
from app.models.candidate import CandidateDocument, PersonalInfo


# ─── Sample CV text fixture ──────────────────────────────────────────────────

SAMPLE_CV_TEXT = """
Dr. Ahmed Hassan
ahmed.hassan@nust.edu.pk | +92-333-1234567 | Islamabad, Pakistan
linkedin.com/in/ahmedhassan

EDUCATION
PhD Computer Science — NUST, Islamabad (2010 - 2015) CGPA: 3.8/4.0
MS Software Engineering — LUMS, Lahore (2007 - 2009) CGPA: 3.6/4.0
BS Computer Science — University of Karachi (2003 - 2007) 82%

EXPERIENCE
Associate Professor — NUST (2016 - Present)
Lecturer — COMSATS University (2010 - 2016)

SKILLS
Python, Machine Learning, Deep Learning, NLP, PyTorch, TensorFlow, Data Analysis, Research

PUBLICATIONS
Ahmed Hassan, M. Ali, "A Deep Learning Approach to NLP", IEEE Conference on AI, 2019
Hassan, A., "Machine Learning in Healthcare", Journal of Medical Informatics, 2021. DOI: 10.1000/abc123
"""


# ─── Unit tests ───────────────────────────────────────────────────────────────

class TestNormalization:
    def test_cgpa_4_scale(self):
        score = _normalize_score("CGPA: 3.8/4.0")
        assert score == pytest.approx(95.0, abs=0.1)

    def test_cgpa_5_scale(self):
        score = _normalize_score("CGPA: 4.0/5.0")
        assert score == pytest.approx(80.0, abs=0.1)

    def test_percentage(self):
        score = _normalize_score("82%")
        assert score == 82.0

    def test_bare_cgpa(self):
        score = _normalize_score("3.7")
        assert score == pytest.approx(92.5, abs=0.1)

    def test_empty(self):
        assert _normalize_score("") is None

    def test_text_only(self):
        assert _normalize_score("A Grade") is None


class TestDegreeLevel:
    def test_phd(self):
        assert _map_degree_level("PhD Computer Science") == "PhD"

    def test_ms(self):
        assert _map_degree_level("MS Software Engineering") == "PG"

    def test_bs(self):
        assert _map_degree_level("BS Computer Science") == "UG"

    def test_hssc(self):
        assert _map_degree_level("FSc Pre-Engineering") == "HSSC"

    def test_matric(self):
        assert _map_degree_level("Matric SSC Science") == "SSE"


class TestRuleBasedExtraction:
    def setup_method(self):
        self.result = rule_based_extract(SAMPLE_CV_TEXT)

    def test_email_extracted(self):
        assert "ahmed.hassan@nust.edu.pk" in self.result["personal_info"]["email"]

    def test_phone_extracted(self):
        assert self.result["personal_info"]["phone"] != ""

    def test_linkedin_extracted(self):
        assert "linkedin" in self.result["personal_info"]["linkedin"]

    def test_skills_extracted(self):
        skills = self.result["skills"]
        assert len(skills) > 0
        skills_joined = " ".join(skills).lower()
        assert "python" in skills_joined or "machine learning" in skills_joined

    def test_publications_extracted(self):
        pubs = self.result["publications"]
        assert len(pubs) >= 1

    def test_education_records(self):
        edu = self.result["education"]
        assert len(edu) >= 1


class TestMissingFieldDetection:
    def _make_doc(self, **kwargs) -> CandidateDocument:
        defaults = dict(
            filename="test.pdf",
            file_path="/data/test.pdf",
            personal_info=PersonalInfo(name="John Doe", email="john@example.com"),
        )
        defaults.update(kwargs)
        return CandidateDocument(**defaults)

    def test_no_missing_fields_baseline(self):
        doc = self._make_doc()
        missing = detect_missing_fields(doc)
        # No education/experience records exist — those should be flagged
        assert "education" in missing
        assert "experience" in missing

    def test_missing_name(self):
        doc = self._make_doc(personal_info=PersonalInfo(name="", email="x@y.com"))
        missing = detect_missing_fields(doc)
        assert "personal_info.name" in missing

    def test_missing_email(self):
        doc = self._make_doc(personal_info=PersonalInfo(name="John", email=""))
        missing = detect_missing_fields(doc)
        assert "personal_info.email" in missing


class TestCSVExport:
    def test_csv_created(self, tmp_path):
        doc = CandidateDocument(
            filename="sample.pdf",
            file_path="/data/sample.pdf",
            personal_info=PersonalInfo(name="Test User", email="test@test.com"),
        )
        doc.missing_fields = detect_missing_fields(doc)
        csv_path = export_to_csv(doc, str(tmp_path))
        assert os.path.exists(csv_path)
        content = open(csv_path).read()
        assert "Test User" in content
        assert "test@test.com" in content


# ─── Integration test with real PDF ──────────────────────────────────────────

class TestPDFExtraction:
    """Requires the sample PDF at data/sample_cvs/ or data/."""

    @staticmethod
    def _find_pdf() -> str | None:
        # Try absolute paths relative to this file's location
        this_dir = Path(__file__).parent
        project_root = this_dir.parent.parent  # backend/tests -> backend -> project root
        candidates = [
            project_root / "data" / "sample_cvs" / "Handler (8).pdf",
            project_root / "Handler (8).pdf",
            this_dir.parent / "data" / "sample_cvs" / "Handler (8).pdf",
        ]
        for p in candidates:
            if p.exists():
                return str(p)
        return None

    def test_pymupdf_extracts_text(self):
        pdf_path = self._find_pdf()
        if not pdf_path:
            pytest.skip("Sample PDF not found — copy it to data/sample_cvs/")
        text = extract_text_pymupdf(pdf_path)
        assert len(text) > 100, "PyMuPDF should extract significant text"

    def test_pdfplumber_extracts_text(self):
        pdf_path = self._find_pdf()
        if not pdf_path:
            pytest.skip("Sample PDF not found — copy it to data/sample_cvs/")
        text = extract_text_pdfplumber(pdf_path)
        assert len(text) > 100, "pdfplumber should extract significant text"

    def test_rule_based_on_real_pdf(self):
        pdf_path = self._find_pdf()
        if not pdf_path:
            pytest.skip("Sample PDF not found")
        text = extract_text_pymupdf(pdf_path)
        if len(text) < 100:
            pytest.skip("PDF extracted text too short for meaningful test")
        result = rule_based_extract(text)
        assert "personal_info" in result
        assert isinstance(result["skills"], list)
        assert isinstance(result["publications"], list)
