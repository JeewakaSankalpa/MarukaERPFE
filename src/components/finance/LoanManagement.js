import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Badge, Row, Col, Card } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';

export default function LoanManagement() {
    const [loans, setLoans] = useState([]);
    const [showAdd, setShowAdd] = useState(false);
    const [showRepay, setShowRepay] = useState(false);

    // New Loan Form
    const [newLoan, setNewLoan] = useState({
        bankName: '',
        loanReference: '',
        principalAmount: '',
        interestRate: '',
        durationMonths: 12,
        startDate: new Date().toISOString().split('T')[0],
        monthlyInstallment: ''
    });

    // Repayment Form
    const [selectedLoan, setSelectedLoan] = useState(null);
    const [repayment, setRepayment] = useState({
        amount: '',
        date: new Date().toISOString().split('T')[0],
        reference: ''
    });

    useEffect(() => { loadLoans(); }, []);

    const loadLoans = async () => {
        try {
            const res = await api.get('/finance/loans');
            setLoans(res.data);
        } catch (e) { toast.error("Failed to load loans"); }
    };

    const handleCreate = async () => {
        try {
            await api.post('/finance/loans', newLoan);
            toast.success("Loan Added");
            setShowAdd(false);
            loadLoans();
        } catch (e) { toast.error("Failed to add loan"); }
    };

    const handleRepay = async () => {
        if (!selectedLoan) return;
        try {
            await api.post(`/finance/loans/${selectedLoan.id}/repay`, repayment);
            toast.success("Repayment Added");
            setShowRepay(false);
            loadLoans();
        } catch (e) { toast.error("Failed to add repayment"); }
    };

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between mb-4">
                <h2>Loan Management</h2>
                <Button onClick={() => setShowAdd(true)}>+ Add New Loan</Button>
            </div>

            <Row>
                {loans.map(loan => (
                    <Col md={6} lg={4} key={loan.id} className="mb-4">
                        <Card className="shadow-sm border-0 h-100">
                            <Card.Header className="bg-white d-flex justify-content-between align-items-center">
                                <strong>{loan.bankName}</strong>
                                <Badge bg={loan.status === 'CLOSED' ? 'success' : 'primary'}>{loan.status}</Badge>
                            </Card.Header>
                            <Card.Body>
                                <div className="mb-2 text-muted small">Ref: {loan.loanReference}</div>
                                <h4 className="text-primary">{loan.outstandingBalance?.toLocaleString(undefined, { style: 'currency', currency: 'LKR' })}</h4>
                                <div className="small text-muted mb-3">Outstanding Balance</div>

                                <Row className="g-2 text-small small mb-3">
                                    <Col xs={6}>Principal: {loan.principalAmount?.toLocaleString()}</Col>
                                    <Col xs={6}>Paid: {loan.totalRepaid?.toLocaleString()}</Col>
                                    <Col xs={6}>Rate: {loan.interestRate}%</Col>
                                    <Col xs={6}>Term: {loan.durationMonths}m</Col>
                                </Row>

                                <Button size="sm" variant="outline-success" className="w-100"
                                    disabled={loan.status === 'CLOSED'}
                                    onClick={() => { setSelectedLoan(loan); setShowRepay(true); }}>
                                    Record Repayment
                                </Button>
                            </Card.Body>
                            {/* Simple History Expansion could be added here */}
                        </Card>
                    </Col>
                ))}
            </Row>

            {/* Add Loan Modal */}
            <Modal show={showAdd} onHide={() => setShowAdd(false)}>
                <Modal.Header closeButton><Modal.Title>Add New Loan</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-2">
                            <Form.Label>Bank / Lender Name</Form.Label>
                            <Form.Control value={newLoan.bankName} onChange={e => setNewLoan({ ...newLoan, bankName: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Loan Reference No.</Form.Label>
                            <Form.Control value={newLoan.loanReference} onChange={e => setNewLoan({ ...newLoan, loanReference: e.target.value })} />
                        </Form.Group>
                        <Row>
                            <Col>
                                <Form.Group className="mb-2">
                                    <Form.Label>Principal Amount</Form.Label>
                                    <Form.Control type="number" value={newLoan.principalAmount} onChange={e => setNewLoan({ ...newLoan, principalAmount: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-2">
                                    <Form.Label>Interest Rate (%)</Form.Label>
                                    <Form.Control type="number" value={newLoan.interestRate} onChange={e => setNewLoan({ ...newLoan, interestRate: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <Row>
                            <Col>
                                <Form.Group className="mb-2">
                                    <Form.Label>Start Date</Form.Label>
                                    <Form.Control type="date" value={newLoan.startDate} onChange={e => setNewLoan({ ...newLoan, startDate: e.target.value })} />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-2">
                                    <Form.Label>Duration (Months)</Form.Label>
                                    <Form.Control type="number" value={newLoan.durationMonths} onChange={e => setNewLoan({ ...newLoan, durationMonths: e.target.value })} />
                                </Form.Group>
                            </Col>
                        </Row>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAdd(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleCreate}>Create Loan Account</Button>
                </Modal.Footer>
            </Modal>

            {/* Repayment Modal */}
            <Modal show={showRepay} onHide={() => setShowRepay(false)}>
                <Modal.Header closeButton><Modal.Title>Record Repayment - {selectedLoan?.bankName}</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-2">
                            <Form.Label>Repayment Amount</Form.Label>
                            <Form.Control type="number" value={repayment.amount} onChange={e => setRepayment({ ...repayment, amount: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Date Paid</Form.Label>
                            <Form.Control type="date" value={repayment.date} onChange={e => setRepayment({ ...repayment, date: e.target.value })} />
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Reference / Confirmation</Form.Label>
                            <Form.Control value={repayment.reference} onChange={e => setRepayment({ ...repayment, reference: e.target.value })} />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRepay(false)}>Cancel</Button>
                    <Button variant="success" onClick={handleRepay}>Save Repayment</Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
}
