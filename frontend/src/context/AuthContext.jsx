import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { formatApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    // null = checking, false = unauthenticated, object = authenticated
    const [user, setUser] = useState(null);
    const [error, setError] = useState("");

    const refreshMe = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data);
            return data;
        } catch (e) {
            setUser(false);
            return null;
        }
    }, []);

    useEffect(() => {
        refreshMe();
    }, [refreshMe]);

    const login = async (email, password) => {
        setError("");
        try {
            const { data } = await api.post("/auth/login", { email, password });
            setUser(data.user);
            return data.user;
        } catch (e) {
            const msg = formatApiError(e.response?.data?.detail) || e.message;
            setError(msg);
            throw new Error(msg);
        }
    };

    const register = async (name, email, password) => {
        setError("");
        try {
            const { data } = await api.post("/auth/register", { name, email, password });
            setUser(data.user);
            return data.user;
        } catch (e) {
            const msg = formatApiError(e.response?.data?.detail) || e.message;
            setError(msg);
            throw new Error(msg);
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch (e) {
            // ignore
        }
        setUser(false);
    };

    return (
        <AuthContext.Provider value={{ user, error, login, register, logout, refreshMe }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}
