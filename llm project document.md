# CS 417: Large Language Models (LLMs) — Spring 2026
## Faculty of Computing | BSDS-2K23
## Term Project Description

# SMART HR RECRUITMENT
### Talent Acquisition & Learning Automation for Smart Hiring (TALASH)

**Instructor:** Prof. Dr. Muhammad Moazam Fraz

---

## Course Learning Outcomes (CLOs)

| No. | Course Learning Outcomes | PLO (CS) | BT Level |
|-----|--------------------------|----------|----------|
| CLO 1 | Explain the fundamental concepts, architectures, and training principles of large language models. | SO-2 — Knowledge for Solving Computing Problems | C-2 (Understand) |
| CLO 2 | Compare and select appropriate large language models and configurations for different tasks based on capabilities, constraints, and use cases. | SO-5 — Modern Tool Usage | C-4 (Analyze) |
| CLO 3 | Develop and apply LLM-based solutions for practical NLP problems using suitable interaction and adaptation strategies. | SO-4 — Design/Development of Solutions | C-3 (Apply) |
| CLO 4 | Evaluate and improve LLM-based solutions using relevant metrics, testing procedures, and error analysis. | SO-3 — Problem Analysis | C-5 (Evaluate) |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Objectives / Scope](#2-objectives--scope)
3. [Functional Modules](#3-functional-modules)
   - 3.1 [Educational Profile Analysis](#31-educational-profile-analysis)
   - 3.2 [Analyze Research Profile](#32-analyze-research-profile)
   - 3.3 [Student's Supervision](#33-students-supervision)
   - 3.4 [Books Authored / Co-Authored (if any)](#34-books-authored--co-authored-if-any)
   - 3.5 [Number of Patents (if any)](#35-number-of-patents-if-any)
   - 3.6 [Topic Variability in Publications](#36-topic-variability-in-publications)
   - 3.7 [Co-Author Analysis](#37-co-author-analysis)
   - 3.8 [Professional Experience and Employment History](#38-professional-experience-and-employment-history)
   - 3.9 [Skill Alignment with Job Roles and Research Publications](#39-skill-alignment-with-job-roles-and-research-publications)
4. [Functional Requirements for Web-Based TALASH Application](#4-functional-requirements-for-web-based-talash-application)
5. [Dataset](#5-dataset)
6. [Project Evaluation and Submission Scheme](#6-project-evaluation-and-submission-scheme)

---

## 1. Introduction

Recruitment is one of the most critical processes in any organization, yet it is often time-consuming, subjective, and heavily dependent on manual evaluation of resumes and supporting documents. Traditional hiring workflows usually focus on basic keyword matching and human judgment, which may overlook deeper aspects of a candidate's academic quality, research output, publication profile, experience consistency, and skill relevance.

This project proposes **SMART HR RECRUITMENT: Talent Acquisition & Learning Automation for Smart Hiring (TALASH)**, an AI-powered recruitment support system focused on University recruitment needs, built using Large Language Models (LLMs). The system is designed to automate CV screening, candidate-job matching, academic and publication analysis, experience validation, and skill alignment assessment. TALASH aims to assist recruiters in making more informed, evidence-based, and efficient hiring decisions.

The project is especially suitable for CS417 – Large Language Models because it applies LLMs to real-world tasks such as document understanding, information extraction, semantic matching, ranking, reasoning, and profile summarization.

---

## 2. Objectives / Scope

The main objective of TALASH is to build an LLM-assisted recruitment system that performs comprehensive candidate evaluation beyond traditional keyword-based filtering. Develop an AI-Based CV Screening Engine to parse and rank CVs based on competency alignment and job-specific criteria. Analyse candidate's educational, research and professional experience profile in a grounded and quantifiable manner.

---

## 3. Functional Modules

### Pre-Processing Module

Develop a preprocessing module that parses candidate CVs in PDF format and extracts structured information into an Excel sheet or CSV file in a relational-database-like format. The extracted data should be organized into linked tables or structured fields such as personal information, education, experience, skills, publications, and other relevant profile components.

The objective of this task is to convert unstructured CV content into a clean, machine-readable dataset that can serve as the foundation for downstream analysis modules.

---

### 3.1 Educational Profile Analysis

The purpose of this module is to evaluate the candidate's academic background in a structured, evidence-based, and quantifiable manner. Rather than only recording degree titles, the system will examine the candidate's educational journey across school, college, undergraduate, and postgraduate levels to assess academic performance, progression, institutional quality, and continuity of education.

This module is especially important because a candidate's educational profile provides evidence of academic strength, consistency, specialization, and preparedness for advanced professional or research roles.

#### i. Extraction of SSE and HSSC Performance

The system will identify and extract the candidate's SSE and HSSC academic records from the CV or supporting documents. This includes:

- SSE percentage
- HSSC percentage
- Board or institution name, where available
- Year of completion, where available

This information helps assess the candidate's early academic performance and whether the candidate has demonstrated stable academic achievement across educational stages.

#### ii. Extraction of UG and PG Academic Records

The system will extract the candidate's academic performance at the undergraduate and postgraduate levels, including:

- UG marks / CGPA
- PG marks / CGPA
- Degree title
- Specialization / discipline
- University name
- Year of admission and completion, where available

This module will support variations in academic pathways. For example, some candidates may have:

- A 14-year BSc degree
- Followed by a 16-year MSc degree
- Followed by MS / MPhil

While others may have a direct 4-year BS, followed by MS and PhD. The system will therefore identify the actual degree sequence from the candidate's profile rather than assuming a fixed academic route.

#### iii. Normalization of Marks and CGPA

Candidates may report academic results in different forms, such as percentages, CGPA on different scales, grades, or divisions. The system will normalize these representations where possible while preserving the original values. This will support fairer comparison and more consistent interpretation of academic performance.

#### iv. Degree and Institution Extraction

The system will identify the candidate's degree titles and corresponding institutions, particularly at higher education levels, including:

- BS
- MS / MPhil
- PhD
- And equivalent undergraduate/postgraduate degrees where applicable

For each degree, the system will extract:

- Degree title
- Specialization
- Institution name
- Start year
- End year
- Marks / CGPA, where available

#### v. Institutional Quality Assessment using THE and QS Rankings

After extracting the institutions, the system will associate them with recognized external ranking sources such as:

- [Times Higher Education (THE) Rankings](https://www.timeshighereducation.com/world-university-rankings)
- [QS World University Rankings](https://www.topuniversities.com/world-university-rankings)

This helps evaluate the quality and reputation of the institutions attended by the candidate. If a ranking is unavailable, the system will record this transparently rather than making unsupported assumptions.

#### vi. Educational Progression and Consistency

The system will analyze the candidate's academic journey to assess:

- Progression from school to advanced higher education
- Consistency of specialization
- Improvement or decline in academic performance
- Continuity in educational development

This helps determine whether the profile reflects a coherent and progressive academic path.

#### vii. Detection of Educational Gaps

The system will identify gaps between educational stages, such as:

- Delay between SSE and HSSC
- Delay between HSSC and undergraduate studies
- Delay between undergraduate and postgraduate studies
- Or long breaks before MS, MPhil, or PhD enrollment

The duration of such gaps will be calculated and flagged for interpretation.

#### viii. Gap Justification using Professional Experience

The system will compare educational gaps against documented professional activities such as:

- Employment history
- Teaching experience
- Research assistantships
- Internships
- Freelancing
- Consultancy
- Entrepreneurship
- Or other productive engagements

This allows the system to determine whether the educational gap is justified by professional experience or remains unexplained.

#### ix. Educational Strength Interpretation

Based on the extracted and enriched information, the system will generate an overall educational assessment reflecting:

- Academic performance across levels
- Highest qualification
- Quality of institutions
- Academic consistency
- Presence and duration of educational gaps
- Whether those gaps are supported by relevant work experience

---

### 3.2 Analyze Research Profile

The purpose of this module is to evaluate the candidate's research portfolio in a grounded, evidence-based, and quantifiable manner. Instead of relying only on the total number of publications, the system will examine the quality, legitimacy, visibility, indexing status, authorship contribution, collaboration patterns, supervision record, patents, and books associated with the candidate. This enables a deeper and fairer assessment of the candidate's academic and research standing.

#### i. Analysis of Journal Publications

For each journal paper listed in the candidate's profile, the system will first identify and verify the publication venue using reliable external sources. The goal is to determine whether the journal is legitimate, recognized, and indexed in reputable databases.

The system will extract or identify the journal name, ISSN, paper title, publication year, and list of authors, and then use these details to evaluate the journal on multiple dimensions.

##### a. Journal Legitimacy and Identification

The system will determine the authenticity and credibility of the journal by identifying its ISSN and matching it with recognized journal databases. ISSN serves as a unique identifier and helps avoid confusion caused by journals with similar names. This step is important for distinguishing genuine indexed journals from predatory or misleading venues.

##### b. Web of Science (WoS) Indexing Status

The system will determine whether the journal is indexed in Web of Science. If the journal is indexed, the system will also retrieve its Impact Factor, where available. This helps evaluate the global visibility and influence of the journal, since WoS-indexed journals are generally considered more reputable in research assessment.

##### c. Scopus Indexing Status

The system will determine whether the journal is indexed in Scopus. Scopus indexing indicates that the journal is recognized in a widely used bibliographic database and is often considered a measure of publication legitimacy and academic quality.

##### d. Quartile Ranking

The system will identify the journal's quartile ranking such as Q1, Q2, Q3, or Q4. This provides an additional indicator of the journal's standing within its subject category. For example, Q1 journals are generally considered stronger and more competitive than lower quartiles.

##### e. Candidate Authorship Role

The system will analyze the order of authors and publication metadata to determine the candidate's role in the paper, specifically whether the candidate is:

- First author
- Corresponding author
- Both first and corresponding author
- Some other co-author

This is important because authorship position often reflects the level of contribution and leadership in the research work. A first author usually indicates primary contribution, while corresponding author often indicates supervisory or lead responsibility.

##### f. Overall Journal Paper Quality Interpretation

Based on the above indicators, the system can produce a structured interpretation of each journal paper. For example, it may indicate whether a paper was published in a highly ranked, indexed journal with strong visibility, or in a lower-tier or unverified venue. This enables a more nuanced evaluation than simply counting the number of journal papers.

> **Useful links:** [Clarivate MJL](https://mjl.clarivate.com/home) | [WoS Journal Info](https://wos-journal.info/) | [Scopus Metrics](https://www.elsevier.com/products/scopus/metrics)
>
> ⚠️ **Do not take journal ranking information from CV — verify it from the sources.**

#### ii. Analysis of Conference Papers

For each conference paper listed in the candidate's profile, the system will evaluate the quality, recognition, and academic standing of the conference venue. Conference publications are especially important in many fields such as computer science, where top conferences may carry significant research value.

The system will identify the conference name, paper title, publication year, authors, and proceedings details, and then assess the overall rank or standing of the conference using recognized conference ranking sources.

##### a. A\* Ranking Status

The system will specifically identify whether the conference holds an A\* ranking, where such rankings are available. An A\* conference is generally considered among the highest quality venues in its domain.

> **Useful link:** [CORE Conference Rankings](https://portal.core.edu.au/conf-ranks/)

##### b. Maturity of the Conference Series

The system will identify the maturity and continuity of the conference by determining its position in the series, such as:

- 5th International Conference
- 13th Annual Conference
- 28th IEEE Conference

This indicates whether the conference is a long-running and established venue or a newer and potentially less mature event. Mature conferences often suggest continuity, recognition, and academic stability.

##### d. Indexing and Proceedings Publisher

The system will identify whether the conference proceedings are indexed or published in recognized platforms such as:

- Scopus
- IEEE Xplore
- Springer
- ACM
- Or other reputable indexing and publishing sources

> **Useful link:** [Google Scholar Metrics](https://scholar.google.com/intl/en/scholar/metrics.html)

##### e. Candidate Authorship Role

The system will determine the candidate's contribution role in the conference paper by identifying whether the candidate is:

- First author
- Corresponding author
- Both first and corresponding author
- Some other co-author

##### f. Overall Conference Paper Quality Interpretation

Using the venue rank, A\* status, maturity, indexing status, and authorship role, the system will generate a structured assessment of the quality of each conference paper.

> **Why This Research Profile Analysis Is Important**
>
> Publication count alone does not reflect actual research strength. Two candidates may have the same number of papers, but the quality of venues, indexing status, quartile, conference maturity, and authorship roles may be very different. By analyzing these factors, the system can provide a much more reliable and fair assessment of the candidate's academic and research contributions.

---

### 3.3 Student's Supervision

This part of the research profile analysis is intended to evaluate the candidate's academic mentoring and supervisory contribution, especially at the postgraduate level. Supervision of MS and PhD students is an important indicator of research leadership, academic maturity, and contribution to capacity building in higher education.

#### a. Number of MS / PhD Students Supervised as Main Supervisor

The system will determine how many MS and PhD students have been supervised by the candidate in the role of main supervisor. A higher number of students supervised as main supervisor may indicate:

- Stronger academic leadership
- Greater trust placed in the candidate by the institution
- More substantial experience in directing independent research

#### b. Number of MS / PhD Students Supervised as Co-Supervisor

The system will also identify how many MS and PhD students the candidate has supervised as a co-supervisor. This distinction between main supervision and co-supervision is important because it shows whether the candidate primarily leads student research or contributes in a supporting supervisory capacity.

#### c. Publications Produced with Supervised Students

The system will analyze how many research papers have been co-authored by the candidate together with his or her supervised students. For each such paper, the system will determine:

- Whether the paper includes the supervised student(s)
- The total number of papers produced with students
- Whether the candidate is the corresponding author
- The author sequence number of the candidate
- The overall authorship pattern between supervisor and student

> **Note:** This information is usually not provided in the CV. Candidates can be asked to provide their supervised / co-supervised MS/PhD student names and years of graduation (if any).

---

### 3.4 Books Authored / Co-Authored (if any)

This part of the analysis evaluates the candidate's contribution to scholarly writing, academic dissemination, and authorship of long-form research or educational material.

#### a. Book Metadata Extraction

For each book associated with the candidate, the system will extract:

- Book Name
- Authors
- ISBN
- Publisher
- Publishing Year
- Online link

#### b. Authorship Role

The system will determine whether the candidate is:

- Sole author
- Lead author
- Co-author
- Or one of several contributing authors

#### c. Publisher Credibility and Scholarly Value

By identifying the publisher and publication year, the system can help estimate the scholarly relevance and credibility of the book.

#### d. Verification and Accessibility

The inclusion of an online link allows evaluators to verify the existence of the book and access more details about the publication.

#### e. Importance in Candidate Assessment

Books authored or co-authored by a candidate may indicate:

- Strong subject expertise
- Contribution to teaching and curriculum
- Leadership in a research area
- Broader academic influence beyond journal and conference publications

---

### 3.5 Number of Patents (if any)

This component evaluates the candidate's innovation, applied research contribution, and intellectual property output.

#### a. Patent Identification

For each patent, the system will extract:

- Patent Number
- Patent Title
- Date
- Innovators / Inventors
- Country of Filing
- Online verification link

#### b. Patent Contribution Analysis

The system may analyze the candidate's role among the listed inventors to determine whether the candidate appears as:

- Lead inventor
- Co-inventor
- Or contributing innovator

#### c. Verification and Credibility

The inclusion of an online verification link ensures that the patent can be validated through an official or publicly accessible patent database.

#### d. Importance in Candidate Assessment

Patent analysis helps answer questions such as:

- Has the candidate produced any patentable innovation?
- Are the candidate's contributions limited to academic publications, or do they also include applied invention?
- Does the candidate demonstrate research translation into practical or commercial outcomes?

---

### 3.6 Topic Variability in Publications

The system should analyze the subjects, themes, and research areas covered across all of a candidate's publications and determine whether the candidate has worked in a highly focused research domain or has published across multiple diverse areas.

In practical terms, the system should:

- Extract keywords, titles, abstracts, venues, and research domains from the candidate's papers
- Group publications into thematic clusters (e.g., machine learning, computer vision, networks, software engineering, cybersecurity, HR analytics)
- Measure how concentrated or dispersed the publications are across these clusters
- Identify the candidate's core area of specialization
- Estimate the degree of topical diversity in the research profile

This objective helps answer questions such as:

- Is the candidate a specialist with deep work in one narrow domain?
- Is the candidate an interdisciplinary researcher publishing in several related or unrelated areas?
- Has the candidate's research focus remained stable over time, or has it shifted significantly?

The output of this module may include:

- Major research themes of the candidate
- Percentage of publications in each theme
- Dominant topic area
- Diversity score or variability score
- Trend of topic changes over time

---

### 3.7 Co-Author Analysis

The system will analyze publication co-authorship data to identify collaboration patterns, including recurring collaborators, collaboration network size, authorship structure, and possible student-supervisor relationships.

In practical terms, the system should:

- Extract the list of co-authors from each publication
- Identify repeated collaborators
- Count how often the same co-authors appear
- Distinguish between one-time and long-term collaborations
- Examine whether the candidate usually works in small teams or large groups
- Identify whether the collaborations are mostly internal, external, national, or international

The co-author analysis can provide indicators such as:

- Total number of unique co-authors
- Most frequent collaborators
- Average number of co-authors per paper
- Collaboration network size
- Proportion of papers with recurring collaborators
- Possible student-supervisor collaboration patterns
- Collaboration diversity score

---

### 3.8 Professional Experience and Employment History

The purpose of this module is to evaluate the candidate's professional profile, employment continuity, career progression, and skill relevance in a structured and evidence-based manner.

#### i. Timeline Consistency Analysis

The system will extract job titles, organizations, start dates, end dates, employment type, and education periods, and then analyze the profile for the following:

- **Overlap between Education and Employment:** Identifies whether any professional experience overlaps with periods of formal education. Full-time job overlapping with a full-time degree may require closer scrutiny, while part-time teaching or research assistantship during MS/PhD may be reasonable.

- **Overlap between Multiple Jobs:** Detects whether two or more professional positions overlap in time, helping identify concurrent roles, consulting assignments, or potentially inconsistent claims.

- **Professional Gaps:** Identifies periods where the candidate has no recorded employment. Calculates and flags the duration of these gaps for interpretation.

- **Gap Justification:** Determines whether professional gaps are explained by other productive activities such as higher education, research, freelancing, training, entrepreneurship, consultancy, or personal leave.

- **Career Continuity and Progression:** Examines whether the candidate's work history shows a logical and progressive trajectory (e.g., junior to senior roles, research assistantship to faculty position).

This analysis helps evaluators answer:

- Is the candidate's career timeline internally consistent?
- Are there unexplained employment gaps?
- Are overlapping roles legitimate or suspicious?
- Does the candidate demonstrate career progression and professional maturity?

> **Note:** If some information is missing, draft an email to ask the information from the candidate.

---

### 3.9 Skill Alignment with Job Roles and Research Publications

This component verifies whether the skills claimed in the CV are genuinely supported by the candidate's academic, research, and professional record.

The system will compare the skills listed in the CV with:

- The candidate's job titles and job responsibilities
- The candidate's research publications and research themes
- The target job description where applicable

The analysis will focus on:

- **Skill-to-Experience Alignment:** Determines whether the candidate's professional roles provide evidence for the claimed skills (e.g., project management, machine learning, curriculum design, software development, data analysis).

- **Skill-to-Publication Alignment:** Examines whether claimed technical or research-oriented skills are supported by the topics, methods, and domains reflected in the candidate's publications.

- **Skill Consistency Across Profile:** Assesses whether the same skills appear consistently across education, work experience, research output, projects, and certifications.

- **Job Relevance of Skills:** When a target position is provided, compares the candidate's evidenced skills against the skills required by the job description.

- **Strength of Skill Evidence:** Classifies skills into:
  - Strongly evidenced
  - Partially evidenced
  - Weakly evidenced
  - Unsupported

This analysis helps evaluators answer:

- Are the candidate's claimed skills credible?
- Are the skills supported by actual work and research?
- Which skills are central strengths, and which appear overstated?
- How relevant are the candidate's skills to the target role?

---

## 4. Functional Requirements for Web-Based TALASH Application

A web application shall be developed for candidate profile analysis and recruitment support.

### 1. CV Upload and Folder Monitoring
- The system shall allow CVs to be uploaded to a designated folder/repository.
- The application shall automatically read all uploaded CV files from that folder.

### 2. Automatic CV Parsing and Candidate Analysis Engine
- The system shall extract structured information from each CV, including education, experience, skills, publications, supervision, patents, and books, where available.
- The system shall automatically perform educational, research, and professional profile analysis for each candidate based on the defined TALASH criteria.

### 3. Graphical Dashboard
- The system shall provide graphical visualizations such as charts, score summaries, publication breakdowns, gap analysis, and skill alignment views.
- The system shall present analyzed candidate information in tabular format for structured comparison and review.
- The system shall generate a concise candidate summary at the end of the analysis, highlighting key strengths, concerns, suitability, and overall profile interpretation.

### 4. Missing Information Detection
- The system shall detect missing, incomplete, or unclear information in the CV (e.g., absent academic scores, incomplete dates, missing publication details, unclear authorship roles).
- If required information is missing, the system shall draft an email requesting the missing details and asking the candidate to provide an updated CV.
- If multiple candidates have missing information, the system shall generate separate, individualized, and personalized draft emails for each candidate.

---

## 5. Dataset

Sample CVs are available at this link *(uses SEECS email IDs)*.

---

## 6. Project Evaluation and Submission Scheme

| Milestone | Weight |
|-----------|--------|
| Milestone 1 | 25% |
| Milestone 2 | 25% |
| Milestone 3 | 50% |

### Common Submission Instructions

For each milestone, every group must submit:

- Updated report on LMS
- Updated presentation slides on LMS
- Updated code on the group's GitHub repository
- Running demo during evaluation

### Demo Procedure

Each group will:
1. Give a brief presentation
2. Show a live demo
3. Answer questions/viva

### GitHub Requirement

The GitHub repository must be consistently updated throughout the semester. Continuous progress is expected; last-minute bulk uploads will be penalized.

---

### Milestone 1: Proposal, Architecture, Wireframes, Early Prototype

**Expected Work and Minimum Demo Expectation**

- Completed Preprocessing Module
- System architecture and technical design
- Module interaction and data flow
- Folder-based CV ingestion design
- LLM/NLP pipeline design
- Database/storage design
- UI/UX wireframes
- Early prototype with basic upload/read flow
- Preliminary extraction from 1–2 CVs

**Evaluation Rubric**

| Criterion | Marks |
|-----------|-------|
| System architecture and technical design | 4 |
| UI/UX wireframes and design thinking | 4 |
| Completed Pre-Processing Module & Early prototype progress | 12 |
| Running demo | 5 |
| **Total** | **25** |

---

### Milestone 2: Core Extraction, Analysis Pipeline, Intermediate Web App

**Expected Work and Minimum Demo Expectation**

- Working CV ingestion pipeline
- Folder-based reading of uploaded CVs
- CV parsing and structured extraction
- Functional implementation of:
  - Educational Profile Analysis
  - Professional Experience and Employment History
  - Missing information detection
  - Initial candidate summary generation
- Partial Research Profile processing
- Tabular outputs
- Initial charts/graphs
- Personalized draft emails for missing information

**Evaluation Rubric**

| Criterion | Marks |
|-----------|-------|
| CV parsing and structured extraction | 6 |
| Educational profile analysis | 5 |
| Professional experience analysis | 4 |
| Missing-information detection and personalized email drafting | 4 |
| Intermediate web application functionality | 6 |
| **Total** | **25** |

---

### Milestone 3: Full Integrated System, Final Report, Live Demo

**Expected Work and Minimum Demo Expectation**

- Complete working web application
- Full implementation of all functional modules
- Folder-based CV processing for multiple candidates
- Candidate-wise tabular outputs
- Graphical dashboard and comparative views
- Candidate summary generation
- Personalized missing-information email drafting
- End-to-end integration

**Evaluation Rubric**

| Criterion | Marks |
|-----------|-------|
| Completion of functional modules | 30 |
| Candidate assessment report and summary generation | 6 |
| Tabular and graphical presentation | 6 |
| Web application integration and reliability, UI/UX, inductivity | 8 |
| **Total** | **50** |

**Functional Modules Breakdown (30 Marks)**

| Sub-Criterion | Marks |
|---------------|-------|
| Educational Profile Analysis | 6 |
| Research Profile Analysis: journals and conferences | 7 |
| Topic variability and co-author analysis | 6 |
| Student supervision, patents, and books | 5 |
| Professional experience and employment history | 6 |
| **Total** | **30** |

---

### ⭐ Extra Credit

Devise and implement a full-scale quantifiable candidate ranking module in the system.

---

### Late Submission Policy

- Submissions made **within 48 hours** after the deadline will incur a **50% penalty**.
- Submissions received **after 48 hours** of the deadline will **not be accepted** for whatever reasons — plan accordingly.