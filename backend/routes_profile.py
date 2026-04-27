"""Profile and base-resume routes."""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile

from models import Profile, ProfileUpdate
from resume_parser import parse_resume_bytes
from routes_auth import current_user

router = APIRouter(prefix="/profile", tags=["profile"])

MAX_UPLOAD_BYTES = 4 * 1024 * 1024  # 4 MB


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@router.get("", response_model=Profile)
async def get_profile(request: Request, user: dict = Depends(current_user)):
    db = request.app.state.db
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    if not profile:
        profile = {
            "user_id": user["id"], "full_name": user.get("name", ""),
            "headline": "", "phone": "", "location": "",
            "email_public": user["email"], "linkedin_url": "", "website_url": "",
            "summary": "", "skills": [], "base_resume_text": "",
            "base_resume_filename": "", "updated_at": _now(),
        }
        await db.profiles.insert_one(profile)
        profile.pop("_id", None)
    return profile


@router.put("", response_model=Profile)
async def update_profile(
    payload: ProfileUpdate, request: Request, user: dict = Depends(current_user)
):
    db = request.app.state.db
    update = {k: v for k, v in payload.model_dump().items() if v is not None}
    update["updated_at"] = _now()
    await db.profiles.update_one(
        {"user_id": user["id"]},
        {"$set": update, "$setOnInsert": {"user_id": user["id"]}},
        upsert=True,
    )
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return profile


@router.post("/upload-resume", response_model=Profile)
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    user: dict = Depends(current_user),
):
    data = await file.read()
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Empty file.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="File too large (max 4MB).")
    try:
        text, fmt = parse_resume_bytes(file.filename or "resume", data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    db = request.app.state.db
    await db.profiles.update_one(
        {"user_id": user["id"]},
        {"$set": {
            "base_resume_text": text,
            "base_resume_filename": file.filename or f"resume.{fmt}",
            "updated_at": _now(),
        }, "$setOnInsert": {"user_id": user["id"]}},
        upsert=True,
    )
    profile = await db.profiles.find_one({"user_id": user["id"]}, {"_id": 0})
    return profile
