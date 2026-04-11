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

// ─── Main candidate types ─────────────────────────────────────────────────────

export interface CandidateListItem {
  id: string
  name: string
  filename: string
  uploaded_at: string
  processing_status: 'pending' | 'processing' | 'done' | 'failed'
  overall_score: number | null
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
  overall_score: number | null
  summary: string
}

export interface UploadResponse {
  candidate_id: string
  filename: string
  status: string
  message: string
}
