import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
    const { user } = useAuth();
    if (user === null) {
        return (
            <div
                className="flex min-h-screen items-center justify-center bg-zinc-50"
                data-testid="auth-loading"
            >
                <div className="rf-eyebrow">Verifying session…</div>
            </div>
        );
    }
    if (user === false) return <Navigate to="/login" replace />;
    return children;
}
