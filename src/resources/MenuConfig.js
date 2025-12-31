export const MenuConfig = [
    {
        id: "home",
        title: "Dashboard",
        icon: "FaHome",
        path: "/dashboard", // Direct Link
        roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE", "CUSTOMER"],
        subItems: [
            // Hidden logical items
            { id: "dashboard.pending_approvals", title: "Widget: Pending Approvals", path: "#", hidden: true, roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"] },
            { id: "dashboard.my_attendance", title: "Widget: My Attendance", path: "#", hidden: true, roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"] },
        ]
    },
    {
        id: "projects",
        title: "Projects",
        icon: "FaProjectDiagram",
        roles: ["ADMIN", "MANAGER", "EMPLOYEE"],
        subItems: [
            { id: "projects.my_projects", title: "My Projects", path: "/projects/search" },
            { id: "projects.create", title: "New Project", path: "/projects/create" },
            { id: "projects.estimation", title: "Estimation", path: "/projects/estimation" },

            // Component-Level Permissions (Hidden from Sidebar)
            { id: "projects.payments", title: "Access Payments", path: "#", hidden: true },
            { id: "projects.files", title: "Access Files", path: "#", hidden: true },
            { id: "projects.delivery", title: "Access Delivery Schedule", path: "#", hidden: true },
        ]
    },
    {
        id: "inventory",
        title: "Inventory",
        icon: "FaBoxes",
        roles: ["ADMIN", "MANAGER", "STORE_KEEPER", "EMPLOYEE"],
        subItems: [
            { id: "inventory.dashboard", title: "Dashboard", path: "/inventory/dashboard" }, // NEW
            { id: "inventory.search", title: "Stock Search", path: "/inventory/search" },
            { id: "inventory.stock_taking", title: "Stock Taking", path: "/inventory/stock-taking" },
            { id: "inventory.audit_approvals", title: "Audit Approvals", path: "/inventory/audit-approvals" },
            { id: "inventory.products", title: "Products", path: "/product/create" },
            { id: "inventory.pr", title: "Purchase Requests", path: "/inventory/pr" },
            { id: "inventory.internal", title: "New Request", path: "/item/requests" },
            { id: "inventory.my_requests", title: "My Requests", path: "/item/my-requests" }, // NEW
            { id: "inventory.fulfil", title: "Fulfil Requests", path: "/stores/fulfil-requests" },
            { id: "inventory.return", title: "Returns", path: "/inventory/return" },
            { id: "inventory.approvals", title: "Return Approvals", path: "/inventory/returns/approvals" },
            { id: "inventory.approvals", title: "Return Approvals", path: "/inventory/returns/approvals" },

        ]
    },
    {
        id: "procurement",
        title: "Procurement",
        icon: "FaChartLine",
        roles: ["ADMIN", "STORE_KEEPER", "MANAGER", "EMPLOYEE"],
        subItems: [
            { id: "procurement.dashboard", title: "Dashboard", path: "/procurement/dashboard" }, // NEW
            { id: "procurement.planning", title: "Stores Planning", path: "/stores/planning" },
            { id: "procurement.pos", title: "Purchase Orders", path: "/pos" },
            { id: "procurement.pending", title: "Pending Items", path: "/stores/pending-to-po" },
            { id: "procurement.grn", title: "Receive (GRN)", path: "/grn" },
            { id: "procurement.grn_history", title: "GRN History", path: "/grns" },
            { id: "procurement.transfers", title: "Transfers", path: "/transfers/inbox" },
        ]
    },
    {
        id: "hr",
        title: "HR & Team",
        icon: "FaUsers",
        roles: ["ADMIN", "HR", "MANAGER", "EMPLOYEE"],
        subItems: [
            { id: "hr.directory", title: "Directory", path: "/employee/list", roles: ["ADMIN", "HR", "MANAGER"] },
            { id: "hr.attendance", title: "Attendance", path: "/attendance" },
            { id: "hr.leave", title: "Leave", path: "/leave" },
            { id: "hr.payroll", title: "Payroll", path: "/salary", roles: ["ADMIN", "HR", "MANAGER"] },
            { id: "hr.config", title: "Configuration", path: "/hr/config", roles: ["ADMIN", "HR", "MANAGER"] },
        ]
    },
    {
        id: "partners",
        title: "Partners",
        icon: "FaBriefcase",
        roles: ["ADMIN", "SALES", "MANAGER"],
        subItems: [
            { id: "partners.customers", title: "Customers", path: "/customer/view" },
            { id: "partners.suppliers", title: "Suppliers", path: "/supplier/search" },
        ]
    },
    {
        id: "reports",
        title: "Reports",
        icon: "FaChartLine",
        roles: ["ADMIN", "MANAGER", "HR", "STORE_KEEPER", "EMPLOYEE"],
        subItems: [
            { id: "reports.interactive", title: "Interactive Dashboard", path: "/dashboard/interactive" },
            { id: "reports.dashboard", title: "Reports Dashboard", path: "/reports" },
            { id: "reports.stock", title: "Stock Valuation", path: "/reports/stock" },
            { id: "reports.payables", title: "Payables Report", path: "/reports/payables" },
            { id: "reports.receivables", title: "Receivables Report", path: "/reports/receivables" },
            { id: "reports.leave", title: "Leave Utilization", path: "/reports/leave" },
            // Add Project Material if route exists, keeping it safe for now:
            // { id: "reports.project_material", title: "Project Material", path: "/reports/project-material" }, 
        ]
    },
    {
        id: "finance",
        title: "Sales & Finance",
        icon: "FaBriefcase",
        roles: ["ADMIN", "MANAGER"],
        subItems: [
            { id: "finance.dashboard", title: "Finance Dashboard", path: "/finance/dashboard" },
            { id: "finance.expenses", title: "Expenses", path: "/finance/expenses" },
            { id: "finance.loans", title: "Loan Management", path: "/finance/loans" },
            { id: "finance.reports", title: "Financial Statements", path: "/finance/reports" },
            { id: "finance.assets", title: "Asset Register", path: "/assets" },
        ]
    },
    {
        id: "settings",
        title: "Settings",
        icon: "FaCogs",
        roles: ["ADMIN"],
        subItems: [
            { id: "settings.config", title: "System Config", path: "/admin/config" },
            { id: "settings.workflows", title: "Workflows", path: "/admin/workflows" },
            { id: "settings.estimation", title: "Estimation Settings", path: "/settings" },
            { id: "settings.departments", title: "Departments", path: "/departments" },
            { id: "settings.new_department", title: "New Department", path: "/departments/new" },
        ]
    }
];
