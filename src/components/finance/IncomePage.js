import { ArrowLeft, FileCheck2, Info, RefreshCw, Search, WalletCards } from 'lucide-react';
import React, { useState, useEffect } from 'react';
import { Table, Card, Badge, Form, Row, Col, InputGroup, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useNavigate,  Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    PieChart, Pie, Cell
} from 'recharts';
import ResponsiveContainer from "../ReusableComponents/SafeResponsiveContainer";
import api from '../../api/api';
import SafeSelect from '../ReusableComponents/SafeSelect';
import './IncomePage.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

export default function IncomePage() {
    const navigate = useNavigate();
    const [invoices, setInvoices] = useState([]);
    const [projectReceivables, setProjectReceivables] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');

    // Filters
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [filterMonth, setFilterMonth] = useState(''); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        loadInvoices();
    }, []);

    const loadInvoices = async () => {
        try {
            setLoading(true);
            setLoadError('');
            const [invoiceRes, receivableRes] = await Promise.all([
                api.get('/invoices'),
                api.get('/projects/receivables')
            ]);
            setInvoices(invoiceRes.data || []);
            setProjectReceivables(receivableRes.data || []);
        } catch (e) {
            console.error(e);
            setLoadError('Income records could not be loaded. Check the connection and try again.');
            toast.error("Failed to load income data");
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'PAID': return <Badge bg="success">PAID</Badge>;
            case 'PENDING': return <Badge bg="warning" text="dark">PENDING</Badge>;
            case 'PARTIALLY_PAID': return <Badge bg="info">PARTIAL</Badge>;
            case 'CANCELLATION_PENDING': return <Badge bg="warning" text="dark">CANCELLATION PENDING</Badge>;
            case 'CANCELLED': return <Badge bg="danger">CANCELLED</Badge>;
            default: return <Badge bg="secondary">{status}</Badge>;
        }
    };

    // --- Filter Logic ---
    const filteredInvoices = invoices.filter(inv => {
        const matchStatus = filterStatus === 'ALL' || inv.status === filterStatus;
        const matchSearch = (
            (inv.invoiceNumber && inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (inv.projectId && inv.projectId.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        let matchMonth = true;
        if (filterMonth) {
            // Check issuedDate or dueDate. Let's use issuedDate for income realization.
            const d = inv.issuedDate ? inv.issuedDate.substring(0, 7) : '';
            matchMonth = d === filterMonth;
        }
        return matchStatus && matchSearch && matchMonth;
    });

    // --- Chart Data Preparation ---
    // 1. Monthly Trend (Last 6 months from data or current) based on filtered view? 
    // Usually charts show aggregation. Let's aggregate based on filteredInvoices to respect range.
    const activeFinancialInvoices = filteredInvoices.filter(inv => inv.status !== 'CANCELLED');
    const monthlyData = {};
    activeFinancialInvoices.forEach(inv => {
        const month = inv.issuedDate ? inv.issuedDate.substring(0, 7) : 'Unknown';
        if (!monthlyData[month]) monthlyData[month] = 0;
        monthlyData[month] += (inv.totalAmount || 0);
    });
    const barChartData = Object.keys(monthlyData).sort().map(m => ({
        month: m,
        amount: monthlyData[m]
    }));

    // 2. Status Distribution
    const statusDataMap = {};
    filteredInvoices.forEach(inv => {
        const s = inv.status || 'Unknown';
        if (!statusDataMap[s]) statusDataMap[s] = 0;
        statusDataMap[s]++;
    });
    const pieChartData = Object.keys(statusDataMap).map(s => ({
        name: s,
        value: statusDataMap[s]
    }));

    // --- Totals ---
    const totalIncome = activeFinancialInvoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const totalReceived = activeFinancialInvoices.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
    const projectPaymentsReceived = projectReceivables.reduce(
        (acc, project) => acc + (Number(project.totalReceived) || 0), 0
    );
    const totalPending = activeFinancialInvoices
        .filter(i => i.status !== 'PAID')
        .reduce((acc, curr) => acc + ((curr.totalAmount || 0) - (curr.paidAmount || 0)), 0);


    return (
        <main className="income-page" aria-labelledby="income-heading" aria-busy={loading}>
            <header className="income-header">
                <div className="income-heading-group">
                    <button type="button" className="income-back" onClick={() => navigate(-1)} aria-label="Back to previous page"><ArrowLeft size={19} aria-hidden="true" /></button>
                    <div><span className="income-eyebrow">Sales &amp; Finance</span><h1 id="income-heading">Income and receivables</h1><p>Review invoiced revenue, allocated receipts, unallocated project payments, and outstanding balances.</p></div>
                </div>
                <Button type="button" variant="outline-primary" className="income-refresh" onClick={loadInvoices} disabled={loading}><RefreshCw size={16} aria-hidden="true" />{loading ? 'Refreshing…' : 'Refresh income'}</Button>
            </header>

            {loadError && <div className="income-error" role="alert"><div><strong>Unable to load income records</strong><span>{loadError}</span></div><Button type="button" size="sm" variant="outline-danger" onClick={loadInvoices}>Try again</Button></div>}
{/* Summary Cards */}
            <Row className="income-summary-grid g-3">
                <Col md={3}>
                    <Card className="income-summary income-summary--invoiced">
                        <Card.Body>
                            <h2>Total invoiced</h2>
                            <strong>{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                            <small>Invoice amounts</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="income-summary income-summary--received">
                        <Card.Body>
                            <h2><FileCheck2 size={15} aria-hidden="true" />Invoice payments</h2>
                            <strong>{totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                            <small>Allocated to invoices</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="income-summary income-summary--project">
                        <Card.Body>
                            <h2><WalletCards size={15} aria-hidden="true" />Project payments</h2>
                            <strong>{projectPaymentsReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                            <small>Received for projects, not invoices</small>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={3}>
                    <Card className="income-summary income-summary--outstanding">
                        <Card.Body>
                            <h2>Outstanding</h2>
                            <strong>{totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                            <small>Invoice balances only</small>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="income-guidance" aria-label="Income totals explanation">
                <Card.Body className="d-flex align-items-start gap-3 py-3">
                    <Info className="text-primary flex-shrink-0 mt-1" size={20} aria-hidden="true" />
                    <div>
                            <strong>How to read these totals</strong>
                        <div>
                            Invoice Payments are linked to a specific invoice. Project Payments are receipts recorded
                            in Project Finance and remain unallocated until someone assigns them to an invoice.
                            They are shown separately so the same payment is not counted twice.
                        </div>
                    </div>
                </Card.Body>
            </Card>

            {/* Charts Section */}
            <Row className="income-visual-grid g-3">
                <Col md={8}>
                    <Card className="income-chart-card">
                        <Card.Header><div><span>Period movement</span><strong>Invoiced income trend</strong></div><small>Filtered invoice value by issue month</small></Card.Header>
                        <Card.Body className="income-chart-body" role="img" aria-label="Bar chart of invoiced income by month">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(val) => val.toLocaleString()} />
                                    <Legend />
                                    <Bar dataKey="amount" fill="#1769aa" name="Invoiced Amount" isAnimationActive={false} />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="income-chart-card">
                        <Card.Header><div><span>Invoice mix</span><strong>Status distribution</strong></div><small>Count of filtered invoices by status</small></Card.Header>
                        <Card.Body className="income-chart-body" role="img" aria-label="Donut chart of invoice counts by status">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        paddingAngle={5}
                                        dataKey="value"
                                        isAnimationActive={false}
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Invoices List */}
            <Card className="income-register">
                <Card.Header>
                    <div className="income-register-heading"><div><span>Invoice register</span><strong>Income records</strong></div><small>Showing {filteredInvoices.length} of {invoices.length} invoices</small></div>
                    <Row className="g-2 income-filters">
                        <Col md={3}>
                            <InputGroup>
                                <InputGroup.Text><Search size={15} aria-hidden="true" /></InputGroup.Text>
                                <Form.Control
                                    aria-label="Search invoices by project or invoice number"
                                    placeholder="Search Project / Invoice..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={3}>
                            <Form.Control
                                aria-label="Filter invoices by issue month"
                                type="month"
                                value={filterMonth}
                                onChange={e => setFilterMonth(e.target.value)}
                                placeholder="Filter by Month"
                            />
                        </Col>
                        <Col md={3}>
                            <SafeSelect aria-label="Filter invoices by status" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="ALL">All Statuses</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="PARTIALLY_PAID">Partially Paid</option>
                                <option value="CANCELLATION_PENDING">Cancellation Pending</option>
                                <option value="CANCELLED">Cancelled</option>
                            </SafeSelect>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body className="p-0 income-table-scroll" role="region" aria-label="Income invoice table" tabIndex="0">
                    <Table hover className="mb-0 align-middle">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4">Invoice #</th>
                                <th>Project ID</th>
                                <th>Issued Date</th>
                                <th>Due Date</th>
                                <th className="text-end">Amount</th>
                                <th className="text-end">Paid</th>
                                <th className="text-end">Balance</th>
                                <th className="text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="8" className="income-loading"><span className="income-loading-line" /><span className="income-loading-line" /><span className="income-loading-line" /><span className="visually-hidden">Loading income records</span></td></tr>
                            ) : filteredInvoices.length === 0 ? (
                                <tr><td colSpan="8" className="text-center py-4 text-muted">No invoices found.</td></tr>
                            ) : (
                                filteredInvoices.map(inv => {
                                    const balance = (inv.totalAmount || 0) - (inv.paidAmount || 0);
                                    return (
                                        <tr key={inv.id}>
                                            <td className="ps-4 fw-bold">{inv.invoiceNumber}</td>
                                            <td>
                                                <Link to={`/projects/manage/${inv.projectId}`} className="text-decoration-none fw-bold">
                                                    {inv.projectId}
                                                </Link>
                                            </td>
                                            <td>{inv.issuedDate}</td>
                                            <td>{inv.dueDate}</td>
                                            <td className="text-end">{inv.totalAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-end text-success">{inv.paidAmount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            <td className="text-end fw-bold">{balance > 0 ? balance.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}</td>
                                            <td className="text-center">{getStatusBadge(inv.status)}</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
        </main>
    );
}
