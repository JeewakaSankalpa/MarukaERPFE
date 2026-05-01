import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Container, Card, Table, Button, Spinner, Badge, Nav, Modal, Form, Row, Col } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PaymentAccountPicker from '../ReusableComponents/PaymentAccountPicker';

const SupplierReturnApprovals = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('PENDING');

    // Settlement Modal State
    const [showSettlementModal, setShowSettlementModal] = useState(false);
    const [selectedReturn, setSelectedReturn] = useState(null);
    const [settlementData, setSettlementData] = useState({
        type: 'REPLACEMENT',
        quantitySettled: '',
        amountSettled: '',
        referenceId: '',
        notes: ''
    });
    const [submittingSettlement, setSubmittingSettlement] = useState(false);

    useEffect(() => {
        fetchReturns();
    }, [statusFilter]);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/inventory/returns/supplier?status=${statusFilter}&size=100`);
            setReturns(response.data?.content || response.data || []);
        } catch (err) {
            console.error("Error fetching supplier returns:", err);
            toast.error("Failed to load supplier returns.");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (ret) => {
        if (!window.confirm(`Are you sure you want to approve this return?\nThis will deduct ${ret.quantity} units from Batch ${ret.batchNo}.`)) return;
        setProcessingId(ret.id);
        try {
            await api.post(`/inventory/returns/supplier/${ret.id}/approve`);
            toast.success("Supplier return approved. Stock has been deducted.");
            fetchReturns(); 
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to approve return.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (ret) => {
        setProcessingId(ret.id);
        try {
            await api.post(`/inventory/returns/supplier/${ret.id}/reject`);
            toast.success("Supplier return rejected.");
            fetchReturns(); 
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to reject return.");
        } finally {
            setProcessingId(null);
        }
    };

    const openSettlementModal = (ret) => {
        setSelectedReturn(ret);
        const alreadySettled = (ret.settlements || []).reduce((acc, s) => acc + s.quantitySettled, 0);
        const remainingToSettle = ret.quantity - alreadySettled;
        
        setSettlementData({
            type: 'REPLACEMENT',
            quantitySettled: remainingToSettle,
            amountSettled: remainingToSettle * (ret.unitCost || 0),
            referenceId: '',
            notes: ''
        });
        setShowSettlementModal(true);
    };

    const handleSettlementChange = (field, value) => {
        setSettlementData(prev => {
            const updated = { ...prev, [field]: value };
            if (field === 'quantitySettled' && selectedReturn) {
                updated.amountSettled = Number(value) * (selectedReturn.unitCost || 0);
            }
            return updated;
        });
    };

    const submitSettlement = async (e) => {
        e.preventDefault();
        setSubmittingSettlement(true);
        try {
            const payload = {
                type: settlementData.type,
                quantitySettled: Number(settlementData.quantitySettled),
                amountSettled: Number(settlementData.amountSettled),
                referenceId: settlementData.referenceId,
                notes: settlementData.notes
            };
            
            await api.post(`/inventory/returns/supplier/${selectedReturn.id}/settle`, payload);
            toast.success("Settlement recorded successfully!");
            setShowSettlementModal(false);
            fetchReturns();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to record settlement.");
        } finally {
            setSubmittingSettlement(false);
        }
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <Container className="py-4">
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">Supplier Returns</h3>
            </div>

            <Nav variant="tabs" className="mb-4" activeKey={statusFilter} onSelect={(k) => setStatusFilter(k)}>
                <Nav.Item><Nav.Link eventKey="PENDING">Pending Approvals</Nav.Link></Nav.Item>
                <Nav.Item><Nav.Link eventKey="APPROVED">Approved & Settled</Nav.Link></Nav.Item>
                <Nav.Item><Nav.Link eventKey="REJECTED">Rejected History</Nav.Link></Nav.Item>
            </Nav>

            <Card className="shadow-sm border-0">
                <Card.Body>
                    <Table responsive hover bordered className="align-middle">
                        <thead className="table-light">
                            <tr>
                                <th>Return Ref</th>
                                <th>Supplier</th>
                                <th>Date</th>
                                <th>Item Details</th>
                                {statusFilter === 'APPROVED' && <th>Settlement</th>}
                                <th>Reason</th>
                                <th>Status</th>
                                {statusFilter === 'PENDING' && <th style={{ width: 180 }}>Actions</th>}
                                {statusFilter === 'APPROVED' && <th style={{ width: 150 }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {returns.length === 0 ? (
                                <tr><td colSpan={8} className="text-center text-muted">No {statusFilter.toLowerCase()} returns found.</td></tr>
                            ) : (
                                returns.map(r => {
                                    const alreadySettled = (r.settlements || []).reduce((acc, s) => acc + s.quantitySettled, 0);
                                    const isFullySettled = alreadySettled >= r.quantity;
                                    
                                    return (
                                        <tr key={r.id}>
                                            <td><small className="text-secondary">{r.returnNumber || r.id}</small></td>
                                            <td><strong>{r.supplierNameSnapshot || r.supplierName || r.supplierId}</strong></td>
                                            <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                                            <td>
                                                <div className="small">
                                                    <strong>{r.productName || r.productId}</strong>
                                                    <br/>
                                                    <Badge bg="info" className="me-2">Qty: {r.quantity}</Badge> 
                                                    <Badge bg="secondary">Batch: {r.batchNumber || r.batchNo}</Badge>
                                                    {r.unitCost > 0 && <div>Cost: Rs. {r.unitCost}</div>}
                                                </div>
                                            </td>
                                            {statusFilter === 'APPROVED' && (
                                                <td>
                                                    <Badge bg={r.settlementStatus === 'SETTLED' ? 'success' : r.settlementStatus === 'PARTIAL' ? 'warning' : 'secondary'}>
                                                        {r.settlementStatus || 'PENDING'}
                                                    </Badge>
                                                    <div className="small mt-1 text-muted">
                                                        Settled: {alreadySettled} / {r.quantity}
                                                    </div>
                                                </td>
                                            )}
                                            <td><div style={{ maxWidth: 200, wordWrap: 'break-word', whiteSpace: 'pre-wrap' }} className="small text-muted">{r.reason || '-'}</div></td>
                                            <td>
                                                <Badge bg={r.status === 'PENDING' ? 'warning' : r.status === 'APPROVED' ? 'success' : 'danger'}>
                                                    {r.status}
                                                </Badge>
                                            </td>
                                            {statusFilter === 'PENDING' && (
                                                <td className="text-nowrap">
                                                    <Button 
                                                        variant="success" size="sm" 
                                                        onClick={() => handleApprove(r)}
                                                        disabled={processingId === r.id}
                                                        className="me-2 shadow-sm"
                                                    >
                                                        {processingId === r.id ? '...' : 'Approve'}
                                                    </Button>
                                                    <Button 
                                                        variant="outline-danger" size="sm" 
                                                        onClick={() => handleReject(r)}
                                                        disabled={processingId === r.id}
                                                        className="shadow-sm"
                                                    >
                                                        {processingId === r.id ? '...' : 'Reject'}
                                                    </Button>
                                                </td>
                                            )}
                                            {statusFilter === 'APPROVED' && (
                                                <td>
                                                    {!isFullySettled ? (
                                                        <Button variant="primary" size="sm" onClick={() => openSettlementModal(r)}>
                                                            Record Settlement
                                                        </Button>
                                                    ) : (
                                                        <Button variant="outline-secondary" size="sm" onClick={() => openSettlementModal(r)}>
                                                            View Settlements
                                                        </Button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>

            {/* Settlement Modal */}
            <Modal show={showSettlementModal} onHide={() => setShowSettlementModal(false)} size="lg">
                <Form onSubmit={submitSettlement}>
                    <Modal.Header closeButton>
                        <Modal.Title>Record Supplier Settlement</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        {selectedReturn && (
                            <div className="mb-4 bg-light p-3 rounded">
                                <h6>Return Info</h6>
                                <Row className="small">
                                    <Col md={4}><strong>Product:</strong> {selectedReturn.productName}</Col>
                                    <Col md={4}><strong>Total Returned Qty:</strong> {selectedReturn.quantity}</Col>
                                    <Col md={4}><strong>Unit Cost:</strong> Rs. {selectedReturn.unitCost}</Col>
                                </Row>
                                <hr className="my-2" />
                                <h6>Past Settlements</h6>
                                {(selectedReturn.settlements || []).length === 0 ? (
                                    <div className="text-muted small">No settlements recorded yet.</div>
                                ) : (
                                    <Table size="sm" bordered className="mb-0 bg-white">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Type</th>
                                                <th>Qty</th>
                                                <th>Amount</th>
                                                <th>Ref / Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedReturn.settlements.map((s, idx) => (
                                                <tr key={idx}>
                                                    <td>{new Date(s.createdAt).toLocaleDateString()}</td>
                                                    <td><Badge bg="secondary">{s.type}</Badge></td>
                                                    <td>{s.quantitySettled}</td>
                                                    <td>Rs. {s.amountSettled}</td>
                                                    <td>
                                                        <div>{s.referenceId}</div>
                                                        <small className="text-muted">{s.notes}</small>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                )}
                            </div>
                        )}

                        {selectedReturn && ((selectedReturn.settlements || []).reduce((acc, s) => acc + s.quantitySettled, 0) < selectedReturn.quantity) && (
                            <div className="border p-3 rounded">
                                <h6 className="mb-3 text-primary">New Settlement Entry</h6>
                                <Row className="mb-3">
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>Settlement Type</Form.Label>
                                            <Form.Select 
                                                value={settlementData.type}
                                                onChange={e => handleSettlementChange('type', e.target.value)}
                                            >
                                                <option value="REPLACEMENT">Replacement Items</option>
                                                <option value="REFUND">Cash/Bank Refund</option>
                                                <option value="CREDIT_NOTE">Credit Note</option>
                                            </Form.Select>
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>Quantity Settling</Form.Label>
                                            <Form.Control 
                                                type="number" min="1" 
                                                max={selectedReturn.quantity - (selectedReturn.settlements || []).reduce((acc, s) => acc + s.quantitySettled, 0)}
                                                value={settlementData.quantitySettled}
                                                onChange={e => handleSettlementChange('quantitySettled', e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col md={4}>
                                        <Form.Group>
                                            <Form.Label>Total Amount (Rs.)</Form.Label>
                                            <Form.Control 
                                                type="number"
                                                value={settlementData.amountSettled}
                                                onChange={e => handleSettlementChange('amountSettled', e.target.value)}
                                                required
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                <Row>
                                    <Col md={12}>
                                        {settlementData.type === 'REFUND' ? (
                                            <PaymentAccountPicker
                                                required
                                                value={settlementData.referenceId}
                                                onChange={(acc) => {
                                                    handleSettlementChange('referenceId', acc.paymentAccountId);
                                                    if (acc.paymentMethod) {
                                                        handleSettlementChange('notes', `Refund to ${acc.paymentAccountName} via ${acc.paymentMethod}`);
                                                    }
                                                }}
                                            />
                                        ) : (
                                            <Form.Group>
                                                <Form.Label>Reference</Form.Label>
                                                <Form.Control 
                                                    type="text" 
                                                    value={settlementData.referenceId}
                                                    onChange={e => handleSettlementChange('referenceId', e.target.value)}
                                                    placeholder={settlementData.type === 'CREDIT_NOTE' ? 'Credit Note No.' : 'Reference ID'}
                                                />
                                            </Form.Group>
                                        )}
                                    </Col>
                                    <Col md={12} className="mt-3">
                                        <Form.Group>
                                            <Form.Label>Notes</Form.Label>
                                            <Form.Control 
                                                type="text" 
                                                value={settlementData.notes}
                                                onChange={e => handleSettlementChange('notes', e.target.value)}
                                                placeholder="Any additional remarks..."
                                            />
                                        </Form.Group>
                                    </Col>
                                </Row>
                                {settlementData.type === 'REPLACEMENT' && (
                                    <div className="mt-3 text-info small">
                                        * Note: Recording a Replacement will automatically generate a <strong>Draft GRN</strong> for the replacement items. You must go to the standard GRN screen to verify and post it to update inventory.
                                    </div>
                                )}
                            </div>
                        )}
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowSettlementModal(false)}>Close</Button>
                        {selectedReturn && ((selectedReturn.settlements || []).reduce((acc, s) => acc + s.quantitySettled, 0) < selectedReturn.quantity) && (
                            <Button variant="primary" type="submit" disabled={submittingSettlement}>
                                {submittingSettlement ? 'Saving...' : 'Record Settlement'}
                            </Button>
                        )}
                    </Modal.Footer>
                </Form>
            </Modal>
            
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
};

export default SupplierReturnApprovals;
