import logo from "./logo.svg";
import "./components/Styles/App.css";

import React from "react";
import {
    HashRouter as Router,
    Routes,
    Route,
    Navigate,
    useLocation,
    useParams,
    useNavigate,
} from "react-router-dom";

import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import AdminDashboard from "./components/AdminDashboard";
import CustomerDashboard from "./components/Customer/CustomerDashboard";

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
import PrivateRoute from "./components/routes/PrivateRoute";
import ProjectDetails from "./components/Project/ProjectDetails";
import WorkflowBuilder from "./components/workflow/WorkflowBuilder";
import ItemAdd from "./components/Inventory/ItemAdd";
import InventoryDashboard from "./components/Inventory/InventoryDashboard";
import { useAuth } from "./context/AuthContext";

import SupplierCreate from "./components/Supplier/SupplierPage";
import ProductCreate from "./components/Inventory/ProductPage";
import SupplierView from "./components/Supplier/SupplierView";
import SupplierDashboard from "./components/Supplier/SupplierDashboard";
import PurchaseRequestPage from "./components/Inventory/PurchaseRequestPage";
import StoresPlanningPage from "./components/Stores/StoresPlanningPage";
import PendingToPOPage from "./components/Stores/PendingToPOPage";
import TransfersInbox from "./components/Transfers/TransferInbox";
import POListView from "./components/PO/POListView";
import GRNReceivePage from "./components/GRN/GRNRecievePage";
import GRNListView from "./components/GRN/GRNListView";
import ItemRequestForm from "./components/Requests/ItemRequestForm";
import DepartmentList from "./components/Departments/DepartmentList";
import DepartmentForm from "./components/Departments/DepartmentForm";
import POCreateManual from "./components/PO/POCreateManual";
import IRFulfilmentPage from "./components/Requests/IRFulfilmentPage";
import ProjectEstimationPage from "./components/estimates/ProjectEstimationPage";
import ReportsPage from "./components/Reports/ReportsPage";
import EmployeeCreate from "./components/Employee/EmployeeCreate";
import EmployeeList from "./components/Employee/EmployeeList";
import SalaryManagement from "./components/Employee/SalaryManagement";
import SalaryReport from "./components/Employee/Reports/SalaryReport";
import LeaveUtilizationReport from "./components/Employee/Reports/LeaveUtilizationReport";
import StockValuationReport from "./components/Inventory/Reports/StockValuationReport";
import LeaveRequestPage from "./components/Employee/LeaveRequestPage";
import AttendancePage from "./components/Employee/AttendancePage";

/* ---------------- Layout ---------------- */
function Layout({ children }) {
    const location = useLocation(); // ✅ use hook, not global
    const isLoginRoute = location.pathname === "/login";

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

/* --------------- Route Wrappers --------------- */
function DepartmentFormRouteWrapper() {
    const params = useParams();
    const navigate = useNavigate();
    return <DepartmentForm id={params.id} onDone={(id) => navigate(`/departments/${id}`)} />;
}

function DepartmentListRouteWrapper() {
    const navigate = useNavigate();
    return (
        <DepartmentList
            onOpenForm={(id) => navigate(id ? `/departments/${id}` : "/departments/new")}
        />
    );
}

function DepartmentFormNewRouteWrapper() {
    const navigate = useNavigate();
    return <DepartmentForm onDone={(id) => navigate(`/departments/${id}`)} />;
}

function POListRouteWrapper() {
    const navigate = useNavigate();
    return <POListView onOpenGRN={(poId) => navigate(`/grn?poId=${poId}`)} />;
}

function GRNRouteWrapper() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    return <GRNReceivePage poId={params.get("poId")} />;
}

function POCreateManualRouteWrapper() {
    const navigate = useNavigate();
    return <POCreateManual onCreated={() => navigate(`/pos`)} />;
}

function CustomerViewRouteWrapper() {
    const navigate = useNavigate();
    return <CustomerView onEditCustomer={(customer) => navigate(`/customer/edit/${customer.id}`)} />;
}

function ProjectEstimationRouteWrapper() {
    const { id } = useParams();
    return <ProjectEstimationPage projectId={id} />;
}

/* ------------------- App ------------------- */
function App() {
    const { isAuthenticated } = useAuth(); // keep if you use it elsewhere

    return (
        <Router>
            <Layout>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* Protected */}
                    <Route element={<PrivateRoute />}>
                        {/* <Route path="/dashboard" element={<Dashboard />} /> */}
                        <Route path="/admin" element={<AdminDashboard />} />
                        {/* <Route path="/customerDashboard" element={<CustomerDashboard />} /> */}

                        {/* HR / Employees */}
                        <Route path="/employee/create" element={<EmployeeCreate mode="create" />} />
                        <Route path="/employee/edit/:id" element={<EmployeeCreate mode="edit" />} />
                        <Route path="/employee/list" element={<EmployeeList />} />
                        <Route path="/salary" element={<SalaryManagement />} />
                        <Route path="/salary/report" element={<SalaryReport />} />
                        <Route path="/leave" element={<LeaveRequestPage />} />
                        <Route path="/attendance" element={<AttendancePage />} />

                        {/* Users */}
                        <Route path="/user/create" element={<UserCreate mode="create" />} />
                        <Route path="/user/search" element={<UserSearch />} />
                        <Route path="/user/edit/:id" element={<UserCreate mode="edit" />} />
                        <Route path="/user/view/:id" element={<UserCreate mode="view" />} />

                        {/* Inventory */}
                        <Route path="/inventory/add" element={<InventoryAdd />} />
                        <Route path="/item/add" element={<ItemAdd />} />
                        <Route path="/inventory/search" element={<InventoryView />} />
                        <Route path="/inventory/return" element={<InventoryReturn />} />
                        <Route path="/inventory/return-to-inventory" element={<ReturnToInventory />} />

                        {/* Projects */}
                        <Route path="/projects/create" element={<ProjectCreate mode="create" />} />
                        <Route path="/projects/search" element={<ProjectSearch />} />
                        <Route path="/projects/:id" element={<ProjectCreate mode="edit" />} />
                        <Route path="/projects/edit/:id" element={<ProjectCreate mode="edit" />} />
                        <Route path="/projects/view/:id" element={<ProjectCreate mode="view" />} />
                        <Route path="/projects/manage/:id" element={<ProjectDetails />} />
                        <Route path="/projects/workflow" element={<WorkflowBuilder />} />
                        <Route path="/projects/estimation" element={<ProjectEstimationPage />} />
                        <Route path="/projects/estimation/:id" element={<ProjectEstimationRouteWrapper />} />

                        {/* Customer */}
                        <Route path="/customer/create" element={<CustomerCreate />} />
                        <Route path="/customer/create" element={<CustomerCreate />} />
                        <Route path="/customer/view" element={<CustomerViewRouteWrapper />} />
                        <Route path="/customer/edit/:id" element={<CustomerCreate />} />

                        {/* Supplier / Product */}
                        <Route path="/supplier/create" element={<SupplierCreate />} />
                        <Route path="/product/create" element={<ProductCreate />} />

                        {/* Requests / Stores / PO / GRN */}
                        <Route path="/inventory/pr" element={<PurchaseRequestPage />} />
                        <Route path="/stores/planning" element={<StoresPlanningPage />} />
                        <Route path="/stores/pending-to-po" element={<PendingToPOPage />} />
                        <Route path="/transfers/inbox" element={<TransfersInbox />} />
                        <Route path="/item/requests" element={<ItemRequestForm />} />
                        {/*<Route path="/item/list-requests" element={<ItemRequests />} />*/}

                        <Route path="/pos" element={<POListRouteWrapper />} />
                        <Route path="/pos/new" element={<POCreateManualRouteWrapper />} />
                        <Route path="/grn" element={<GRNRouteWrapper />} />
                        <Route path="/grns" element={<GRNListView />} />

                        {/* Departments */}
                        <Route path="/departments" element={<DepartmentListRouteWrapper />} />
                        <Route path="/departments/new" element={<DepartmentFormNewRouteWrapper />} />
                        <Route path="/departments/:id" element={<DepartmentFormRouteWrapper />} />

                        <Route path="/stores/fulfil-requests" element={<IRFulfilmentPage />} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/reports/leave" element={<LeaveUtilizationReport />} />
                        <Route path="/reports/stock" element={<StockValuationReport />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
