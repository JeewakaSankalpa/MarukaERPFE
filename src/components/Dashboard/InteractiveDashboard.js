import React, { useEffect, useState } from 'react';
import { Row, Col, Card } from 'react-bootstrap';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Legend, PieChart, Pie, Cell
} from 'recharts';
import { FaUsers, FaUserCheck, FaClock, FaExclamationTriangle } from 'react-icons/fa';
import api from '../../api/api';
import LoadingState from '../ReusableComponents/LoadingState';
import PageLayout from '../ReusableComponents/PageLayout';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const InteractiveDashboard = () => {
    const [salesData, setSalesData] = useState([]);
    const [expenseData, setExpenseData] = useState([]);
    const [projectStatus, setProjectStatus] = useState([]);
    const [hrStats, setHrStats] = useState({ totalEmployees: 0, presentToday: 0, absentToday: 0, pendingLeaves: 0 });
    const [opsStats, setOpsStats] = useState({ overdueProjects: 0, pendingApprovals: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadAnalytics = async () => {
            try {
                // Fetch mock data from our new controller
                try {
                    const [salesRes, expenseRes, projectRes, hrRes, opsRes] = await Promise.all([
                        api.get('/analytics/sales-trend'),
                        api.get('/analytics/expense-breakdown'),
                        api.get('/analytics/project-status'),
                        api.get('/analytics/hr-stats'),
                        api.get('/analytics/ops-stats')
                    ]);
                    setSalesData(salesRes.data.data || []);
                    setExpenseData(expenseRes.data.data || []);
                    setProjectStatus(projectRes.data.data || []);
                    setHrStats(hrRes.data || { totalEmployees: 0, presentToday: 0, absentToday: 0, pendingLeaves: 0 });
                    setOpsStats(opsRes.data || { overdueProjects: 0, pendingApprovals: 0 });
                } catch (innerError) {
                    console.warn("Backend analytics endpoints might be missing, using fallback data.");
                    // Fallback Mock
                    setSalesData([
                        { month: 'Jan', sales: 4000, expenses: 2400 },
                        { month: 'May', sales: 1890, expenses: 4800 },
                    ]);
                    setExpenseData([
                        { name: "Payroll", value: 400000 },
                    ]);
                    setProjectStatus([
                        { name: "Planning", count: 5 },
                        { name: "Completed", count: 8 }
                    ]);
                    setHrStats({ totalEmployees: 50, presentToday: 45, absentToday: 5, pendingLeaves: 3 });
                    setOpsStats({ overdueProjects: 2, pendingApprovals: 12 });
                }
            } catch (e) {
                console.error("Dashboard Load Error", e);
            } finally {
                setLoading(false);
            }
        };

        loadAnalytics();
    }, []);

    if (loading) return <LoadingState fullScreen />;

    return (
        <PageLayout title="Executive Dashboard" breadcrumbs={[{ label: 'Home', href: '/dashboard' }]}>

            {/* KPI Cards */}
            <Row className="g-3 mb-4">
                <Col md={3}>
                    <StatCard
                        title="Workforce"
                        value={`${hrStats.presentToday} / ${hrStats.totalEmployees}`}
                        subtitle="Present Today"
                        icon={<FaUserCheck />}
                        color="success"
                    />
                </Col>
                <Col md={3}>
                    <StatCard
                        title="Leave Requests"
                        value={hrStats.pendingLeaves}
                        subtitle="Pending Approval"
                        icon={<FaClock />}
                        color="warning"
                    />
                </Col>
                <Col md={3}>
                    <StatCard
                        title="Projects Overdue"
                        value={opsStats.overdueProjects}
                        subtitle="Needs Attention"
                        icon={<FaExclamationTriangle />}
                        color="danger"
                    />
                </Col>
                <Col md={3}>
                    <StatCard
                        title="Pending Approvals"
                        value={opsStats.pendingApprovals}
                        subtitle="Across all projects"
                        icon={<FaUsers />}
                        color="primary"
                    />
                </Col>
            </Row>

            <Row className="g-4 mb-4">
                {/* Sales vs Expenses Trend */}
                <Col lg={8}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white fw-bold">Financial Performance (YTD)</Card.Header>
                        <Card.Body style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={salesData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#82ca9d" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#82ca9d" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <Tooltip />
                                    <Area type="monotone" dataKey="sales" stroke="#8884d8" fillOpacity={1} fill="url(#colorSales)" />
                                    <Area type="monotone" dataKey="expenses" stroke="#82ca9d" fillOpacity={1} fill="url(#colorExpenses)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Project Status Distribution */}
                <Col lg={4}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white fw-bold">Project Heatmap</Card.Header>
                        <Card.Body style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={projectStatus}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="count"
                                    >
                                        {projectStatus.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Row className="g-4">
                {/* Expense Breakdown */}
                <Col lg={6}>
                    <Card className="shadow-sm border-0">
                        <Card.Header className="bg-white fw-bold">Expense Breakdown</Card.Header>
                        <Card.Body style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={expenseData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis type="number" />
                                    <YAxis dataKey="name" type="category" width={100} />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="value" fill="#8884d8" name="Amount (LKR)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>

                {/* Recent Activity (Placeholder for now, could be dynamic later) */}
                <Col lg={6}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white fw-bold">Recent System Activity</Card.Header>
                        <Card.Body>
                            <ul className="list-group list-group-flush">
                                <li className="list-group-item d-flex justify-content-between align-items-center">
                                    <span>User <strong>Alice</strong> checked in</span>
                                    <span className="badge bg-light text-dark">2m ago</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center">
                                    <span>New Project <strong>Skyline Tower</strong> created</span>
                                    <span className="badge bg-light text-dark">1h ago</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center">
                                    <span>Leave request by <strong>Bob</strong></span>
                                    <span className="badge bg-warning text-dark">3h ago</span>
                                </li>
                            </ul>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </PageLayout>
    );
};

const StatCard = ({ title, value, subtitle, icon, color }) => (
    <Card className={`border-0 shadow-sm border-start border-4 border-${color} h-100`}>
        <Card.Body className="d-flex align-items-center">
            <div className={`display-6 text-${color} me-3`}>{icon}</div>
            <div>
                <h6 className="text-muted mb-1">{title}</h6>
                <h4 className="fw-bold mb-0">{value}</h4>
                <small className="text-secondary">{subtitle}</small>
            </div>
        </Card.Body>
    </Card>
);

export default InteractiveDashboard;
