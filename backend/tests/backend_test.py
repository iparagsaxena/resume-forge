"""ResumeForge backend regression tests.

Covers: auth (register/login/me/logout), profile (GET/PUT/upload-resume),
jobs (analyze/list/get/delete/generate-resume/generate-cover-letter/pdf),
plus CORS preflight & Bearer-vs-Cookie auth parity.
"""
import io
import os
import time
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://instant-cover-gen.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

DEMO_EMAIL = "demo@resumeforge.com"
DEMO_PASSWORD = "demo123"

# A reasonable JD prompt (>20 chars) for analyze
JD_TEXT = (
    "We are hiring a Senior Python Backend Engineer. Required: Python, FastAPI, MongoDB, "
    "REST APIs, Docker, AWS, CI/CD, unit testing with pytest. Nice to have: Kubernetes, "
    "GraphQL, Redis. You will design scalable microservices and collaborate cross-functionally."
)

BASE_RESUME = (
    "John Doe\nSenior Software Engineer\nPython, FastAPI, MongoDB, Docker, AWS, REST APIs, pytest.\n"
    "Experience: 6 years building backend microservices and APIs at scale."
)


# ---------- shared session fixtures ----------
@pytest.fixture(scope="session")
def demo_session():
    """Logged in demo user using cookies (web flow)."""
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=20)
    assert r.status_code == 200, f"Demo login failed: {r.status_code} {r.text}"
    body = r.json()
    assert "access_token" in body and body["user"]["email"] == DEMO_EMAIL
    s.headers.update({"X-Test-Token": body["access_token"]})  # stash for bearer tests
    return s


@pytest.fixture(scope="session")
def bearer_token(demo_session):
    return demo_session.headers["X-Test-Token"]


@pytest.fixture(scope="session")
def bearer_session(bearer_token):
    """Cookieless session that uses Authorization Bearer (extension flow)."""
    s = requests.Session()
    s.headers.update({"Authorization": f"Bearer {bearer_token}"})
    return s


# ---------- health & landing ----------
class TestHealth:
    def test_health(self):
        r = requests.get(f"{API}/health", timeout=10)
        assert r.status_code == 200
        assert r.json()["status"] == "ok"

    def test_root(self):
        r = requests.get(f"{API}/", timeout=10)
        assert r.status_code == 200


# ---------- auth ----------
class TestAuth:
    def test_register_new_user_sets_cookies_and_returns_token(self):
        s = requests.Session()
        email = f"TEST_{uuid.uuid4().hex[:10]}@example.com"
        r = s.post(f"{API}/auth/register",
                   json={"email": email, "password": "pwd12345", "name": "Test User"}, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        # backend normalises email to lowercase
        assert body["user"]["email"] == email.lower()
        assert isinstance(body["access_token"], str) and len(body["access_token"]) > 20
        # cookies set on session
        cookie_names = [c.name for c in s.cookies]
        assert "access_token" in cookie_names
        assert "refresh_token" in cookie_names
        # /me works via cookie
        me = s.get(f"{API}/auth/me", timeout=10)
        assert me.status_code == 200
        assert me.json()["email"] == email.lower()

    def test_register_duplicate_email_400(self, demo_session):
        r = requests.post(f"{API}/auth/register",
                          json={"email": DEMO_EMAIL, "password": "whatever1", "name": "x"}, timeout=15)
        assert r.status_code == 400

    def test_login_demo_success_and_me_via_cookie(self, demo_session):
        r = demo_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == DEMO_EMAIL

    def test_login_invalid_password_401(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": DEMO_EMAIL, "password": "wrongpass"}, timeout=15)
        assert r.status_code == 401

    def test_me_via_bearer_token(self, bearer_session):
        r = bearer_session.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == DEMO_EMAIL

    def test_me_unauthenticated(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_logout_clears_cookies(self):
        s = requests.Session()
        r = s.post(f"{API}/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PASSWORD}, timeout=15)
        assert r.status_code == 200
        r2 = s.post(f"{API}/auth/logout", timeout=10)
        assert r2.status_code == 200
        # FastAPI delete_cookie sends Max-Age=0; requests drops it; subsequent /me unauthenticated
        s2 = requests.Session()
        r3 = s2.get(f"{API}/auth/me", cookies={}, timeout=10)
        assert r3.status_code == 401


# ---------- CORS preflight ----------
class TestCORS:
    def test_preflight_frontend_origin(self):
        origin = "https://instant-cover-gen.preview.emergentagent.com"
        r = requests.options(
            f"{API}/auth/login",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
            timeout=10,
        )
        assert r.status_code in (200, 204), r.text
        assert r.headers.get("access-control-allow-origin") == origin
        assert r.headers.get("access-control-allow-credentials", "").lower() == "true"

    def test_preflight_chrome_extension_origin(self):
        origin = "chrome-extension://abcdefghijklmnopabcdefghijklmnop"
        r = requests.options(
            f"{API}/auth/login",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
            timeout=10,
        )
        assert r.status_code in (200, 204), r.text
        assert r.headers.get("access-control-allow-origin") == origin


# ---------- profile ----------
class TestProfile:
    def test_get_profile_autocreated(self, demo_session):
        r = demo_session.get(f"{API}/profile", timeout=10)
        assert r.status_code == 200
        body = r.json()
        assert body["user_id"]
        assert "skills" in body and isinstance(body["skills"], list)

    def test_update_profile_persists(self, demo_session):
        new_headline = f"Backend Engineer {uuid.uuid4().hex[:6]}"
        skills = ["Python", "FastAPI", "MongoDB"]
        r = demo_session.put(
            f"{API}/profile",
            json={
                "full_name": "Demo User",
                "headline": new_headline,
                "skills": skills,
                "summary": "Senior backend engineer.",
                "base_resume_text": BASE_RESUME,
            },
            timeout=15,
        )
        assert r.status_code == 200, r.text
        # GET to verify persistence
        r2 = demo_session.get(f"{API}/profile", timeout=10)
        body = r2.json()
        assert body["headline"] == new_headline
        assert body["skills"] == skills
        assert BASE_RESUME[:20] in body["base_resume_text"]

    def test_upload_resume_invalid_extension_400(self, demo_session):
        files = {"file": ("malware.exe", io.BytesIO(b"MZ\x00\x00fake"), "application/octet-stream")}
        r = demo_session.post(f"{API}/profile/upload-resume", files=files, timeout=15)
        assert r.status_code == 400, r.text

    def test_upload_resume_txt_populates_base_text(self, demo_session):
        text = b"Jane Test\nPython, FastAPI, AWS, Docker\n6 years experience.\n"
        files = {"file": ("resume.txt", io.BytesIO(text), "text/plain")}
        r = demo_session.post(f"{API}/profile/upload-resume", files=files, timeout=20)
        assert r.status_code == 200, r.text
        body = r.json()
        assert "Python" in body["base_resume_text"]
        assert body["base_resume_filename"].endswith(".txt")
        # restore the rich resume so subsequent generation tests work
        demo_session.put(f"{API}/profile", json={"base_resume_text": BASE_RESUME}, timeout=15)


# ---------- jobs (with Gemini) ----------
@pytest.fixture(scope="module")
def analyzed_job(demo_session):
    """Create an analyzed job once and reuse across tests in this module."""
    # ensure base_resume_text exists for generation tests
    demo_session.put(f"{API}/profile", json={"base_resume_text": BASE_RESUME}, timeout=15)
    r = demo_session.post(
        f"{API}/jobs/analyze",
        json={
            "job_description": JD_TEXT,
            "job_title": "Senior Python Engineer",
            "company": "TestCo",
            "source_site": "manual",
        },
        timeout=60,  # gemini can take time
    )
    assert r.status_code == 200, r.text
    job = r.json()
    assert job["id"] and job["job_description"]
    return job


class TestJobsAnalyze:
    def test_analyze_creates_job_with_analysis(self, analyzed_job):
        analysis = analyzed_job.get("analysis") or {}
        # match_score 0..100
        assert 0 <= int(analysis.get("match_score", -1)) <= 100, f"Invalid match_score: {analysis}"
        assert isinstance(analysis.get("keywords"), list)
        assert isinstance(analysis.get("hard_skills"), list)
        assert isinstance(analysis.get("missing_from_resume"), list)
        assert isinstance(analysis.get("present_in_resume"), list)
        assert isinstance(analysis.get("summary"), str)

    def test_analyze_too_short_422(self, demo_session):
        r = demo_session.post(f"{API}/jobs/analyze", json={"job_description": "short"}, timeout=15)
        assert r.status_code == 422

    def test_list_jobs_includes_created(self, demo_session, analyzed_job):
        r = demo_session.get(f"{API}/jobs", timeout=15)
        assert r.status_code == 200
        ids = [j["id"] for j in r.json()]
        assert analyzed_job["id"] in ids

    def test_get_job_detail_with_documents_field(self, demo_session, analyzed_job):
        r = demo_session.get(f"{API}/jobs/{analyzed_job['id']}", timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["id"] == analyzed_job["id"]
        assert "documents" in body and isinstance(body["documents"], list)

    def test_get_job_404(self, demo_session):
        r = demo_session.get(f"{API}/jobs/{uuid.uuid4()}", timeout=10)
        assert r.status_code == 404


class TestJobsGenerate:
    def test_generate_resume_requires_base_resume(self, demo_session, analyzed_job):
        # temporarily clear base_resume_text
        demo_session.put(f"{API}/profile", json={"base_resume_text": ""}, timeout=15)
        try:
            r = demo_session.post(
                f"{API}/jobs/{analyzed_job['id']}/generate-resume",
                json={"tone": "professional"}, timeout=20,
            )
            assert r.status_code == 400, r.text
        finally:
            demo_session.put(f"{API}/profile", json={"base_resume_text": BASE_RESUME}, timeout=15)

    def test_generate_resume_returns_content(self, demo_session, analyzed_job):
        r = demo_session.post(
            f"{API}/jobs/{analyzed_job['id']}/generate-resume",
            json={"tone": "professional"}, timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["doc_type"] == "resume"
        assert isinstance(body["content"], str) and len(body["content"]) > 50
        # share id with PDF test
        pytest.RESUME_DOC_ID = body["id"]

    def test_generate_cover_letter_returns_content(self, demo_session, analyzed_job):
        r = demo_session.post(
            f"{API}/jobs/{analyzed_job['id']}/generate-cover-letter",
            json={"tone": "professional"}, timeout=90,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["doc_type"] == "cover_letter"
        assert len(body["content"]) > 50
        pytest.COVER_DOC_ID = body["id"]

    def test_pdf_download_via_bearer(self, bearer_session):
        # Use the resume doc id captured above
        doc_id = getattr(pytest, "RESUME_DOC_ID", None)
        assert doc_id, "Resume doc id missing - generation test must run first"
        r = bearer_session.get(f"{API}/jobs/documents/{doc_id}/pdf", timeout=30)
        assert r.status_code == 200, r.text
        assert r.headers.get("content-type", "").startswith("application/pdf")
        cd = r.headers.get("content-disposition", "")
        assert "attachment" in cd
        assert r.content[:4] == b"%PDF", f"Invalid PDF magic: {r.content[:8]}"

    def test_pdf_download_unauthenticated_401(self):
        doc_id = getattr(pytest, "RESUME_DOC_ID", None)
        assert doc_id
        r = requests.get(f"{API}/jobs/documents/{doc_id}/pdf", timeout=15)
        assert r.status_code == 401


class TestJobsCleanup:
    def test_delete_job_and_404_after(self, demo_session, analyzed_job):
        r = demo_session.delete(f"{API}/jobs/{analyzed_job['id']}", timeout=15)
        assert r.status_code == 200
        r2 = demo_session.get(f"{API}/jobs/{analyzed_job['id']}", timeout=10)
        assert r2.status_code == 404
