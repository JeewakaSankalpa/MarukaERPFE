import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Row, Col, Card, Badge, InputGroup } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    PieChart, Pie, Cell
} from 'recharts';
import api from '../../api/api';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF6666'];

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Filters
    const [filterCategory, setFilterCategory] = useState('ALL');
    const [filterMonth, setFilterMonth] = useState(''); // YYYY-MM
    const [searchTerm, setSearchTerm] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        title: '',
        category: 'OPERATIONAL',
        amount: '',
        expenseDate: new Date().toISOString().substring(0, 10),
        description: '',
        paymentMethod: 'CASH',
        reference: '',
        status: 'PAID'
    });

    useEffect(() => {
        loadExpenses();
    }, []);

    const loadExpenses = async () => {
        try {
            setLoading(true);
            const res = await api.get('/finance/expenses');
            setExpenses(res.data || []);
        } catch (e) {
            toast.error("Failed to load expenses");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!formData.title || !formData.amount) {
            toast.warn("Title and Amount are required");
            return;
        }
        try {
            await api.post('/finance/expenses', formData);
            toast.success("Expense saved");
            setShowModal(false);
            setFormData({
                title: '',
                category: 'OPERATIONAL',
                amount: '',
                expenseDate: new Date().toISOString().substring(0, 10),
                description: '',
                paymentMethod: 'CASH',
                reference: '',
                status: 'PAID'
            });
            loadExpenses();
        } catch (e) {
            toast.error("Failed to save expense");
        }
    };

    // --- Filter Logic ---
    const filteredExpenses = expenses.filter(exp => {
        const matchCategory = filterCategory === 'ALL' || exp.category === filterCategory;
        const matchSearch = (
            (exp.title && exp.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (exp.description && exp.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        let matchMonth = true;
        if (filterMonth) {
            const d = exp.expenseDate ? exp.expenseDate.substring(0, 7) : '';
            matchMonth = d === filterMonth;
        }
        return matchCategory && matchSearch && matchMonth;
    });

    // --- Chart Data ---
    // 1. Monthly Trend
    const monthlyData = {};
    filteredExpenses.forEach(exp => {
        const month = exp.expenseDate ? exp.expenseDate.substring(0, 7) : 'Unknown';
        if (!monthlyData[month]) monthlyData[month] = 0;
        monthlyData[month] += (exp.amount || 0);
    });
    const barChartData = Object.keys(monthlyData).sort().map(m => ({
        month: m,
        amount: monthlyData[m]
    }));

    // 2. Category Breakdown
    const catDataMap = {};
    filteredExpenses.forEach(exp => {
        const c = exp.category || 'Unknown';
        if (!catDataMap[c]) catDataMap[c] = 0;
        catDataMap[c] += (exp.amount || 0);
    });
    const pieChartData = Object.keys(catDataMap).map(c => ({
        name: c,
        value: catDataMap[c]
    }));

    const totalFiltered = filteredExpenses.reduce((acc, curr) => acc + (curr.amount || 0), 0);

    return (
        <Container fluid className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Expense Management</h2>
                <Button variant="primary" onClick={() => setShowModal(true)}>+ New Expense</Button>
            </div>

            {/* Charts */}
            <Row className="mb-4 g-3">
                <Col md={4}>
                    <Card className="shadow-sm border-0 border-start border-4 border-primary bg-white h-100">
                        <Card.Body className="d-flex flex-column justify-content-center text-center">
                            <h6 className="text-muted">Total Expenses (Filtered)</h6>
                            <h2 className="display-6 fw-bold text-primary">{totalFiltered.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={barChartData}>
                                    <Tooltip formatter={(val) => val.toLocaleString()} />
                                    <Bar dataKey="amount" fill="#8884d8" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
                <Col md={4}>
                    <Card className="shadow-sm border-0 h-100">
                        <Card.Body style={{ height: 200 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={pieChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} fill="#82ca9d" paddingAngle={5} dataKey="value">
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>

            <Card className="shadow-sm border-0">
                <Card.Header className="bg-white py-3">
                    <Row className="g-2 align-items-center">
                        <Col md={3}>
                            <InputGroup>
                                <InputGroup.Text><i className="bi bi-search"></i></InputGroup.Text>
                                <Form.Control
                                    placeholder="Search Title..."
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
                            <Form.Select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                                <option value="ALL">All Categories</option>
                                <option value="OPERATIONAL">Operational</option>
                                <option value="UTILITIES">Utilities</option>
                                <option value="RENT">Rent</option>
                                <option value="MAINTENANCE">Maintenance</option>
                                <option value="SUPPLIER_PAYMENT">Supplier Payment</option>
                                <option value="OTHER">Other</option>
                            </Form.Select>
                        </Col>
                        <Col className="text-end">
                            <small className="text-muted">{filteredExpenses.length} records</small>
                        </Col>
                    </Row>
                </Card.Header>
                <Card.Body className="p-0">
                    <Table hover responsive striped className="mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4">Date</th>
                                <th>Category</th>
                                <th>Title / Description</th>
                                <th className="text-end">Amount</th>
                                <th>Status</th>
                                <th>Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredExpenses.length === 0 ? (
                                <tr><td colSpan="6" className="text-center text-muted">No expenses recorded.</td></tr>
                            ) : (
                                filteredExpenses.map(e => (
                                    <tr key={e.id}>
                                        <td className="ps-4">{e.expenseDate}</td>
                                        <td>
                                            {e.category === 'SUPPLIER_PAYMENT' ? (
                                                <Badge bg="warning" text="dark">Supplier Payment</Badge>
                                            ) : (
                                                <Badge bg="secondary">{e.category}</Badge>
                                            )}
                                        </td>
                                        <td>
                                            {/* Link to GRN if available */}
                                            {e.category === 'SUPPLIER_PAYMENT' && e.projectId ? (
                                                <Link to={`/grn?poId=${e.projectId}`} className="text-decoration-none fw-bold text-dark">
                                                    {e.title} <i className="bi bi-box-arrow-up-right ms-1 small text-primary"></i>
                                                </Link>
                                            ) : (
                                                <span className="fw-medium">{e.title}</span>
                                            )}
                                        </td>
                                        <td className="text-end">{e.amount?.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td>{e.status}</td>
                                        <td>{e.paymentMethod}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Create Modal */}
            <Modal show={showModal} onHide={() => setShowModal(false)} size="lg" centered>
                <Modal.Header closeButton><Modal.Title>Record New Expense</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Row className="g-3">
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Title *</Form.Label>
                                <Form.Control value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Category</Form.Label>
                                <Form.Select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                                    <option value="OPERATIONAL">Operational</option>
                                    <option value="UTILITIES">Utilities</option>
                                    <option value="RENT">Rent</option>
                                    <option value="MAINTENANCE">Maintenance</option>
                                    <option value="OTHER">Other</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Amount *</Form.Label>
                                <Form.Control type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Date</Form.Label>
                                <Form.Control type="date" value={formData.expenseDate} onChange={e => setFormData({ ...formData, expenseDate: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Payment Method</Form.Label>
                                <Form.Select value={formData.paymentMethod} onChange={e => setFormData({ ...formData, paymentMethod: e.target.value })}>
                                    <option value="CASH">Cash</option>
                                    <option value="BANK_TRANSFER">Bank Transfer</option>
                                    <option value="CHEQUE">Cheque</option>
                                    <option value="CARD">Card</option>
                                </Form.Select>
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group>
                                <Form.Label>Reference / Cheque No</Form.Label>
                                <Form.Control value={formData.reference} onChange={e => setFormData({ ...formData, reference: e.target.value })} />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group>
                                <Form.Label>Description</Form.Label>
                                <Form.Control as="textarea" rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                            </Form.Group>
                        </Col>
                    </Row>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSave}>Save Expense</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
