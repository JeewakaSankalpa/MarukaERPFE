import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute({ children, module }) {
    const { isAuthenticated, role } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Bypass check for ADMIN
    if (role === 'ADMIN') {
        return children ? children : <Outlet />;
    }

    // Check Module Access if 'module' prop is passed
    if (module) {
        try {
            const userModules = JSON.parse(localStorage.getItem("moduleAccess") || "[]");
            if (!userModules.includes(module)) {
                if (location.pathname !== '/dashboard') {
                    return <Navigate to="/dashboard" replace />;
                }
            }
        } catch (e) {
            console.error("Error parsing module access", e);
        }
    }

    return children ? children : <Outlet />;
}
