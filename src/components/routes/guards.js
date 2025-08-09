// src/routes/guards.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export const PrivateRoute = ({ children }) => {
    const { token } = useAuth();
    return token ? children : <Navigate to="/login" replace />;
};

export const RoleRoute = ({ allowedRoles, children }) => {
    const { role } = useAuth();
    return allowedRoles.includes(role) ? children : <Navigate to="/unauthorized" replace />;
};
