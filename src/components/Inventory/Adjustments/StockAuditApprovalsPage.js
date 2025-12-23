import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Container,
    Card,
    Table,
    Button,
    Accordion,
    Badge,
    Alert,
    Spinner,
    Modal,
    Row,
    Col
} from 'react-bootstrap';
import { FaChevronDown } from 'react-icons/fa';

const StockAuditApprovalsPage = () => {
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [approveDialog, setApproveDialog] = useState(null); // Audit ID to approve
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        fetchAudits();
    }, []);

    const fetchAudits = async () => {
        try {
            setLoading(true);
            const response = await axios.get('http://localhost:8080/api/inventory/adjustments/audit');
            const sorted = response.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setAudits(sorted);
            setError(null);
        } catch (err) {
            console.error("Error fetching audits:", err);
            setError("Failed to load stock audits.");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!approveDialog) return;

        setApproving(true);
        try {
            const user = "Manager"; // Replace with actual logged in user if auth is available
            await axios.post(`http://localhost:8080/api/inventory/adjustments/audit/${approveDialog}/approve`, null, {
                params: { approver: user }
            });
            setSuccess("Audit approved and stock updated successfully.");
            setApproveDialog(null);
            fetchAudits(); // Refresh list
        } catch (err) {
            console.error("Error approving audit:", err);
            setError("Failed to approve audit.");
        } finally {
            setApproving(false);
        }
    };

    if (loading) return <div className="d-flex justify-content-center p-5"><Spinner animation="border" /></div>;

    return (
        <Container fluid className="p-4">
            <h3 className="mb-4">Stock Audit Approvals</h3>

            {error && <Alert variant="danger" onClose={() => setError(null)} dismissible>{error}</Alert>}
            {success && <Alert variant="success" onClose={() => setSuccess(null)} dismissible>{success}</Alert>}

            {audits.length === 0 ? (
                <Card className="text-center p-5 text-muted">
                    <h5>No stock audits found.</h5>
                </Card>
            ) : (
                <Accordion defaultActiveKey="0">
                    {audits.map((audit, idx) => (
                        <Accordion.Item eventKey={idx.toString()} key={audit.id} className="mb-3 border rounded shadow-sm">
                            <Accordion.Header>
                                <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                                    <div>
                                        <span className="fw-bold me-2">{audit.title || 'Untitled Audit'}</span>
                                        <span className="text-secondary small">
                                            Submitted on {new Date(audit.createdAt).toLocaleString()} by {audit.createdBy || 'Unknown'}
                                        </span>
                                    </div>
                                    <Badge
                                        bg={audit.status === 'PENDING_APPROVAL' ? 'warning' : audit.status === 'APPROVED' ? 'success' : 'secondary'}
                                        text={audit.status === 'PENDING_APPROVAL' ? 'dark' : 'white'}
                                    >
                                        {audit.status}
                                    </Badge>
                                </div>
                                <div className="text-secondary small mt-1">
                                    {audit.approverIds && audit.approverIds.length > 0 ? (
                                        <span>Assigned to: <strong>{audit.approverIds.join(', ')}</strong></span>
                                    ) : (
                                        <span>No specific approver assigned</span>
                                    )}
                                </div>
                            </Accordion.Header>
                            <Accordion.Body>
                                <Table size="sm" responsive>
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Batch</th>
                                            <th className="text-end">Old Qty</th>
                                            <th className="text-end">New Qty</th>
                                            <th className="text-end">Adjustment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {audit.items.map((item, idxx) => (
                                            <tr key={idxx}>
                                                <td>{item.productName}</td>
                                                <td>{item.batchNo}</td>
                                                <td className="text-end">{item.oldQuantity}</td>
                                                <td className="text-end fw-bold">{item.newQuantity}</td>
                                                <td className={`text-end ${item.adjustmentQuantity < 0 ? 'text-danger' : 'text-success'}`}>
                                                    {item.adjustmentQuantity > 0 ? `+${item.adjustmentQuantity}` : item.adjustmentQuantity}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>

                                {audit.status === 'PENDING_APPROVAL' && (
                                    <div className="d-flex justify-content-end gap-2 mt-3">
                                        <Button variant="outline-danger">Reject</Button>
                                        <Button variant="primary" onClick={() => setApproveDialog(audit)}>Approve</Button>
                                    </div>
                                )}

                                {audit.status === 'APPROVED' && (
                                    <div className="text-end mt-2 text-secondary small">
                                        Approved by {audit.approvedBy} on {new Date(audit.approvedAt).toLocaleString()}
                                    </div>
                                )}
                            </Accordion.Body>
                        </Accordion.Item>
                    ))}
                </Accordion>
            )}

            <Modal show={!!approveDialog} onHide={() => setApproveDialog(null)}>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Approval</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to approve this stock audit? This will permanently update the stock levels for all items in this audit.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setApproveDialog(null)}>Cancel</Button>
                    <Button variant="primary" onClick={handleApprove} disabled={approving}>
                        {approving ? <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" /> : 'Confirm Approve'}
                    </Button>
                </Modal.Footer>
            </Modal>
        </Container>
    );
};

export default StockAuditApprovalsPage;
