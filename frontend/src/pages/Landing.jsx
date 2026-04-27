import { Link } from "react-router-dom";
import {
    ArrowRight,
    CheckCircle2,
    Chrome,
    FileText,
    Layers,
    ScanLine,
    Sparkles,
    Target,
    Wand2,
} from "lucide-react";

const PILL =
    "inline-flex items-center px-2.5 py-1 text-xs font-bold tracking-[0.15em] uppercase border border-zinc-200 bg-white text-zinc-600";

export default function Landing() {
    return (
        <div className="bg-zinc-50 text-zinc-950" data-testid="landing-page">
            {/* Nav */}
            <header className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-zinc-200">
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
                    <Link to="/" className="flex items-center gap-2" data-testid="brand-link">
                        <span className="inline-flex h-7 w-7 items-center justify-center bg-zinc-950 text-white">
                            <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                        <span className="rf-heading text-lg font-black tracking-tight">
                            ResumeForge
                        </span>
                    </Link>
                    <div className="flex items-center gap-2">
                        <Link
                            to="/login"
                            data-testid="landing-login-link"
                            className="px-3 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
                        >
                            Login
                        </Link>
                        <Link
                            to="/register"
                            data-testid="landing-register-cta"
                            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800 rounded-sm"
                        >
                            Create account <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                </div>
            </header>

            {/* Hero */}
            <section className="relative border-b border-zinc-200 overflow-hidden">
                <div className="absolute inset-0 rf-grid-bg opacity-70" aria-hidden="true" />
                <div className="relative max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 px-6 pt-20 pb-24">
                    <div className="lg:col-span-7">
                        <span className={PILL} data-testid="hero-eyebrow">
                            Chrome extension · v0.1
                        </span>
                        <h1 className="rf-heading mt-6 text-5xl sm:text-6xl lg:text-7xl font-black leading-[0.95] tracking-tighter">
                            Apply to jobs
                            <br />
                            <span className="underline decoration-[6px] decoration-zinc-950 underline-offset-[10px]">
                                in minutes,
                            </span>
                            <br />
                            not weekends.
                        </h1>
                        <p className="mt-7 text-lg text-zinc-600 max-w-xl leading-relaxed">
                            ResumeForge reads the job description right from LinkedIn, Indeed or
                            Naukri, pulls out the exact keywords recruiters scan for, and rewrites
                            a tailored resume + cover letter you can download as PDF — on the spot.
                        </p>

                        <div className="mt-10 flex flex-wrap items-center gap-3">
                            <Link
                                to="/register"
                                data-testid="hero-primary-cta"
                                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800"
                            >
                                Start for free <ArrowRight className="h-4 w-4" />
                            </Link>
                            <a
                                href="#install"
                                data-testid="hero-install-cta"
                                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-bold text-zinc-950 bg-white border border-zinc-200 hover:bg-zinc-100"
                            >
                                <Chrome className="h-4 w-4" /> Install the extension
                            </a>
                        </div>

                        <div className="mt-10 flex items-center gap-6 text-xs text-zinc-500">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> LinkedIn
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Indeed
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Naukri
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Any page
                            </div>
                        </div>
                    </div>

                    <div className="lg:col-span-5 relative">
                        <div className="relative border border-zinc-200 bg-white shadow-[6px_6px_0_0_rgba(9,9,11,1)]">
                            <div className="border-b border-zinc-200 px-4 py-2 flex items-center gap-2">
                                <span className="h-2.5 w-2.5 bg-zinc-200 inline-block" />
                                <span className="h-2.5 w-2.5 bg-zinc-200 inline-block" />
                                <span className="h-2.5 w-2.5 bg-zinc-950 inline-block" />
                                <span className="ml-3 rf-eyebrow">resumeforge · popup</span>
                            </div>
                            <div className="p-5 space-y-4 rf-mono text-[13px]">
                                <div className="flex items-center justify-between">
                                    <span className="rf-eyebrow">JD match</span>
                                    <span className="text-2xl rf-heading font-black">78%</span>
                                </div>
                                <div className="border-t border-dashed border-zinc-300" />
                                <div className="space-y-1">
                                    <div className="rf-eyebrow">Keywords spotted</div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {[
                                            "React",
                                            "TypeScript",
                                            "Postgres",
                                            "CI/CD",
                                            "A/B testing",
                                            "SaaS",
                                        ].map((k) => (
                                            <span
                                                key={k}
                                                className="px-2 py-0.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200"
                                            >
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="rf-eyebrow">Missing on resume</div>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {["Kubernetes", "GraphQL"].map((k) => (
                                            <span
                                                key={k}
                                                className="px-2 py-0.5 text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200"
                                            >
                                                {k}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-2 grid grid-cols-2 gap-2">
                                    <button className="py-2 text-xs font-bold bg-zinc-950 text-white">
                                        Generate resume
                                    </button>
                                    <button className="py-2 text-xs font-bold bg-white border border-zinc-200">
                                        Cover letter
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-5 -left-5 border border-zinc-200 bg-white px-3 py-2 rf-mono text-[11px] shadow-sm">
                            <span className="rf-eyebrow">latency</span>{" "}
                            <span className="font-bold">~4s</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature grid */}
            <section className="border-b border-zinc-200">
                <div className="max-w-7xl mx-auto px-6 py-24">
                    <div className="max-w-2xl">
                        <span className={PILL}>How it works</span>
                        <h2 className="rf-heading mt-4 text-4xl sm:text-5xl font-black tracking-tighter">
                            From job post to polished PDF — without the copy-paste.
                        </h2>
                    </div>
                    <div className="mt-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            {
                                icon: ScanLine,
                                title: "One click scan",
                                body: "Open any role on LinkedIn, Indeed or Naukri. The extension reads the JD automatically or on-demand.",
                            },
                            {
                                icon: Target,
                                title: "ATS keyword map",
                                body: "Gemini 2.5 extracts the keywords that matter and compares them to your base resume — green = covered, amber = missing.",
                            },
                            {
                                icon: Wand2,
                                title: "Tailored docs",
                                body: "Generate a resume and cover letter rewritten for that specific role, in seconds.",
                            },
                            {
                                icon: FileText,
                                title: "Download as PDF",
                                body: "Clean, recruiter-ready PDFs. History and versions kept in your dashboard.",
                            },
                        ].map((f) => (
                            <div
                                key={f.title}
                                className="bg-white border border-zinc-200 p-6 rounded-sm"
                                data-testid={`feature-${f.title.toLowerCase().replace(/\s+/g, "-")}`}
                            >
                                <div className="inline-flex h-8 w-8 items-center justify-center bg-zinc-950 text-white">
                                    <f.icon className="h-4 w-4" />
                                </div>
                                <h3 className="rf-heading mt-4 text-lg font-bold tracking-tight">
                                    {f.title}
                                </h3>
                                <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
                                    {f.body}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Install guide */}
            <section id="install" className="border-b border-zinc-200 bg-white">
                <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-5">
                        <span className={PILL}>Install</span>
                        <h2 className="rf-heading mt-4 text-4xl font-black tracking-tighter">
                            Load the Chrome extension.
                        </h2>
                        <p className="mt-4 text-zinc-600 leading-relaxed">
                            We&apos;re in beta — packaged as an unpacked extension. Three steps and
                            you&apos;re live.
                        </p>
                        <Link
                            to="/register"
                            data-testid="install-register-cta"
                            className="inline-flex items-center gap-2 mt-6 px-5 py-3 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800"
                        >
                            Create your account <ArrowRight className="h-4 w-4" />
                        </Link>
                    </div>
                    <div className="lg:col-span-7">
                        <ol className="space-y-4">
                            {[
                                {
                                    n: "01",
                                    title: "Download the extension package",
                                    body: "Grab the /chrome-extension folder from the project or the zipped build.",
                                },
                                {
                                    n: "02",
                                    title: "Open chrome://extensions",
                                    body: "Enable Developer mode (top-right), then click Load unpacked.",
                                },
                                {
                                    n: "03",
                                    title: "Pin it & log in",
                                    body: "Pin ResumeForge to your toolbar and sign in with your dashboard account.",
                                },
                            ].map((s) => (
                                <li
                                    key={s.n}
                                    className="flex gap-5 border border-zinc-200 bg-white p-5"
                                >
                                    <span className="rf-heading text-4xl font-black tracking-tighter text-zinc-950">
                                        {s.n}
                                    </span>
                                    <div>
                                        <h4 className="font-bold text-zinc-950">{s.title}</h4>
                                        <p className="mt-1 text-sm text-zinc-600">{s.body}</p>
                                    </div>
                                </li>
                            ))}
                        </ol>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-zinc-950 text-zinc-300">
                <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-2 text-white">
                            <Layers className="h-4 w-4" />
                            <span className="rf-heading text-lg font-black">ResumeForge</span>
                        </div>
                        <p className="mt-3 max-w-md text-sm text-zinc-400 leading-relaxed">
                            AI-assisted resumes and cover letters, tailored to the job in front of
                            you.
                        </p>
                    </div>
                    <div className="rf-eyebrow text-zinc-500">
                        Built with Gemini · FastAPI · React
                    </div>
                </div>
            </footer>
        </div>
    );
}
