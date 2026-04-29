import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Modal, Form, Badge, Row, Col, Card, Alert } from 'react-bootstrap';
import api from '../../api/api';
import { toast } from 'react-toastify';
import PaymentAccountPicker from '../ReusableComponents/PaymentAccountPicker';
import OverdraftConfirmModal from '../ReusableComponents/OverdraftConfirmModal';
import SafeDatePicker from '../ReusableComponents/SafeDatePicker';

export default function LoanManagement() {
    const navigate = useNavigate();
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
        reference: '',
        paymentAccountId: '',
        paymentAccountName: '',
        paymentAccountType: ''
    });

    const [showOverdraftModal, setShowOverdraftModal] = useState(false);
    const [accountBalance, setAccountBalance] = useState(null);

    useEffect(() => { loadLoans(); }, []);

    useEffect(() => {
        if (repayment.paymentAccountId) {
            api.get(`/finance/accounts/${repayment.paymentAccountId}`)
                .then(res => setAccountBalance(Number(res.data.balance) || 0))
                .catch(() => setAccountBalance(null));
        } else {
            setAccountBalance(null);
        }
    }, [repayment.paymentAccountId]);

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
        if (!repayment.paymentAccountId) { toast.warn('Please select a payment account'); return; }
        if (!repayment.paymentMethod) { toast.warn('Please explicitly select a Payment Method (e.g. Card, Cash)'); return; }
        const maxRepay = Number(selectedLoan.outstandingBalance) || 0;
        if (Number(repayment.amount) > maxRepay) {
            toast.error(`Repayment cannot exceed outstanding balance: Rs. ${maxRepay.toFixed(2)}`);
            return;
        }
        // Check overdraft
        if (accountBalance !== null && Number(repayment.amount) > accountBalance) {
            setShowOverdraftModal(true);
            return;
        }
        await submitRepay(false);
    };

    const submitRepay = async (allowOverdraft = false) => {
        try {
            await api.post(`/finance/loans/${selectedLoan.id}/repay`, { ...repayment, allowOverdraft });
            toast.success("Repayment Added");
            setShowRepay(false);
            loadLoans();
        } catch (e) { toast.error("Failed to add repayment"); }
    };

    return (
        <>
        <Container className="py-4">
            <div className="d-flex justify-content-between mb-4">
                <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h2 className="mb-0">Loan Management</h2>
                        </div>
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
                                    <SafeDatePicker name="startDate" value={newLoan.startDate} onChange={e => setNewLoan({ ...newLoan, startDate: e.target.value })} />
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
                        <div className="mb-3">
                            <PaymentAccountPicker
                                required
                                value={repayment.paymentAccountId}
                                onChange={info => setRepayment({ ...repayment, ...info })}
                            />
                        </div>
                        <Form.Group className="mb-2">
                            <Form.Label>Repayment Amount <small className="text-muted">(max: Rs. {(Number(selectedLoan?.outstandingBalance) || 0).toFixed(2)})</small></Form.Label>
                            <Form.Control
                                type="number"
                                max={selectedLoan?.outstandingBalance}
                                value={repayment.amount}
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    const max = Number(selectedLoan?.outstandingBalance) || 0;
                                    if (val > max) {
                                        toast.warn(`Cannot exceed outstanding balance: Rs. ${max.toFixed(2)}`);
                                        setRepayment({ ...repayment, amount: max.toString() });
                                    } else {
                                        setRepayment({ ...repayment, amount: e.target.value });
                                    }
                                }}
                            />
                            {accountBalance !== null && (
                                <small className={`mt-1 d-block ${accountBalance < Number(repayment.amount || 0) ? 'text-danger fw-bold' : 'text-muted'}`}>
                                    Account balance: Rs. {accountBalance.toLocaleString('en-LK', { minimumFractionDigits: 2 })}
                                    {accountBalance < Number(repayment.amount || 0) && ' ⚠️ Insufficient — overdraft will apply'}
                                </small>
                            )}
                        </Form.Group>
                        <Form.Group className="mb-2">
                            <Form.Label>Date Paid</Form.Label>
                            <SafeDatePicker name="date" value={repayment.date} onChange={e => setRepayment({ ...repayment, date: e.target.value })} />
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

        <OverdraftConfirmModal
            show={showOverdraftModal}
            amount={repayment.amount}
            balance={accountBalance}
            accountName={repayment.paymentAccountName}
            onConfirm={() => { setShowOverdraftModal(false); submitRepay(true); }}
            onCancel={() => setShowOverdraftModal(false)}
        />
        </>
    );
}
