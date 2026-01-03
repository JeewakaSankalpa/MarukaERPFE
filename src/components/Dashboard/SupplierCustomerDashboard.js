import React, { useEffect, useState } from "react";
import axios from "axios";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from "recharts";
import { DollarSign, Users, Briefcase, Truck, ShoppingCart } from "lucide-react";

// Helper for formatted currency
const formatCurrency = (val) => {
    return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "LKR",
    }).format(val);
};

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8"];

const SupplierCustomerDashboard = () => {
    const [activeTab, setActiveTab] = useState("customers");
    // Default to YTD
    const [dateRange, setDateRange] = useState({
        startDate: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
    });

    const [metrics, setMetrics] = useState({
        customerKPI: {},
        supplierKPI: {},
        topCustomers: [],
        topSuppliers: [],
        projectStatus: [],
        poStatus: [],
        recentInvoices: [],
        recentPOs: [],
        productSupplierStats: [],
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAllData();
    }, [dateRange]); // Refetch when dates change

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const params = {
                startDate: dateRange.startDate,
                endDate: dateRange.endDate
            };

            const [
                cKPI,
                sKPI,
                topC,
                topS,
                pStatus,
                poStatus,
                rInv,
                rPOs,
                prodSupStats,
            ] = await Promise.all([
                axios.get("http://localhost:8080/api/analytics/customer-kpi", { params }),
                axios.get("http://localhost:8080/api/analytics/supplier-kpi", { params }),
                axios.get("http://localhost:8080/api/analytics/top-customers", { params }),
                axios.get("http://localhost:8080/api/analytics/top-suppliers", { params }),
                axios.get("http://localhost:8080/api/analytics/project-status"), // Status usually implies 'Current', maybe no date filter? Or created in range?
                axios.get("http://localhost:8080/api/analytics/po-status", { params }),
                axios.get("http://localhost:8080/api/analytics/recent-invoices"), // Recent usually ignores filter
                axios.get("http://localhost:8080/api/analytics/recent-pos"),
                axios.get("http://localhost:8080/api/analytics/product-supplier-stats", { params }),
            ]);

            setMetrics({
                customerKPI: cKPI.data,
                supplierKPI: sKPI.data,
                topCustomers: topC.data,
                topSuppliers: topS.data,
                projectStatus: pStatus.data.data, // wrapped in data.data by controller
                poStatus: poStatus.data.data,
                recentInvoices: rInv.data,
                recentPOs: rPOs.data,
                productSupplierStats: prodSupStats.data,
            });
            setLoading(false);
        } catch (error) {
            console.error("Error fetching dashboard data", error);
            setLoading(false);
        }
    };

    if (loading) return <div className="p-4">Loading Dashboard...</div>;

    return (
        <div className="container-fluid p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="h3 font-weight-bold text-gray-800">
                    Supplier & Customer Dashboard
                </h2>
                <div className="d-flex align-items-center gap-2">
                    {/* Date Picker */}
                    <div className="d-flex align-items-center me-3 bg-white p-2 border rounded shadow-sm">
                        <span className="me-2 text-gray-600 small font-weight-bold">Period:</span>
                        <input
                            type="date"
                            className="form-control form-control-sm me-2"
                            value={dateRange.startDate}
                            onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        />
                        <span className="me-2">-</span>
                        <input
                            type="date"
                            className="form-control form-control-sm"
                            value={dateRange.endDate}
                            onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        />
                    </div>

                    <div>
                        <button
                            className={`btn me-2 ${activeTab === "customers" ? "btn-primary" : "btn-light"
                                }`}
                            onClick={() => setActiveTab("customers")}
                        >
                            Customers
                        </button>
                        <button
                            className={`btn ${activeTab === "suppliers" ? "btn-primary" : "btn-light"
                                }`}
                            onClick={() => setActiveTab("suppliers")}
                        >
                            Suppliers
                        </button>
                    </div>
                </div>
            </div>

            {activeTab === "customers"
                ? renderCustomerView(metrics)
                : renderSupplierView(metrics)}
        </div>
    );
};

/* ------------------- Customer View ------------------- */
const renderCustomerView = (metrics) => {
    return (
        <div className="animate-fade-in">
            {/* KPI Cards */}
            <div className="row mb-4">
                <div className="col-md-4">
                    <KPICard
                        title="Active Customers"
                        value={metrics.customerKPI.activeCustomers}
                        icon={<Users color="#4e73df" />}
                        color="primary"
                    />
                </div>
                <div className="col-md-4">
                    <KPICard
                        title="Total Revenue"
                        value={formatCurrency(metrics.customerKPI.totalRevenue)}
                        icon={<DollarSign color="#1cc88a" />}
                        color="success"
                    />
                </div>
                <div className="col-md-4">
                    <KPICard
                        title="Outstanding Payments"
                        value={formatCurrency(metrics.customerKPI.outstanding)}
                        icon={<Briefcase color="#e74a3b" />}
                        color="danger"
                    />
                </div>
            </div>

            {/* Charts Row */}
            <div className="row mb-4">
                <div className="col-lg-8 mb-4">
                    <div className="card shadow mb-4 h-100">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">
                                Top Customers by Revenue
                            </h6>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={metrics.topCustomers}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={150} interval={0} />
                                    <Tooltip formatter={(val) => formatCurrency(val)} />
                                    <Legend />
                                    <Bar dataKey="received" name="Received" stackId="a" fill="#1cc88a" />
                                    <Bar dataKey="outstanding" name="Outstanding" stackId="a" fill="#e74a3b" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4 mb-4">
                    <div className="card shadow mb-4 h-100">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">
                                Project Status Distribution
                            </h6>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={metrics.projectStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="count"
                                        label
                                    >
                                        {metrics.projectStatus.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Invoices Table */}
            <div className="card shadow mb-4">
                <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">Recent Invoices</h6>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-bordered" width="100%" cellSpacing="0">
                            <thead>
                                <tr>
                                    <th>Inv #</th>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.recentInvoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td>{inv.invoiceNumber}</td>
                                        <td>{inv.issuedDate}</td>
                                        <td>{formatCurrency(inv.totalAmount)}</td>
                                        <td>
                                            <span
                                                className={`badge bg-${inv.status === "PAID"
                                                    ? "success"
                                                    : inv.status === "PENDING"
                                                        ? "warning"
                                                        : "secondary"
                                                    }`}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {metrics.recentInvoices.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center">
                                            No recent invoices
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

/* ------------------- Supplier View ------------------- */
const renderSupplierView = (metrics) => {
    return (
        <div className="animate-fade-in">
            {/* KPI Cards */}
            <div className="row mb-4">
                <div className="col-md-4">
                    <KPICard
                        title="Active Suppliers"
                        value={metrics.supplierKPI.activeSuppliers}
                        icon={<Truck color="#4e73df" />}
                        color="info"
                    />
                </div>
                <div className="col-md-4">
                    <KPICard
                        title="Total Spend"
                        value={formatCurrency(metrics.supplierKPI.totalSpend)}
                        icon={<ShoppingCart color="#1cc88a" />}
                        color="success"
                    />
                </div>
                <div className="col-md-4">
                    <KPICard
                        title="Outstanding to Suppliers"
                        value={formatCurrency(metrics.supplierKPI.outstanding)}
                        icon={<DollarSign color="#e74a3b" />}
                        color="warning"
                    />
                </div>
            </div>

            {/* Charts Row */}
            <div className="row mb-4">
                <div className="col-lg-8 mb-4">
                    <div className="card shadow mb-4 h-100">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">
                                Top Suppliers by Spend
                            </h6>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart
                                    data={metrics.topSuppliers}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis type="category" dataKey="name" width={150} interval={0} />
                                    <Tooltip formatter={(val) => formatCurrency(val)} />
                                    <Legend />
                                    <Bar dataKey="paid" name="Paid" stackId="a" fill="#36b9cc" />
                                    <Bar dataKey="outstanding" name="Outstanding" stackId="a" fill="#f6c23e" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="col-lg-4 mb-4">
                    <div className="card shadow mb-4 h-100">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">
                                PO Status Distribution
                            </h6>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={metrics.poStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#82ca9d"
                                        paddingAngle={5}
                                        dataKey="count"
                                        label
                                    >
                                        {metrics.poStatus.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Product-wise Supplier Report */}
            <div className="card shadow mb-4">
                <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">Product-wise Supplier Report</h6>
                </div>
                <div className="card-body">
                    <div className="table-responsive" style={{ maxHeight: "300px", overflowY: "auto" }}>
                        <table className="table table-bordered table-sm" width="100%" cellSpacing="0">
                            <thead className="thead-light">
                                <tr>
                                    <th>Product</th>
                                    <th>Supplier</th>
                                    <th>Total Qty Supplied</th>
                                    <th>Total Spend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.productSupplierStats.map((stat, idx) => (
                                    <tr key={idx}>
                                        <td>{stat.product}</td>
                                        <td>{stat.supplier}</td>
                                        <td>{stat.totalQty}</td>
                                        <td>{formatCurrency(stat.totalSpend)}</td>
                                    </tr>
                                ))}
                                {metrics.productSupplierStats.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center">
                                            No data available
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Recent POs Table */}
            <div className="card shadow mb-4">
                <div className="card-header py-3">
                    <h6 className="m-0 font-weight-bold text-primary">Recent Purchase Orders</h6>
                </div>
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-bordered" width="100%" cellSpacing="0">
                            <thead>
                                <tr>
                                    <th>PO #</th>
                                    <th>Supplier</th>
                                    <th>Total</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {metrics.recentPOs.map((po) => (
                                    <tr key={po.id}>
                                        <td>{po.poNumber}</td>
                                        <td>{po.supplierNameSnapshot}</td>
                                        <td>{formatCurrency(po.grandTotal)}</td>
                                        <td>
                                            <span
                                                className={`badge bg-${po.status === "FINALIZED"
                                                    ? "success"
                                                    : po.status === "APPROVED"
                                                        ? "info"
                                                        : "secondary"
                                                    }`}
                                            >
                                                {String(po.status)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                                {metrics.recentPOs.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center">
                                            No recent POs
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, icon, color }) => {
    return (
        <div className={`card border-left-${color} shadow h-100 py-2`}>
            <div className="card-body">
                <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                        <div
                            className={`text-xs font-weight-bold text-${color} text-uppercase mb-1`}
                        >
                            {title}
                        </div>
                        <div className="h5 mb-0 font-weight-bold text-gray-800">
                            {value}
                        </div>
                    </div>
                    <div className="col-auto">
                        <div className={`text-${color}`}>{icon}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SupplierCustomerDashboard;
