# TALASH — Smart HR Recruitment Platform

> **LLM-Powered Academic Recruitment System**  
> CS-417: Large Language Models · BSDS-01 · School of Electrical Engineering and Computer Science

[![Python 3.11+](https://img.shields.io/badge/Python-3.11%2B-blue)](https://www.python.org/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-latest-009688)](https://fastapi.tiangolo.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-latest-47A248)](https://www.mongodb.com/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED)](https://docs.docker.com/compose/)

---

## Team

| Name                   | GitHub                                         |
| ---------------------- | ---------------------------------------------- |
| Muhammad Muntazar      | [@Muntazar](https://github.com/Muntazar)       |
| Muhammad Wasif Shakeel | [@Overproness](https://github.com/Overproness) |
| Adyaan Ahmed           | [@Adyaan](https://github.com/Adyaan)           |

**Repository:** [https://github.com/Overproness/talash_llm_project](https://github.com/Overproness/talash_llm_project)  
**Course Instructor:** Prof. Dr. Muhammad Moazam Fraz

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [CV Ingestion & Processing Pipeline](#cv-ingestion--processing-pipeline)
4. [Tech Stack](#tech-stack)
5. [Project Structure](#project-structure)
6. [Prerequisites](#prerequisites)
7. [Setup & Installation](#setup--installation)
8. [Environment Variables](#environment-variables)
9. [Running the Application](#running-the-application)
10. [API Reference](#api-reference)
11. [Frontend Pages](#frontend-pages)
12. [Analysis Modules](#analysis-modules)
13. [LLM Provider Support](#llm-provider-support)
14. [Docker Deployment](#docker-deployment)
15. [Running Tests](#running-tests)
16. [Reference Data](#reference-data)
17. [Reference Data Scraping Pipeline](#reference-data-scraping-pipeline)
18. [Authentication](#authentication)
19. [UI Design System](#ui-design-system)

---

## Overview

TALASH is a fully integrated, LLM-powered academic recruitment platform capable of ingesting multiple CVs, extracting and analyzing candidate data across several dimensions, and presenting ranked, visualized results through a polished web interface.

**Core capabilities:**

- Drag-and-drop PDF CV upload with real-time processing status
- LLM-powered structured extraction (name, education, publications, skills, experience, etc.)
- Deep research profiling: journal/conference quality scoring, topic variability (Shannon entropy), co-author analysis
- Education analysis: score normalization, institution quality lookup (HEC/QS/THE), gap detection
- Professional experience analysis: timeline consistency, career trajectory, gap detection
- Weighted candidate ranking engine (education 30%, research 30%, experience 25%, skills 5%, completeness 10%)
- LLM-generated candidate summaries and personalized missing-info email drafts
- Rich graphical dashboard with donut charts, bar charts, and score cards
- Side-by-side radar chart comparison for up to 3 candidates
- JWT-based authentication, folder-based auto-processing, and full Docker Compose deployment

---

## System Architecture

The system runs as three Dockerized services:

```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────┐
│  Next.js 14     │────▶│  FastAPI Backend     │────▶│  MongoDB     │
│  Port 3000      │     │  Port 8000           │     │  Port 27017  │
└─────────────────┘     └─────────────────────┘     └──────────────┘
                                  │
                          ┌───────▼────────┐
                          │  Ollama (host) │
                          │  Port 11434    │
                          └────────────────┘
```

**Full CV processing pipeline:**

```
PDF Upload → Text Extraction (PyMuPDF → pdfplumber → OCR)
    → LLM Structured Extraction (JSON → Pydantic)
    → Parallel Analysis (Education · Research · Experience · Supervision)
    → Weighted Score Computation
    → LLM Summary + Email Draft Generation
    → MongoDB Persistence → Frontend Polling
```

### CV Ingestion & Processing Pipeline

TALASH features a robust, multi-stage ingestion and analysis pipeline that converts unstructured CV PDF files into highly structured candidate profiles. The complete end-to-end flow operates as follows:

1. **Ingestion & Event Triggering**:
   The platform processes CVs uploaded through two pathways:
   - **Frontend File Upload**: A user uploads a CV via the Next.js drag-and-drop web UI, triggering a `POST /api/upload` API request.
   - **Automated Directory Watcher**: The backend hosts a background service utilizing the `watchdog` library. It monitors the `cv_uploads/` folder (`CV_UPLOAD_DIR`). When a new PDF is placed in this folder, an event is caught and queued asynchronously via an `asyncio.Queue` worker running within the FastAPI app lifecycle.

2. **Multi-CV Boundary Detection & Splitting**:
   Portals often batch multiple applicant PDFs together (e.g., NUST-style portal export sheets).
   - Before parsing, the system runs a fast scan on the PDF pages using regular expressions to detect boundaries containing strings like `Candidate for the Post of`.
   - If a multi-CV file is identified, the system invokes PyMuPDF (`fitz`) to split the document into separate candidate PDFs.
   - It extracts the name of each candidate directly from the first page of their section to generate a personalized filename (e.g. `CV_John_Doe.pdf`).
   - Each resulting file is then treated as an independent candidate upload and processed separately.

3. **Pending State Database Registration**:
   To avoid duplicate processing by folder watchers and provide instant user feedback:
   - The file is assigned a MongoDB record in the `candidates` collection with status `"processing"`.
   - This database entry locks the filename and path, preventing other concurrent workers from picking it up.

4. **Dual-Engine Text Extraction**:
   Extracting layout-agnostic text from resumes is challenging, so TALASH employs a dual-library extraction strategy:
   - **PyMuPDF (`fitz`)**: Serves as the high-speed primary extractor for standard text flow.
   - **`pdfplumber`**: Leveraged specifically to handle tables. If `pdfplumber` finds tables, it translates them into a tab-delimited text grid.
   - The pipeline compares and merges both outputs: the clean prose of PyMuPDF is joined with the structured tables of `pdfplumber` to supply the LLM with contextually accurate layout representations.

5. **Structured Field Extraction (Pydantic Mapping)**:
   The raw text is structured using an LLM or rule-based fallback:
   - **LLM Structured Parser**: The backend prompts the active LLM provider (local Ollama or cloud-based Gemini/OpenAI/Grok) to return a structured JSON response mapping strictly to our core schema models (`PersonalInfo`, `EducationRecord`, `ExperienceRecord`, `Publication`, `Book`, `Patent`, `Supervision`).
   - **Regex Rule Fallback**: If the LLM is unreachable or fails to generate a valid schema, the parser falls back to a local rules engine. This uses regular expressions and custom keyword indices (e.g., matching degree level prefixes like `BS`, `MS`, `PhD` and employment-related anchors) to capture basic details.

6. **Score Normalization & Analytical Enrichment**:
   Once parsed, the candidate document is passed to the specialized analysis modules:
   - **Education normalization ([education_analyzer.py])**: Normalizes CGPAs (out of 4.0 or 5.0), percentages, and raw school marks to a uniform 0–100 scale. It performs fuzzy name searches against the local university ranking database to fetch HEC categories and QS/THE tiers. It also detects education gaps and computes performance trends.
   - **Experience analysis ([experience_analyzer.py])**: Identifies employment histories, maps career progressions, flags overlaps, and checks for unexplained gaps exceeding 3 months.
   - **Research indexing ([research_analyzer.py])**: Maps candidate publications to CORE 2023 conference ranks and Scimago journal best quartiles (Q1–Q4). It tracks authorship positions, evaluates subject areas, and determines research focus/breadth by computing Title Shannon Entropy.
   - **Weighted Score Engine**: Calculates the overall grade using the weighted formula:
     $$\text{Score} = 30\% \text{ Education} + 30\% \text{ Research} + 25\% \text{ Experience} + 5\% \text{ Skills} + 10\% \text{ Completeness}$$
     Fresh graduates are not penalized for missing professional experience; the denominator dynamically ignores missing optional modules.

7. **LLM suitability Summary & Personalized Email Draft**:
   - The structured metrics are passed back to the LLM to output a clean, 4–6 sentence candidate profile evaluation, avoiding speculative language.
   - If critical info is missing (e.g. normalized marks or exact graduation dates), the system triggers [email_generator.py] to construct a professional missing-information email draft, ready to copy from the UI.

8. **Persistence and Frontend Polling**:
   - The finished parsed candidate document, along with all calculated scores, timelines, publications, missing fields, and draft letters is saved to MongoDB.
   - The status is updated to `"done"` (or `"failed"` with the error log stored). The frontend UI (which has been polling the backend) immediately refreshes to display the candidate's dashboard.

---

## Tech Stack

### Backend

| Package                            | Purpose                                              |
| ---------------------------------- | ---------------------------------------------------- |
| Python 3.11+                       | Runtime                                              |
| FastAPI + Uvicorn                  | REST API & ASGI server                               |
| Motor                              | Async MongoDB driver                                 |
| LangChain                          | Multi-provider LLM abstraction                       |
| PyMuPDF / pdfplumber / pytesseract | PDF text extraction                                  |
| rapidfuzz                          | Fuzzy string matching for institution/journal lookup |
| watchdog                           | Folder-based CV auto-processing                      |
| bcrypt + python-jose               | Authentication                                       |
| httpx                              | Async HTTP client (CrossRef, Scopus APIs)            |

### Frontend

| Package                 | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| Next.js 14 (App Router) | Framework                                                 |
| React 18 + TypeScript   | UI                                                        |
| Tailwind CSS v3         | Styling                                                   |
| Pure SVG                | Charts (donut, bar, radar) — no external charting library |

---

## Project Structure

```
talash_llm_project/
├── assets/
│   ├── database/
│   │   └── database_schema_erd.html
│   ├── diagrams/
│   │   ├── cv_ingestion_pipeline.svg
│   │   ├── llm_nlp_pipeline.svg
│   │   ├── module_interaction_data_flow.svg
│   │   └── system_architecture.svg
│   └── ui/                          # UI screenshots
│       ├── candidate_profile.png
│       ├── candidates_list.png
│       ├── compare_candidates.png
│       ├── dashboard.png
│       ├── email_drafts.png
│       ├── home_cv_upload.png
│       └── settings.png
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI entry point
│   │   ├── api/routes/              # upload, candidates, health, settings, auth
│   │   ├── core/
│   │   │   ├── config.py            # Pydantic settings (reads .env)
│   │   │   └── database.py          # MongoDB connection helpers
│   │   ├── models/
│   │   │   └── candidate.py         # Pydantic models / response schemas
│   │   └── services/
│   │       ├── cv_parser.py         # PDF extraction + LLM parsing pipeline
│   │       ├── llm_client.py        # LangChain multi-provider LLM client
│   │       ├── education_analyzer.py
│   │       ├── research_analyzer.py
│   │       ├── experience_analyzer.py
│   │       ├── candidate_analyzer.py
│   │       ├── email_generator.py
│   │       ├── folder_watcher.py    # watchdog-based folder monitoring
│   │       └── data_refresher.py    # Reference data cache refresh
│   ├── data/
│   │   ├── cv_uploads/
│   │   ├── processed/
│   │   └── reference_data/
│   │       ├── university_rankings.json
│   │       ├── core_conferences.json
│   │       ├── academic_publishers.json
│   │       └── journal_quality.json
│   ├── tests/
│   ├── .env.example
│   ├── Dockerfile
│   ├── README.md
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── layout.tsx               # Root layout (Sidebar + TopBar)
│   │   ├── page.tsx                 # CV upload page
│   │   ├── dashboard/
│   │   ├── candidates/              # List + [id] detail
│   │   ├── compare/
│   │   ├── ranking/
│   │   ├── email-drafts/
│   │   ├── login/ & signup/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── candidate/
│   │   └── charts/
│   ├── lib/
│   │   ├── api.ts                   # API client
│   │   └── types.ts                 # Shared TypeScript types
│   ├── .env.local
│   ├── next.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
├── test/
│   ├── Test_CV.pdf
│   ├── Test_CV_2.pdf
│   ├── Test_CV_3.pdf
│   └── Test_CV_4.pdf
├── .gitignore
├── docker-compose.yml
└── vercel.json
```

---

## Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB (local or Atlas)
- At least one LLM provider (see [LLM Provider Support](#llm-provider-support))

---

## Setup & Installation

### Backend

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a virtual environment
python -m venv .venv

# Windows
.venv\Scripts\activate
# Linux / macOS
# source .venv/bin/activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env   # then edit .env with your values
```

### Frontend

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Configure environment variables
cp .env.local.example .env.local   # or create .env.local manually
```

---

## Environment Variables

### Backend — `backend/.env`

```env
# MongoDB
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB=talash

# LLM Provider: ollama | gemini | openai | grok
LLM_PROVIDER=ollama

# Ollama (local)
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=llama3.2:3b

# Google Gemini
# Users add their own Gemini API key in Settings after signing in.
GEMINI_MODEL=gemini-1.5-flash

# OpenAI
# Users add their own OpenAI API key in Settings after signing in.
OPENAI_MODEL=gpt-4o-mini

# Grok / xAI
# Users add their own xAI API key in Settings after signing in.
GROK_MODEL=grok-3-mini

# Storage
CV_UPLOAD_DIR=data/cv_uploads
PROCESSED_DIR=data/processed
MAX_FILE_SIZE_MB=50
```

### Frontend — `frontend/.env.local`

```env
# URL of the TALASH backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Running the Application

### Development (manual)

**Backend:**

```bash
# From the project root
$env:PYTHONPATH = "path to \talash_llm_project\backend"   # Windows PowerShell
python -m uvicorn app.main:app --host 127.0.0.1 --port 5100 --reload
```

The API will be available at `http://localhost:8000`.  
Interactive Swagger docs: `http://localhost:8000/docs`

**Frontend:**

```bash
cd frontend
npm run dev
```

The app will be available at `http://localhost:3000`.

**Other frontend scripts:**

```bash
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## API Reference

### Core Endpoints

| Method   | Path                                          | Description                       |
| -------- | --------------------------------------------- | --------------------------------- |
| `GET`    | `/api/health`                                 | Health check and LLM status       |
| `POST`   | `/api/upload`                                 | Upload a PDF CV for parsing       |
| `GET`    | `/api/candidates`                             | List all candidates (paginated)   |
| `GET`    | `/api/candidates/{id}`                        | Get full candidate profile        |
| `DELETE` | `/api/candidates/{id}`                        | Remove a candidate record         |
| `POST`   | `/api/candidates/{id}/analyze`                | Re-run full analysis pipeline     |
| `GET`    | `/api/candidates/{id}/email-draft`            | Retrieve or generate email draft  |
| `POST`   | `/api/candidates/{id}/email-draft/regenerate` | Force LLM email regeneration      |
| `GET`    | `/api/candidates/rank`                        | Ranked candidate list             |
| `GET`    | `/api/dashboard/stats`                        | Aggregate dashboard statistics    |
| `GET`    | `/api/settings`                               | Get current LLM provider settings |
| `PUT`    | `/api/settings`                               | Update LLM provider configuration |
| `POST`   | `/api/auth/login`                             | JWT-based authentication          |
| `POST`   | `/api/auth/signup`                            | New user registration             |
| `GET`    | `/api/admin/users`                            | Admin: list all users             |

### Query Parameters — `GET /api/candidates`

| Param    | Default | Description                                     |
| -------- | ------- | ----------------------------------------------- |
| `skip`   | `0`     | Number of records to skip                       |
| `limit`  | `50`    | Max records to return (max 200)                 |
| `status` | —       | Filter by status: `processing`, `done`, `error` |

### Query Parameters — `GET /api/candidates/rank`

| Param       | Default | Description                     |
| ----------- | ------- | ------------------------------- |
| `limit`     | `50`    | Number of results               |
| `min_score` | `0`     | Minimum overall score threshold |

---

## Frontend Pages

| Route               | Description                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `/`                 | CV upload — drag-and-drop or browse PDF files with real-time status polling                                                              |
| `/dashboard`        | Aggregate stats: donut chart (publication types), bar chart (score comparison), status distribution, top skills, score cards             |
| `/candidates`       | Searchable, sortable paginated table with color-coded score badges                                                                       |
| `/candidates/[id]`  | Full candidate profile: education table, publication list with quality badges, experience timeline, authorship breakdown, missing fields |
| `/compare`          | Side-by-side radar chart comparison for up to 3 candidates on 4 axes (Experience, Education, Research, Skills)                           |
| `/ranking`          | Podium-style leaderboard (Gold/Silver/Bronze) with per-component score breakdown bars and filter controls                                |
| `/email-drafts`     | LLM-generated missing-info emails with expandable previews and one-click clipboard copy                                                  |
| `/settings`         | LLM provider and model configuration (Ollama, Gemini, OpenAI, Grok)                                                                      |
| `/login`, `/signup` | JWT authentication pages                                                                                                                 |

---

## Analysis Modules

### 1. Education Analyzer (`services/education_analyzer.py`)

Normalizes academic scores across all grading systems to a unified 0–100 scale:

| Input Format     | Normalization |
| ---------------- | ------------- |
| CGPA / 4.0       | × 25          |
| Percentage       | used directly |
| Raw marks / 1100 | ÷ 1100 × 100  |
| CGPA / 5.0       | × 20          |

Institution names are fuzzy-matched (rapidfuzz, threshold 75) against `university_rankings.json` for HEC category (W/X/Y/Z), QS World Ranking, and THE Ranking. Gap detection flags unjustified breaks between education levels and computes a `performance_trend`: improving / declining / stable / mixed.

### 2. Research Analyzer (`services/research_analyzer.py`)

**Journal quality** is assessed via a 5-stage pipeline: Scopus API → local Scimago index → publisher inference → LLM fallback → CrossRef DOI enrichment. Each journal is classified Q1–Q4.

**Conference quality** is matched against the CORE 2023 database:

| CORE Rank | Points |
| --------- | ------ |
| A\*       | 100    |
| A         | 80     |
| B         | 60     |
| C         | 40     |
| Unranked  | 20     |

**Authorship roles** (sole, first, corresponding, co-author) are detected via fuzzy name matching and factored into contribution scores.

### 3. Topic Variability & Co-Author Analysis

Publication titles are tokenized and lemmatized to build a term-frequency vector. Shannon entropy (H = −Σ pᵢ log₂ pᵢ) classifies research breadth:

| Entropy       | Classification     |
| ------------- | ------------------ |
| H ≥ 2.5       | Highly diverse     |
| 1.5 ≤ H < 2.5 | Moderately diverse |
| H < 1.5       | Focused / niche    |

Co-author analysis tracks unique collaborators, network density, repeat collaborators (3+ papers), and solo publication rate.

### 4. Experience Analyzer (`services/experience_analyzer.py`)

Detects education–employment overlaps, concurrent jobs, and unjustified gaps (> 3 months). Computes career trajectory: ascending / lateral / descending / mixed. Score components: total years, seniority tier, continuity, progression, overlap penalty.

### 5. Candidate Ranking — Weighted Formula

```
Overall Score = 0.30 × Education Score
              + 0.30 × Research Score
              + 0.25 × Experience Score
              + 0.05 × Skills Score
              + 0.10 × Profile Completeness
```

The denominator normalizes only over components that were actually computed, preventing unfair penalties for fresh graduates.

### 6. LLM Summary & Email Drafting

Upon pipeline completion, the configured LLM generates a 4–6 sentence professional candidate summary. For candidates with critical/high severity missing fields, a personalized email is auto-drafted covering which fields are missing, why they matter, and re-submission instructions. A rule-based fallback operates when the LLM is unavailable.

---

## LLM Provider Support

Four providers are supported and switchable per user via the Settings UI:

| Provider         | Models                            | Use Case                       |
| ---------------- | --------------------------------- | ------------------------------ |
| Ollama (default) | llama3.2:3b / llama3.1:8b         | Offline / local development    |
| Google Gemini    | gemini-2.5-flash / gemini-2.5-pro | Cloud, high-quality extraction |
| OpenAI           | gpt-4o-mini / gpt-4o              | Proven accuracy                |
| Grok / xAI       | grok-3-mini / grok-3              | Fast inference                 |

Each signed-in user supplies their own cloud provider API key in Settings. CVs exceeding 8,000 characters are automatically routed to the larger model variant to reduce hallucinations.

**Ollama quickstart:**

```bash
# Install from https://ollama.com, then pull a model
ollama pull llama3.2:3b
```

---

## Docker Deployment

```bash
# Build and run all services from the project root
docker-compose up --build

# Build individual services
docker-compose up --build backend
docker-compose up --build frontend
```

Services:

| Service            | Port  |
| ------------------ | ----- |
| Frontend (Next.js) | 3000  |
| Backend (FastAPI)  | 8000  |
| MongoDB            | 27017 |
| Ollama (host)      | 11434 |

> Ollama runs on the host machine and is accessed from the backend container via host networking.

---

## Running Tests

```bash
cd backend
pytest tests/
```

---

## Reference Data

| File                       | Contents                                             |
| -------------------------- | ---------------------------------------------------- |
| `university_rankings.json` | HEC categories, QS/THE rankings, institution aliases |
| `core_conferences.json`    | CORE 2023 ranking database with acronyms             |
| `academic_publishers.json` | Publisher credibility classification                 |
| `journal_quality.json`     | Scimago SJR/CiteScore index (ISSN-keyed)             |

---

## Reference Data Scraping Pipeline

TALASH integrates a dedicated scraping and database refreshing pipeline residing in [backend/app/services/scrapers/]. This system periodically crawls academic and institutional ranking websites, downloading and merging their data locally to ensure that normalization indexes remain up to date.

### Scraper Modules

The following scrapers are registered and loaded by the orchestrator:

- **HEC Pakistani Universities ([hec_universities.py])**:
  Scrapes the recognised Pakistani universities database from the HEC official portal. It extracts the name, sector (Public/Private), chartered body, province, and city for each card. It normalizes parenthetical acronyms and known aliases (like _FAST_, _NUST_, _LUMS_), resolves them to synthetic national quality tiers (`national_top`, `national_good`, `national_average`), and updates `university_rankings.json`. _Interval: Quarterly (90 days)_.
- **QS World Rankings ([qs_rankings.py])**:
  Fetches the QS World University Rankings. To bypass Cloudflare JS challenges, it runs Playwright Chromium to load the rankings page. By intercepting the active API node ID (`nid`), it triggers internal API requests within the authenticated browser context to fetch all ranks, matching them to global tiers (`world_elite`, `world_top`, `world_good`, `world_ranked`) and merging them into `university_rankings.json`. _Interval: Quarterly (90 days)_.
- **Times Higher Education ([the_rankings.py])**:
  Downloads Times Higher Education World Rankings JSON using a direct HTTP client (`httpx`), passing a custom `Referer` matching the THE domain to bypass CDN protection. It extracts ranks, scores, and aliases, merging them into `university_rankings.json`. _Interval: Annually (365 days)_.
- **Scimago Journal Quality Index ([scimago_journals.py])**:
  Downloads the Scimago best quartile journal index CSV (containing ~30,000 journals). It first tries direct HTTP; if blocked, it falls back to a Playwright Chromium context, downloads the semicolon-delimited CSV, parses ISSNs, titles, best SJR quartiles (Q1–Q4), and writes the output directly to `journal_quality.json`. _Interval: Monthly (30 days)_.
- **CORE Conferences ([core_conferences.py])**:
  Downloads the portal.core.edu.au CORE 2023 CSV directly. It extracts titles, acronyms, and CORE conference ranks (A*, A, B, C, or Unranked) and saves them to `core_conferences.json`. *Interval: Monthly (30 days)\*.
- **Academic Publishers ([publishers.py])**:
  Fetches Beall's List of Predatory Publishers directly from a raw CSV on GitHub, and merges it with a hand-curated list of top academic publishers (Elsevier, IEEE, Springer, ACM, Wiley, OUP, CUP) and open-access portals (MDPI, Frontiers, PLOS, Hindawi) to output `academic_publishers.json`. _Interval: Quarterly (90 days)_.
- **Clarivate Master Journal List ([clarivate_mjl.py])**:
  An on-demand scraper. When resolving journal credentials, it launches Playwright, logs in to the Clarivate Master Journal List portal using service account credentials, performs a search, paginates through mat-card containers, and caches results in `clarivate_mjl_cache.json` with a 14-day TTL.
- **Web of Science Search ([wos_journal_info.py])**:
  An on-demand scraper querying `wos-journal.info` directly using `httpx` to retrieve details and caching search responses under `wos_journal_info_cache.json` with a 30-day TTL.
- **CORE Live Search ([core_search.py])**:
  An on-demand hybrid searcher. It first checks the local `core_conferences.json` database. If no close fuzzy match is found, it hits portal.core.edu.au via HTTP to query the portal live, caching matches in `core_search_cache.json` with a 7-day TTL.

### Data Syncing & Execution Safeguards

- **Task Orchestration ([data_refresher.py])**:
  The orchestrator manages background scraper executions, enforcing sequential runs to avoid concurrent file-writing locks.
- **Atomic Saves**:
  To prevent data corruption if a scraper or system crashes mid-write, all JSON references are written atomically using a temporary file: data is dumped to a `.tmp` file and then renamed using `os.replace`.
- **Startup & Cron Schedule**:
  `APScheduler` handles running the scrapers at the scheduled monthly, quarterly, or annual cron ticks. On server startup, `run_due_scrapers()` inspects a local `metadata.json` tracking last run times. If any scraper is overdue (e.g., if the server was offline during the cron tick), it runs immediately.
- **Memory Cache Invalidation**:
  Upon successful execution of a scraper, `data_refresher` triggers cache clears for `lru_cache` loaders in the candidate education and research analyzer engines, ensuring newly scraped ranking data is reflected immediately without a container reboot.

---

## Authentication

JWT-based auth with 7-day token expiry, bcrypt password hashing, and `get_current_user` dependency injected on all protected routes. Middleware-based route protection on the Next.js frontend.

---

## UI Design System

The frontend uses a custom TALASH "Intelligent Atelier" design system built on Tailwind CSS v3:

- **Color palette:** `--md-sys-color-primary` (`#4648d4`), surface/container hierarchy
- **Typography:** Inter font with `tracking-tight` headers
- **Icons:** Google Material Symbols (ligature-based, single font file)
- **Charts:** Pure SVG — no external charting library
- **Components:** Fixed sidebar navigation, TopBar with search, status badges, score cells with mini progress bars
