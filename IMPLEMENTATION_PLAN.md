# TALASH — Implementation Plan
## CS417: Smart HR Recruitment | Spring 2026

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router) + Tailwind CSS (design system from DESIGN.md) |
| **Backend** | FastAPI (Python) |
| **LLM / SLM** | Ollama (local inference server) — see LLM Decision section below |
| **PDF Parsing** | PyMuPDF (`fitz`) + pdfplumber fallback |
| **Database** | MongoDB (via Motor async driver) |
| **File Storage** | Local folder-based CV ingestion (as per requirements) |
| **Embeddings** | `sentence-transformers` library (local, no API) |
| **Data/Charts** | Recharts (frontend graphs) |
| **Reference Data** | Pre-downloaded local CSVs: Scimago SJR, CORE rankings, QS/THE rankings, DOAJ |
| **Email** | Draft-only — LLM generates text; no external sending service |
| **Testing** | Pytest (backend), Playwright (E2E), Jest (frontend) |
| **Containerization** | Docker + Docker Compose |

---

## Project Structure (Target)

```
talash/
├── frontend/                  # Next.js app
│   ├── app/
│   │   ├── (auth)/
│   │   ├── dashboard/
│   │   ├── candidates/
│   │   │   ├── page.tsx           # Candidates list
│   │   │   └── [id]/
│   │   │       ├── page.tsx       # Candidate profile
│   │   │       └── compare/
│   │   ├── upload/                # CV upload page
│   │   ├── email-drafts/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/                    # Design-system components
│   │   ├── charts/
│   │   ├── candidate/
│   │   └── analysis/
│   └── lib/
│       ├── api.ts                 # API client
│       └── types.ts               # Shared types
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/
│   │   │   ├── routes/
│   │   │   │   ├── candidates.py
│   │   │   │   ├── upload.py
│   │   │   │   ├── analysis.py
│   │   │   │   └── emails.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   └── database.py
│   │   ├── models/               # Pydantic schemas (also serve as MongoDB document shapes)
│   │   ├── services/
│   │   │   ├── cv_parser.py          # Module 0: PDF → structured data
│   │   │   ├── education_analyzer.py # Module 3.1
│   │   │   ├── research_analyzer.py  # Module 3.2
│   │   │   ├── supervision.py        # Module 3.3
│   │   │   ├── books_patents.py      # Modules 3.4 & 3.5
│   │   │   ├── topic_variability.py  # Module 3.6
│   │   │   ├── coauthor_analyzer.py  # Module 3.7
│   │   │   ├── experience_analyzer.py# Module 3.8
│   │   │   ├── skill_alignment.py    # Module 3.9
│   │   │   ├── email_drafter.py      # Missing info emails
│   │   │   ├── ranking_engine.py     # Extra credit: candidate ranking
│   │   │   └── llm_client.py         # Ollama wrapper (local LLM)
│   ├── tests/
│   └── requirements.txt
│
├── data/
│   ├── cv_uploads/               # CV drop folder
│   ├── processed/                # Output CSVs / structured JSON
│   ├── sample_cvs/               # Test CVs (includes Talash.pdf — provided dataset)
│   └── reference_data/           # Pre-downloaded local lookup CSVs
│       ├── scimago_sjr.csv        # Scopus indexing + Q1-Q4 quartiles
│       ├── core_rankings.csv      # Conference rankings (A*, A, B, C)
│       ├── qs_rankings.csv        # QS World University Rankings
│       ├── the_rankings.csv       # THE World University Rankings
│       ├── doaj_journals.csv      # Open access journal verification
│       └── wos_master_list.csv    # WoS-indexed journal ISSNs (Clarivate free list)
│
├── docker-compose.yml
└── .env.example
```

---

## LLM / SLM Decision

All AI/ML inference runs locally — no external API calls are permitted.

### The Core Question: Use a Pre-Trained Model or Fine-Tune One?

**Recommendation: Start with a pre-trained local LLM via Ollama. Fine-tuning is optional and only worthwhile after M2 if accuracy is demonstrably insufficient.**

Reason: fine-tuning requires a labeled training dataset of CV examples with ground-truth extractions. We do not have that at project start. The provided dataset (`Talash.pdf`) is not large enough to fine-tune from scratch. Pre-trained instruction-tuned models already handle structured extraction tasks well when prompted correctly (especially with JSON-mode output).

---

### Option A: Ollama (Recommended)

Ollama is a local inference server that downloads and serves open-source LLMs. Inference happens entirely on your machine — no internet required after the initial model download.

| Model | Size | VRAM (GPU) | RAM (CPU-only) | Notes |
|-------|------|-----------|----------------|-------|
| `llama3.2:3b` | 2 GB | ~4 GB | ~8 GB | Fast, low-spec machines |
| `llama3.2:8b` | 5 GB | ~8 GB | ~16 GB | **Recommended** — best accuracy/speed balance |
| `qwen2.5:7b` | 4.7 GB | ~8 GB | ~16 GB | Alternative — excellent at JSON/structured output |
| `mistral:7b` | 4.1 GB | ~8 GB | ~16 GB | Fallback |
| `phi3:medium` | 8 GB | ~12 GB | ~24 GB | High-resource machines only |

**How it works in the system:**
- `llm_client.py` sends prompts to `http://localhost:11434/api/generate` (Ollama's local endpoint)
- Use Ollama's JSON mode (`format: "json"`) for structured extraction — forces valid JSON output
- LangChain's `OllamaLLM` class wraps this cleanly if desired; direct HTTP is equally fine
- Install: `winget install Ollama.Ollama` then `ollama pull llama3.2:8b`

---

### Option B: HuggingFace Transformers (Direct)

Run the same models directly via `transformers` + `torch` in Python, without Ollama middleware.

- More control over inference (batching, quantization via `bitsandbytes`)
- Requires more setup (CUDA drivers, model cache management)
- Good alternative if Ollama is unavailable or for tighter pipeline integration

**When to use:** Ollama is unavailable on the target machine, or batch processing of many CVs is needed efficiently.

---

### Option C: Fine-Tuning a Smaller SLM (Post-M2 Optional)

Fine-tune `Phi-3 mini (3.8B)` or `Llama 3.2 3B` on CV extraction tasks using the structured outputs generated during M1/M2 as synthetic training data.

- Use LoRA (Low-Rank Adaptation) via `unsloth` or `trl` library — trains on a consumer GPU
- Result: a model specialized in Pakistani academic CV parsing, faster and more consistent

**Verdict:** Not planned for M1 or M2. Evaluate need after M2 based on extraction error rate on the test CVs.

---

### Embeddings for Topic Variability (Module 3.6)

For semantic clustering of publication titles, use `sentence-transformers` (fully local, no API):

| Model | Size | Use Case |
|-------|------|----------|
| `all-MiniLM-L6-v2` | 80 MB | Fast, good quality — use for M2/early M3 |
| `all-mpnet-base-v2` | 420 MB | Better quality — upgrade for M3 if needed |

Usage: `SentenceTransformer('all-MiniLM-L6-v2').encode(paper_titles)` → cluster with `scikit-learn` KMeans or `hdbscan`.

---

### Decision Summary

| Task | Approach |
|------|----------|
| CV structured extraction | Ollama + `llama3.2:8b` with JSON mode |
| Education/experience narrative | Ollama + `llama3.2:8b` |
| Email drafting | Ollama + `llama3.2:8b` |
| Candidate summary generation | Ollama + `llama3.2:8b` |
| Semantic embeddings | `sentence-transformers` (`all-MiniLM-L6-v2`) |
| Journal/conference lookup | Rule-based + `rapidfuzz` fuzzy matching on local CSVs |
| Institution name matching | `rapidfuzz` + Ollama disambiguation if fuzzy match confidence is low |
| Fine-tuning | Not planned — revisit after M2 |

---

## Milestones

---

## MILESTONE 1 — Proposal, Architecture, Wireframes, Early Prototype
**Weight: 25% | Deadline: ~Week 4**

### Goals
- System architecture finalized
- UI/UX wireframes completed (the `stitch/` folder already has HTML prototypes)
- Preprocessing module working
- Early prototype: upload a CV and extract raw text

---

### M1-Phase 1: Project Setup & Infrastructure

#### Step 1.1 — Repository & Tooling Setup
- Initialize Git repository
- Create `frontend/` (Next.js 14), `backend/` (FastAPI), `data/` directories and all subdirectories
- Set up Docker Compose with services: `mongodb`, `backend`, `frontend` (no Redis/Celery)
- Install Ollama on the host machine (`winget install Ollama.Ollama`) and pull the chosen model (`ollama pull llama3.2:8b`)
- Download all reference CSVs (Scimago SJR, CORE rankings, QS, THE, DOAJ, WoS title list) into `data/reference_data/`
- Place `Talash.pdf` (the provided dataset) in `data/sample_cvs/`
- Configure `.env` with: MongoDB URL, Ollama host, model name — no external API keys needed
- Set up Tailwind CSS in Next.js with the design tokens from `stitch/stitch/talash_insight/DESIGN.md`

**Test:** `docker-compose up` → MongoDB + backend + frontend all healthy; `ollama list` shows the pulled model

#### Step 1.2 — Design System Implementation
- Convert the `stitch/` HTML prototypes into Next.js components following the "Intelligent Atelier" design system
- Implement shared components: `Sidebar`, `TopBar`, `Card`, `ScoreChip`, `GhostInput`, `PrimaryButton`, `GradientButton`
- Pages to convert: Home/Upload, Dashboard, Candidates List, Candidate Profile, Compare, Email Drafts, Settings

**Test:** All pages render correctly in browser with design system applied

---

### M1-Phase 2: Preprocessing Module (CV Parser)

#### Step 2.1 — PDF Ingestion & Text Extraction
- Implement folder-watching service that detects new PDFs in `data/cv_uploads/`
- Use `PyMuPDF` to extract raw text from PDFs, preserving layout hints
- Fallback to `pdfplumber` for complex/scanned PDFs; OCR fallback with `pytesseract` for image-based PDFs
- Store raw extracted text in database

**Test:** Upload 3–5 sample CVs → raw text extracted and stored for each

#### Step 2.2 — LLM-Based Structured Extraction
- Prompt local Ollama LLM (`llama3.2:8b`) with JSON mode to extract structured fields from raw CV text:
  - Personal info (name, email, phone)
  - Education (all degrees: SSE, HSSC, UG, PG, PhD with marks, institution, years)
  - Work Experience (title, org, start/end, type)
  - Skills list
  - Publications (journal papers, conference papers)
  - Books, Patents
  - Supervision records
- Output: validated Pydantic models → stored in MongoDB as documents (one document per candidate)
- Export to CSV for each candidate

**Test:** Run against `Talash.pdf` and 1–2 other CVs → verify extracted fields against manual inspection; check CSV output format

#### Step 2.3 — Extraction Validation & Missing Field Detection
- Rule-based validator checks required fields
- Flag missing/ambiguous data (e.g., no CGPA, missing publication years, unclear authorship)
- Store a `missing_fields` JSON array per candidate

**Test:** Use a CV with intentionally missing fields → validator flags correct fields

---

### M1-Phase 3: Early Prototype Integration

#### Step 3.1 — Upload API Endpoint
- `POST /api/upload` — accepts PDF files, saves to `cv_uploads/`, processes synchronously (returns candidate ID on completion)
- `GET /api/candidates` — returns list of processed candidates
- `GET /api/candidates/{id}` — returns structured candidate data

#### Step 3.2 — Upload UI → Backend Integration
- Wire the `home_cv_upload` page to `POST /api/upload`
- Show processing status (uploading → parsing → done) via response polling or SSE
- Redirect to candidate profile on completion

**Test (M1 Demo):** Upload a PDF → see it appear in candidate list → basic extracted fields visible

---

## MILESTONE 2 — Core Extraction, Analysis Pipeline, Intermediate Web App
**Weight: 25% | Deadline: ~Week 8**

### Goals
- Full CV parsing pipeline operational
- Educational Profile Analysis (Module 3.1) implemented
- Professional Experience Analysis (Module 3.8) implemented
- Missing information detection + personalized email drafts
- Partial Research Profile processing
- Tabular outputs and initial charts in UI

---

### M2-Phase 4: Educational Profile Analysis (Module 3.1)

#### Step 4.1 — Academic Records Extraction & Normalization
- Extract SSE/HSSC (matric/inter) percentages, board, year
- Extract UG/PG/PhD CGPA/marks, degree, specialization, university, years
- Normalize all academic scores: % → /100, CGPA on 4.0 → /4.0, CGPA on 5.0 scaled to 4.0, division grades mapped to numeric
- Handle 14+2 year pathways (BSc+MSc) vs 4-year BS pathways

**Test:** Run on 5 CVs → verify normalization math is correct for each grading format

#### Step 4.2 — Institutional Quality Assessment
- Load `qs_rankings.csv` and `the_rankings.csv` from `data/reference_data/` into memory at startup
- Use `rapidfuzz` fuzzy string matching to match extracted institution name against the ranking tables
- If fuzzy match confidence < threshold (e.g., 80%), use Ollama to disambiguate (e.g., "UET Lahore" → "University of Engineering and Technology, Lahore")
- Return: rank tier, country; mark as "Not Ranked" if not found in either dataset

**Test:** Test 10 institution names (including abbreviations) → verify correct matches and graceful "Not Ranked" handling

#### Step 4.3 — Gap Detection & Justification
- Parse all education date ranges → sort chronologically
- Calculate gaps between educational stages (in months)
- Cross-check gaps against professional experience timeline
- Classify each gap: Justified (has overlapping job/research), Unexplained

**Test:** Use a CV with a 2-year gap covered by a job → system marks gap as "Justified by: Employment at X"

#### Step 4.4 — Educational Strength Score
- Weighted scoring formula:
  - Academic performance (normalized marks) — 30%
  - Institutional quality (ranking tier) — 25%
  - Highest qualification — 20%
  - Consistency/progression — 15%
  - Gap penalty (unexplained gaps deduct points) — 10%
- LLM generates a 3–4 sentence narrative interpretation

**Test:** Score 5 candidates → manually verify rankings make sense relative to profiles

#### Step 4.5 — Education UI Component
- Timeline visualization of education stages
- Color-coded gaps (orange = explained, red = unexplained)
- Score display with breakdown chips
- Institution rank badges

**Test (UI):** Education section renders for all 5 test candidates

---

### M2-Phase 5: Professional Experience Analysis (Module 3.8)

#### Step 5.1 — Timeline Consistency Analysis
- Extract all jobs with start/end dates; identify open-ended roles ("Present")
- Detect: overlapping jobs, education-job overlaps, professional gaps
- For each gap/overlap: calculate exact duration, flag severity

**Test:** Use a CV with overlapping two jobs → system detects and flags overlap correctly

#### Step 5.2 — Gap Justification & Career Progression
- Cross-reference professional gaps with education periods
- LLM assesses career trajectory: junior → senior progression pattern
- Output: `career_continuity_score`, list of `flagged_periods` with reasons

**Test:** CV with gap explained by Masters degree → system marks as "Justified by: MS enrollment"

#### Step 5.3 — Experience UI Component
- Interactive Gantt-style career timeline
- Flagged periods highlighted
- Progression summary card

**Test:** All 5 test CVs render career timeline correctly

---

### M2-Phase 6: Missing Information Detection & Email Drafting

#### Step 6.1 — Missing Info Aggregator
- Aggregate `missing_fields` from all analysis modules
- Categorize by type: academic records, publication details, date gaps, authorship roles

#### Step 6.2 — Personalized Email Drafting
- LLM prompt: given candidate name, missing fields, and context → draft a professional, personalized email
- Email cites the specific missing information (e.g., "Your CGPA for your MS degree at NUST was not included")
- Multiple candidates → separate individualized emails
- Store drafts in database; UI shows draft list with copy/edit/send actions

**Test:** Candidate with 4 missing fields → email draft correctly names all 4 items with proper context

#### Step 6.3 — Email Drafts UI
- Wire `email_drafts` page to backend
- List all drafts by candidate
- Preview, edit, and copy-to-clipboard functionality

**Test:** Email drafts page displays all generated drafts

---

### M2-Phase 7: Partial Research Profile (Module 3.2 — Journals)

#### Step 7.1 — Journal Publication Extraction & Verification
- Extract journal name, ISSN, paper title, year, authors from CV
- Look up journal in **local `scimago_sjr.csv`** by ISSN or journal name (`rapidfuzz` fuzzy match on name if ISSN is missing):
  - Scimago SJR covers: Scopus indexing status ✓, quartile (Q1–Q4) ✓, H-index, SJR score
- Look up journal in **local `wos_master_list.csv`** (Clarivate free title list) by ISSN to determine WoS indexing status
- Look up journal in **local `doaj_journals.csv`** for open-access verification
- If not found in any local dataset: flag as "Unverified / Potentially Predatory"
- No API calls made at runtime — all lookups are local CSV reads

**Test:** 10 journal papers from `Talash.pdf` → verify quartile and indexing results match manual lookup for 3 journals

#### Step 7.2 — Authorship Role Detection
- Parse author lists to find candidate name
- Determine position: first, corresponding, both, other co-author
- Handle name variations (initials vs full name)

**Test:** Verify authorship roles correctly identified across different name formatting styles

---

### M2-Phase 8: Tabular Outputs & Charts

#### Step 8.1 — Candidate Comparison Table
- Wire `candidates_list` page with sortable/filterable table data from backend
- Columns: Name, Education Score, Research Score, Experience Score, Missing Fields count

#### Step 8.2 — Initial Dashboard Charts
- Bar chart: candidates by education score
- Donut chart: distribution of publication types (journal vs conference)
- Bar chart: publications per quartile
- Wire `dashboard` page to real data

**Test (M2 Demo):** Upload 3+ CVs → full pipeline runs → candidates table and dashboard charts render with real data; email drafts generated for candidates with missing info

---

## MILESTONE 3 — Full Integrated System, Final Report, Live Demo
**Weight: 50% | Deadline: ~Week 14**

### Goals
- All 9 functional modules fully implemented
- Graphical dashboard complete
- Candidate summary generation
- Full multi-candidate comparison
- Candidate ranking engine (extra credit)
- End-to-end integration tested

---

### M3-Phase 9: Research Profile — Conferences (Module 3.2 continued)

#### Step 9.1 — Conference Paper Analysis
- Extract conference name, paper title, year, authors
- Look up conference in **local `core_rankings.csv`** using `rapidfuzz` fuzzy match on conference name → rank (A*, A, B, C) and A* flag
- Identify conference maturity from the name string (regex: "13th Annual", "28th IEEE", etc.)
- Check proceedings publisher: classify from publisher string extracted by LLM (IEEE, ACM, Springer, Elsevier, etc.)

**Test:** 5 conference papers → verify CORE ranking lookup works for at least 3

#### Step 9.2 — Research Profile Scoring
- Combine journal + conference metrics into `research_score`
- Formula: Σ(paper_weight) where weight = f(Q1=1.0, Q2=0.75, Q3=0.5, Q4/unranked=0.25) × f(authorship: first=1.0, corresponding=0.9, other=0.5) + A* conference bonus

**Test:** Score 5 candidates → verify high-quality profiles rank higher

---

### M3-Phase 10: Student Supervision & Books/Patents (Modules 3.3, 3.4, 3.5)

#### Step 10.1 — Supervision Analysis
- Extract MS/PhD supervision records (main vs co-supervisor)
- LLM identifies supervision data from CV text
- Optional: match supervised student names to co-authored papers

**Test:** CV with 3 MS students supervised → system extracts all 3 correctly

#### Step 10.2 — Books & Patents
- Extract book metadata (ISBN, publisher, authors, year)
- Extract patent data (patent number, inventors, country, date)
- Determine authorship role in each
- Flag online verification links

**Test:** CV with 1 book and 1 patent → both extracted with correct metadata

---

### M3-Phase 11: Topic Variability & Co-Author Analysis (Modules 3.6, 3.7)

#### Step 11.1 — Topic Clustering
- Embed all paper titles (and abstracts if available) using **local `sentence-transformers` model** (`all-MiniLM-L6-v2`) — no API call
- Cluster embeddings using `scikit-learn` KMeans (or `hdbscan` for variable cluster count)
- Use Ollama to generate a human-readable label for each cluster (e.g., "Computer Vision", "NLP", "Networks")
- Compute topic distribution: % of papers per theme, dominant theme, diversity score (entropy-based 0–100)
- Compute year-by-year topic trend

**Test:** Candidate with 10 papers in 2 clearly different topics → high concentration score detected

#### Step 11.2 — Co-Author Network Analysis
- Build co-author graph per candidate
- Compute: unique co-authors, most frequent collaborators, avg authors/paper
- Detect possible supervisor-student pairs from name overlap with supervision data
- Classify collaborations: national vs international (by institution affiliation)

**Test:** Candidate with 8 papers → co-author network graph built correctly

#### Step 11.3 — Topic & Co-Author UI
- Network graph visualization (D3.js or Recharts)
- Topic distribution pie/bar chart
- Co-author frequency list

---

### M3-Phase 12: Skill Alignment (Module 3.9)

#### Step 12.1 — Skill Evidence Mapping
- Extract claimed skills from CV
- LLM cross-references each skill against:
  - Job titles and responsibilities
  - Publication topics and methods
  - Certifications and projects
- Classify each skill: **Strongly Evidenced / Partially Evidenced / Unsupported**

**Test:** Candidate claiming "Deep Learning" → verify it's classified as "Strongly Evidenced" if they have DL papers

#### Step 12.2 — Job Relevance Analysis
- Accept optional job description input (from settings/job role config)
- Score each candidate's skills against the JD requirements
- Output: matched skills, missing skills, overall job-fit score

**Test:** Provide a sample JD → verify relevant skills are matched correctly

---

### M3-Phase 13: Comprehensive Candidate Summary

#### Step 13.1 — AI-Generated Candidate Report
- LLM synthesizes all module outputs into a structured summary:
  - Executive summary (3–5 sentences)
  - Key strengths (top 3 items with evidence)
  - Concerns / flags (gaps, unverified claims, unsupported skills)
  - Suitability rating with explanation
  - Recommended follow-up questions
- Store report as text; render in `candidate_profile` page

**Test:** Generate summaries for 5 candidates → verify each is unique, accurate, and meaningful

---

### M3-Phase 14: Candidate Ranking Engine (Extra Credit)

#### Step 14.1 — Configurable Weighting System
- Admin-configurable weights for each module score (via Settings page)
- Default weights:
  - Education Score — 20%
  - Research Score — 30%
  - Experience Score — 25%
  - Skill Alignment — 15%
  - Supervision/Books/Patents — 10%
- Compute final `talash_score` (0–100) for each candidate
- Rankings table: sorted, filterable, with score breakdown

**Test:** Adjust weights → verify rankings update accordingly

---

### M3-Phase 15: Full Dashboard & Comparison Views

#### Step 15.1 — Graphical Dashboard (Complete)
- KPI cards: Total candidates, avg Talash score, top candidate
- Publication quality breakdown charts
- Education score distribution histogram
- Career progression heatmap across candidates
- Missing info detection summary

#### Step 15.2 — Multi-Candidate Comparison
- Wire `compare_candidates` page
- Side-by-side profile comparison (up to 4 candidates)
- Radar chart: scores across all modules per candidate
- Highlighted differences in key metrics

**Test:** Select 3 candidates → comparison view renders with radar chart and differences highlighted

---

### M3-Phase 16: End-to-End Testing & Polish

#### Step 16.1 — Full Pipeline Test (Multiple CVs)
- Process a batch of 5–10 sample CVs end-to-end
- Verify no pipeline failures, all modules produce output
- Verify database integrity (no orphaned records)

#### Step 16.2 — UI/UX Polish
- Consistent application of DESIGN.md rules across all pages:
  - No borders, tonal layering only
  - Glassmorphism on modals/dropdowns
  - Gradient CTAs
  - Ghost inputs
- Dark mode support
- Responsive layout (tablet support)

#### Step 16.3 — Performance Optimization
- Add in-process LRU cache (Python `functools.lru_cache` or `cachetools`) for ranking data and reference CSV lookups
- For large CV batches: use FastAPI's `BackgroundTasks` for non-blocking processing without requiring Celery
- API response times < 500ms for all pre-processed data endpoints (LLM inference excluded — it is slow by nature)

#### Step 16.4 — Security Hardening
- File upload validation: accept only PDFs, max size 10MB, scan for malformed files
- API authentication (JWT) on all protected endpoints
- Input sanitization on all LLM prompts (prevent prompt injection)
- Rate limiting on API endpoints

**Final Demo Test:** Upload 5 CVs → full pipeline processes → dashboard, candidate profiles, comparison view, email drafts, and rankings all functional and populated with real data

---

## Testing Strategy Per Module

| Module | Unit Test | Integration Test | Manual Verification |
|--------|-----------|-----------------|---------------------|
| CV Parsing | PDF text extraction accuracy | Full parse → DB insert | Compare extracted vs CV manually |
| Education Analysis | Normalization math, gap calc | End-to-end score | Review score for known candidate |
| Research Analysis | Quartile lookup, authorship detection | Journal verify pipeline | Spot-check 5 papers |
| Experience Analysis | Overlap detection, gap calc | Full timeline | Visual timeline check |
| Missing Info / Email | Field detection logic | Email draft content | Human review of emails |
| Skill Alignment | Evidence classification | Full skill audit | Check 3 candidate skill maps |
| Summary Generation | LLM output structure | Full report generation | Human review of 3 summaries |
| Ranking Engine | Weight calculation math | Full ranking with 5 CVs | Verify order makes sense |

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|-----------|
| LLM hallucinating publication data | High | Cross-verify with local reference CSVs; LLM output is never used as sole source for rankings |
| Poor OCR on scanned CVs | Medium | Fallback OCR pipeline (`pytesseract`); flag low-confidence extractions |
| Local reference CSVs being outdated | Medium | Version-stamp each CSV with download date; re-download before final demo |
| Local LLM insufficient extraction quality | Medium | Test on `Talash.pdf` first; switch to larger model (`qwen2.5:7b`) if needed |
| Slow LLM inference on low-spec machines | Medium | Use `llama3.2:3b` on CPU-only; batch prompts efficiently; show progress indicator |
| Name matching for authorship (false negatives) | Medium | `rapidfuzz` fuzzy matching + Ollama disambiguation for low-confidence matches |
| Journal not found in local CSVs | Low | Mark as "Unverified"; flag for manual review; do not assume predatory |

---

## Reference Datasets (Pre-Downloaded, No Runtime API Calls)

All external reference data is downloaded once and stored in `data/reference_data/`. No API calls are made at runtime.

| Dataset | Purpose | Format | Where to Download |
|---------|---------|--------|-------------------|
| Scimago SJR | Q1–Q4 quartile, Scopus indexing, SJR score, H-index | Free annual CSV | scimagojr.com/journalrank.php |
| CORE Rankings | Conference rank (A*, A, B, C) | Free CSV | portal.core.edu.au/conf-ranks/ |
| QS World Rankings | University quality tier | CSV (free partial) | topuniversities.com/world-university-rankings |
| THE World Rankings | University quality tier | CSV (free partial) | timeshighereducation.com/world-university-rankings |
| DOAJ | Open access journal verification | Free CSV dump | doaj.org/docs/public-data-dump/ |
| WoS Master Journal List | WoS-indexed journal ISSNs | Free CSV title list | clarivate.com/academia-government/scientific-and-academic-research/research-discovery-and-referencing/web-of-science/master-journal-list/ |

> **Note on WoS Impact Factor:** The IF itself is paywalled. Use the **Scimago SJR score** as a quality proxy — it is highly correlated with IF and is freely available.
>
> **Note on Ollama:** Ollama (`llama3.2:8b`) handles all LLM tasks: extraction, narrative generation, email drafting, cluster labeling. It runs entirely on local hardware. No OpenAI or any other LLM API keys are required.
>
> **Primary Test Dataset:** `Talash.pdf` (provided sample dataset) is placed in `data/sample_cvs/` and used for all end-to-end tests throughout the milestones.
