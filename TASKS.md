# TALASH — Task List
## CS417: Smart HR Recruitment | Spring 2026

---

## MILESTONE 1 — Proposal, Architecture, Wireframes, Early Prototype

### Infrastructure & Setup
- [ ] M1-1.1 Initialize Git repository with proper `.gitignore` and branch structure
- [ ] M1-1.2 Create `frontend/` directory with Next.js 14 (App Router) scaffold
- [ ] M1-1.3 Create `backend/` directory with FastAPI scaffold
- [ ] M1-1.4 Create `data/cv_uploads/`, `data/processed/`, `data/sample_cvs/`, `data/reference_data/` directories
- [ ] M1-1.5 Write `docker-compose.yml` with services: `mongodb`, `backend`, `frontend` (no Redis/Celery)
- [ ] M1-1.6 Create `.env.example` with: `MONGODB_URL`, `OLLAMA_HOST`, `OLLAMA_MODEL` (no external API keys)
- [ ] M1-1.7 Install Ollama on host machine (`winget install Ollama.Ollama`) and pull chosen model (`ollama pull llama3.2:8b`)
- [ ] M1-1.8 Download all reference CSVs and place in `data/reference_data/`: Scimago SJR, CORE rankings, QS rankings, THE rankings, DOAJ, WoS Master Journal List
- [ ] M1-1.9 Place `Talash.pdf` (provided dataset) in `data/sample_cvs/`
- [ ] M1-1.10 Configure Tailwind CSS in Next.js with all design tokens from `DESIGN.md`
- [ ] M1-1.11 **Test:** Run `docker-compose up` and verify all services are healthy; run `ollama list` to confirm model is available

### Design System & UI Conversion
- [ ] M1-2.1 Implement shared `Sidebar` component with Dark Indigo anchor
- [ ] M1-2.2 Implement `TopBar`, `Card`, `PrimaryButton` (gradient), `SecondaryButton` components
- [ ] M1-2.3 Implement `ScoreChip`, `GhostInput`, and `GlassModal` components
- [ ] M1-2.4 Convert `home_cv_upload/code.html` → Next.js Upload page
- [ ] M1-2.5 Convert `dashboard/code.html` → Next.js Dashboard page (static/mock data)
- [ ] M1-2.6 Convert `candidates_list/code.html` → Next.js Candidates List page (static/mock data)
- [ ] M1-2.7 Convert `candidate_profile/code.html` → Next.js Candidate Profile page (static/mock data)
- [ ] M1-2.8 Convert `compare_candidates/code.html` → Next.js Compare page (static/mock data)
- [ ] M1-2.9 Convert `email_drafts/code.html` → Next.js Email Drafts page (static/mock data)
- [ ] M1-2.10 Convert `settings/code.html` → Next.js Settings page
- [ ] M1-2.11 **Test:** All pages render in browser with correct design system (no borders, tonal layers, gradient CTAs)

### Preprocessing Module — PDF Parsing
- [ ] M1-3.1 Install and configure `PyMuPDF` (fitz) and `pdfplumber` in backend
- [ ] M1-3.2 Implement folder-watcher service (`watchdog` library) for `data/cv_uploads/`
- [ ] M1-3.3 Implement PDF text extraction service with `PyMuPDF` as primary extractor
- [ ] M1-3.4 Add `pdfplumber` fallback for complex/multi-column PDFs
- [ ] M1-3.5 Add `pytesseract` OCR fallback for scanned/image-based PDFs
- [ ] M1-3.6 Define all Pydantic models: `CandidateRaw`, `Education`, `Experience`, `Publication`, `Skill`, `Book`, `Patent`
- [ ] M1-3.7 Write LLM extraction prompt for Ollama (JSON mode) to convert raw CV text → structured Pydantic models
- [ ] M1-3.8 Set up Motor (async MongoDB driver) in FastAPI; implement `get_db()` dependency
- [ ] M1-3.9 Define MongoDB collections and document schemas (no migration needed — schema-less; document shapes enforced by Pydantic)
- [ ] M1-3.10 Implement CSV export function: structured candidate data → CSV file in `data/processed/`
- [ ] M1-3.11 **Test:** Upload `Talash.pdf` → verify raw text extracted + structured JSON stored in MongoDB
- [ ] M1-3.12 **Test:** Verify CSV output contains correct columns and data

### Early Prototype API & Integration
- [ ] M1-4.1 Implement `POST /api/upload` endpoint (accept PDF, save, process synchronously, return candidate ID)
- [ ] M1-4.2 Implement `GET /api/candidates` endpoint (return list)
- [ ] M1-4.3 Implement `GET /api/candidates/{id}` endpoint (return full structured data)
- [ ] M1-4.4 Wire Upload page → `POST /api/upload` with file input + loading/progress state
- [ ] M1-4.5 Show processing status in UI: uploading → parsing → done (via response polling or SSE)
- [ ] M1-4.6 On completion, redirect to candidate profile page
- [ ] M1-4.7 **Demo Test:** Upload `Talash.pdf` → candidate appears in list → basic fields visible on profile page

---

## MILESTONE 2 — Core Extraction, Analysis Pipeline, Intermediate Web App

### Module 3.1 — Educational Profile Analysis
- [ ] M2-5.1 Implement SSE/HSSC (matric/inter) data extraction from parsed CV
- [ ] M2-5.2 Implement UG/PG/PhD records extraction (degree, CGPA, institution, years)
- [ ] M2-5.3 Implement marks normalization: % → /100, CGPA/5.0 → /4.0, grade → numeric
- [ ] M2-5.4 Handle both 14+2 year pathways (BSc+MSc) and direct 4-year BS pathways
- [ ] M2-5.5 Load `qs_rankings.csv` and `the_rankings.csv` into memory as lookup tables on backend startup
- [ ] M2-5.6 Implement `rapidfuzz` fuzzy matching for institution name → ranking lookup; Ollama disambiguation for low-confidence matches
- [ ] M2-5.7 Implement educational gap detection (sort date ranges, compute gaps in months)
- [ ] M2-5.8 Implement gap justification: cross-check gaps against work experience timeline
- [ ] M2-5.9 Classify each gap: `Justified` (with reason) or `Unexplained`
- [ ] M2-5.10 Implement education strength scoring formula (weighted: marks 30%, institution 25%, qualification 20%, consistency 15%, gap penalty 10%)
- [ ] M2-5.11 LLM generates 3–4 sentence narrative interpretation of education profile
- [ ] M2-5.12 Implement Education timeline UI component (color-coded gaps)
- [ ] M2-5.13 Implement institution rank badges in UI
- [ ] M2-5.14 **Test:** Normalize CGPA values across 5 different formats and verify math
- [ ] M2-5.15 **Test:** CV with 2-year gap covered by employment → system marks gap "Justified"
- [ ] M2-5.16 **Test:** Score candidates from `Talash.pdf` → manually verify rankings match expectation

### Module 3.8 — Professional Experience Analysis
- [ ] M2-6.1 Extract all job records: title, org, start/end, employment type
- [ ] M2-6.2 Detect overlapping job periods
- [ ] M2-6.3 Detect job–education overlaps (flag full-time job + full-time degree)
- [ ] M2-6.4 Detect professional gaps and calculate exact duration in months
- [ ] M2-6.5 Classify each gap: justified by education, or unexplained
- [ ] M2-6.6 LLM assesses career trajectory: junior → senior progression pattern
- [ ] M2-6.7 Output `career_continuity_score` and list of `flagged_periods`
- [ ] M2-6.8 Implement Gantt-style career timeline UI component
- [ ] M2-6.9 Highlight flagged periods (overlaps, gaps) in timeline
- [ ] M2-6.10 **Test:** CV with two overlapping jobs → system detects and flags correctly
- [ ] M2-6.11 **Test:** Gap explained by Masters degree → system marks as "Justified by: MS enrollment"

### Missing Information Detection & Email Drafting
- [ ] M2-7.1 Aggregate `missing_fields` lists from all analysis modules per candidate
- [ ] M2-7.2 Categorize missing fields: academic records, publication details, date gaps, authorship
- [ ] M2-7.3 Write LLM email drafting prompt (professional, personalized, cites specific missing items)
- [ ] M2-7.4 Generate separate personalized email for each candidate with missing info
- [ ] M2-7.5 Store email drafts in database with `candidate_id`, `status` (draft/sent)
- [ ] M2-7.6 Implement `GET /api/emails` and `GET /api/emails/{candidate_id}` endpoints
- [ ] M2-7.7 Wire Email Drafts page to backend — list all drafts by candidate
- [ ] M2-7.8 Add preview, edit, and copy-to-clipboard actions in Email Drafts UI
- [ ] M2-7.9 **Test:** Candidate with 4 missing fields → email draft correctly names all 4 with context
- [ ] M2-7.10 **Test:** 3 candidates with different missing fields → 3 distinct personalized emails

### Module 3.2 (Partial) — Journal Publication Analysis
- [ ] M2-8.1 Extract journal name, ISSN, paper title, year, authors from CV parsing output
- [ ] M2-8.2 Load `scimago_sjr.csv` into memory; look up each journal by ISSN (exact match); fall back to `rapidfuzz` name match if ISSN is missing
- [ ] M2-8.3 From Scimago lookup: determine Scopus indexing status (present in CSV = Scopus-indexed) and quartile (Q1–Q4)
- [ ] M2-8.4 Load `wos_master_list.csv`; look up journal ISSN to determine WoS indexing status (use Scimago SJR score as IF proxy since actual IF is paywalled)
- [ ] M2-8.5 Load `doaj_journals.csv`; check for open-access journal verification
- [ ] M2-8.6 If journal not found in any local dataset: flag as "Unverified" with manual review note
- [ ] M2-8.7 Implement author name matching (candidate name → position in author list using `rapidfuzz`)
- [ ] M2-8.8 Handle name variations (initials, middle names, transliterations)
- [ ] M2-8.9 Classify authorship role: first, corresponding, both, other co-author
- [ ] M2-8.10 **Test:** 10 journal papers from `Talash.pdf` → manually verify quartile + Scopus status for 3
- [ ] M2-8.11 **Test:** Verify authorship role detection across 5 different name format styles

### Tabular Outputs & Initial Charts
- [ ] M2-9.1 Implement `GET /api/candidates/table` — returns all candidates with module scores
- [ ] M2-9.2 Wire Candidates List page with sortable/filterable table (real data)
- [ ] M2-9.3 Add columns: Name, Education Score, Exp. Score, Research Score, Missing Fields count
- [ ] M2-9.4 Implement bar chart: candidates by education score (Recharts/Chart.js)
- [ ] M2-9.5 Implement donut chart: journal vs conference publication breakdown
- [ ] M2-9.6 Implement bar chart: publications per quartile
- [ ] M2-9.7 Wire Dashboard page to real backend data
- [ ] M2-9.8 **M2 Demo Test:** Upload `Talash.pdf` + 2 more CVs → pipeline runs → candidates table populated + charts render + email drafts generated

---

## MILESTONE 3 — Full Integrated System, Final Report, Live Demo

### Module 3.2 (Complete) — Conference Paper Analysis
- [ ] M3-10.1 Extract conference name, paper title, year, authors
- [ ] M3-10.2 Load `core_rankings.csv` into memory as conference lookup table
- [ ] M3-10.3 Implement `rapidfuzz` conference name matching → CORE rank (A*, A, B, C)
- [ ] M3-10.4 Flag A* conferences in output
- [ ] M3-10.5 Detect conference maturity from name (e.g., "13th Annual...")
- [ ] M3-10.6 Check proceedings publisher: IEEE Xplore, ACM DL, Springer, Scopus
- [ ] M3-10.7 Determine authorship role in conference papers
- [ ] M3-10.8 Implement research profile scoring (journals + conferences combined)
- [ ] M3-10.9 Scoring formula: paper weight = quality × authorship bonus
- [ ] M3-10.10 **Test:** 5 conference papers → CORE ranking lookup works for at least 3
- [ ] M3-10.11 **Test:** Score 5 candidates → verify high-quality profiles rank higher

### Modules 3.3, 3.4, 3.5 — Supervision, Books, Patents
- [ ] M3-11.1 LLM extraction of supervision records (student names, degree type, year, role: main/co)
- [ ] M3-11.2 Match supervised student names to co-authored publications
- [ ] M3-11.3 Count and output: MS supervised (main), MS supervised (co), PhD supervised (main), PhD supervised (co)
- [ ] M3-11.4 Extract book metadata: title, ISBN, publisher, year, authors, online link
- [ ] M3-11.5 Determine book authorship role (sole, lead, co)
- [ ] M3-11.6 Extract patent metadata: number, title, date, inventors, country, link
- [ ] M3-11.7 Determine candidate role in each patent (lead/co inventor)
- [ ] M3-11.8 **Test:** CV with 3 supervised students → all 3 extracted correctly with role
- [ ] M3-11.9 **Test:** CV with 1 book + 1 patent → both extracted with correct metadata

### Module 3.6 — Topic Variability Analysis
- [ ] M3-12.1 Embed all paper titles/abstracts using local `sentence-transformers` model (`all-MiniLM-L6-v2`) — no API call
- [ ] M3-12.2 Cluster embeddings into research themes (k-means or HDBSCAN)
- [ ] M3-12.3 Use LLM to label each cluster with a human-readable theme name
- [ ] M3-12.4 Compute topic distribution: % of papers per theme
- [ ] M3-12.5 Compute diversity score (entropy-based: 0 = all one topic, 100 = fully diverse)
- [ ] M3-12.6 Compute year-by-year topic trend (topic shift over time)
- [ ] M3-12.7 Implement topic distribution pie/bar chart in UI
- [ ] M3-12.8 **Test:** Candidate with 10 papers in 2 topics → high concentration score

### Module 3.7 — Co-Author Network Analysis
- [ ] M3-13.1 Build co-author graph per candidate from all publications
- [ ] M3-13.2 Compute: unique co-authors count, most frequent collaborators, avg co-authors/paper
- [ ] M3-13.3 Detect possible supervisor-student pairs (cross-reference supervision data)
- [ ] M3-13.4 Classify collaboration scope: national vs international (by affiliation)
- [ ] M3-13.5 Implement network graph visualization (D3.js force-directed graph)
- [ ] M3-13.6 Implement co-author frequency ranked list in profile UI
- [ ] M3-13.7 **Test:** Candidate with 8 papers → co-author graph built and rendered correctly

### Module 3.9 — Skill Alignment
- [ ] M3-14.1 Extract claimed skills list from CV parsing
- [ ] M3-14.2 LLM cross-references each skill against job titles/responsibilities
- [ ] M3-14.3 LLM cross-references each skill against publication topics/methods
- [ ] M3-14.4 LLM cross-references each skill against certifications and projects
- [ ] M3-14.5 Classify each skill: Strongly Evidenced / Partially Evidenced / Unsupported
- [ ] M3-14.6 Implement job description input field in Settings page
- [ ] M3-14.7 Score candidate skills against provided JD requirements
- [ ] M3-14.8 Output: matched skills, missing skills, overall job-fit score
- [ ] M3-14.9 Implement skill evidence UI view (color-coded by evidence strength)
- [ ] M3-14.10 **Test:** Candidate claiming "Deep Learning" with DL papers → classified "Strongly Evidenced"
- [ ] M3-14.11 **Test:** Sample JD input → relevant skills matched correctly

### Candidate Summary Generation
- [ ] M3-15.1 Write LLM summary prompt combining all module outputs
- [ ] M3-15.2 Output structured summary: executive summary, key strengths, concerns, suitability, follow-up questions
- [ ] M3-15.3 Implement `POST /api/candidates/{id}/generate-summary` endpoint
- [ ] M3-15.4 Display AI summary in Candidate Profile page (formatted card)
- [ ] M3-15.5 **Test:** Generate summaries for 5 candidates → each is unique, accurate, useful

### Candidate Ranking Engine (Extra Credit)
- [ ] M3-16.1 Implement configurable weight system per module (Settings page)
- [ ] M3-16.2 Default weights: Education 20%, Research 30%, Experience 25%, Skills 15%, Supervision/Books/Patents 10%
- [ ] M3-16.3 Compute `talash_score` (0–100) for each candidate
- [ ] M3-16.4 Implement rankings table: sorted, filterable, score breakdown visible
- [ ] M3-16.5 Implement `POST /api/rankings/compute` to recompute with new weights
- [ ] M3-16.6 **Test:** Change weights → verify ranking order updates accordingly

### Full Dashboard & Comparison Views
- [ ] M3-17.1 Add KPI cards to Dashboard: total candidates, avg score, top candidate
- [ ] M3-17.2 Add publication quality breakdown chart (complete version)
- [ ] M3-17.3 Add education score distribution histogram
- [ ] M3-17.4 Add missing info summary card on dashboard
- [ ] M3-17.5 Implement multi-candidate selection on Candidates List page (checkboxes)
- [ ] M3-17.6 Wire Compare Candidates page with real backend data (up to 4 candidates)
- [ ] M3-17.7 Implement radar chart: all module scores per candidate (Recharts)
- [ ] M3-17.8 Highlight key differences between compared candidates
- [ ] M3-17.9 **Test:** Select 3 candidates → comparison view + radar chart renders correctly

### End-to-End Testing & Final Polish
- [ ] M3-18.1 Run full pipeline on a batch of 5–10 sample CVs
- [ ] M3-18.2 Verify no pipeline failures, all modules produce output for each CV
- [ ] M3-18.3 Verify MongoDB document integrity (no orphaned documents, all required fields present)
- [ ] M3-18.4 Audit all pages for DESIGN.md compliance (no borders, glassmorphism, gradient CTAs)
- [ ] M3-18.5 Implement dark mode toggle and verify all pages in dark mode
- [ ] M3-18.6 Verify responsive layout on tablet viewport
- [ ] M3-18.7 Add in-process LRU cache (`cachetools`) for reference CSV lookups and computed ranking data
- [ ] M3-18.8 Verify API response < 500ms for all pre-processed data endpoints (LLM inference endpoints excluded)
- [ ] M3-18.9 Add file upload validation: PDF only, max 10MB, MIME type check
- [ ] M3-18.10 Implement JWT authentication on all protected API endpoints
- [ ] M3-18.11 Add LLM prompt input sanitization (prevent prompt injection)
- [ ] M3-18.12 Add rate limiting on upload and LLM-dependent endpoints
- [ ] M3-18.13 Write Pytest unit tests for: normalization math, gap detection, scoring formulas, quartile lookup
- [ ] M3-18.14 Write Playwright E2E tests for: upload flow, candidate profile, email drafts, comparison view
- [ ] M3-18.15 **Final Demo Test:** Upload 5 CVs → all pages functional with real data — dashboard, profiles, comparison, emails, rankings all working
