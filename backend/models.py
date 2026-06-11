"""Pydantic models for the application."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str = "user"
    created_at: str


class AuthResponse(BaseModel):
    user: UserPublic
    access_token: str


# ---------- Profile ----------
class ProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    headline: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    email_public: Optional[str] = None
    linkedin_url: Optional[str] = None
    website_url: Optional[str] = None
    summary: Optional[str] = None
    skills: Optional[List[str]] = None
    base_resume_text: Optional[str] = None


class Profile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    full_name: str = ""
    headline: str = ""
    phone: str = ""
    location: str = ""
    email_public: str = ""
    linkedin_url: str = ""
    website_url: str = ""
    summary: str = ""
    skills: List[str] = []
    base_resume_text: str = ""
    base_resume_filename: str = ""
    updated_at: str = Field(default_factory=_now_iso)


# ---------- Jobs ----------
class AnalyzeRequest(BaseModel):
    job_description: str = Field(min_length=20)
    job_title: Optional[str] = None
    company: Optional[str] = None
    source_url: Optional[str] = None
    source_site: Optional[str] = None  # linkedin/indeed/naukri/manual


class KeywordsAnalysis(BaseModel):
    keywords: List[str] = []
    hard_skills: List[str] = []
    soft_skills: List[str] = []
    tools: List[str] = []
    missing_from_resume: List[str] = []
    present_in_resume: List[str] = []
    match_score: int = 0
    summary: str = ""
    suggested_titles: List[str] = []


class JobRecord(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    user_id: str
    job_title: str = ""
    company: str = ""
    source_url: str = ""
    source_site: str = ""
    job_description: str
    analysis: Optional[KeywordsAnalysis] = None
    created_at: str = Field(default_factory=_now_iso)


class GenerateRequest(BaseModel):
    tone: Optional[str] = "professional"  # professional / enthusiastic / concise
    extra_notes: Optional[str] = ""


class QuickCoverLetterRequest(BaseModel):
    job_description: str = Field(min_length=20)
    job_title: Optional[str] = ""
    company: Optional[str] = ""
    source_url: Optional[str] = ""
    source_site: Optional[str] = ""
    tone: Optional[str] = "professional"
    extra_notes: Optional[str] = ""


class GeneratedDocument(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_uuid)
    user_id: str
    job_id: str
    doc_type: str  # "resume" | "cover_letter"
    content: str
    created_at: str = Field(default_factory=_now_iso)
