import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import { Card, Button, Row, Col, Table, Modal, Form } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api/api';
import PaymentAccountPicker from '../ReusableComponents/PaymentAccountPicker';

/**
 * Component to display project financial summary and payments.
 * Allows editing total value and adding payments.
 *
 * @component
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 * @param {Object} props.project - Project object
 * @param {Function} props.onRefresh - Callback to refresh project data
 */
export default function ProjectPaymentsCard({ projectId, project, onRefresh, currency = 'LKR' }) {
    const navigate = useNavigate();
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(false);

    // Edit Value State
    const [showEditValue, setShowEditValue] = useState(false);
    const [newValue, setNewValue] = useState('');

    // Add Payment State
    const [showPay, setShowPay] = useState(false);
    const [payData, setPayData] = useState({ 
        amount: '', 
        date: new Date().toISOString().substring(0, 10), 
        reference: '',
        paymentAccountId: '',
        paymentAccountName: '',
        paymentAccountType: ''
    });
    const [submitting, setSubmitting] = useState(false);

    const loadPayments = async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            const res = await api.get(`/projects/${projectId}/payments`);
            setPayments(res.data || []);
        } catch (e) {
            toast.error("Failed to load payments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadPayments(); }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

    const handleUpdateValue = async () => {
        try {
            await api.patch(`/projects/${projectId}/value`, { totalValue: parseFloat(newValue) });
            toast.success("Project value updated");
            setShowEditValue(false);
            onRefresh?.();
        } catch (e) {
            toast.error("Failed to update value");
        }
    };

    const handleAddPayment = async () => {
        if (!payData.amount || !payData.date || !payData.reference?.trim()) {
            toast.warn("Amount, Date, and Reference are all required");
            return;
        }
        if (!payData.paymentAccountId) {
            toast.warn("Please select a payment account");
            return;
        }
        if (!payData.paymentMethod) {
            toast.warn("Please explicitly select a Payment Method (e.g. Card, Cash)");
            return;
        }
        try {
            setSubmitting(true);
            await api.post(`/projects/${projectId}/payments`, {
                amount: parseFloat(payData.amount),
                date: payData.date,
                reference: payData.reference.trim(),
                paymentAccountId: payData.paymentAccountId,
                paymentAccountName: payData.paymentAccountName,
                paymentAccountType: payData.paymentAccountType,
                paymentMethod: payData.paymentMethod
            });
            toast.success("Payment added");
            setShowPay(false);
            setPayData({ amount: '', date: new Date().toISOString().substring(0, 10), reference: '' });
            loadPayments();
            onRefresh?.();
        } catch (e) {
            toast.error("Failed to add payment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Card className="h-100">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Project Payments (Receivables)</span>
                <div className="d-flex gap-2">

                    <Button size="sm" variant="success" onClick={() => setShowPay(true)}>
                        Add Payment
                    </Button>
                </div>
            </Card.Header>
            <Card.Body>
                <Row className="mb-4 text-center">
                    <Col>
                        <div className="text-muted small">Total Project Value</div>
                        <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h4 className="mb-0 text-primary">{currency} {project?.totalProjectValue?.toLocaleString() || '0.00'}</h4>
                        </div>
</Col>
                    <Col>
                        <div className="text-muted small">Total Received</div>
                        <h4 className="text-success">{currency} {project?.totalReceived?.toLocaleString() || '0.00'}</h4>
                    </Col>
                    <Col>
                        <div className="text-muted small">Balance Due</div>
                        <h4 className="text-danger">{currency} {project?.balance?.toLocaleString() || '0.00'}</h4>
                    </Col>
                </Row>

                <h6 className="mb-2">Payment History</h6>
                <Table size="sm" hover responsive striped>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Reference</th>
                            <th className="text-end">Amount ({currency})</th>
                            <th>Added By</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.length === 0 ? <tr><td colSpan="4" className="text-center text-muted">No payments recorded</td></tr> :
                            payments.map(p => (
                                <tr key={p.id}>
                                    <td>{p.paymentDate}</td>
                                    <td>{p.reference}</td>
                                    <td className="text-end">{p.amount?.toLocaleString()}</td>
                                    <td>{p.addedBy}</td>
                                </tr>
                            ))
                        }
                    </tbody>
                </Table>
            </Card.Body>

            {/* Edit Value Modal */}
            <Modal show={showEditValue} onHide={() => setShowEditValue(false)} size="sm" centered>
                <Modal.Header closeButton><Modal.Title>Edit Project Value</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Total Agreed Value</Form.Label>
                        <Form.Control type="number" value={newValue} onChange={e => setNewValue(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEditValue(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleUpdateValue}>Save</Button>
                </Modal.Footer>
            </Modal>

            {/* Add Payment Modal */}
            <Modal show={showPay} onHide={() => { if (!submitting) setShowPay(false); }} centered>
                <Modal.Header closeButton={!submitting}><Modal.Title>Add Payment</Modal.Title></Modal.Header>
                <Modal.Body>
                    <div className="mb-3">
                        <PaymentAccountPicker
                            required
                            value={payData.paymentAccountId}
                            onChange={info => setPayData(d => ({ ...d, ...info }))}
                        />
                    </div>
                    <Form.Group className="mb-3">
                        <Form.Label>Date <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="date" value={payData.date} onChange={e => setPayData({ ...payData, date: e.target.value })} disabled={submitting} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Amount <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="number" value={payData.amount} onChange={e => setPayData({ ...payData, amount: e.target.value })} disabled={submitting} required />
                    </Form.Group>
                    <Form.Group className="mb-3">
                        <Form.Label>Reference <span className="text-danger">*</span></Form.Label>
                        <Form.Control type="text" placeholder="Check No, Bank Ref, etc." value={payData.reference} onChange={e => setPayData({ ...payData, reference: e.target.value })} disabled={submitting} required />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowPay(false)} disabled={submitting}>Cancel</Button>
                    <Button variant="success" onClick={handleAddPayment} disabled={submitting}>
                        {submitting ? 'Adding...' : 'Add Payment'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Card>
    );
}
