import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function PrivateRoute({ children, module }) {
    const { isAuthenticated, role } = useAuth();
    const location = useLocation();

    if (!isAuthenticated) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    // Check Module Access if 'module' prop is passed
    if (module) {
        try {
            const userModules = JSON.parse(localStorage.getItem("moduleAccess") || "[]");

            // Strict check: User must have the module in their access list
            if (!userModules.includes(module)) {
                console.error(`[PrivateRoute] Access Denied! Module: '${module}'. User Modules:`, userModules);

                // Redirect to dashboard if trying to access unauthorized route
                if (location.pathname !== '/dashboard') {
                    return <Navigate to="/dashboard" replace />;
                }
            } else {
                // explicit logging for debugging
                if (module === 'settings' || module.startsWith('settings.')) {
                    console.log(`[PrivateRoute] Access GRANTED for ${module}.`);
                }
            }
        } catch (e) {
            console.error("Error parsing module access", e);
            // In case of error (e.g. corrupted localStorage), deny access safely
            return <Navigate to="/dashboard" replace />;
        }
    }

    return children ? children : <Outlet />;
}
