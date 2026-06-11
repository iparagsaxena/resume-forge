/* ResumeForge popup controller */
(() => {
    // --- config ---
    const DEFAULT_BACKEND = "https://instant-cover-gen.preview.emergentagent.com";
    const DEFAULT_DASHBOARD = DEFAULT_BACKEND;

    const els = {
        app: document.getElementById("rf-app"),
        userLabel: document.getElementById("rf-user-label"),
        logoutBtn: document.getElementById("rf-logout-btn"),

        viewLoading: document.getElementById("rf-view-loading"),
        viewAuth: document.getElementById("rf-view-auth"),
        viewMain: document.getElementById("rf-view-main"),
        viewResult: document.getElementById("rf-view-result"),

        loginForm: document.getElementById("rf-login-form"),
        loginEmail: document.getElementById("rf-login-email"),
        loginPassword: document.getElementById("rf-login-password"),
        loginSubmit: document.getElementById("rf-login-submit"),
        loginError: document.getElementById("rf-login-error"),
        openRegister: document.getElementById("rf-open-register"),

        pageMeta: document.getElementById("rf-page-meta"),
        scanBtn: document.getElementById("rf-scan-btn"),
        jdWrap: document.getElementById("rf-jd-preview-wrap"),
        jdTitle: document.getElementById("rf-jd-title"),
        jdCompany: document.getElementById("rf-jd-company"),
        jdText: document.getElementById("rf-jd-text"),
        analyzeBtn: document.getElementById("rf-analyze-btn"),
        quickCoverBtn: document.getElementById("rf-quick-cover-btn"),
        mainStatus: document.getElementById("rf-main-status"),

        backMain: document.getElementById("rf-back-main"),
        score: document.getElementById("rf-score"),
        roleTitle: document.getElementById("rf-role-title"),
        roleCompany: document.getElementById("rf-role-company"),
        chipsPresent: document.getElementById("rf-chips-present"),
        chipsMissing: document.getElementById("rf-chips-missing"),
        chipsAll: document.getElementById("rf-chips-all"),
        resultStatus: document.getElementById("rf-result-status"),

        footer: document.getElementById("rf-footer"),
        genResumeBtn: document.getElementById("rf-gen-resume"),
        genCoverBtn: document.getElementById("rf-gen-cover"),
        openDashboard: document.getElementById("rf-open-dashboard"),
    };

    const state = {
        backendUrl: DEFAULT_BACKEND,
        dashboardUrl: DEFAULT_DASHBOARD,
        token: null,
        user: null,
        activeTab: null,
        scannedJD: null,
        currentJob: null, // job record returned by analyze
    };

    // --- helpers ---
    const api = async (path, { method = "GET", body = null } = {}) => {
        const headers = { Accept: "application/json" };
        if (state.token) headers["Authorization"] = `Bearer ${state.token}`;
        if (body) headers["Content-Type"] = "application/json";
        const res = await fetch(`${state.backendUrl}/api${path}`, {
            method,
            headers,
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch {
            data = { detail: text };
        }
        if (!res.ok) {
            const detail = data?.detail || res.statusText;
            const msg = typeof detail === "string" ? detail : JSON.stringify(detail);
            throw new Error(msg);
        }
        return data;
    };

    const show = (view) => {
        els.app.dataset.view = view;
        [els.viewLoading, els.viewAuth, els.viewMain, els.viewResult].forEach(
            (el) => (el.style.display = "none")
        );
        if (view === "loading") els.viewLoading.style.display = "block";
        if (view === "auth") els.viewAuth.style.display = "block";
        if (view === "main") els.viewMain.style.display = "block";
        if (view === "result") els.viewResult.style.display = "block";

        // logout + footer visibility
        els.logoutBtn.style.display = state.token ? "inline-flex" : "none";
        els.userLabel.textContent = state.user?.email || "—";
        els.footer.style.display = view === "result" ? "flex" : "none";
    };

    const setStatus = (el, msg, kind = "muted") => {
        if (!el) return;
        el.textContent = msg || "";
        el.className = kind === "error" ? "rf-error" : "rf-muted rf-status-line";
    };

    const chip = (label, kind) => {
        const span = document.createElement("span");
        span.className = `rf-chip ${kind}`;
        span.textContent = label;
        return span;
    };

    const renderChips = (container, items, kind) => {
        container.innerHTML = "";
        if (!items || items.length === 0) {
            const empty = document.createElement("span");
            empty.className = "rf-eyebrow";
            empty.textContent = "—";
            container.appendChild(empty);
            return;
        }
        items.forEach((it) => container.appendChild(chip(it, kind)));
    };

    const saveStorage = async () => {
        await chrome.storage.local.set({
            rf_token: state.token,
            rf_user: state.user,
            rf_backend: state.backendUrl,
        });
    };

    const loadStorage = async () => {
        const data = await chrome.storage.local.get([
            "rf_token",
            "rf_user",
            "rf_backend",
            "rf_dashboard",
        ]);
        state.token = data.rf_token || null;
        state.user = data.rf_user || null;
        state.backendUrl = data.rf_backend || DEFAULT_BACKEND;
        state.dashboardUrl = data.rf_dashboard || state.backendUrl;
    };

    const getActiveTab = async () => {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        return tab || null;
    };

    const runScan = async () => {
        els.scanBtn.disabled = true;
        setStatus(els.mainStatus, "Scanning page…");
        try {
            const tab = state.activeTab;
            if (!tab || !tab.id) throw new Error("No active tab.");
            const [result] = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: extractJDFromPage,
            });
            const data = result?.result || {};
            state.scannedJD = data;
            els.jdText.value = data.description || "";
            els.jdTitle.value = data.title || "";
            els.jdCompany.value = data.company || "";
            els.jdWrap.style.display = "flex";
            if (data.description && data.description.length > 30) {
                setStatus(els.mainStatus, `Extracted ${data.description.length} characters.`);
            } else {
                setStatus(
                    els.mainStatus,
                    "Couldn't auto-extract. Paste the JD manually below.",
                    "error"
                );
            }
        } catch (e) {
            setStatus(els.mainStatus, `Scan failed: ${e.message}`, "error");
            els.jdWrap.style.display = "flex";
        } finally {
            els.scanBtn.disabled = false;
        }
    };

    const runQuickCoverLetter = async () => {
        const jd = els.jdText.value.trim();
        if (jd.length < 30) {
            setStatus(els.mainStatus, "Please paste at least 30 characters of JD.", "error");
            return;
        }
        els.quickCoverBtn.disabled = true;
        els.analyzeBtn.disabled = true;
        const originalLabel = els.quickCoverBtn.textContent;
        els.quickCoverBtn.textContent = "Generating…";
        setStatus(els.mainStatus, "Writing your cover letter with Gemini…");
        try {
            const payload = {
                job_description: jd,
                job_title: els.jdTitle.value.trim(),
                company: els.jdCompany.value.trim(),
                source_url: state.activeTab?.url || "",
                source_site: detectSource(state.activeTab?.url || ""),
                tone: "professional",
                extra_notes: "",
            };
            const result = await api("/jobs/quick-cover-letter", { method: "POST", body: payload });
            // Persist a "currentJob" so the existing PDF helper can name the file.
            state.currentJob = {
                id: result.job_id,
                company: payload.company,
                job_title: payload.job_title,
            };
            await downloadPdf(result.document.id, "cover_letter");
            setStatus(els.mainStatus, "Cover letter generated · PDF downloaded.");
        } catch (e) {
            if (String(e.message).toLowerCase().includes("not authenticated")) {
                state.token = null;
                state.user = null;
                await saveStorage();
                show("auth");
                return;
            }
            setStatus(els.mainStatus, `Failed: ${e.message}`, "error");
        } finally {
            els.quickCoverBtn.disabled = false;
            els.analyzeBtn.disabled = false;
            els.quickCoverBtn.textContent = originalLabel;
        }
    };

    const runAnalyze = async () => {        const jd = els.jdText.value.trim();
        if (jd.length < 30) {
            setStatus(els.mainStatus, "Please paste at least 30 characters of JD.", "error");
            return;
        }
        els.analyzeBtn.disabled = true;
        setStatus(els.mainStatus, "Analyzing with Gemini… this takes a few seconds.");
        try {
            const payload = {
                job_description: jd,
                job_title: els.jdTitle.value.trim(),
                company: els.jdCompany.value.trim(),
                source_url: state.activeTab?.url || "",
                source_site: detectSource(state.activeTab?.url || ""),
            };
            const job = await api("/jobs/analyze", { method: "POST", body: payload });
            state.currentJob = job;
            renderResult(job);
            show("result");
        } catch (e) {
            if (String(e.message).toLowerCase().includes("not authenticated")) {
                state.token = null;
                state.user = null;
                await saveStorage();
                show("auth");
                return;
            }
            setStatus(els.mainStatus, `Failed: ${e.message}`, "error");
        } finally {
            els.analyzeBtn.disabled = false;
        }
    };

    const renderResult = (job) => {
        const a = job.analysis || {};
        els.score.textContent = `${a.match_score || 0}%`;
        els.roleTitle.textContent = job.job_title || "Untitled role";
        els.roleCompany.textContent = job.company || "";
        renderChips(els.chipsPresent, a.present_in_resume || [], "present");
        renderChips(els.chipsMissing, a.missing_from_resume || [], "missing");
        renderChips(els.chipsAll, a.keywords || [], "neutral");
        setStatus(els.resultStatus, "");
    };

    const generateDoc = async (docType) => {
        if (!state.currentJob) return;
        const btn = docType === "resume" ? els.genResumeBtn : els.genCoverBtn;
        const originalLabel = btn.textContent;
        btn.disabled = true;
        btn.textContent = "Working…";
        setStatus(els.resultStatus, `Generating ${docType.replace("_", " ")}…`);
        try {
            const path = `/jobs/${state.currentJob.id}/generate-${docType === "resume" ? "resume" : "cover-letter"}`;
            const doc = await api(path, {
                method: "POST",
                body: { tone: "professional", extra_notes: "" },
            });
            await downloadPdf(doc.id, docType);
            setStatus(
                els.resultStatus,
                `Saved ${docType === "resume" ? "resume" : "cover letter"} · PDF downloaded.`
            );
        } catch (e) {
            setStatus(els.resultStatus, `Error: ${e.message}`, "error");
        } finally {
            btn.disabled = false;
            btn.textContent = originalLabel;
        }
    };

    const downloadPdf = async (docId, docType) => {
        const url = `${state.backendUrl}/api/jobs/documents/${docId}/pdf`;
        const res = await fetch(url, {
            headers: { Authorization: `Bearer ${state.token}` },
        });
        if (!res.ok) throw new Error("Could not download PDF.");
        const blob = await res.blob();
        const objUrl = URL.createObjectURL(blob);
        const companySlug =
            (state.currentJob?.company || "role").toLowerCase().replace(/\s+/g, "-") || "role";
        const filename = `${docType === "resume" ? "resume" : "cover-letter"}-${companySlug}.pdf`;
        try {
            await chrome.downloads.download({ url: objUrl, filename, saveAs: false });
        } catch {
            // Fallback: open in a new tab
            chrome.tabs.create({ url: objUrl });
        }
    };

    const doLogin = async (ev) => {
        ev.preventDefault();
        els.loginError.style.display = "none";
        els.loginSubmit.disabled = true;
        els.loginSubmit.textContent = "Signing in…";
        try {
            const data = await api("/auth/login", {
                method: "POST",
                body: {
                    email: els.loginEmail.value.trim(),
                    password: els.loginPassword.value,
                },
            });
            state.token = data.access_token;
            state.user = data.user;
            await saveStorage();
            await bootstrapMainView();
        } catch (e) {
            els.loginError.textContent = e.message || "Sign in failed.";
            els.loginError.style.display = "block";
        } finally {
            els.loginSubmit.disabled = false;
            els.loginSubmit.textContent = "Sign in";
        }
    };

    const doLogout = async () => {
        state.token = null;
        state.user = null;
        await chrome.storage.local.remove(["rf_token", "rf_user"]);
        show("auth");
    };

    const bootstrapMainView = async () => {
        // show page meta
        const tab = await getActiveTab();
        state.activeTab = tab;
        if (tab?.url) {
            const src = detectSource(tab.url);
            els.pageMeta.textContent = `${src.toUpperCase()} · ${tab.url}`;
        } else {
            els.pageMeta.textContent = "No active tab detected.";
        }
        els.jdWrap.style.display = "none";
        show("main");
        // Auto-scan if on known sites
        if (
            tab?.url &&
            /(linkedin\.com|indeed\.com|naukri\.com|glassdoor\.com|wellfound\.com|ycombinator\.com)/.test(
                tab.url
            )
        ) {
            runScan();
        }
    };

    const init = async () => {
        show("loading");
        await loadStorage();
        if (!state.token) {
            show("auth");
            return;
        }
        // Verify token
        try {
            const me = await api("/auth/me");
            state.user = me;
            await saveStorage();
            await bootstrapMainView();
        } catch {
            state.token = null;
            state.user = null;
            await saveStorage();
            show("auth");
        }
    };

    // --- event bindings ---
    els.loginForm.addEventListener("submit", doLogin);
    els.logoutBtn.addEventListener("click", doLogout);
    els.scanBtn.addEventListener("click", runScan);
    els.analyzeBtn.addEventListener("click", runAnalyze);
    els.quickCoverBtn.addEventListener("click", runQuickCoverLetter);
    els.backMain.addEventListener("click", () => show("main"));
    els.genResumeBtn.addEventListener("click", () => generateDoc("resume"));
    els.genCoverBtn.addEventListener("click", () => generateDoc("cover_letter"));
    els.openRegister.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: `${state.dashboardUrl}/register` });
    });
    els.openDashboard.addEventListener("click", (e) => {
        e.preventDefault();
        chrome.tabs.create({ url: `${state.dashboardUrl}/dashboard` });
    });

    init();

    // --- JD extraction function (runs in the tab context) ---
    function extractJDFromPage() {
        const host = location.hostname;
        const getText = (el) =>
            (el ? el.innerText || el.textContent || "" : "").replace(/\u00A0/g, " ").trim();
        const firstText = (selectors) => {
            for (const s of selectors) {
                const el = document.querySelector(s);
                const t = getText(el);
                if (t && t.length > 40) return t;
            }
            return "";
        };
        const firstShort = (selectors) => {
            for (const s of selectors) {
                const el = document.querySelector(s);
                const t = getText(el);
                if (t) return t.slice(0, 120);
            }
            return "";
        };
        let title = "";
        let company = "";
        let description = "";
        if (host.includes("linkedin.com")) {
            title = firstShort([
                ".job-details-jobs-unified-top-card__job-title h1",
                ".job-details-jobs-unified-top-card__job-title",
                ".jobs-unified-top-card__job-title",
                ".topcard__title",
                "h1.t-24",
            ]);
            company = firstShort([
                ".job-details-jobs-unified-top-card__company-name a",
                ".job-details-jobs-unified-top-card__company-name",
                ".jobs-unified-top-card__company-name a",
                ".topcard__org-name-link",
            ]);
            description = firstText([
                ".jobs-description__content",
                ".jobs-description-content__text",
                ".jobs-box__html-content",
                "#job-details",
            ]);
        } else if (host.includes("indeed.com")) {
            title = firstShort([
                "h1.jobsearch-JobInfoHeader-title",
                "[data-testid='jobsearch-JobInfoHeader-title']",
                "h1",
            ]);
            company = firstShort([
                "[data-testid='inlineHeader-companyName']",
                ".jobsearch-InlineCompanyRating div",
                ".jobsearch-CompanyInfoContainer a",
            ]);
            description = firstText([
                "#jobDescriptionText",
                ".jobsearch-JobComponent-description",
            ]);
        } else if (host.includes("naukri.com")) {
            title = firstShort([
                ".styles_jd-header-title__rZwM1",
                ".jd-header-title",
                "h1",
            ]);
            company = firstShort([
                ".styles_jd-header-comp-name__MvqAI a",
                ".jd-header-comp-name a",
            ]);
            description = firstText([
                ".styles_JDC__dang-inner-html__h0K4t",
                ".job-desc",
                ".dang-inner-html",
            ]);
        } else if (host.includes("glassdoor.com")) {
            title = firstShort(["[data-test='job-title']", "h1"]);
            company = firstShort(["[data-test='employer-name']"]);
            description = firstText([
                ".jobDescriptionContent",
                "[data-test='description']",
                ".desc",
            ]);
        } else if (host.includes("wellfound.com") || host.includes("ycombinator.com")) {
            title = firstShort(["h1", "h2"]);
            description = firstText(["main", "article", "section"]);
        }
        if (!description) {
            // fallback: grab largest text block on page
            const candidates = Array.from(document.querySelectorAll("section, article, div, main"))
                .map((el) => ({ el, text: getText(el) }))
                .filter((x) => x.text && x.text.length > 400)
                .sort((a, b) => b.text.length - a.text.length);
            if (candidates[0]) description = candidates[0].text.slice(0, 8000);
        }
        if (!title) {
            title = document.title.split(/[-|·—]/)[0].slice(0, 140).trim();
        }
        return { title, company, description: (description || "").slice(0, 15000) };
    }

    function detectSource(url = "") {
        if (!url) return "manual";
        if (url.includes("linkedin.com")) return "linkedin";
        if (url.includes("indeed.com")) return "indeed";
        if (url.includes("naukri.com")) return "naukri";
        if (url.includes("glassdoor.com")) return "glassdoor";
        if (url.includes("wellfound.com")) return "wellfound";
        if (url.includes("ycombinator.com")) return "ycombinator";
        return "manual";
    }
})();
