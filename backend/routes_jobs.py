"""Job & document generation routes."""
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import StreamingResponse
import io

from models import AnalyzeRequest, GenerateRequest, JobRecord
from gemini_service import (
    analyze_job_description,
    generate_cover_letter,
    generate_resume,
)
from pdf_service import text_to_pdf
from routes_auth import current_user

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _get_profile(db, user_id: str) -> dict:
    profile = await db.profiles.find_one({"user_id": user_id}, {"_id": 0})
    return profile or {"base_resume_text": "", "full_name": "", "skills": []}


@router.post("/analyze")
async def analyze(payload: AnalyzeRequest, request: Request, user: dict = Depends(current_user)):
    db = request.app.state.db
    profile = await _get_profile(db, user["id"])
    analysis = await analyze_job_description(
        job_description=payload.job_description,
        base_resume_text=profile.get("base_resume_text", ""),
    )
    job_id = str(uuid.uuid4())
    job_doc = {
        "id": job_id,
        "user_id": user["id"],
        "job_title": (payload.job_title or "").strip(),
        "company": (payload.company or "").strip(),
        "source_url": (payload.source_url or "").strip(),
        "source_site": (payload.source_site or "").strip(),
        "job_description": payload.job_description.strip(),
        "analysis": analysis,
        "created_at": _now(),
    }
    await db.jobs.insert_one(job_doc)
    job_doc.pop("_id", None)
    return job_doc


@router.get("")
async def list_jobs(request: Request, user: dict = Depends(current_user)):
    db = request.app.state.db
    cursor = db.jobs.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(200)


@router.get("/{job_id}")
async def get_job(job_id: str, request: Request, user: dict = Depends(current_user)):
    db = request.app.state.db
    job = await db.jobs.find_one({"id": job_id, "user_id": user["id"]}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    docs_cursor = db.documents.find({"job_id": job_id, "user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    job["documents"] = await docs_cursor.to_list(100)
    return job


@router.delete("/{job_id}")
async def delete_job(job_id: str, request: Request, user: dict = Depends(current_user)):
    db = request.app.state.db
    res = await db.jobs.delete_one({"id": job_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found.")
    await db.documents.delete_many({"job_id": job_id, "user_id": user["id"]})
    return {"ok": True}


async def _generate_and_store(
    db, user_id: str, job_id: str, doc_type: str, tone: str, extra_notes: str
) -> dict:
    job = await db.jobs.find_one({"id": job_id, "user_id": user_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found.")
    profile = await _get_profile(db, user_id)
    if not profile.get("base_resume_text"):
        raise HTTPException(
            status_code=400,
            detail="Upload your base resume in Profile before generating documents.",
        )
    if doc_type == "resume":
        content = await generate_resume(profile, job, tone, extra_notes)
    else:
        content = await generate_cover_letter(profile, job, tone, extra_notes)
    doc = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "job_id": job_id,
        "doc_type": doc_type,
        "content": content,
        "created_at": _now(),
    }
    await db.documents.insert_one(doc)
    doc.pop("_id", None)
    return doc


@router.post("/{job_id}/generate-resume")
async def generate_resume_route(
    job_id: str, payload: GenerateRequest, request: Request, user: dict = Depends(current_user)
):
    db = request.app.state.db
    return await _generate_and_store(
        db, user["id"], job_id, "resume", payload.tone or "professional", payload.extra_notes or ""
    )


@router.post("/{job_id}/generate-cover-letter")
async def generate_cover_letter_route(
    job_id: str, payload: GenerateRequest, request: Request, user: dict = Depends(current_user)
):
    db = request.app.state.db
    return await _generate_and_store(
        db, user["id"], job_id, "cover_letter", payload.tone or "professional", payload.extra_notes or ""
    )


@router.get("/documents/{doc_id}/pdf")
async def download_pdf(doc_id: str, request: Request, user: dict = Depends(current_user)):
    db = request.app.state.db
    doc = await db.documents.find_one({"id": doc_id, "user_id": user["id"]}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found.")
    job = await db.jobs.find_one({"id": doc["job_id"], "user_id": user["id"]}, {"_id": 0}) or {}
    label = "resume" if doc["doc_type"] == "resume" else "cover-letter"
    company = (job.get("company") or "role").replace(" ", "-").lower()[:32]
    filename = f"{label}-{company}.pdf"
    pdf_bytes = text_to_pdf(doc["content"], filename_hint=label)
    headers = {"Content-Disposition": f'attachment; filename="{filename}"'}
    return StreamingResponse(io.BytesIO(pdf_bytes), media_type="application/pdf", headers=headers)


@router.get("/documents/all")
async def list_all_documents(request: Request, user: dict = Depends(current_user)):
    db = request.app.state.db
    cursor = db.documents.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    return await cursor.to_list(200)
