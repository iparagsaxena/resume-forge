"""Gemini-powered JD analysis and document generation via emergentintegrations."""
import os
import json
import re
import uuid
import logging
from typing import Dict, Any

from emergentintegrations.llm.chat import LlmChat, UserMessage

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"  # stable, fast, wide-available model
GEMINI_PROVIDER = "gemini"


def _get_key() -> str:
    key = os.environ.get("EMERGENT_LLM_KEY")
    if not key:
        raise RuntimeError("EMERGENT_LLM_KEY is not configured on the server.")
    return key


def _new_chat(system_message: str) -> LlmChat:
    return LlmChat(
        api_key=_get_key(),
        session_id=f"resumeforge-{uuid.uuid4()}",
        system_message=system_message,
    ).with_model(GEMINI_PROVIDER, GEMINI_MODEL)


def _extract_json(text: str) -> Dict[str, Any]:
    """Pull the first JSON object out of a model reply even if wrapped in ``` fences."""
    if not text:
        return {}
    # strip code fences
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
    if fenced:
        candidate = fenced.group(1)
    else:
        # greedy first { to last }
        start = text.find("{")
        end = text.rfind("}")
        candidate = text[start : end + 1] if start != -1 and end != -1 else text
    try:
        return json.loads(candidate)
    except Exception:
        # try to repair trailing commas etc. fallback: return empty
        try:
            cleaned = re.sub(r",\s*([}\]])", r"\1", candidate)
            return json.loads(cleaned)
        except Exception:
            logger.warning("Failed to parse JSON from model output.")
            return {}


async def analyze_job_description(job_description: str, base_resume_text: str) -> Dict[str, Any]:
    system = (
        "You are an ATS (Applicant Tracking System) expert and career strategist. "
        "Given a job description and the candidate's resume, extract the most relevant "
        "keywords, hard skills, soft skills, and tools, and compute a match score. "
        "Return ONLY valid JSON, no markdown, no prose outside JSON."
    )
    resume_block = base_resume_text.strip() or "(no resume provided)"
    prompt = f"""Analyze the following JOB DESCRIPTION against the CANDIDATE RESUME.

JOB DESCRIPTION:
\"\"\"
{job_description.strip()[:12000]}
\"\"\"

CANDIDATE RESUME:
\"\"\"
{resume_block[:12000]}
\"\"\"

Return a JSON object with EXACTLY these keys:
{{
  "keywords": [list of 8-15 short ATS keywords most likely scanned by recruiters],
  "hard_skills": [technical skills explicitly or implicitly required],
  "soft_skills": [soft/behavioural skills mentioned],
  "tools": [tools, platforms, frameworks, software named],
  "present_in_resume": [skills/keywords already covered by the resume],
  "missing_from_resume": [important skills/keywords missing from the resume that should be added if truthful],
  "match_score": integer 0-100 estimating how well the resume matches the JD,
  "summary": "2-3 sentence plain-English analysis",
  "suggested_titles": [1-3 role title suggestions that match this JD]
}}
All arrays should contain short strings (1-4 words each) without duplicates."""
    chat = _new_chat(system)
    response = await chat.send_message(UserMessage(text=prompt))
    data = _extract_json(response)
    # sensible defaults
    data.setdefault("keywords", [])
    data.setdefault("hard_skills", [])
    data.setdefault("soft_skills", [])
    data.setdefault("tools", [])
    data.setdefault("present_in_resume", [])
    data.setdefault("missing_from_resume", [])
    data.setdefault("match_score", 0)
    data.setdefault("summary", "")
    data.setdefault("suggested_titles", [])
    try:
        data["match_score"] = max(0, min(100, int(data["match_score"])))
    except Exception:
        data["match_score"] = 0
    return data


async def generate_resume(profile: Dict[str, Any], job: Dict[str, Any], tone: str, extra_notes: str) -> str:
    system = (
        "You are an expert resume writer. Produce a tailored, ATS-friendly resume in clean, "
        "plain-text format using the structure provided. Never invent fake employers or dates. "
        "Rephrase and reorder bullets to emphasize alignment with the job description. "
        "Use strong action verbs and quantify achievements where possible. Output plain text only."
    )
    analysis = job.get("analysis") or {}
    keywords = ", ".join((analysis.get("keywords") or [])[:20])
    jd = (job.get("job_description") or "")[:8000]
    resume_text = (profile.get("base_resume_text") or "")[:10000]
    prompt = f"""Tailor the candidate's resume for the following role.

CANDIDATE PROFILE:
- Name: {profile.get("full_name") or "(derive from resume)"}
- Headline: {profile.get("headline") or ""}
- Email: {profile.get("email_public") or ""}
- Phone: {profile.get("phone") or ""}
- Location: {profile.get("location") or ""}
- LinkedIn: {profile.get("linkedin_url") or ""}
- Website: {profile.get("website_url") or ""}

CANDIDATE BASE RESUME (authoritative source of facts):
\"\"\"
{resume_text or "(no resume text)"}
\"\"\"

TARGET JOB:
- Title: {job.get("job_title") or ""}
- Company: {job.get("company") or ""}
- Key Keywords to weave in (only when truthful): {keywords}
- Tone: {tone}
- Extra instructions from user: {extra_notes or "(none)"}

JOB DESCRIPTION:
\"\"\"
{jd}
\"\"\"

Output format (plain text, NO markdown symbols like # or **):

NAME
Headline | Location | Email | Phone | LinkedIn

SUMMARY
(3-4 line tailored pitch)

SKILLS
- comma separated list grouped by hard/soft

EXPERIENCE
Role | Company | Dates
- Achievement bullet (metric when possible)
- Achievement bullet
...

EDUCATION
Degree | Institution | Year

CERTIFICATIONS / PROJECTS (if present in the resume)

Keep it under 600 words. Only include sections supported by the base resume."""
    chat = _new_chat(system)
    return await chat.send_message(UserMessage(text=prompt))


async def generate_cover_letter(profile: Dict[str, Any], job: Dict[str, Any], tone: str, extra_notes: str) -> str:
    system = (
        "You are an expert cover letter writer. Produce a concise, genuine, and tailored cover "
        "letter. Never invent facts. Use specific hooks from the job description. Output plain text."
    )
    analysis = job.get("analysis") or {}
    keywords = ", ".join((analysis.get("keywords") or [])[:12])
    jd = (job.get("job_description") or "")[:6000]
    resume_text = (profile.get("base_resume_text") or "")[:6000]
    prompt = f"""Write a cover letter tailored to this role.

CANDIDATE:
- Name: {profile.get("full_name") or "(derive from resume)"}
- Headline: {profile.get("headline") or ""}
- Location: {profile.get("location") or ""}
- Email: {profile.get("email_public") or ""}
- Phone: {profile.get("phone") or ""}

CANDIDATE BASE RESUME:
\"\"\"
{resume_text or "(no resume)"}
\"\"\"

JOB:
- Title: {job.get("job_title") or ""}
- Company: {job.get("company") or ""}
- Keywords: {keywords}
- Tone: {tone}
- Extra instructions: {extra_notes or "(none)"}

JOB DESCRIPTION:
\"\"\"
{jd}
\"\"\"

Guidelines:
- 3 to 4 short paragraphs (max 300 words).
- Opening hook specific to the company/role.
- Middle: 2-3 concrete achievements from the resume that map to the JD.
- Close with clear call-to-action.
- Start with "Dear Hiring Manager," unless a contact is known.
- End with the candidate's name.
- Plain text, no markdown."""
    chat = _new_chat(system)
    return await chat.send_message(UserMessage(text=prompt))
