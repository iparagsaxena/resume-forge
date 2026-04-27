"""Authentication routes."""
import os
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from motor.motor_asyncio import AsyncIOMotorDatabase

from auth import (
    create_access_token,
    create_refresh_token,
    decode_token,
    extract_token_from_request,
    get_current_user_from_db,
    hash_password,
    verify_password,
)
from models import AuthResponse, LoginRequest, RegisterRequest, UserPublic

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookies(response: Response, access_token: str, refresh_token: str):
    response.set_cookie(
        key="access_token", value=access_token, httponly=True, secure=True,
        samesite="none", max_age=60 * 60 * 24 * 7, path="/",
    )
    response.set_cookie(
        key="refresh_token", value=refresh_token, httponly=True, secure=True,
        samesite="none", max_age=60 * 60 * 24 * 30, path="/",
    )


async def _build_db_dep(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db


async def current_user(request: Request) -> dict:
    db = request.app.state.db
    return await get_current_user_from_db(request, db)


@router.post("/register", response_model=AuthResponse)
async def register(payload: RegisterRequest, request: Request, response: Response):
    db = request.app.state.db
    email = payload.email.lower().strip()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="An account with this email already exists.")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "email": email,
        "name": payload.name.strip(),
        "role": "user",
        "password_hash": hash_password(payload.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    # create empty profile
    await db.profiles.update_one(
        {"user_id": user_id},
        {"$setOnInsert": {
            "user_id": user_id,
            "full_name": payload.name.strip(),
            "headline": "",
            "phone": "",
            "location": "",
            "email_public": email,
            "linkedin_url": "",
            "website_url": "",
            "summary": "",
            "skills": [],
            "base_resume_text": "",
            "base_resume_filename": "",
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    access = create_access_token(user_id, email)
    refresh = create_refresh_token(user_id)
    _set_auth_cookies(response, access, refresh)
    return {
        "user": {
            "id": user_id, "email": email, "name": doc["name"],
            "role": "user", "created_at": doc["created_at"],
        },
        "access_token": access,
    }


@router.post("/login", response_model=AuthResponse)
async def login(payload: LoginRequest, request: Request, response: Response):
    db = request.app.state.db
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password.")
    access = create_access_token(user["id"], email)
    refresh = create_refresh_token(user["id"])
    _set_auth_cookies(response, access, refresh)
    return {
        "user": {
            "id": user["id"], "email": user["email"], "name": user.get("name", ""),
            "role": user.get("role", "user"), "created_at": user["created_at"],
        },
        "access_token": access,
    }


@router.post("/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"ok": True}


@router.get("/me", response_model=UserPublic)
async def me(user: dict = Depends(current_user)):
    return {
        "id": user["id"], "email": user["email"], "name": user.get("name", ""),
        "role": user.get("role", "user"), "created_at": user["created_at"],
    }


@router.post("/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token.")
    try:
        payload = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid refresh token.")
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid token type.")
    db = request.app.state.db
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    access = create_access_token(user["id"], user["email"])
    response.set_cookie(
        key="access_token", value=access, httponly=True, secure=True,
        samesite="none", max_age=60 * 60 * 24 * 7, path="/",
    )
    return {"access_token": access}


async def seed_admin_and_demo(db):
    """Seed admin + demo accounts based on env."""
    now = datetime.now(timezone.utc).isoformat()
    seeds = [
        {
            "email": os.environ.get("ADMIN_EMAIL", "admin@resumeforge.com").lower(),
            "password": os.environ.get("ADMIN_PASSWORD", "admin123"),
            "name": "Admin",
            "role": "admin",
        },
        {
            "email": os.environ.get("TEST_USER_EMAIL", "demo@resumeforge.com").lower(),
            "password": os.environ.get("TEST_USER_PASSWORD", "demo123"),
            "name": "Demo User",
            "role": "user",
        },
    ]
    for s in seeds:
        existing = await db.users.find_one({"email": s["email"]})
        if existing is None:
            user_id = str(uuid.uuid4())
            await db.users.insert_one({
                "id": user_id,
                "email": s["email"],
                "name": s["name"],
                "role": s["role"],
                "password_hash": hash_password(s["password"]),
                "created_at": now,
            })
            await db.profiles.update_one(
                {"user_id": user_id},
                {"$setOnInsert": {
                    "user_id": user_id, "full_name": s["name"], "headline": "",
                    "phone": "", "location": "", "email_public": s["email"],
                    "linkedin_url": "", "website_url": "", "summary": "",
                    "skills": [], "base_resume_text": "", "base_resume_filename": "",
                    "updated_at": now,
                }},
                upsert=True,
            )
        else:
            if not verify_password(s["password"], existing.get("password_hash", "")):
                await db.users.update_one(
                    {"email": s["email"]},
                    {"$set": {"password_hash": hash_password(s["password"])}},
                )
