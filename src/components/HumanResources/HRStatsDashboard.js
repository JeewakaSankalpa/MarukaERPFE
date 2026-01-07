import React, { useEffect, useState } from "react";
import api from "../../api/api";
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
import { Users, UserCheck, UserMinus, Clock, Briefcase } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"];

const HRStatsDashboard = () => {
    const [stats, setStats] = useState({
        totalEmployees: 0,
        presentToday: 0,
        absentToday: 0,
        pendingLeaves: 0,
    });
    const [attendanceTrend, setAttendanceTrend] = useState([]);
    const [roleDistribution, setRoleDistribution] = useState([]);
    const [hierarchy, setHierarchy] = useState([]);
    const [loading, setLoading] = useState(true);

    const [trendFilter, setTrendFilter] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
    });

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        fetchTrendData();
    }, [trendFilter]);

    const fetchDashboardData = async () => {
        try {
            const [hrStatsRes, roleRes, hierarchyRes] = await Promise.all([
                api.get("/analytics/hr-stats"),
                api.get("/analytics/role-distribution"),
                api.get("/analytics/org-hierarchy"),
            ]);

            setStats(hrStatsRes.data);
            setRoleDistribution(roleRes.data);
            setHierarchy(hierarchyRes.data);
            setLoading(false);
        } catch (error) {
            console.error("Error fetching HR Dashboard data", error);
            setLoading(false);
        }
    };

    const fetchTrendData = async () => {
        try {
            const res = await api.get("/analytics/attendance-trend", {
                params: { month: trendFilter.month, year: trendFilter.year },
            });
            setAttendanceTrend(res.data);
        } catch (error) {
            console.error("Error fetching attendance trend", error);
        }
    };

    const handleFilterChange = (e) => {
        setTrendFilter({ ...trendFilter, [e.target.name]: parseInt(e.target.value) });
    };

    if (loading) return <div className="p-4">Loading HR Analytics...</div>;

    return (
        <div className="container-fluid p-4">
            <h2 className="h3 mb-4 text-gray-800 font-weight-bold">HR Statistics Dashboard</h2>

            {/* Top Cards */}
            <div className="row mb-4">
                <div className="col-xl-3 col-md-6 mb-4">
                    <KPICard title="Total Employees" value={stats.totalEmployees} icon={<Users color="#4e73df" />} color="primary" />
                </div>
                <div className="col-xl-3 col-md-6 mb-4">
                    <KPICard title="Present Today" value={stats.presentToday} icon={<UserCheck color="#1cc88a" />} color="success" />
                </div>
                <div className="col-xl-3 col-md-6 mb-4">
                    <KPICard title="Absent Today" value={stats.absentToday} icon={<UserMinus color="#e74a3b" />} color="danger" />
                </div>
                <div className="col-xl-3 col-md-6 mb-4">
                    <KPICard title="Pending Leaves" value={stats.pendingLeaves} icon={<Clock color="#f6c23e" />} color="warning" />
                </div>
            </div>

            {/* Charts Row */}
            <div className="row mb-4">
                {/* Attendance Trend */}
                <div className="col-lg-8 mb-4">
                    <div className="card shadow mb-4 h-100">
                        <div className="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                            <h6 className="m-0 font-weight-bold text-primary">Attendance Trends</h6>
                            <div className="d-flex gap-2">
                                <select name="month" className="form-select form-select-sm" value={trendFilter.month} onChange={handleFilterChange}>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'short' })}</option>
                                    ))}
                                </select>
                                <select name="year" className="form-select form-select-sm" value={trendFilter.year} onChange={handleFilterChange}>
                                    {[2024, 2025, 2026].map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={320}>
                                <BarChart data={attendanceTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" label={{ value: 'Day', position: 'insideBottom', offset: -5 }} />
                                    <YAxis allowDecimals={false} />
                                    <Tooltip />
                                    <Bar dataKey="count" fill="#4e73df" name="Employees Present" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Role Distribution */}
                <div className="col-lg-4 mb-4">
                    <div className="card shadow mb-4 h-100">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Employee Roles</h6>
                        </div>
                        <div className="card-body">
                            <ResponsiveContainer width="100%" height={300}>
                                <PieChart>
                                    <Pie
                                        data={roleDistribution}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        label
                                    >
                                        {roleDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            </div>

            {/* Hierarchy & Pending Leaves Row */}
            <div className="row">
                {/* Organization Hierarchy */}
                <div className="col-lg-6 mb-4">
                    <div className="card shadow mb-4 h-100">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Organization Hierarchy</h6>
                        </div>
                        <div className="card-body" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                            {hierarchy.length > 0 ? (
                                <ul className="list-group list-group-flush">
                                    {hierarchy.map(node => <HierarchyNode key={node.id} node={node} level={0} />)}
                                </ul>
                            ) : (
                                <p className="text-muted text-center mt-4">No hierarchy data available.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Pending Leaves List (Placeholder for now, could be a real list) */}
                <div className="col-lg-6 mb-4">
                    <div className="card shadow mb-4 h-100">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Pending Leaves for Approval</h6>
                        </div>
                        <div className="card-body text-center py-5">
                            <div className="mb-3">
                                <Clock size={48} className="text-warning" />
                            </div>
                            <h4>{stats.pendingLeaves} requests pending</h4>
                            <p className="text-muted">Navigate to Leave Management to review.</p>
                            <a href="/leave" className="btn btn-primary btn-sm">Go to Approvals</a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Recursive Component for Hierarchy
const HierarchyNode = ({ node, level }) => {
    const [expanded, setExpanded] = useState(true);
    const hasChildren = node.children && node.children.length > 0;

    return (
        <li className="list-group-item border-0 p-1">
            <div className="d-flex align-items-center" style={{ marginLeft: `${level * 20}px` }}>
                {hasChildren && (
                    <span
                        className="me-2 cursor-pointer text-muted"
                        style={{ cursor: 'pointer', width: '20px' }}
                        onClick={() => setExpanded(!expanded)}
                    >
                        {expanded ? '▼' : '▶'}
                    </span>
                )}
                {!hasChildren && <span style={{ width: '28px' }}></span>}

                <div className="d-flex align-items-center p-2 rounded hover-bg-light flex-grow-1 border">
                    {node.profileImage ? (
                        <img src={node.profileImage} alt="" className="rounded-circle me-2" width="30" height="30" />
                    ) : (
                        <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2" style={{ width: 30, height: 30, fontSize: 12 }}>
                            {node.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <div className="fw-bold small">{node.name}</div>
                        <div className="text-muted x-small" style={{ fontSize: '0.8em' }}>{node.designation || node.role}</div>
                    </div>
                </div>
            </div>
            {hasChildren && expanded && (
                <ul className="list-group list-group-flush border-0 mt-1">
                    {node.children.map(child => (
                        <HierarchyNode key={child.id} node={child} level={level + 1} />
                    ))}
                </ul>
            )}
        </li>
    );
};

const KPICard = ({ title, value, icon, color }) => {
    return (
        <div className={`card border-start border-${color} shadow h-100 py-2 border-3`}>
            <div className="card-body">
                <div className="row no-gutters align-items-center">
                    <div className="col mr-2">
                        <div className={`text-xs font-weight-bold text-${color} text-uppercase mb-1`}>
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

export default HRStatsDashboard;
