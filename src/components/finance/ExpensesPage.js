import React, { useState, useEffect } from 'react';
import { Container, Button, Table, Modal, Form, Row, Col, Card } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api/api';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);

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

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Expense Management</h2>
                <Button variant="primary" onClick={() => setShowModal(true)}>+ New Expense</Button>
            </div>

            <Card className="shadow-sm">
                <Card.Body>
                    <Table hover responsive striped>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Category</th>
                                <th>Title</th>
                                <th className="text-end">Amount</th>
                                <th>Status</th>
                                <th>Method</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenses.length === 0 ? (
                                <tr><td colSpan="6" className="text-center text-muted">No expenses recorded.</td></tr>
                            ) : (
                                expenses.map(e => (
                                    <tr key={e.id}>
                                        <td>{e.expenseDate}</td>
                                        <td>{e.category}</td>
                                        <td>{e.title}</td>
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
