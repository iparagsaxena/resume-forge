import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErr("");
        try {
            await register(name, email, password);
            navigate("/profile");
        } catch (e2) {
            setErr(e2.message || "Could not create account.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-zinc-50" data-testid="register-page">
            <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-950 text-white relative overflow-hidden">
                <div className="absolute inset-0 rf-grid-bg opacity-20" aria-hidden="true" />
                <div className="relative flex items-center gap-2">
                    <span className="inline-flex h-7 w-7 items-center justify-center bg-white text-zinc-950">
                        <Sparkles className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </span>
                    <span className="rf-heading text-lg font-black">ResumeForge</span>
                </div>
                <div className="relative">
                    <p className="rf-eyebrow text-zinc-400">Getting started</p>
                    <h2 className="rf-heading mt-4 text-4xl font-black tracking-tighter leading-tight">
                        Upload a resume once.
                        <br />
                        Tailor it forever.
                    </h2>
                    <ul className="mt-6 text-zinc-400 text-sm space-y-2">
                        <li>— Extract keywords from any job post</li>
                        <li>— Generate resumes &amp; cover letters</li>
                        <li>— Download clean PDFs</li>
                    </ul>
                </div>
                <div className="relative rf-eyebrow text-zinc-500">v0.1 · beta</div>
            </div>

            <div className="flex flex-col justify-center px-6 sm:px-12 py-12">
                <div className="max-w-sm w-full mx-auto">
                    <Link to="/" className="rf-eyebrow hover:text-zinc-950" data-testid="back-to-landing-register">
                        ← Back
                    </Link>
                    <h1 className="rf-heading mt-6 text-4xl font-black tracking-tighter">
                        Create account.
                    </h1>
                    <p className="mt-2 text-zinc-600">Free to start. No credit card needed.</p>

                    <form onSubmit={submit} className="mt-8 space-y-4" data-testid="register-form">
                        <div>
                            <label className="rf-eyebrow block mb-1.5">Name</label>
                            <input
                                type="text"
                                required
                                data-testid="register-name-input"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-11 w-full rounded-sm border border-zinc-300 bg-white px-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                                placeholder="Ada Lovelace"
                            />
                        </div>
                        <div>
                            <label className="rf-eyebrow block mb-1.5">Email</label>
                            <input
                                type="email"
                                required
                                data-testid="register-email-input"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="h-11 w-full rounded-sm border border-zinc-300 bg-white px-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                                placeholder="you@example.com"
                            />
                        </div>
                        <div>
                            <label className="rf-eyebrow block mb-1.5">Password</label>
                            <input
                                type="password"
                                required
                                minLength={6}
                                data-testid="register-password-input"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-11 w-full rounded-sm border border-zinc-300 bg-white px-3 text-sm placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-950"
                                placeholder="at least 6 characters"
                            />
                        </div>
                        {err && (
                            <div
                                className="text-sm font-semibold text-red-700 bg-red-50 border border-red-200 px-3 py-2"
                                data-testid="register-error"
                            >
                                {err}
                            </div>
                        )}
                        <button
                            type="submit"
                            data-testid="register-submit"
                            disabled={loading}
                            className="inline-flex items-center justify-center gap-2 w-full h-11 text-sm font-bold text-white bg-zinc-950 hover:bg-zinc-800 disabled:opacity-60"
                        >
                            {loading ? "Creating account…" : "Create account"}
                            {!loading && <ArrowRight className="h-4 w-4" />}
                        </button>
                    </form>

                    <p className="mt-8 text-sm text-zinc-500">
                        Already have one?{" "}
                        <Link
                            to="/login"
                            data-testid="goto-login"
                            className="font-bold text-zinc-950 underline underline-offset-4"
                        >
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
