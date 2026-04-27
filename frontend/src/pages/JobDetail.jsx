import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
    ArrowLeft,
    Download,
    FileText,
    Loader2,
    Mail,
    Sparkles,
    Trash2,
} from "lucide-react";
import Layout from "../components/Layout";
import api, { API_BASE, formatApiError } from "../lib/api";

export default function JobDetail() {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(""); // "resume" | "cover_letter" | ""
    const [err, setErr] = useState("");
    const [tone, setTone] = useState("professional");
    const [notes, setNotes] = useState("");

    const fetchJob = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/jobs/${jobId}`);
            setJob(data);
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchJob();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [jobId]);

    const generate = async (docType) => {
        setBusy(docType);
        setErr("");
        try {
            await api.post(`/jobs/${jobId}/generate-${docType === "resume" ? "resume" : "cover-letter"}`, {
                tone,
                extra_notes: notes,
            });
            await fetchJob();
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setBusy("");
        }
    };

    const downloadPdf = async (doc) => {
        try {
            const res = await api.get(`/jobs/documents/${doc.id}/pdf`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
            const a = document.createElement("a");
            a.href = url;
            const name = `${doc.doc_type}-${(job?.company || "role").toLowerCase().replace(/\s+/g, "-")}.pdf`;
            a.download = name;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (e) {
            setErr("Failed to download PDF.");
        }
    };

    const deleteJob = async () => {
        if (!window.confirm("Delete this job and all its generated documents?")) return;
        try {
            await api.delete(`/jobs/${jobId}`);
            navigate("/dashboard");
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        }
    };

    if (loading)
        return (
            <Layout>
                <div className="text-sm text-zinc-500" data-testid="job-loading">
                    Loading job…
                </div>
            </Layout>
        );
    if (!job)
        return (
            <Layout>
                <div data-testid="job-not-found">
                    <p className="text-zinc-600">Job not found.</p>
                    <Link to="/dashboard" className="mt-3 inline-flex items-center gap-2 underline">
                        <ArrowLeft className="h-4 w-4" /> Back to dashboard
                    </Link>
                </div>
            </Layout>
        );

    const analysis = job.analysis || {};
    const docs = job.documents || [];

    return (
        <Layout>
            <div className="flex flex-col gap-6" data-testid="job-detail-page">
                <Link
                    to="/dashboard"
                    className="rf-eyebrow inline-flex items-center gap-2 hover:text-zinc-950"
                    data-testid="back-to-dashboard"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
                </Link>

                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0">
                        <span className="rf-eyebrow">
                            {(job.source_site || "manual").toUpperCase()}
                            {job.source_url ? " · source linked" : ""}
                        </span>
                        <h1 className="rf-heading mt-2 text-4xl sm:text-5xl font-black tracking-tighter">
                            {job.job_title || "Untitled role"}
                        </h1>
                        {job.company && (
                            <p className="mt-1 text-zinc-600 text-lg">{job.company}</p>
                        )}
                        {job.source_url && (
                            <a
                                href={job.source_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-1 inline-block text-sm text-zinc-500 underline underline-offset-2"
                                data-testid="job-source-link"
                            >
                                {job.source_url}
                            </a>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <MatchDial score={analysis.match_score || 0} />
                        <button
                            type="button"
                            onClick={deleteJob}
                            data-testid="delete-job-button"
                            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-700 bg-white border border-red-200 hover:bg-red-50"
                        >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                        </button>
                    </div>
                </div>

                {err && (
                    <div
                        className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2"
                        data-testid="job-error"
                    >
                        {err}
                    </div>
                )}

                {/* Analysis grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <section className="border border-zinc-200 bg-white p-6 lg:col-span-2">
                        <span className="rf-eyebrow">ATS analysis</span>
                        <h2 className="rf-heading mt-2 text-2xl font-bold tracking-tight">
                            Keyword map
                        </h2>
                        {analysis.summary && (
                            <p className="mt-3 text-sm text-zinc-600" data-testid="analysis-summary">
                                {analysis.summary}
                            </p>
                        )}
                        <div className="mt-5 space-y-4">
                            <KeywordBlock
                                testId="keywords-all"
                                title="Top keywords"
                                items={analysis.keywords || []}
                                variant="neutral"
                            />
                            <KeywordBlock
                                testId="keywords-present"
                                title="Covered by your resume"
                                items={analysis.present_in_resume || []}
                                variant="success"
                            />
                            <KeywordBlock
                                testId="keywords-missing"
                                title="Missing / add if truthful"
                                items={analysis.missing_from_resume || []}
                                variant="warning"
                            />
                            <KeywordBlock
                                testId="keywords-tools"
                                title="Tools &amp; platforms"
                                items={analysis.tools || []}
                                variant="neutral"
                            />
                        </div>
                    </section>

                    <aside className="border border-zinc-200 bg-white p-6 flex flex-col gap-4">
                        <span className="rf-eyebrow">Generate</span>
                        <h3 className="rf-heading text-xl font-bold tracking-tight">
                            Tailored documents
                        </h3>
                        <div>
                            <label className="rf-eyebrow block mb-1.5">Tone</label>
                            <select
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                data-testid="tone-select"
                                className="h-10 w-full border border-zinc-300 px-3 text-sm bg-white"
                            >
                                <option value="professional">Professional</option>
                                <option value="enthusiastic">Enthusiastic</option>
                                <option value="concise">Concise</option>
                                <option value="technical">Technical</option>
                            </select>
                        </div>
                        <div>
                            <label className="rf-eyebrow block mb-1.5">Extra notes (optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                data-testid="extra-notes"
                                className="w-full border border-zinc-300 p-2 text-sm rf-mono min-h-[80px]"
                                placeholder="e.g., emphasize leadership, relocation-friendly…"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => generate("resume")}
                            disabled={!!busy}
                            data-testid="generate-resume-button"
                            className="inline-flex items-center justify-center gap-2 h-11 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60"
                        >
                            {busy === "resume" ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Writing…
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" /> Generate resume
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => generate("cover_letter")}
                            disabled={!!busy}
                            data-testid="generate-cover-letter-button"
                            className="inline-flex items-center justify-center gap-2 h-11 text-sm font-bold text-zinc-950 bg-white border border-zinc-200 hover:bg-zinc-100 disabled:opacity-60"
                        >
                            {busy === "cover_letter" ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" /> Writing…
                                </>
                            ) : (
                                <>
                                    <Mail className="h-4 w-4" /> Generate cover letter
                                </>
                            )}
                        </button>
                    </aside>
                </div>

                {/* Generated docs */}
                <section>
                    <div className="flex items-center justify-between">
                        <h2 className="rf-heading text-2xl font-bold tracking-tight">
                            Generated documents
                        </h2>
                        <span className="rf-eyebrow">{docs.length} versions</span>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {docs.length === 0 && (
                            <div
                                className="border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 md:col-span-2"
                                data-testid="no-docs"
                            >
                                No documents yet. Generate your first one on the right.
                            </div>
                        )}
                        {docs.map((d) => (
                            <article
                                key={d.id}
                                className="border border-zinc-200 bg-white p-5 flex flex-col"
                                data-testid={`doc-card-${d.id}`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="rf-eyebrow">
                                        {d.doc_type === "resume" ? "Resume" : "Cover letter"}
                                    </span>
                                    <span className="rf-eyebrow text-zinc-400">
                                        {new Date(d.created_at).toLocaleString()}
                                    </span>
                                </div>
                                <pre className="mt-3 flex-1 whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 bg-zinc-50 border border-zinc-200 p-3 max-h-80 overflow-auto rf-mono">
                                    {d.content}
                                </pre>
                                <button
                                    type="button"
                                    onClick={() => downloadPdf(d)}
                                    data-testid={`download-pdf-${d.id}`}
                                    className="mt-3 inline-flex items-center justify-center gap-2 h-10 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800"
                                >
                                    <Download className="h-4 w-4" /> Download PDF
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

                {/* Raw JD */}
                <section>
                    <h2 className="rf-heading text-2xl font-bold tracking-tight">
                        Job description
                    </h2>
                    <div
                        className="mt-3 border border-zinc-200 bg-white p-5 text-sm rf-mono whitespace-pre-wrap leading-relaxed max-h-96 overflow-auto"
                        data-testid="raw-jd"
                    >
                        {job.job_description}
                    </div>
                </section>
            </div>
        </Layout>
    );
}

function MatchDial({ score }) {
    const color =
        score >= 70 ? "text-emerald-700" : score >= 40 ? "text-amber-700" : "text-zinc-700";
    return (
        <div
            className="flex flex-col items-center border border-zinc-200 bg-white px-4 py-2"
            data-testid="match-dial"
        >
            <span className="rf-eyebrow">Match</span>
            <span className={`rf-heading text-3xl font-black tracking-tighter ${color}`}>
                {score}%
            </span>
        </div>
    );
}

function KeywordBlock({ title, items, variant, testId }) {
    if (!items || items.length === 0) return null;
    const cls =
        variant === "success"
            ? "text-emerald-700 bg-emerald-50 border-emerald-200"
            : variant === "warning"
              ? "text-amber-700 bg-amber-50 border-amber-200"
              : "text-zinc-700 bg-zinc-100 border-zinc-200";
    return (
        <div data-testid={testId}>
            <span className="rf-eyebrow">{title}</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
                {items.map((k, i) => (
                    <span
                        key={`${k}-${i}`}
                        className={`inline-flex items-center px-2 py-1 text-xs font-bold border ${cls}`}
                    >
                        {k}
                    </span>
                ))}
            </div>
        </div>
    );
}

// Unused but keeps import symmetric
export { FileText };
// Export the API base for potential external use
export { API_BASE };
