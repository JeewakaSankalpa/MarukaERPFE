import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute({ children, module }) {
    const { isAuthenticated } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Check Module Access if 'module' prop is passed
    if (module) {
        try {
            const userModules = JSON.parse(localStorage.getItem("moduleAccess") || "[]");
            // If userModules is empty (and not just []), it might mean they have NO access or it's not loaded.
            // But if they are authenticated, they should have some modules.
            // We assume 'web' or similar might not have modules, so we might need a fallback.
            // For now, strict check:
            if (!userModules.includes(module)) {
                // Redirect to likely safe place, e.g. dashboard.
                // Avoiding infinite loop: if dashboard itself is protected, we need to be careful.
                // Dashboard usually has no specific module requirement or 'dashboard' module.
                // If this is the dashboard route itself failing, we have a problem.
                // Assuming dashboard is safe or has different check.
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
