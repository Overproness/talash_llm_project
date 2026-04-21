// ─── Sub-types ────────────────────────────────────────────────────────────────

export interface PersonalInfo {
  name: string
  email: string
  phone: string
  location: string
  linkedin: string
  website: string
}

export interface EducationRecord {
  level: string
  degree: string
  specialization: string
  institution: string
  start_year: number | null
  end_year: number | null
  marks_or_cgpa: string
  normalized_score: number | null
  board_or_affiliation: string
}

export interface ExperienceRecord {
  title: string
  organization: string
  employment_type: string
  start_date: string
  end_date: string
  description: string
}

export interface Publication {
  pub_type: string
  title: string
  authors: string[]
  venue: string
  year: number | null
  doi: string
  issn: string
}

export interface Book {
  title: string
  authors: string[]
  publisher: string
  year: number | null
  isbn: string
  url: string
}

export interface Patent {
  title: string
  patent_number: string
  inventors: string[]
  country: string
  date: string
  url: string
}

export interface Supervision {
  student_name: string
  degree: string
  role: string
  year: number | null
  thesis_title: string
}

// ─── Analysis types (Milestone 2) ─────────────────────────────────────────────

export interface EducationGap {
  from_level: string
  to_level: string
  from_year: number | null
  to_year: number | null
  gap_years: number | null
  justified: boolean
  justification: string
}

export interface EducationAnalysis {
  academic_performance: Array<{
    level: string
    degree: string
    institution: string
    specialization: string
    marks_or_cgpa: string
    normalized_score: number | null
    years: string
  }>
  performance_trend: string
  highest_qualification: string
  specialization_consistency: string
  institution_quality: Array<{
    institution: string
    degree: string
    level: string
    ranking_info: string
  }>
  education_gaps: EducationGap[]
  gap_justifications: string[]
  overall_assessment: string
  education_score: number | null
}

export interface ExperienceGap {
  from_role: string
  to_role: string
  from_date: string
  to_date: string
  gap_months: number | null
  justified: boolean
  justification: string
}

export interface TimelineOverlap {
  type: string
  item_a: string
  item_b: string
  overlap_period: string
  assessment: string
}

export interface ExperienceAnalysis {
  total_experience_years: number | null
  career_trajectory: string
  current_role: string
  experience_gaps: ExperienceGap[]
  timeline_overlaps: TimelineOverlap[]
  career_progression: Array<{
    title: string
    organization: string
    period: string
    employment_type: string
    seniority_level: number
  }>
  experience_consistency: string
  overall_assessment: string
  experience_score: number | null
}

export interface ResearchProfileSummary {
  total_publications: number
  journal_count: number
  conference_count: number
  book_chapter_count: number
  publication_years_range: string
  primary_research_areas: string[]
  publication_trend: string
  overall_assessment: string
}

export interface MissingInfoItem {
  field: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
}

export interface EmailDraft {
  candidate_name: string
  candidate_email: string
  subject: string
  body: string
  missing_items: string[]
}

// ─── Main candidate types ─────────────────────────────────────────────────────

export interface CandidateListItem {
  id: string
  name: string
  filename: string
  uploaded_at: string
  processing_status: 'pending' | 'processing' | 'done' | 'failed'
  overall_score: number | null
  education_score: number | null
  experience_score: number | null
  skills_count: number
  publications_count: number
  missing_fields_count: number
}

export interface CandidateFull {
  id: string
  filename: string
  file_path: string
  uploaded_at: string
  processing_status: string
  processing_error: string
  raw_text: string
  extraction_method: string
  personal_info: PersonalInfo
  education: EducationRecord[]
  experience: ExperienceRecord[]
  publications: Publication[]
  skills: string[]
  books: Book[]
  patents: Patent[]
  supervision: Supervision[]
  missing_fields: string[]
  missing_info_detailed: MissingInfoItem[]
  education_analysis: EducationAnalysis | null
  experience_analysis: ExperienceAnalysis | null
  research_summary: ResearchProfileSummary | null
  overall_score: number | null
  summary: string
}

export interface UploadResponse {
  candidate_id: string
  filename: string
  status: string
  message: string
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────

export interface DashboardStats {
  total_candidates: number
  status_distribution: Record<string, number>
  education_levels: Record<string, number>
  publication_types: Record<string, number>
  top_skills: Array<{ skill: string; count: number }>
  score_data: Array<{
    name: string
    overall_score: number | null
    education_score: number | null
    experience_score: number | null
  }>
  missing_info_candidates: Array<{ name: string; missing_count: number }>
}
