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
            if (!userModules.includes(module)) {
                console.error(`[PrivateRoute] Access Denied! Module: '${module}'. User Modules:`, userModules);
                if (location.pathname !== '/dashboard') {
                    return <Navigate to="/dashboard" replace />;
                }
            } else if (module === 'settings') {
                console.log(`[PrivateRoute] Access GRANTED for settings. User Modules:`, userModules);
            }
        } catch (e) {
            console.error("Error parsing module access", e);
        }
    }

    return children ? children : <Outlet />;
}
