# TALASH — Milestone 2 Report

## Core Extraction, Analysis Pipeline & Intermediate Web Application

**Project:** TALASH — LLM-Powered Smart HR Recruitment System  
**Milestone:** 2 of 3  
**Date:** April 26, 2026  
**Total Marks Available:** 25

---

## Executive Summary

Milestone 2 delivers a fully operational CV analysis pipeline — from raw PDF ingestion through structured extraction, deep educational and experience analysis, missing-information detection, personalized email drafting, and a rich intermediate web application. All rubric criteria are implemented and functional.

---

## Rubric Achievement Summary

| Criterion                                                     | Marks Available |     Status      |
| ------------------------------------------------------------- | :-------------: | :-------------: |
| CV parsing and structured extraction                          |        6        |     ✅ Full     |
| Educational profile analysis                                  |        5        |     ✅ Full     |
| Professional experience analysis                              |        4        |     ✅ Full     |
| Missing-information detection and personalized email drafting |        4        |     ✅ Full     |
| Intermediate web application functionality                    |        6        |     ✅ Full     |
| **Total**                                                     |     **25**      | **✅ Complete** |

---

## 1. Working CV Ingestion Pipeline

### 1.1 API-Based Upload (`POST /api/upload`)

- Accepts PDF files (validated by extension and MIME type)
- File size limit enforced (configurable, default 50 MB)
- Safe filename handling with automatic counter-suffix deduplication
- Immediately inserts a `processing` record into MongoDB and returns a candidate ID
- Spawns a non-blocking background task (`BackgroundTasks`) for the full parse → analyze pipeline
- Frontend polls every 1 second until `processing_status === "done"` or `"failed"`

### 1.2 Folder-Based Watching (`FolderWatcher` + `main.py` lifespan)

- `watchdog`-based `Observer` monitors the `cv_uploads/` directory recursively
- New `.pdf` files dropped into the folder are detected via `on_created` events
- Events are pushed to an `asyncio.Queue` thread-safely using `call_soon_threadsafe`
- A dedicated `asyncio.Task` (`_watcher_queue_worker`) drains the queue and runs the full parse → analyze pipeline for each file
- Duplicate detection: skips files already in MongoDB by `file_path`
- **Fixed in this milestone:** wired into `app/main.py` lifespan startup/shutdown

---

## 2. CV Parsing and Structured Extraction (6 marks)

### 2.1 Text Extraction Engine

- **Primary:** PyMuPDF (`fitz`) — fast, high-fidelity text extraction
- **Secondary:** pdfplumber — with structured table extraction
- Both engines run; the richer result (more characters) is kept; table content is appended
- Warning emitted for image-based (scanned) PDFs under 100 characters

### 2.2 LLM Extraction

- Structured JSON extraction via a detailed prompt to Ollama/Gemini/OpenAI/Grok
- Covers: `personal_info`, `education[]`, `experience[]`, `publications[]`, `books[]`, `patents[]`, `supervision[]`, `skills[]`
- JSON cleaning: strips markdown fences, repairs common malformations
- Falls back to rule-based if LLM is unavailable or returns invalid JSON

### 2.3 Rule-Based Fallback

- **Personal info:** regex patterns for email, phone, LinkedIn/GitHub URLs
- **Education:** keyword-based section detection, level mapping (Matric → SSE, Inter → HSSC, BS/BE → UG, MS/MPhil → PG, PhD)
- **Score normalization:** `_normalize_score()` handles CGPA/4.0 (1-digit), percentage (2-digit), raw marks/1100 (Pakistani board scale, 3+ digit)
- **Experience:** section detection for job titles, organizations, date ranges
- **Skills:** explicit section scan; inferred from education specializations and publication topics if absent
- **Publications:** DOI, author pattern, year, venue regexes

### 2.4 Structured Output (CSV + MongoDB)

- Parsed data saved as structured CSV in `data/processed/`
- Full document stored in MongoDB with all sub-arrays intact

### 2.5 Missing Field Detection at Parse Time

`cv_parser.detect_missing_fields()` checks:

- Personal: name, email
- Per education record: marks/CGPA, institution
- Experience records presence
- Per publication: year, venue

---

## 3. Educational Profile Analysis (5 marks)

**Service:** `backend/app/services/education_analyzer.py`  
**Model:** `EducationAnalysis` with `education_score: 0–100`

### 3.1 Institution Quality Lookup

- Fuzzy matching (`rapidfuzz`, `token_set_ratio`, cutoff 72) against `university_rankings.json`
- Returns: HEC category (W1/W2/X/Y/Z), QS rank, THE rank, tier, matched name
- Low-quality institution flag reduces score

### 3.2 Gap Detection

- Compares consecutive degree `end_year` → `start_year`
- Gaps > 1 year are flagged with `justified: bool`
- Justification from cross-checking simultaneous employment records

### 3.3 Performance Trend Analysis

- Normalizes all scores to a 0–100 scale across academic levels
- Detects `improving` / `declining` / `stable` / `mixed` trends
- Comparison order: SSE → HSSC → UG → PG → PhD

### 3.4 Specialization Consistency

- Word-overlap heuristic across UG / PG / PhD specializations
- Produces `consistent` / `partial` / `inconsistent` label

### 3.5 Scoring Formula

```
score = avg_normalized_marks (max 40)
      + level_bonus (PhD=25, PG=20, UG=15, HSSC=8)
      + trend_bonus (improving=5)
      − gap_penalty (per unjustified gap, max 15)
      + record_completeness_bonus (max 5)
```

### 3.6 LLM Enhancement

- Rule-based score computed first for reliability
- LLM called for richer qualitative assessment (specialization alignment, interdisciplinary trends)
- Final score = average of rule-based + LLM score

---

## 4. Professional Experience and Employment History Analysis (4 marks)

**Service:** `backend/app/services/experience_analyzer.py`  
**Model:** `ExperienceAnalysis` with `experience_score: 0–100`

### 4.1 Robust Date Parsing

- Handles: `"Jan 2020"`, `"2020"`, `"January 2020"`, `"present"` / `"current"` / `"ongoing"` (mapped to current date)
- Computes precise durations in years and months

### 4.2 Total Experience (no double-counting)

- Merges overlapping employment intervals before summing
- Produces `total_experience_years` as a float

### 4.3 Career Trajectory

- Seniority keyword mapping (5 levels: intern/student → professor/dean/CEO)
- Produces: `ascending` / `descending` / `lateral` / `mixed`

### 4.4 Overlap Detection

- Education–employment overlaps > 3 months: assessed as `legitimate` (part-time/RA/TA) vs `needs_clarification`
- Job–job overlaps > 1 month: flagged with period and assessment

### 4.5 Gap Detection

- Employment gaps > 3 months flagged
- Justified by: education enrollment, publications during the period

### 4.6 Scoring Formula

```
score = years_score (max 30, log-scaled)
      + trajectory_bonus (ascending=10, lateral=5)
      + roles_count_bonus (max 10)
      + seniority_bonus (max 10)
      − gap_penalty (per unjustified gap, max 15)
      − overlap_penalty (per unresolved overlap)
```

### 4.7 LLM Enhancement

Same pattern as education: rule-based first, LLM enrichment, score averaged.

---

## 5. Missing Information Detection and Personalized Email Drafting (4 marks)

**Service:** `backend/app/services/email_generator.py`  
**Endpoint:** `POST /api/candidates/{id}/email-draft`

### 5.1 Comprehensive Missing-Info Detection

`detect_missing_info_detailed()` checks 20+ fields with severity levels:

| Severity   | Examples                                   |
| ---------- | ------------------------------------------ |
| `critical` | email, name                                |
| `high`     | education institution, employment records  |
| `medium`   | publication venue, experience description  |
| `low`      | phone, LinkedIn, current employment status |

### 5.2 LLM-Personalized Email Generation

- Constructs a rich prompt with: candidate name, missing items by severity, existing data snippet
- Returns a structured `EmailDraft`: subject, body, missing_items list
- Email is personalized — references specific missing fields with polite, professional tone
- Rule-based template fallback if LLM unavailable (grouped by severity section)

### 5.3 Frontend Email Drafts Page (`/email-drafts`)

- Lists all candidates with `missing_fields_count > 0`
- Lazy-generates email on first expand (calls backend on demand)
- Regenerate button, clipboard copy, `mailto:` direct send link
- Severity-colored missing field tags

---

## 6. Initial Candidate Summary Generation

**Service:** `backend/app/services/candidate_analyzer.py` → `_generate_summary_with_llm()`

- After all analyses complete, calls LLM with: name, highest degree, institution, total experience years, top 5 skills, publication count, key achievements
- Produces a 3–5 sentence professional summary stored as `summary` on the document
- Rule-based fallback produces a structured template summary if LLM unavailable
- Displayed prominently on the candidate profile Overview tab

---

## 7. Partial Research Profile Processing

**Service:** `backend/app/services/research_analyzer.py`  
**Model:** `FullResearchProfile` / `ResearchProfileSummary`

For Milestone 2, the research analyzer provides:

- Total publication count, journal/conference/book-chapter breakdown
- Publication year range and trend
- Primary research areas (extracted from venue names and publication titles)
- `research_score` computation based on publication count and quality indicators

Full quality scoring (Scopus/WoS indexing, CORE ranks, quartile assignment) is the Milestone 3 component.

---

## 8. Tabular Outputs

All data is surfaced as structured tables in the frontend:

| Table                | Location                             | Fields                                                               |
| -------------------- | ------------------------------------ | -------------------------------------------------------------------- |
| Candidates list      | `/candidates`                        | Name, Edu Level, Status, Skills, Publications, Missing count, Scores |
| Education records    | Candidate profile → Education tab    | Level, Degree, Institution, Years, Score                             |
| Experience records   | Candidate profile → Experience tab   | Title, Organization, Period, Type, Seniority                         |
| Publications         | Candidate profile → Publications tab | Type, Title, Authors, Venue, Year, DOI                               |
| Career progression   | Experience tab                       | Seniority-ordered timeline                                           |
| Institution quality  | Education tab                        | HEC category, QS/THE rank, tier                                      |
| Missing fields       | Candidate profile overview           | Field name, severity badge                                           |
| Dashboard aggregates | `/dashboard`                         | Edu level distribution, publication types, top skills                |

---

## 9. Initial Charts / Graphs

All charts implemented as custom SVG/CSS (no third-party chart library dependency):

| Chart                        | Type                  | Location          | Data                                         |
| ---------------------------- | --------------------- | ----------------- | -------------------------------------------- |
| Education Level Distribution | Horizontal bar chart  | Dashboard         | Count per level (PhD, PG, UG, etc.)          |
| Publication Types            | Donut chart (SVG)     | Dashboard         | Journal / Conference / Book-chapter split    |
| Top Skills                   | Horizontal bar chart  | Dashboard         | Top 20 skills by candidate count             |
| Score Comparison             | Grouped progress bars | Dashboard         | Overall, Education, Experience per candidate |
| Score progress bars          | Inline progress bars  | Candidate profile | Overall, Education, Experience, Research     |
| Score comparison bars        | Multi-candidate bars  | Compare page      | Overall, Education, Experience per candidate |

---

## 10. Intermediate Web Application — Page Summary

| Page                  | Route              | Key Features                                                                                                                              |
| --------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| **Home / Upload**     | `/`                | Drag-and-drop PDF upload, real-time status polling, upload history, stats bar                                                             |
| **Dashboard**         | `/dashboard`       | 4 KPI cards, 4 chart types, live MongoDB aggregation                                                                                      |
| **Candidates List**   | `/candidates`      | Sortable table, text search, status badges, score columns                                                                                 |
| **Candidate Profile** | `/candidates/[id]` | 7-tab layout: Overview, Education, Experience, Publications, Skills, Analysis, Raw CV; Re-analyze button; missing-info banner             |
| **Compare**           | `/compare`         | Multi-candidate score bars, side-by-side cards, skills comparison with shared-skill highlighting, education gaps, missing-field summaries |
| **Email Drafts**      | `/email-drafts`    | Lazy email generation, regenerate, copy, mailto                                                                                           |
| **Settings**          | `/settings`        | Live LLM provider hot-swap (Ollama/Gemini/OpenAI/Grok), model selector, health indicators                                                 |

---

## Technical Architecture

### Backend Stack

- **Framework:** FastAPI (async) with Motor (async MongoDB driver)
- **PDF parsing:** PyMuPDF + pdfplumber (dual-engine)
- **LLM providers:** Ollama (local), Google Gemini, OpenAI, Grok/xAI — runtime switchable
- **Fuzzy matching:** rapidfuzz for institution and publisher lookups
- **Scheduling:** APScheduler (monthly/quarterly data refresh)
- **File monitoring:** watchdog (folder-based CV ingestion)

### Frontend Stack

- **Framework:** Next.js 14 (App Router) with TypeScript
- **Styling:** Tailwind CSS with custom Material You design tokens
- **Charts:** Custom SVG/CSS (no chart library dependency)
- **API client:** centralized `lib/api.ts` with environment-aware base URL

### Data Storage

- **Database:** MongoDB (Motor async driver)
- **File storage:** Local filesystem (`data/cv_uploads/`, `data/processed/`)
- **Reference data:** JSON files for university rankings, CORE conferences, academic publishers

---

## Changes Made in This Submission

1. **Folder watcher wired into `main.py`** — `FolderWatcher` now starts as part of the FastAPI lifespan, with a dedicated asyncio queue worker for processing dropped files. Previously the watcher service existed but was never instantiated.

2. **Compare page substantially improved** — Added:
   - Side-by-side score comparison bars (Overall, Education, Experience) with colour-coded per-candidate tracks
   - Education degree level, career trajectory, total experience years
   - Education gap display with justification text
   - Missing fields list with severity
   - AI summary excerpt per candidate
   - Skills comparison section with shared-skill highlighting
   - Education level column in the selection table with missing-fields count

3. **`CandidateListItem` extended with `edu_level`** — Backend model, route builder (`_doc_to_list_item`), and frontend TypeScript type updated to expose the highest education level in list views.

---

## Known Limitations / Future Work (Milestone 3)

- Full journal quality scoring (Scopus/WoS live APIs with quartile data) is the Milestone 3 deliverable; currently rule-based publisher inference is used as an approximation
- CORE conference ranking uses offline JSON; live CORE API integration is planned
- No authentication layer — all endpoints are open (acceptable for academic demo context)
- Folder watcher restart-recovery: files dropped while the server is down will not be auto-processed (manual re-upload or admin trigger workaround)
