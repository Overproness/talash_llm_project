"""
Missing Info Detector & Email Generator — Module 4.4

Enhanced missing information detection + LLM-powered personalized email drafting.
"""

import json
import logging
from typing import Optional

from app.models.candidate import (
    CandidateDocument,
    EmailDraft,
    MissingInfoItem,
)
from app.services.llm_client import generate_with_llm_text, is_llm_available

logger = logging.getLogger(__name__)


# ─── Enhanced missing field detection ─────────────────────────────────────────

def detect_missing_info_detailed(doc: CandidateDocument) -> list[MissingInfoItem]:
    """Comprehensive missing information detection with severity classification."""
    missing: list[MissingInfoItem] = []
    pi = doc.personal_info

    # Personal info checks
    if not pi.name:
        missing.append(MissingInfoItem(
            field="personal_info.name",
            description="Candidate name is missing",
            severity="critical",
        ))
    if not pi.email:
        missing.append(MissingInfoItem(
            field="personal_info.email",
            description="Email address is missing",
            severity="high",
        ))
    if not pi.phone:
        missing.append(MissingInfoItem(
            field="personal_info.phone",
            description="Phone number is missing",
            severity="medium",
        ))

    # Education checks
    if not doc.education:
        missing.append(MissingInfoItem(
            field="education",
            description="No education records found in CV",
            severity="critical",
        ))
    else:
        for i, edu in enumerate(doc.education):
            if not edu.institution and not edu.board_or_affiliation:
                missing.append(MissingInfoItem(
                    field=f"education[{i}].institution",
                    description=f"Institution name missing for {edu.degree or f'education record {i+1}'}",
                    severity="high",
                ))
            if not edu.marks_or_cgpa:
                missing.append(MissingInfoItem(
                    field=f"education[{i}].marks_or_cgpa",
                    description=f"Academic score/CGPA missing for {edu.degree or f'education record {i+1}'} at {edu.institution or 'unknown institution'}",
                    severity="high",
                ))
            if not edu.start_year and not edu.end_year:
                missing.append(MissingInfoItem(
                    field=f"education[{i}].years",
                    description=f"Year of completion missing for {edu.degree or f'education record {i+1}'}",
                    severity="medium",
                ))
            if not edu.specialization and edu.level in ("UG", "PG", "PhD"):
                missing.append(MissingInfoItem(
                    field=f"education[{i}].specialization",
                    description=f"Specialization/major missing for {edu.degree or edu.level}",
                    severity="medium",
                ))

    # Experience checks
    if not doc.experience:
        missing.append(MissingInfoItem(
            field="experience",
            description="No professional experience records found",
            severity="high",
        ))
    else:
        for i, exp in enumerate(doc.experience):
            if not exp.start_date:
                missing.append(MissingInfoItem(
                    field=f"experience[{i}].start_date",
                    description=f"Start date missing for role: {exp.title or f'position {i+1}'}",
                    severity="medium",
                ))
            if not exp.end_date:
                missing.append(MissingInfoItem(
                    field=f"experience[{i}].end_date",
                    description=f"End date missing for role: {exp.title or f'position {i+1}'} (if still active, specify 'Present')",
                    severity="medium",
                ))
            if not exp.organization:
                missing.append(MissingInfoItem(
                    field=f"experience[{i}].organization",
                    description=f"Organization name missing for role: {exp.title or f'position {i+1}'}",
                    severity="high",
                ))

    # Publication checks
    for i, pub in enumerate(doc.publications):
        if not pub.year:
            missing.append(MissingInfoItem(
                field=f"publications[{i}].year",
                description=f"Publication year missing for: {pub.title[:60] if pub.title else f'publication {i+1}'}",
                severity="medium",
            ))
        if not pub.venue:
            missing.append(MissingInfoItem(
                field=f"publications[{i}].venue",
                description=f"Venue/journal name missing for: {pub.title[:60] if pub.title else f'publication {i+1}'}",
                severity="medium",
            ))
        if not pub.authors:
            missing.append(MissingInfoItem(
                field=f"publications[{i}].authors",
                description=f"Author list missing for: {pub.title[:60] if pub.title else f'publication {i+1}'}",
                severity="low",
            ))

    # Skills check
    if not doc.skills:
        missing.append(MissingInfoItem(
            field="skills",
            description="No skills listed in the CV",
            severity="medium",
        ))

    return missing


# ─── Email generation ─────────────────────────────────────────────────────────

def _generate_email_template(doc: CandidateDocument, missing: list[MissingInfoItem]) -> EmailDraft:
    """Generate a template-based email draft (no LLM required)."""
    name = doc.personal_info.name or "Candidate"
    email = doc.personal_info.email or ""

    # Group missing items by severity
    critical = [m for m in missing if m.severity == "critical"]
    high = [m for m in missing if m.severity == "high"]
    medium = [m for m in missing if m.severity == "medium"]
    low = [m for m in missing if m.severity == "low"]

    # Build detailed list
    missing_descriptions = []
    if critical:
        missing_descriptions.append("CRITICAL (required for assessment):")
        for m in critical:
            missing_descriptions.append(f"  • {m.description}")
    if high:
        missing_descriptions.append("\nImportant (strongly recommended):")
        for m in high:
            missing_descriptions.append(f"  • {m.description}")
    if medium:
        missing_descriptions.append("\nAdditional information needed:")
        for m in medium:
            missing_descriptions.append(f"  • {m.description}")
    if low:
        missing_descriptions.append("\nOptional (if available):")
        for m in low:
            missing_descriptions.append(f"  • {m.description}")

    missing_text = "\n".join(missing_descriptions)

    body = f"""Dear {name},

Thank you for your application. We are currently reviewing your submitted CV as part of our recruitment process.

After a thorough review, we have identified that the following information is either missing or incomplete in your CV:

{missing_text}

To ensure a fair and complete evaluation of your candidacy, we kindly request that you provide the above information at your earliest convenience. You may either:

1. Reply to this email with the requested details, or
2. Submit an updated CV containing the complete information.

Please note that incomplete profiles may affect the assessment timeline. We aim to complete our evaluation promptly and your cooperation will help us serve you better.

If you have any questions or need clarification regarding the requested information, please do not hesitate to reach out.

Best regards,
TALASH HR Recruitment System
Smart HR Recruitment Team"""

    return EmailDraft(
        candidate_name=name,
        candidate_email=email,
        subject=f"Action Required: Missing Information in Your Application — {name}",
        body=body,
        missing_items=[m.description for m in missing],
    )


_EMAIL_PROMPT = """Generate a professional, personalized email to a job candidate requesting missing information from their CV.

CANDIDATE NAME: {name}
CANDIDATE EMAIL: {email}
CURRENT ROLE: {current_role}

MISSING INFORMATION:
{missing_items}

CANDIDATE'S EXISTING PROFILE HIGHLIGHTS:
- Education: {edu_summary}
- Experience: {exp_summary}
- Publications: {pub_count} publications
- Skills: {skills_summary}

Write a professional yet warm email that:
1. Addresses the candidate by name
2. Acknowledges their existing qualifications positively
3. Clearly lists each missing item
4. Explains why the information is needed
5. Provides clear instructions for responding
6. Is appropriately formal for academic recruitment

The email should be 200-350 words. Write ONLY the email body (no subject line or headers)."""


async def generate_email_with_llm(
    doc: CandidateDocument,
    missing: list[MissingInfoItem],
) -> EmailDraft:
    """Generate a personalized email using LLM."""
    name = doc.personal_info.name or "Candidate"
    email = doc.personal_info.email or ""

    # Build context
    current_role = ""
    if doc.experience:
        current_role = f"{doc.experience[0].title} at {doc.experience[0].organization}"

    edu_summary = ", ".join(
        f"{e.degree} ({e.institution})" for e in doc.education[:3]
    ) or "Not available"

    exp_summary = ", ".join(
        f"{e.title} at {e.organization}" for e in doc.experience[:3]
    ) or "Not available"

    skills_summary = ", ".join(doc.skills[:10]) or "Not listed"
    missing_items = "\n".join(f"- {m.description} (Severity: {m.severity})" for m in missing)

    prompt = _EMAIL_PROMPT.format(
        name=name,
        email=email,
        current_role=current_role,
        missing_items=missing_items,
        edu_summary=edu_summary,
        exp_summary=exp_summary,
        pub_count=len(doc.publications),
        skills_summary=skills_summary,
    )

    try:
        body = await generate_with_llm_text(
            "You are an HR recruitment professional drafting personalized emails to academic candidates.",
            prompt,
        )

        return EmailDraft(
            candidate_name=name,
            candidate_email=email,
            subject=f"Action Required: Missing Information in Your Application — {name}",
            body=body,
            missing_items=[m.description for m in missing],
        )
    except Exception as e:
        logger.warning(f"LLM email generation failed, using template: {e}")
        return _generate_email_template(doc, missing)


# ─── Main entry points ────────────────────────────────────────────────────────

async def generate_email_draft(
    doc: CandidateDocument,
    missing: Optional[list[MissingInfoItem]] = None,
) -> EmailDraft:
    """Generate personalized email draft for missing information."""
    if missing is None:
        missing = detect_missing_info_detailed(doc)

    if not missing:
        return EmailDraft(
            candidate_name=doc.personal_info.name or "Candidate",
            candidate_email=doc.personal_info.email or "",
            subject="",
            body="No missing information detected — no email needed.",
            missing_items=[],
        )

    llm_ok = await is_llm_available()
    if llm_ok:
        return await generate_email_with_llm(doc, missing)
    return _generate_email_template(doc, missing)
