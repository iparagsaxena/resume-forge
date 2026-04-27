import { Link, NavLink, useNavigate } from "react-router-dom";
import { Briefcase, LayoutGrid, LogOut, User, Zap } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const navLinkBase =
    "inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950 transition-colors";
const navLinkActive = "text-zinc-950 border-b-2 border-zinc-950 -mb-[1px]";

export default function Layout({ children }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const doLogout = async () => {
        await logout();
        navigate("/", { replace: true });
    };

    return (
        <div className="min-h-screen bg-zinc-50 text-zinc-950">
            <header
                className="sticky top-0 z-30 bg-white/85 backdrop-blur border-b border-zinc-200"
                data-testid="app-header"
            >
                <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-14">
                    <Link
                        to="/dashboard"
                        className="flex items-center gap-2"
                        data-testid="brand-link"
                    >
                        <span className="inline-flex h-7 w-7 items-center justify-center bg-zinc-950 text-white">
                            <Zap className="h-3.5 w-3.5" strokeWidth={2.5} />
                        </span>
                        <span className="rf-heading text-lg font-black tracking-tight">
                            ResumeForge
                        </span>
                        <span className="rf-eyebrow ml-2 hidden sm:inline">BETA</span>
                    </Link>

                    <nav className="flex items-center gap-2">
                        <NavLink
                            to="/dashboard"
                            data-testid="nav-dashboard"
                            className={({ isActive }) =>
                                `${navLinkBase} ${isActive ? navLinkActive : ""}`
                            }
                        >
                            <LayoutGrid className="h-4 w-4" /> Dashboard
                        </NavLink>
                        <NavLink
                            to="/jobs"
                            data-testid="nav-jobs"
                            className={({ isActive }) =>
                                `${navLinkBase} ${isActive ? navLinkActive : ""}`
                            }
                        >
                            <Briefcase className="h-4 w-4" /> Jobs
                        </NavLink>
                        <NavLink
                            to="/profile"
                            data-testid="nav-profile"
                            className={({ isActive }) =>
                                `${navLinkBase} ${isActive ? navLinkActive : ""}`
                            }
                        >
                            <User className="h-4 w-4" /> Profile
                        </NavLink>
                        <button
                            type="button"
                            onClick={doLogout}
                            data-testid="logout-button"
                            className="ml-3 inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-zinc-600 hover:text-zinc-950"
                        >
                            <LogOut className="h-4 w-4" /> Logout
                        </button>
                        <span
                            className="hidden md:inline-flex items-center px-2 py-1 text-xs font-semibold text-zinc-600 bg-zinc-100 border border-zinc-200"
                            data-testid="user-email"
                        >
                            {user?.email}
                        </span>
                    </nav>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-6 py-8" data-testid="page-content">
                {children}
            </main>
        </div>
    );
}
