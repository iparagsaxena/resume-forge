import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
    ArrowRight,
    Briefcase,
    Chrome,
    FileText,
    PlusCircle,
    Sparkles,
    Target,
    Upload,
} from "lucide-react";
import Layout from "../components/Layout";
import api, { formatApiError } from "../lib/api";

export default function Dashboard() {
    const [jobs, setJobs] = useState([]);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showQuick, setShowQuick] = useState(false);
    const [quickText, setQuickText] = useState("");
    const [quickTitle, setQuickTitle] = useState("");
    const [quickCompany, setQuickCompany] = useState("");
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState("");

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [j, p] = await Promise.all([api.get("/jobs"), api.get("/profile")]);
            setJobs(j.data || []);
            setProfile(p.data || null);
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAll();
    }, []);

    const stats = useMemo(() => {
        const total = jobs.length;
        const avg = total
            ? Math.round(jobs.reduce((a, b) => a + (b.analysis?.match_score || 0), 0) / total)
            : 0;
        const best = jobs.reduce((m, j) => Math.max(m, j.analysis?.match_score || 0), 0);
        return { total, avg, best };
    }, [jobs]);

    const hasResume = !!profile?.base_resume_text;

    const submitQuick = async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr("");
        try {
            await api.post("/jobs/analyze", {
                job_description: quickText,
                job_title: quickTitle,
                company: quickCompany,
                source_site: "manual",
            });
            setShowQuick(false);
            setQuickText("");
            setQuickTitle("");
            setQuickCompany("");
            fetchAll();
        } catch (e2) {
            setErr(formatApiError(e2.response?.data?.detail) || e2.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Layout>
            <div className="flex flex-col gap-8" data-testid="dashboard-page">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <span className="rf-eyebrow">Control room</span>
                        <h1 className="rf-heading mt-2 text-4xl sm:text-5xl font-black tracking-tighter">
                            Welcome back.
                        </h1>
                        <p className="mt-2 text-zinc-600 max-w-xl">
                            Saved jobs, keyword coverage, and generated documents — all in one
                            place.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowQuick((v) => !v)}
                            data-testid="quick-analyze-toggle"
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800"
                        >
                            <PlusCircle className="h-4 w-4" /> Paste JD & analyze
                        </button>
                    </div>
                </div>

                {!hasResume && (
                    <div
                        className="border border-amber-200 bg-amber-50 p-5 flex flex-wrap items-center justify-between gap-4"
                        data-testid="no-resume-banner"
                    >
                        <div>
                            <p className="font-bold text-amber-800">Step 1 · Upload your resume</p>
                            <p className="mt-1 text-sm text-amber-900/80">
                                Needed before you can generate tailored documents.
                            </p>
                        </div>
                        <Link
                            to="/profile"
                            data-testid="upload-resume-cta"
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800"
                        >
                            <Upload className="h-4 w-4" /> Go to profile
                        </Link>
                    </div>
                )}

                {showQuick && (
                    <form
                        onSubmit={submitQuick}
                        className="border border-zinc-200 bg-white p-6 space-y-4"
                        data-testid="quick-analyze-form"
                    >
                        <div className="grid sm:grid-cols-2 gap-4">
                            <div>
                                <label className="rf-eyebrow block mb-1.5">Job title</label>
                                <input
                                    type="text"
                                    data-testid="quick-title-input"
                                    value={quickTitle}
                                    onChange={(e) => setQuickTitle(e.target.value)}
                                    className="h-10 w-full border border-zinc-300 px-3 text-sm"
                                    placeholder="Senior Product Designer"
                                />
                            </div>
                            <div>
                                <label className="rf-eyebrow block mb-1.5">Company</label>
                                <input
                                    type="text"
                                    data-testid="quick-company-input"
                                    value={quickCompany}
                                    onChange={(e) => setQuickCompany(e.target.value)}
                                    className="h-10 w-full border border-zinc-300 px-3 text-sm"
                                    placeholder="Acme Inc."
                                />
                            </div>
                        </div>
                        <div>
                            <label className="rf-eyebrow block mb-1.5">Job description</label>
                            <textarea
                                required
                                minLength={20}
                                data-testid="quick-jd-input"
                                value={quickText}
                                onChange={(e) => setQuickText(e.target.value)}
                                className="w-full border border-zinc-300 p-3 text-sm rf-mono min-h-[180px]"
                                placeholder="Paste the full job description here…"
                            />
                        </div>
                        {err && (
                            <div className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2">
                                {err}
                            </div>
                        )}
                        <div className="flex items-center gap-2">
                            <button
                                type="submit"
                                disabled={busy}
                                data-testid="quick-analyze-submit"
                                className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60"
                            >
                                {busy ? "Analyzing…" : "Analyze JD"}
                                {!busy && <ArrowRight className="h-4 w-4" />}
                            </button>
                            <button
                                type="button"
                                onClick={() => setShowQuick(false)}
                                className="px-4 py-2.5 text-sm font-bold text-zinc-600 hover:text-zinc-950"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                )}

                {/* KPI row */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <KPICard
                        testId="kpi-total"
                        icon={Briefcase}
                        label="Saved jobs"
                        value={stats.total}
                    />
                    <KPICard
                        testId="kpi-avg"
                        icon={Target}
                        label="Average match"
                        value={`${stats.avg}%`}
                    />
                    <KPICard
                        testId="kpi-best"
                        icon={Sparkles}
                        label="Best match"
                        value={`${stats.best}%`}
                    />
                </div>

                {/* Jobs list */}
                <section>
                    <div className="flex items-center justify-between">
                        <h2 className="rf-heading text-2xl font-bold tracking-tight">
                            Saved jobs
                        </h2>
                        <span className="rf-eyebrow">{jobs.length} entries</span>
                    </div>
                    <div className="mt-4 border border-zinc-200 bg-white">
                        {loading ? (
                            <div className="p-8 text-sm text-zinc-500">Loading jobs…</div>
                        ) : jobs.length === 0 ? (
                            <EmptyState />
                        ) : (
                            <ul className="divide-y divide-zinc-200">
                                {jobs.map((j) => (
                                    <li
                                        key={j.id}
                                        className="p-5 flex flex-wrap items-center justify-between gap-4 hover:bg-zinc-50"
                                        data-testid={`job-row-${j.id}`}
                                    >
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="rf-eyebrow">
                                                    {(j.source_site || "manual").toUpperCase()}
                                                </span>
                                                {j.created_at && (
                                                    <span className="rf-eyebrow text-zinc-400">
                                                        {new Date(j.created_at).toLocaleString()}
                                                    </span>
                                                )}
                                            </div>
                                            <h3 className="mt-1 font-bold text-zinc-950 truncate">
                                                {j.job_title || "Untitled role"}
                                                {j.company && (
                                                    <span className="text-zinc-500 font-normal">
                                                        {" "}
                                                        · {j.company}
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="mt-1 text-sm text-zinc-500 line-clamp-1">
                                                {(j.analysis?.summary || j.job_description || "").slice(
                                                    0,
                                                    220
                                                )}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <MatchBadge score={j.analysis?.match_score || 0} />
                                            <Link
                                                to={`/jobs/${j.id}`}
                                                data-testid={`view-job-${j.id}`}
                                                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-bold text-zinc-950 border border-zinc-200 hover:bg-zinc-100"
                                            >
                                                Open <ArrowRight className="h-3.5 w-3.5" />
                                            </Link>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </section>

                <div
                    className="border border-zinc-200 bg-white p-6 flex flex-wrap items-center justify-between gap-4"
                    data-testid="extension-reminder"
                >
                    <div className="flex items-center gap-4">
                        <span className="inline-flex h-10 w-10 items-center justify-center bg-zinc-950 text-white">
                            <Chrome className="h-5 w-5" />
                        </span>
                        <div>
                            <p className="font-bold text-zinc-950">
                                Install the Chrome extension
                            </p>
                            <p className="text-sm text-zinc-500">
                                Scan LinkedIn, Indeed, Naukri &amp; any other JD in a click.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/#install"
                        data-testid="extension-install-link"
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-zinc-950 bg-white border border-zinc-200 hover:bg-zinc-100"
                    >
                        Install guide <ArrowRight className="h-4 w-4" />
                    </Link>
                </div>
            </div>
        </Layout>
    );
}

function KPICard({ icon: Icon, label, value, testId }) {
    return (
        <div className="border border-zinc-200 bg-white p-6" data-testid={testId}>
            <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-zinc-500" />
                <span className="rf-eyebrow">{label}</span>
            </div>
            <div className="mt-3 rf-heading text-4xl font-black tracking-tighter">{value}</div>
        </div>
    );
}

function MatchBadge({ score }) {
    const color =
        score >= 70
            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
            : score >= 40
              ? "bg-amber-50 text-amber-700 border-amber-200"
              : "bg-zinc-100 text-zinc-600 border-zinc-200";
    return (
        <span
            className={`inline-flex items-center px-2 py-1 text-xs font-bold border ${color}`}
            data-testid="match-score-badge"
        >
            {score}% match
        </span>
    );
}

function EmptyState() {
    return (
        <div className="p-10 flex flex-col items-center text-center" data-testid="empty-jobs">
            <FileText className="h-8 w-8 text-zinc-400" />
            <h3 className="rf-heading mt-4 text-xl font-bold">No jobs saved yet.</h3>
            <p className="mt-1 text-sm text-zinc-500 max-w-sm">
                Install the Chrome extension or paste a JD above to analyze it and start tailoring
                documents.
            </p>
        </div>
    );
}
