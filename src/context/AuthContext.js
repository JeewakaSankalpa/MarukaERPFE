// src/context/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import api from "../services/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [auth, setAuth] = useState(() => {
        const token = localStorage.getItem("token");
        if (!token) return { token: null, username: null, role: null, userType: null };
        try {
            const payload = jwtDecode(token);
            return {
                token,
                username: payload.sub,
                role: payload.role,
                userType: payload.userType,
            };
        } catch {
            localStorage.removeItem("token");
            return { token: null, username: null, role: null, userType: null };
        }
    });

    // keep axios in sync
    useEffect(() => {
        if (auth.token) {
            api.defaults.headers.common.Authorization = `Bearer ${auth.token}`;
        } else {
            delete api.defaults.headers.common.Authorization;
        }
    }, [auth.token]);

    const login = async (username, password) => {
        // If your api baseURL already includes `/api`, use "/auth/login"
        // Otherwise use "/api/auth/login"
        const { data } = await api.post("/auth/login", { username, password });

        const { token, role, userType } = data;
        localStorage.setItem("token", token);

        let decoded = {};
        try { decoded = jwtDecode(token); } catch {}

        const finalRole = role || decoded.role || null;
        const finalUserType = userType || decoded.userType || null;

        setAuth({
            token,
            username: decoded.sub || username,
            role: finalRole,
            userType: finalUserType,
        });

        // IMPORTANT: return so callers can route immediately
        return { role: finalRole, userType: finalUserType };
    };

    const logout = () => {
        localStorage.removeItem("token");
        setAuth({ token: null, username: null, role: null, userType: null });
    };

    const isAuthenticated = !!auth.token;

    return (
        <AuthContext.Provider value={{ ...auth, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
