import { useEffect, useRef, useState } from "react";
import { FileCheck2, Save, Upload, Sparkles } from "lucide-react";
import Layout from "../components/Layout";
import api, { formatApiError } from "../lib/api";

export default function Profile() {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [msg, setMsg] = useState("");
    const [err, setErr] = useState("");
    const fileRef = useRef(null);

    const fetchProfile = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/profile");
            setProfile(data);
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    const update = (k, v) => setProfile((p) => ({ ...p, [k]: v }));

    const save = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMsg("");
        setErr("");
        try {
            const payload = {
                full_name: profile.full_name || "",
                headline: profile.headline || "",
                phone: profile.phone || "",
                location: profile.location || "",
                email_public: profile.email_public || "",
                linkedin_url: profile.linkedin_url || "",
                website_url: profile.website_url || "",
                summary: profile.summary || "",
                skills: (typeof profile.skills === "string"
                    ? profile.skills.split(",").map((s) => s.trim()).filter(Boolean)
                    : profile.skills) || [],
            };
            const { data } = await api.put("/profile", payload);
            setProfile(data);
            setMsg("Profile saved.");
        } catch (e2) {
            setErr(formatApiError(e2.response?.data?.detail) || e2.message);
        } finally {
            setSaving(false);
        }
    };

    const upload = async (ev) => {
        const file = ev.target.files?.[0];
        if (!file) return;
        setUploading(true);
        setMsg("");
        setErr("");
        try {
            const fd = new FormData();
            fd.append("file", file);
            const { data } = await api.post("/profile/upload-resume", fd, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            setProfile(data);
            setMsg(`Parsed ${file.name} · ${data.base_resume_text.length} chars extracted.`);
        } catch (e) {
            setErr(formatApiError(e.response?.data?.detail) || e.message);
        } finally {
            setUploading(false);
            if (fileRef.current) fileRef.current.value = "";
        }
    };

    if (loading)
        return (
            <Layout>
                <div className="text-sm text-zinc-500" data-testid="profile-loading">
                    Loading profile…
                </div>
            </Layout>
        );
    if (!profile) return null;

    const hasResume = !!profile.base_resume_text;
    const skillsValue = Array.isArray(profile.skills) ? profile.skills.join(", ") : profile.skills || "";

    return (
        <Layout>
            <div className="flex flex-col gap-6" data-testid="profile-page">
                <div>
                    <span className="rf-eyebrow">Profile &amp; base resume</span>
                    <h1 className="rf-heading mt-2 text-4xl sm:text-5xl font-black tracking-tighter">
                        Your source of truth.
                    </h1>
                    <p className="mt-2 text-zinc-600 max-w-xl">
                        Upload a master resume once. Every generation will rewrite from these facts
                        — never invented ones.
                    </p>
                </div>

                {/* Upload card */}
                <section
                    className="border border-zinc-200 bg-white p-6"
                    data-testid="resume-upload-card"
                >
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <span className="inline-flex h-10 w-10 items-center justify-center bg-zinc-950 text-white">
                                {hasResume ? <FileCheck2 className="h-5 w-5" /> : <Upload className="h-5 w-5" />}
                            </span>
                            <div>
                                <p className="font-bold text-zinc-950">
                                    {hasResume
                                        ? `Resume on file · ${profile.base_resume_filename || "resume"}`
                                        : "No base resume uploaded"}
                                </p>
                                <p className="text-sm text-zinc-500">
                                    PDF or DOCX, up to 4 MB.
                                </p>
                            </div>
                        </div>
                        <label className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800 cursor-pointer">
                            <Upload className="h-4 w-4" />
                            {uploading ? "Uploading…" : hasResume ? "Replace resume" : "Upload resume"}
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".pdf,.docx,.txt"
                                onChange={upload}
                                className="hidden"
                                data-testid="resume-file-input"
                            />
                        </label>
                    </div>
                    {hasResume && (
                        <details className="mt-4">
                            <summary className="rf-eyebrow cursor-pointer hover:text-zinc-950" data-testid="preview-resume-toggle">
                                Preview extracted text
                            </summary>
                            <pre
                                className="mt-3 text-xs rf-mono text-zinc-700 bg-zinc-50 border border-zinc-200 p-3 max-h-64 overflow-auto whitespace-pre-wrap"
                                data-testid="resume-extracted-preview"
                            >
                                {profile.base_resume_text.slice(0, 4000)}
                                {profile.base_resume_text.length > 4000 ? "\n…(truncated)" : ""}
                            </pre>
                        </details>
                    )}
                </section>

                {/* Details form */}
                <form
                    onSubmit={save}
                    className="border border-zinc-200 bg-white p-6 grid grid-cols-1 md:grid-cols-2 gap-4"
                    data-testid="profile-form"
                >
                    <Field label="Full name" testId="full-name-input">
                        <input
                            value={profile.full_name || ""}
                            onChange={(e) => update("full_name", e.target.value)}
                            className={INPUT}
                        />
                    </Field>
                    <Field label="Headline" testId="headline-input">
                        <input
                            value={profile.headline || ""}
                            onChange={(e) => update("headline", e.target.value)}
                            className={INPUT}
                            placeholder="e.g., Senior Frontend Engineer"
                        />
                    </Field>
                    <Field label="Public email" testId="email-public-input">
                        <input
                            value={profile.email_public || ""}
                            onChange={(e) => update("email_public", e.target.value)}
                            className={INPUT}
                        />
                    </Field>
                    <Field label="Phone" testId="phone-input">
                        <input
                            value={profile.phone || ""}
                            onChange={(e) => update("phone", e.target.value)}
                            className={INPUT}
                        />
                    </Field>
                    <Field label="Location" testId="location-input">
                        <input
                            value={profile.location || ""}
                            onChange={(e) => update("location", e.target.value)}
                            className={INPUT}
                        />
                    </Field>
                    <Field label="LinkedIn URL" testId="linkedin-input">
                        <input
                            value={profile.linkedin_url || ""}
                            onChange={(e) => update("linkedin_url", e.target.value)}
                            className={INPUT}
                        />
                    </Field>
                    <Field label="Website URL" testId="website-input" className="md:col-span-2">
                        <input
                            value={profile.website_url || ""}
                            onChange={(e) => update("website_url", e.target.value)}
                            className={INPUT}
                        />
                    </Field>
                    <Field label="Summary" testId="summary-input" className="md:col-span-2">
                        <textarea
                            value={profile.summary || ""}
                            onChange={(e) => update("summary", e.target.value)}
                            className={`${INPUT} min-h-[90px] rf-mono`}
                            placeholder="One-paragraph pitch about you…"
                        />
                    </Field>
                    <Field label="Skills (comma separated)" testId="skills-input" className="md:col-span-2">
                        <input
                            value={skillsValue}
                            onChange={(e) => update("skills", e.target.value)}
                            className={INPUT}
                            placeholder="React, TypeScript, Postgres, Leadership"
                        />
                    </Field>
                    <div className="md:col-span-2 flex items-center justify-between gap-4 pt-2">
                        <div className="rf-eyebrow">
                            Last updated:{" "}
                            {profile.updated_at ? new Date(profile.updated_at).toLocaleString() : "—"}
                        </div>
                        <button
                            type="submit"
                            disabled={saving}
                            data-testid="save-profile-button"
                            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60"
                        >
                            {saving ? (
                                <>
                                    <Sparkles className="h-4 w-4" /> Saving…
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" /> Save profile
                                </>
                            )}
                        </button>
                    </div>
                    {msg && (
                        <div
                            className="md:col-span-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2"
                            data-testid="profile-msg"
                        >
                            {msg}
                        </div>
                    )}
                    {err && (
                        <div
                            className="md:col-span-2 text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2"
                            data-testid="profile-err"
                        >
                            {err}
                        </div>
                    )}
                </form>
            </div>
        </Layout>
    );
}

const INPUT =
    "h-10 w-full rounded-sm border border-zinc-300 bg-white px-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:border-transparent";

function Field({ label, children, className = "", testId }) {
    return (
        <div className={className} data-testid={testId}>
            <label className="rf-eyebrow block mb-1.5">{label}</label>
            {children}
        </div>
    );
}
