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
import SystemConfiguration from "./components/SystemConfiguration";

import InventoryAdd from "./components/Inventory/InventoryAdd";
import InventoryView from "./components/Inventory/InventoryView";
import Header from "./components/ReusableComponents/Header";
import NewSideBar from "./components/ReusableComponents/NewSideBar";
import InventoryReturn from "./components/Inventory/InventoryReturn";
import ReturnToInventory from "./components/Project/ReturnToInventory";
import InternalReturnApprovals from "./components/Inventory/InternalReturnApprovals";
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
import { useAuth } from "./context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import SupplierCreate from "./components/Supplier/SupplierPage";
import ProductCreate from "./components/Inventory/ProductPage";
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
import IRFulfilmentPage from "./components/Requests/IRFulfilmentPage";
import ProjectEstimationPage from "./components/estimates/ProjectEstimationPage";
import PurchaseOrderDetails from "./components/PO/PurchaseOrderDetails";
import POPrint from "./components/PO/POPrint";
import POCreateManual from "./components/PO/POCreateManual";
import NotificationsPage from "./components/ReusableComponents/NotificationsPage";
import ReportsPage from "./components/Reports/ReportsPage";
import EmployeeCreate from "./components/Employee/EmployeeCreate";
import EmployeeList from "./components/Employee/EmployeeList";
import EmployeeProfile from "./components/Employee/EmployeeProfile";
import SalaryManagement from "./components/Employee/SalaryManagement";
import HRConfiguration from "./components/HumanResources/HRConfiguration";
import SalaryReport from "./components/Employee/Reports/SalaryReport";
import LeaveUtilizationReport from "./components/Employee/Reports/LeaveUtilizationReport";
import ProjectMaterialReport from "./components/Inventory/Reports/ProjectMaterialReport";
import StockValuationReport from "./components/Inventory/Reports/StockValuationReport";
import PayablesReport from "./components/Inventory/Reports/PayablesReport";
import ReceivablesReport from "./components/Inventory/Reports/ReceivablesReport";
import LeaveRequestPage from "./components/Employee/LeaveRequestPage";
import AttendancePage from "./components/Employee/AttendancePage";
import StockTakingPage from "./components/Inventory/Adjustments/StockTakingPage";
import StockAuditApprovalsPage from "./components/Inventory/Adjustments/StockAuditApprovalsPage";
import AssetRegister from "./components/Assets/AssetRegister";
import QuotationPrint from "./components/Projects/QuotationPrint";
import InvoiceView from "./components/Projects/InvoiceView";
import QuotationList from "./components/Sales/QuotationList";
import QuotationPage from "./components/Sales/QuotationPage";
import SettingsPage from "./components/settings/SettingsPage";



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
                <div className="page-content">
                    {children}
                </div>
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
    // useAuth call removed as unused

    return (
        <Router>
            <ToastContainer position="top-right" autoClose={3000} style={{ zIndex: 99999 }} />
            <Layout>
                <Routes>
                    {/* Public */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<Navigate to="/login" replace />} />

                    {/* Protected */}
                    {/* Dashboard is common, usually no specific module */}
                    <Route element={<PrivateRoute />}>
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/notifications" element={<NotificationsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/user/profile" element={<EmployeeProfile />} />
                    </Route>

                    {/* Admin */}
                    <Route element={<PrivateRoute module="admin" />}>
                        <Route path="/admin/config" element={<SystemConfiguration />} />
                        {/* Users */}
                        <Route path="/user/create" element={<UserCreate mode="create" />} />
                        <Route path="/user/search" element={<UserSearch />} />
                        <Route path="/user/edit/:id" element={<UserCreate mode="edit" />} />
                        <Route path="/user/view/:id" element={<UserCreate mode="view" />} />
                    </Route>

                    {/* Human Resources */}
                    <Route element={<PrivateRoute module="hr" />}>
                        <Route path="/employee/create" element={<EmployeeCreate mode="create" />} />
                        <Route path="/employee/edit/:id" element={<EmployeeCreate mode="edit" />} />
                        <Route path="/employee/list" element={<EmployeeList />} />
                        {/* <Route path="/employee/profile" element={<EmployeeProfile />} />  Common? */}
                        <Route path="/salary" element={<SalaryManagement />} />
                        <Route path="/hr/config" element={<HRConfiguration />} />
                        <Route path="/salary/report" element={<SalaryReport />} />
                        <Route path="/leave" element={<LeaveRequestPage />} />
                        <Route path="/attendance" element={<AttendancePage />} />
                        <Route path="/reports/leave" element={<LeaveUtilizationReport />} />
                    </Route>


                    {/* Inventory / Store / Procurement */}
                    <Route element={<PrivateRoute module="inventory" />}>
                        <Route path="/inventory/add" element={<InventoryAdd />} />
                        <Route path="/item/add" element={<ItemAdd />} />
                        <Route path="/inventory/search" element={<InventoryView />} />
                        <Route path="/inventory/return" element={<InventoryReturn />} />
                        <Route path="/inventory/return-to-inventory" element={<ReturnToInventory />} />
                        <Route path="/inventory/returns/approvals" element={<InternalReturnApprovals />} />
                        <Route path="/inventory/stock-taking" element={<StockTakingPage />} />
                        <Route path="/inventory/audit-approvals" element={<StockAuditApprovalsPage />} />
                        <Route path="/product/create" element={<ProductCreate />} />
                        <Route path="/supplier/create" element={<SupplierCreate />} />
                        <Route path="/supplier/search" element={<SupplierCreate />} />

                        <Route path="/inventory/pr" element={<PurchaseRequestPage />} />
                        <Route path="/stores/planning" element={<StoresPlanningPage />} />
                        <Route path="/stores/pending-to-po" element={<PendingToPOPage />} />
                        <Route path="/transfers/inbox" element={<TransfersInbox />} />
                        <Route path="/item/requests" element={<ItemRequestForm />} />

                        <Route path="/pos" element={<POListRouteWrapper />} />
                        <Route path="/pos/new" element={<POCreateManualRouteWrapper />} />
                        <Route path="/pos/:id/print" element={<POPrint />} />
                        <Route path="/pos/:id" element={<PurchaseOrderDetails />} />
                        <Route path="/grn" element={<GRNRouteWrapper />} />
                        <Route path="/grns" element={<GRNListView />} />
                        <Route path="/stores/fulfil-requests" element={<IRFulfilmentPage />} />

                        {/* Reports */}
                        <Route path="/reports/stock" element={<StockValuationReport />} />
                    </Route>


                    {/* Projects */}
                    <Route element={<PrivateRoute module="projects" />}>
                        <Route path="/projects/create" element={<ProjectCreate mode="create" />} />
                        <Route path="/projects/search" element={<ProjectSearch />} />
                        <Route path="/projects/:id" element={<ProjectCreate mode="edit" />} />
                        <Route path="/projects/edit/:id" element={<ProjectCreate mode="edit" />} />
                        <Route path="/projects/view/:id" element={<ProjectCreate mode="view" />} />
                        <Route path="/projects/manage/:id" element={<ProjectDetails />} />
                        <Route path="/projects/workflow" element={<WorkflowBuilder />} />
                        <Route path="/projects/estimation" element={<ProjectEstimationPage />} />
                        <Route path="/projects/estimation/:id" element={<ProjectEstimationRouteWrapper />} />
                        <Route path="/projects/:projectId/quotation" element={<QuotationPrint />} />
                        <Route path="/invoices/:id" element={<InvoiceView />} />
                        <Route path="/reports/project-material" element={<ProjectMaterialReport />} />
                    </Route>

                    {/* Sales / CRS */}
                    <Route element={<PrivateRoute module="sales" />}>
                        <Route path="/customer/create" element={<CustomerCreate />} />
                        <Route path="/customer/view" element={<CustomerViewRouteWrapper />} />
                        <Route path="/customer/edit/:id" element={<CustomerCreate />} />
                        <Route path="/sales/quotations" element={<QuotationList />} />
                        <Route path="/sales/quotations/new" element={<QuotationPage />} />
                        <Route path="/sales/quotations/:id" element={<QuotationPage />} />
                    </Route>

                    {/* Finance */}
                    <Route element={<PrivateRoute module="finance" />}>
                        <Route path="/reports/payables" element={<PayablesReport />} />
                        <Route path="/reports/receivables" element={<ReceivablesReport />} />
                        <Route path="/assets" element={<AssetRegister />} />
                    </Route>

                    {/* Departments - Common? or Admin */}
                    <Route element={<PrivateRoute module="admin" />}>
                        <Route path="/departments" element={<DepartmentListRouteWrapper />} />
                        <Route path="/departments/new" element={<DepartmentFormNewRouteWrapper />} />
                        <Route path="/departments/:id" element={<DepartmentFormRouteWrapper />} />
                    </Route>

                    <Route path="/reports" element={<ReportsPage />} />

                </Routes>
            </Layout>
        </Router>
    );
}

export default App;
