import React, { useState, useEffect } from 'react';
import { Container, Table, Card, Badge, Form, Row, Col, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import api from '../../api/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

export default function IncomePage() {
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(false);

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
            const res = await api.get('/invoices');
            setInvoices(res.data || []);
        } catch (e) {
            console.error(e);
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
    const monthlyData = {};
    filteredInvoices.forEach(inv => {
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
    const totalIncome = filteredInvoices.reduce((acc, curr) => acc + (curr.totalAmount || 0), 0);
    const totalReceived = filteredInvoices.reduce((acc, curr) => acc + (curr.paidAmount || 0), 0);
    const totalPending = filteredInvoices
        .filter(i => i.status !== 'CANCELLED' && i.status !== 'PAID')
        .reduce((acc, curr) => acc + ((curr.totalAmount || 0) - (curr.paidAmount || 0)), 0);


    return (
        <Container fluid className="py-4">
            <h2 className="mb-4">Income Management</h2>

            {/* Summary Cards */}
            <Row className="mb-4 g-3">
                <Col md={4}>
                    <Card className="text-center shadow-sm border-0 bg-primary text-white h-100">
                        <Card.Body>
                            <h6>Total Invoiced</h6>
                            <h3>{totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="text-center shadow-sm border-0 bg-success text-white h-100">
                        <Card.Body>
                            <h6>Total Received</h6>
                            <h3>{totalReceived.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="text-center shadow-sm border-0 bg-warning text-dark h-100">
                        <Card.Body>
                            <h6>Outstanding</h6>
                            <h3>{totalPending.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h3>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            {/* Charts Section */}
            <Row className="mb-4 g-3">
                <Col md={8}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white fw-bold">Income Trend</Card.Header>
                        <Card.Body style={{ height: 300 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="month" />
                                    <YAxis />
                                    <Tooltip formatter={(val) => val.toLocaleString()} />
                                    <Legend />
                                    <Bar dataKey="amount" fill="#0088FE" name="Invoiced Amount" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Header className="bg-white fw-bold">Status Distribution</Card.Header>
                        <Card.Body style={{ height: 300 }}>
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
            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3">
                    <Row className="g-2 align-items-center">
                        <Col md={3}>
                            <InputGroup>
                                <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
                                <Form.Control
                                    placeholder="Search Project / Invoice..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </InputGroup>
                        </Col>
                        <Col md={3}>
                            <Form.Control
                                type="month"
                                value={filterMonth}
                                onChange={e => setFilterMonth(e.target.value)}
                                placeholder="Filter by Month"
                            />
                        </Col>
                        <Col md={3}>
                            <Form.Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="ALL">All Statuses</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING">Pending</option>
                                <option value="PARTIALLY_PAID">Partially Paid</option>
                                <option value="CANCELLED">Cancelled</option>
                            </Form.Select>
                        </Col>
                        <Col className="text-end">
                            <small className="text-muted">Showing {filteredInvoices.length} invoices</small>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table hover responsive striped className="mb-0 align-middle">
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
                                <tr><td colSpan="8" className="text-center py-4">Loading...</td></tr>
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
        </Container>
    );
}
