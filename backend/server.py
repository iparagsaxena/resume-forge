"""FastAPI entrypoint for ResumeForge backend."""
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from fastapi import APIRouter, FastAPI
from motor.motor_asyncio import AsyncIOMotorClient
from starlette.middleware.cors import CORSMiddleware

from routes_auth import router as auth_router, seed_admin_and_demo
from routes_jobs import router as jobs_router
from routes_profile import router as profile_router


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

mongo_url = os.environ["MONGO_URL"]
mongo_client: AsyncIOMotorClient | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global mongo_client
    mongo_client = AsyncIOMotorClient(mongo_url)
    db = mongo_client[os.environ["DB_NAME"]]
    app.state.db = db
    # indexes
    try:
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        await db.profiles.create_index("user_id", unique=True)
        await db.jobs.create_index([("user_id", 1), ("created_at", -1)])
        await db.jobs.create_index("id", unique=True)
        await db.documents.create_index([("user_id", 1), ("created_at", -1)])
        await db.documents.create_index("id", unique=True)
    except Exception as e:
        logger.warning("Index creation warning: %s", e)
    await seed_admin_and_demo(db)
    logger.info("ResumeForge backend ready.")
    yield
    mongo_client.close()


app = FastAPI(title="ResumeForge API", lifespan=lifespan)

api_router = APIRouter(prefix="/api")


@api_router.get("/")
async def root():
    return {"message": "ResumeForge API", "status": "ok"}


@api_router.get("/health")
async def health():
    return {"status": "ok"}


api_router.include_router(auth_router)
api_router.include_router(profile_router)
api_router.include_router(jobs_router)

app.include_router(api_router)

# CORS — allow frontend + Chrome extension origins
frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000")
extra_origins = os.environ.get("CORS_ORIGINS", "").split(",") if os.environ.get("CORS_ORIGINS") else []
origins = list({frontend_url, "http://localhost:3000", *extra_origins})

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)
