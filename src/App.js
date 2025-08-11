import logo from "./logo.svg";
import "./components/Styles/App.css";

import React from "react";
import {
    HashRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
} from "react-router-dom";

import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./components/AdminDashboard";
import CustomerDashboard from "./components/Customer/CustomerDashboard";
// import EmployerDashboard from './components/Users/UserEdit';
import InventoryAdd from "./components/Inventory/InventoryAdd";
import InventoryView from "./components/Inventory/InventoryView";
import Header from "./components/ReusableComponents/Header";
import NewSideBar from "./components/ReusableComponents/NewSideBar";
import InventoryReturn from "./components/Inventory/InventoryReturn";
import ReturnToInventory from "./components/Project/ReturnToInventory";
import UserCreate from "./components/Users/UserCreate";
import UserSearch from "./components/Users/UserSearch";
import CustomerCreate from "./components/Customer/CustomerCreate";
import CustomerView from "./components/Customer/CustomerView";
import ProjectCreate from "./components/Project/ProjectCreate";
import ProjectSearch from "./components/Project/ProjectSearch";
// ✅ use relative import unless you configured absolute aliases
import PrivateRoute from "./components/routes/PrivateRoute";
import ProjectDetails from "./components/Project/ProjectDetails";
import WorkflowBuilder from "./components/workflow/WorkflowBuilder";
import ItemAdd from "./components/Inventory/ItemAdd";
import InventoryDashboard from "./components/Inventory/InventoryDashboard";

// import Sidebar from './components/Sidebar';

function Layout({ children }) {
    const location = useLocation();
    const isLoginRoute = location.pathname === "/login";

    // Hide chrome on login
    if (isLoginRoute) return <>{children}</>;

    return (
        <div className="app-container">
            <Header />
            <div className="main-content">
                <NewSideBar />
                {children}
            </div>
        </div>
    );
}

function App() {
    return (
        <Router>
            <Layout>
                <Routes>
                    {/* Login is main/initial UI */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* Protected area */}
                    <Route element={<PrivateRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/admin" element={<AdminDashboard />} />
                        <Route path="/customerDashboard" element={<CustomerDashboard />} />

                        {/* Users */}
                        <Route path="/user/create" element={<UserCreate mode="create" />} />
                        <Route path="/user/search" element={<UserSearch />} />
                        <Route path="/user/edit/:id" element={<UserCreate mode="edit" />} />
                        <Route path="/user/view/:id" element={<UserCreate mode="view" />} />

                        {/* Inventory */}
                        <Route path="/inventory/add" element={<InventoryAdd />} />
                        <Route path="/inventory/search" element={<InventoryView />} />
                        <Route path="/inventory/return" element={<InventoryReturn />} />

                        {/* Projects */}
                        <Route path="/projects/create" element={<ProjectCreate mode="create" />} />
                        <Route path="/projects/search" element={<ProjectSearch />} />
                        <Route path="/projects/:id" element={<ProjectCreate mode="edit" />} />
                        <Route path="/projects/edit/:id" element={<ProjectCreate mode="edit" />} />
                        <Route path="/projects/view/:id" element={<ProjectCreate mode="view" />} />
                        <Route path="/projects/manage/:id" element={<ProjectDetails />} />
                        <Route path="/projects/workflow" element={<WorkflowBuilder />} />

                        {/* Misc */}
                        <Route path="/inventory/return-to-inventory" element={<ReturnToInventory />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
