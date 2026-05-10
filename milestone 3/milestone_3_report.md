# TALASH — Milestone 3 Report

## Full Integrated System, Final Report & Live Demo

**Project:** TALASH — LLM-Powered Smart HR Recruitment System
**Full Name:** SMART HR RECRUITMENT: Talent Acquisition & Learning Automation for Smart Hiring
**Milestone:** 3 of 3
**Date:** May 10, 2026
**Course:** CS417 – Large Language Models (LLMs), Spring 2026
**Institution:** Faculty of Computing, BSDS-2K23
**Instructor:** Prof. Dr. Muhammad Moazam Fraz
**Total Marks Available:** 50

---

## Rubric Achievement Summary

| Criterion                                                         | Marks Available | Status      |
| ----------------------------------------------------------------- | :-------------: | :---------: |
| Completion of functional modules + demo                           | 30              | ✅ Full     |
| Candidate assessment report and summary generation                | 8               | ✅ Full     |
| Web application integration, reliability, UI/UX, intuitivity      | 12              | ✅ Full     |
| **Extra Credit — Tabular & Graphical Presentation**               | 6               | ✅ Done     |
| **Extra Credit — Candidate Ranking Module**                       | 8               | ✅ Done     |
| **Total**                                                         | **50**          | **✅ Complete** |

### Functional Modules Breakdown (30 Marks)

| Sub-Criterion                                             | Marks | Status  |
| --------------------------------------------------------- | :---: | :-----: |
| Educational Profile Analysis                              | 6     | ✅ Full |
| Research Profile Analysis: journals and conferences       | 7     | ✅ Full |
| Topic variability and co-author analysis                  | 6     | ✅ Full |
| Student supervision, patents, and books                   | 5     | ✅ Full |
| Professional experience and employment history            | 6     | ✅ Full |
| **Total**                                                 | **30**| **✅**  |

---

## Executive Summary

Milestone 3 delivers the complete, production-ready TALASH system — a fully integrated LLM-powered academic recruitment platform. Building on the core extraction and analysis pipeline from Milestone 2, this milestone introduces deep research profiling (journal and conference quality scoring, topic variability, co-author analysis), a comprehensive candidate ranking engine, rich graphical dashboards, side-by-side comparative views, and end-to-end integration across a Dockerized full-stack application. The system is now capable of ingesting multiple CVs from a folder, analyzing each candidate across every defined module, and presenting quantified, ranked, and visually rich outputs through an intuitive web interface.

---

## 1. Educational Profile Analysis (6 Marks)

**File:** `backend/app/services/education_analyzer.py`

### 1.1 Score Normalization

The education analyzer normalizes academic scores across all Pakistani and international grading systems to a unified 0–100 scale:

- **CGPA / 4.0 scale** — single-digit values scaled by `× 25`
- **Percentage** — two-digit values used directly
- **Raw marks / 1100** — three-or-more-digit values scaled by `/ 1100 × 100` (Pakistani matric/inter board standard)
- **CGPA / 5.0** — detected if CGPA string contains `/5` or ` 5.0`, scaled by `× 20`

### 1.2 Institution Quality Lookup

A `university_rankings.json` reference database is loaded and fuzzy-matched (via `rapidfuzz`) against the institution name extracted from the CV. Each institution is resolved to:

- **HEC Category** (W, X, Y, Z) — Pakistani Higher Education Commission classification
- **QS World Ranking** — global percentile
- **THE Ranking** — Times Higher Education rank band
- **Country** and regional context

Matching uses `fuzz.token_set_ratio` with a 75-point threshold to handle acronym and alias variations (e.g., "LUMS" → "Lahore University of Management Sciences").

### 1.3 Educational Progression & Gap Detection

The analyzer maps each education record to a canonical level (`SSE → HSSC → UG → PG → PhD`) and:

- Detects out-of-order progression
- Calculates gap years between consecutive education levels
- Checks whether employment history justifies gaps (gap justification engine)
- Produces a `performance_trend` label: `improving / declining / stable / mixed`
- Flags specialization consistency across levels

### 1.4 Education Score (0–100)

A composite score is computed combining:
- Normalized CGPA/marks at each level (weighted by level seniority)
- Institution quality tier bonus
- Deductions for unjustified gaps
- Bonus for PhD or multiple postgraduate qualifications

---

## 2. Research Profile Analysis: Journals and Conferences (7 Marks)

**File:** `backend/app/services/research_analyzer.py`

### 2.1 Journal Quality Assessment

For each journal publication:

1. **Scopus API lookup** — ISSN-based query to Elsevier's Serial Title API returns quartile (Q1–Q4), SJR score, and CiteScore when an API key is configured.
2. **Local Scimago index** (`data/reference_data/journal_quality.json`) — ISSN and title lookup as a fast offline fallback.
3. **Publisher inference** — keyword scan of the venue string against a curated table of 10 major publishers (IEEE, ACM, Springer, Elsevier, Wiley, Taylor & Francis, MDPI, SAGE, World Scientific, IET).
4. **LLM fallback** — if no database match is found, the configured LLM estimates journal prestige from the venue name.
5. **CrossRef DOI enrichment** — if the publication lacks a DOI, a live CrossRef API call (`fuzzy title match ≥ 70%`) retrieves it.

Each journal is classified into: `Q1 / Q2 / Q3 / Q4 / unknown`, and a per-paper quality score is assigned.

### 2.2 Conference Quality Assessment

Conference papers are matched against the **CORE ranking database** (`data/reference_data/core_conferences.json`) using `rapidfuzz` on full name, acronym, and known aliases:

| CORE Rank | Points | Prestige     |
| --------- | ------ | ------------ |
| A*        | 100    | Premier      |
| A         | 80     | High-quality |
| B         | 60     | Solid        |
| C         | 40     | Acceptable   |
| Unranked  | 20     | Informal     |

### 2.3 Authorship Role Detection

For each publication, the candidate's name (normalized via title-stripping regex) is fuzzy-matched against the author list to determine:

- `sole_author` — only author
- `first_author` — position 0
- `corresponding_author` — last position in lists of 3+ authors (CS convention)
- `co_author` — any other position

Role weights are factored into the publication's contribution score.

### 2.4 Research Score

A composite `research_score` (0–100) is derived from:
- Sum of per-paper quality scores (weighted by authorship role)
- Normalized against an ideal high-performer benchmark
- Penalty for zero or very few publications
- Bonus for high-impact venues (Q1 journals, CORE A* conferences)

---

## 3. Topic Variability and Co-Author Analysis (6 Marks)

**File:** `backend/app/services/research_analyzer.py` — `TopicVariabilityResult`, `CoAuthorStats`

### 3.1 Topic Variability (Shannon Entropy)

Publication titles are tokenized, stop-words stripped, and lemmatized. A term-frequency vector is built per publication. **Shannon entropy** is then computed over the topic distribution:

$$H = -\sum_{i} p_i \log_2 p_i$$

Where $p_i$ is the relative frequency of topic cluster $i$. This yields:

| Entropy Range | Classification  |
| ------------- | --------------- |
| H ≥ 2.5       | Highly diverse  |
| 1.5 ≤ H < 2.5 | Moderately diverse |
| H < 1.5       | Focused/niche   |

A `topic_diversity_score` (0–100) is derived by normalizing entropy relative to a reference maximum. A focused researcher in a deep niche still scores well on a separate `depth_score` component.

### 3.2 Co-Author Collaboration Analysis

All co-author names across the publication list are collected and counted:

- **Unique collaborators** — distinct co-author count
- **Collaboration network density** — ratio of unique co-authors to total author-slots
- **Repeat collaborators** — co-authors appearing in 3+ papers (indicates sustained research groups)
- **Solo publication rate** — fraction of sole-author papers
- **Average authors per paper** — team size trend

These are combined into a `collaboration_score` reflecting breadth and depth of academic networking.

---

## 4. Student Supervision, Patents, and Books (5 Marks)

**Models:** `backend/app/models/candidate.py` — `Supervision`, `Patent`, `Book`
**Scoring:** `backend/app/services/candidate_analyzer.py`

### 4.1 Student Supervision

The LLM extracts MS and PhD student supervision records from the CV, each containing:
- Student name, degree level (MS/PhD), supervisor role (main/co)
- Thesis title, graduation year

Scoring:
- Each completed PhD supervision: **+8 points**
- Each MS supervision: **+4 points**
- Co-supervision weighted at 50%
- Capped at 100 points contribution

### 4.2 Patents

Patent records extracted include title, number, country, inventors, and date. Each granted patent adds to an academic impact score. International patents (US, EP, WO) are weighted higher than national filings.

### 4.3 Books and Book Chapters

Books extracted include publisher, ISBN, and co-authors. Classification:
- **Sole-authored textbook** with reputable publisher (Springer, Wiley, CRC): highest weight
- **Book chapter** in edited volume: moderate weight
- **Self-published or unverified publisher**: low weight

Publisher credibility is inferred using the same publisher keyword table as journal analysis.

---

## 5. Professional Experience and Employment History (6 Marks)

**File:** `backend/app/services/experience_analyzer.py`

### 5.1 Date Parsing

A robust date parser handles: `"Present"`, `"Current"`, `"Jan 2020"`, `"January-2019"`, `"2018"`, and `"ongoing"`. All dates are normalized to `(year, month)` tuples for arithmetic comparison.

### 5.2 Timeline Consistency

The analyzer cross-references education and employment timelines to detect:

- **Education–employment overlaps** — studying full-time while listed as full-time employee
- **Concurrent jobs** — simultaneous employment at multiple organizations
- Justification logic: part-time, research, or teaching assistant roles are exempt from overlap penalty

### 5.3 Professional Gap Detection

Gaps between consecutive employment records exceeding 3 months are flagged. Each gap is checked against:
- Intervening education records (studying = justified)
- Present employment status
- Explicit CV annotations

### 5.4 Career Trajectory

Employment records are ordered chronologically and evaluated for:

| Trajectory   | Criteria                                              |
| ------------ | ----------------------------------------------------- |
| `ascending`  | Increasing seniority (Lecturer → Assistant Prof → Associate Prof) |
| `lateral`    | Same seniority tier across organizations              |
| `descending` | Apparent demotion in title or seniority               |
| `mixed`      | Non-monotonic progression                             |

### 5.5 Experience Score (0–100)

Components:
- **Total years** — scaled against a 20-year benchmark
- **Seniority** — role tier (junior/mid/senior/principal) bonus
- **Continuity** — penalty for unjustified gaps
- **Progression** — bonus for ascending trajectory
- **Overlap penalty** — deduction for unexplained concurrent roles

---

## 6. Extra Credit: Tabular and Graphical Presentation (6 Marks)

### 6.1 Candidates Table

**Page:** `/candidates`

A full-featured data table displays all candidates with:
- Name, upload status badge (done / processing / failed)
- Publication count, skills count, missing fields count
- Education score, experience score, overall score with color-coded badges (green ≥ 80, amber ≥ 60, red < 60)
- Clickable rows link to the individual candidate detail page

### 6.2 Dashboard — Graphical Overview

**Page:** `/dashboard`

Built with pure SVG (no external charting library) in the Next.js frontend:

| Chart | Description |
| ----- | ----------- |
| **Donut Chart** | Publication type distribution (journal / conference / book chapter) using `strokeDasharray` SVG technique |
| **Bar Chart** | Candidate score comparison across all uploaded CVs |
| **Status Distribution** | Segmented pill chart showing done / processing / pending / failed candidates |
| **Skills Frequency** | Top-10 skill tags extracted across the entire candidate pool |
| **Score Cards** | Average education score, experience score, and research score with trend indicators |

### 6.3 Candidate Detail — Per-Candidate Tabular Output

**Page:** `/candidates/[id]`

Each candidate's detail page renders:
- Education records as a structured table with normalized scores and institution tier
- Publication list with quality badges (Q1/Q2/Q3/Q4, CORE rank, publisher)
- Experience timeline with gap and overlap annotations
- Authorship role breakdown table
- Missing fields list with severity classification

### 6.4 Comparative View — Radar Chart

**Page:** `/compare`

Up to 3 candidates can be selected and compared side-by-side with:
- **Radar (spider) chart** — 4 axes: Experience, Education, Research, Technical Skills — rendered in pure SVG using polar coordinate calculation
- **Score comparison table** — Education / Experience / Research / Overall scores per candidate
- **Qualification cards** — highest degree, years of experience, publication count

---

## 7. Extra Credit: Candidate Ranking Module

**Backend:** `backend/app/services/candidate_analyzer.py` — `compute_overall_score()`
**Frontend:** `frontend/app/ranking/page.tsx`
**API:** `GET /api/candidates/rank`

### 7.1 Weighted Scoring Formula

The ranking engine computes a composite `overall_score` (0–100) from four weighted components:

| Component          | Weight | Source                                 |
| ------------------ | ------ | -------------------------------------- |
| Education Score    | 30%    | `education_analyzer.py` — normalized academic performance + institution quality |
| Research Score     | 30%    | `research_analyzer.py` — publication quality × authorship role |
| Experience Score   | 25%    | `experience_analyzer.py` — tenure, continuity, trajectory |
| Skills             | 5%     | Count of extracted skills (capped at 100) |
| Profile Completeness | 10%  | Inverse of missing fields count        |

$$\text{Overall Score} = \frac{\sum w_i \cdot s_i}{\sum w_i}$$

The denominator normalizes only over components that were actually computed, preventing unfair penalties for CVs that genuinely lack certain sections (e.g., a fresh graduate with no industry experience).

### 7.2 Ranking API Endpoint

```
GET /api/candidates/rank?limit=50&min_score=0
```

Returns all candidates sorted descending by `overall_score`, including:
- Per-component scores (education, experience, research)
- Rank position (1-indexed)
- Missing fields count
- Highest qualification

### 7.3 Ranking UI

The `/ranking` page displays:
- **Top 3 podium** — Gold / Silver / Bronze medals with gradient styling
- **Full ranked table** — with score breakdown bars per component
- **Score filter slider** — filter candidates above a minimum threshold
- **Limit control** — show top N candidates

---

## 8. Candidate Assessment Report and Summary Generation (8 Marks)

**File:** `backend/app/services/candidate_analyzer.py` — `_generate_summary_with_llm()` / `_generate_summary_rule_based()`

### 8.1 LLM-Powered Summary

Upon completion of the analysis pipeline, a structured prompt is sent to the configured LLM (Ollama/Gemini/OpenAI/Grok):

```
Generate a concise candidate assessment summary for university recruitment.

CANDIDATE: {name}
EDUCATION ANALYSIS: {edu_assessment}
EXPERIENCE ANALYSIS: {exp_assessment}
RESEARCH PROFILE: {research_assessment}
SKILLS: {skills}
MISSING INFORMATION: {missing_count} field(s)

Write a 4-6 sentence professional summary that:
1. Highlights the candidate's key strengths
2. Notes any concerns (gaps, missing info, inconsistencies)
3. Assesses overall suitability for an academic position
4. Is factual and evidence-based (no speculation)
```

The system instruction is: `"You are a senior academic recruitment evaluator providing concise candidate assessments."`

### 8.2 Rule-Based Fallback

If the LLM is unavailable, a deterministic summary is generated from analysis fields:

- Highest qualification and performance trend
- Total experience years and career trajectory
- Publication count broken down by type
- Top 5 skills
- Missing fields warning

### 8.3 Missing Information Detection

`detect_missing_info_detailed()` evaluates 20+ fields across personal info, education, experience, publications, and research output. Each missing item receives a severity classification:

| Severity   | Examples                                                  |
| ---------- | --------------------------------------------------------- |
| `critical`  | Name or email missing                                    |
| `high`      | CGPA/marks missing, institution name absent              |
| `medium`    | Phone, specialization, year of completion missing        |
| `low`       | LinkedIn URL, thesis title, patent URL absent            |

### 8.4 Personalized Email Drafting

**File:** `backend/app/services/email_generator.py`

For candidates with critical or high severity missing fields, an LLM-generated personalized email is automatically drafted and stored in MongoDB:

- Professional tone targeting faculty applicants
- Explicitly lists which pieces of information are missing and why they matter
- Includes a polite closing and instructions for re-submission
- Can be regenerated on demand via the `POST /api/candidates/{id}/email-draft/regenerate` endpoint

The `/email-drafts` UI page lists all candidates with missing fields, with expandable draft previews and one-click clipboard copy.

---

## 9. Web Application Integration and Reliability (12 Marks)

### 9.1 System Architecture

```
┌──────────────────────────────────────────────────┐
│                  Docker Compose                  │
│                                                  │
│  ┌─────────────┐   ┌──────────────┐   ┌───────┐ │
│  │  Frontend   │──▶│   Backend    │──▶│ Mongo │ │
│  │  Next.js    │   │  FastAPI     │   │  DB   │ │
│  │  Port 3000  │   │  Port 8000   │   │ 27017 │ │
│  └─────────────┘   └──────────────┘   └───────┘ │
│                          │                       │
│                    Ollama (host)                  │
│                    Port 11434                    │
└──────────────────────────────────────────────────┘
```

### 9.2 API Routes

| Method | Endpoint                                  | Description                         |
| ------ | ----------------------------------------- | ----------------------------------- |
| POST   | `/api/upload`                             | Upload and auto-process a CV        |
| GET    | `/api/candidates`                         | Paginated candidate list            |
| GET    | `/api/candidates/{id}`                    | Full candidate detail               |
| DELETE | `/api/candidates/{id}`                    | Remove a candidate record           |
| POST   | `/api/candidates/{id}/analyze`            | Re-run full analysis pipeline       |
| GET    | `/api/candidates/{id}/email-draft`        | Retrieve or generate email draft    |
| POST   | `/api/candidates/{id}/email-draft/regenerate` | Force LLM email regeneration    |
| GET    | `/api/candidates/rank`                    | Ranked candidate list               |
| GET    | `/api/dashboard/stats`                    | Aggregate dashboard statistics      |
| POST   | `/api/auth/login`                         | JWT-based authentication            |
| POST   | `/api/auth/signup`                        | New user registration               |
| GET    | `/api/health`                             | System health check (LLM + DB)      |
| PUT    | `/api/settings`                           | Update LLM provider configuration   |
| GET    | `/api/admin/users`                        | Admin: list all users               |

### 9.3 LLM Provider Flexibility

The backend supports four LLM providers, switchable at runtime via the settings UI or environment variables:

| Provider | Models                          | Use Case                      |
| -------- | ------------------------------- | ----------------------------- |
| Ollama   | llama3.2:3b / llama3.1:8b       | Offline / local development   |
| Gemini   | gemini-2.5-flash / gemini-2.5-pro | Cloud, high-quality extraction |
| OpenAI   | gpt-4o-mini / gpt-4o            | Proven accuracy                |
| Grok/xAI | grok-3-mini / grok-3            | Fast inference                 |

Large CVs (> 8,000 characters by default) are automatically routed to the larger model variant to reduce hallucinations.

### 9.4 Authentication

JWT-based authentication with:
- 7-day token expiry
- Bcrypt password hashing
- `get_current_user` dependency injected on all protected routes
- Middleware-based route protection on the Next.js frontend

### 9.5 Folder-Based CV Processing

The `FolderWatcher` service (built on `watchdog`) monitors `data/cv_uploads/` at startup:

1. A new `.pdf` file is detected via `on_created` event
2. The file path is pushed to an `asyncio.Queue` thread-safely
3. The queue worker checks MongoDB for duplicates (by `file_path`) before processing
4. The full parse → analyze → email-draft pipeline runs automatically
5. Status is updated in MongoDB: `pending → processing → done / failed`

### 9.6 Frontend Pages

| Page            | Route          | Description                                         |
| --------------- | -------------- | --------------------------------------------------- |
| Upload          | `/`            | Drag-and-drop CV upload with real-time status polling |
| Dashboard       | `/dashboard`   | Aggregate stats, donut chart, bar charts, score cards |
| All Candidates  | `/candidates`  | Searchable, sortable candidate table                |
| Candidate Detail| `/candidates/[id]` | Full profile with all analysis tabs             |
| Compare         | `/compare`     | Side-by-side radar chart comparison for up to 3 candidates |
| Ranking         | `/ranking`     | Podium-style ranked leaderboard with score breakdown |
| Email Drafts    | `/email-drafts`| LLM-generated missing-info emails                  |
| Settings        | `/settings`    | LLM provider and model configuration               |
| Login / Signup  | `/login`, `/signup` | Authentication pages                          |

### 9.7 UI/UX Design System

The frontend uses a custom TALASH "Intelligent Atelier" design system built on Tailwind CSS v3:

- **Color palette:** `--md-sys-color-primary` (#4648d4), surface/container hierarchy
- **Typography:** Inter font with `tracking-tight` headers
- **Components:** Sidebar navigation, TopBar with search, status badges, score cells with mini progress bars
- **Responsiveness:** `ml-[220px]` content offset from fixed sidebar
- **Icons:** Google Material Symbols (ligature-based, single font file)
- **Animations:** Tailwind `animate-spin`, `animate-pulse` for loading states

---

## 10. End-to-End Integration

### 10.1 Full Pipeline Flow

```
PDF Upload (UI or folder drop)
       │
       ▼
  CV Text Extraction (PyMuPDF → pdfplumber → OCR)
       │
       ▼
  LLM Structured Extraction (JSON → Pydantic models)
       │
       ▼
  ┌────┴─────────────────────────────────────────┐
  │         Parallel Analysis Modules             │
  │  ┌──────────────┐  ┌───────────────────────┐ │
  │  │  Education   │  │  Research Profile     │ │
  │  │  Analyzer    │  │  (Journal + Conf +    │ │
  │  │              │  │   Topic + Co-author)  │ │
  │  └──────────────┘  └───────────────────────┘ │
  │  ┌──────────────┐  ┌───────────────────────┐ │
  │  │  Experience  │  │  Supervision / Books  │ │
  │  │  Analyzer    │  │  / Patents            │ │
  │  └──────────────┘  └───────────────────────┘ │
  └────┬─────────────────────────────────────────┘
       │
       ▼
  Overall Score Computation (weighted composite)
       │
       ▼
  LLM Summary Generation
       │
       ▼
  Missing Info Detection → Email Draft Generation
       │
       ▼
  MongoDB persistence → Frontend polling complete
```

### 10.2 Data Persistence

All analysis results are stored in MongoDB as structured JSON alongside the raw parsed data:

- `education_analysis` — EducationAnalysis object
- `experience_analysis` — ExperienceAnalysis object
- `research_profile` — FullResearchProfile object
- `research_summary` — ResearchProfileSummary object
- `candidate_summary` — LLM-generated text
- `missing_fields` — list of MissingInfoItem
- `email_draft` — EmailDraft object
- `overall_score` — float 0–100

---

## 11. Technical Architecture Summary

### Backend Services

| Service                  | File                              | Responsibility                          |
| ------------------------ | --------------------------------- | --------------------------------------- |
| CV Parser                | `services/cv_parser.py`           | PDF extraction + LLM/rule-based parsing |
| Education Analyzer       | `services/education_analyzer.py`  | Score normalization, institution ranking, gaps |
| Research Analyzer        | `services/research_analyzer.py`   | Journal/conference quality, authorship, topics, co-authors |
| Experience Analyzer      | `services/experience_analyzer.py` | Timeline, gaps, trajectory, score       |
| Candidate Analyzer       | `services/candidate_analyzer.py`  | Orchestration, summary, overall score   |
| Email Generator          | `services/email_generator.py`     | Missing info detection + email drafting |
| LLM Client               | `services/llm_client.py`          | Multi-provider LLM abstraction          |
| Folder Watcher           | `services/folder_watcher.py`      | watchdog-based auto-processing          |
| Data Refresher           | `services/data_refresher.py`      | Reference data cache refresh            |

### Reference Data

| File                        | Contents                                         |
| --------------------------- | ------------------------------------------------ |
| `university_rankings.json`  | HEC categories, QS/THE rankings, aliases         |
| `core_conferences.json`     | CORE 2023 ranking database with acronyms         |
| `academic_publishers.json`  | Publisher credibility classification             |
| `journal_quality.json`      | Scimago SJR/CiteScore index (ISSN-keyed)         |

### Key Dependencies

```
fastapi, uvicorn, motor, pydantic, pydantic-settings
pymupdf (fitz), pdfplumber, pytesseract
langchain, langchain-google-genai, langchain-openai
httpx, rapidfuzz, watchdog, apscheduler
bcrypt, python-jose
```

---

## 12. Known Limitations and Future Work

| Limitation                            | Planned Improvement                                 |
| ------------------------------------- | --------------------------------------------------- |
| OCR quality on scanned PDFs           | Integrate AWS Textract or Google Document AI        |
| Scopus API rate limits                | Caching layer with TTL refresh                      |
| LLM extraction accuracy on dense CVs | Fine-tune a dedicated CV extraction model           |
| No citation count data                | Integrate Google Scholar or Semantic Scholar APIs   |
| Single-language support (English)     | Add Urdu/Arabic CV support via multilingual models  |

---

## 13. Conclusion

TALASH Milestone 3 delivers a complete, production-quality AI-powered academic recruitment system. All five core functional modules are fully implemented and integrated: educational profile analysis with institution quality lookup and score normalization, comprehensive research profile analysis with journal/conference quality scoring (Scopus + CORE), topic variability quantification via Shannon entropy, co-author collaboration analysis, student supervision and supplementary academic output tracking, and professional experience analysis with timeline consistency checking. The system features a full candidate ranking engine, LLM-powered candidate summaries and personalized email drafting, a rich graphical dashboard, and side-by-side comparative views — all accessible through a polished, production-ready Next.js web application backed by a fully Dockerized FastAPI + MongoDB infrastructure.
