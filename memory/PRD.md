# ResumeForge — Product Requirements & Build Log

## Original Problem Statement
> Build a chrome extension which works on Job portals like LinkedIn, Naukri, Indeed and other portals which contain job description (can trigger manually also by user), take the JD and extract the keywords and skills which will strengthen the resume and generate a resume and cover letter on the go for the user. The extension would also connect to an external web application where it will source the job details and save in the portal.

## User Choices
- AI provider: **Gemini 2.5 Flash** (via emergentintegrations / EMERGENT_LLM_KEY); other models can be added later.
- Auth: **JWT email/password** (cookies for web, Bearer header for the extension).
- Priority: **Chrome extension first**, then portal/web dashboard (already in user's plans).
- Resume output: **PDF download**.
- Source resume: user uploads a master **PDF or DOCX** that the AI tailors to each JD.

## User Personas
- **Active job seeker** browsing LinkedIn / Indeed / Naukri who wants a tailored resume in minutes, not hours.
- **Power applicant** with a master resume already polished, looking for ATS keyword optimisation per role.
- **Recruitment ops / coach** wanting a controlled tool that does not invent facts.

## Core Requirements (Static)
1. Chrome extension (MV3) that:
   - Auto-extracts JD from supported portals and supports manual paste anywhere.
   - Authenticates with the same backend as the web app (Bearer token).
   - Triggers JD analysis + resume + cover-letter generation, downloads PDFs.
2. Web app dashboard for:
   - Saved jobs list, job detail (analysis + generated docs), profile + base resume management.
3. Backend (FastAPI + MongoDB) that:
   - Handles JWT auth, profile + resume parsing (PDF/DOCX/TXT), JD analysis via Gemini, generation of resumes/cover letters, PDF rendering with reportlab.
   - All routes under `/api`.

## Architecture
- **Backend**: `FastAPI` + `motor` + `bcrypt` + `pyjwt` + `reportlab` + `PyPDF2` + `python-docx` + `emergentintegrations`.
- **Frontend**: React 19 + react-router-dom 7 + axios + Tailwind + Shadcn primitives + lucide-react icons. Custom Swiss/high-contrast theme (Chivo + IBM Plex Sans + IBM Plex Mono).
- **Chrome Extension**: Vanilla JS (MV3), `popup.html/css/js`, `content.js`, `background.js`, manifest with `activeTab + scripting + storage + downloads` and host permissions for major job portals.

## What's Been Implemented (2026-04-27)
- **Backend**: auth (register/login/logout/me/refresh), profile (get/put/upload-resume), jobs (analyze/list/get/delete), document generation (resume + cover letter), PDF download. Admin + demo seeding. CORS configured (FRONTEND_URL + chrome-extension://*).
- **Frontend**: Landing page (hero + feature grid + install guide), Login, Register, Dashboard (KPIs, quick-analyze, jobs list, install reminder), Profile (resume upload + structured fields), Job Detail (analysis chips, generate buttons, generated docs preview, PDF download).
- **Chrome Extension**: popup with login screen, JD scan, analyze, result chips, generate resume / cover letter, automatic PDF download, jump to dashboard, content-script badge on supported portals.
- **Tests**: 25/26 backend tests passing; one minor CORS wildcard sourced from `CORS_ORIGINS="*"` env – fixed by sanitising origins.

## Backlog (Prioritized)
- **P0**
  - Connect to user's existing portal (resume the user already built) for shared job data.
  - Background fetch of saved jobs in extension popup (recent saved jobs).
- **P1**
  - Multiple resume templates (Classic, Modern, Compact) for PDF output.
  - Cover letter previews + tone presets persisted per user.
  - DOCX export in addition to PDF.
  - Pricing/Stripe paywall for unlimited generations.
- **P2**
  - Switch model from Gemini → Claude Sonnet / GPT-5.2 from settings.
  - Auto-fill known LinkedIn/Indeed apply forms with the generated resume.
  - Job tracking: status (saved/applied/interview/offer), reminders.
  - Team accounts / coach dashboards.

## Test Credentials
- Admin: `admin@resumeforge.com` / `admin123`
- Demo:  `demo@resumeforge.com` / `demo123`

## Next Tasks
1. Wire the existing external portal as the source-of-truth for job records (replace `/api/jobs` with proxy or sync).
2. Add a "recent jobs" card inside the extension popup pulled from `/api/jobs?limit=5`.
3. Introduce 2-3 PDF templates and let users pick a default.
4. Stripe paywall for free vs. unlimited.
5. Resolve Kubernetes ingress-level CORS '*' override for the deployed preview (only matters for credentialed cross-origin calls; same-origin web app and Bearer-token extension work today).
