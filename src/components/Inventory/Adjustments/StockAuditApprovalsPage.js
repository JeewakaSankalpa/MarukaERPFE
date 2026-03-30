import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import api from '../../../api/api';
import {
    Container,
    Card,
    Table,
    Button,
    Accordion,
    Badge,
    Spinner,
    Modal
} from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const StockAuditApprovalsPage = () => {
    const navigate = useNavigate();
    const [audits, setAudits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [approveDialog, setApproveDialog] = useState(null); // Audit ID to approve
    const [approving, setApproving] = useState(false);

    useEffect(() => {
        fetchAudits();
    }, []);

    const fetchAudits = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inventory/adjustments/audit');
            const sorted = (response.data || []).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            setAudits(sorted);
        } catch (err) {
            console.error("Error fetching audits:", err);
            toast.error("Failed to load stock audits.");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!approveDialog) return;

        setApproving(true);
        try {
            // Backend handles approver via Principal (JWT)
            await api.post(`/inventory/adjustments/audit/${approveDialog.id}/approve`);
            toast.success("Audit approved and stock updated successfully.");
            setApproveDialog(null);
            fetchAudits(); // Refresh list
        } catch (err) {
            console.error("Error approving audit:", err);
            toast.error(err.response?.data || "Failed to approve audit.");
        } finally {
            setApproving(false);
        }
    };

    if (loading) return <div className="d-flex justify-content-center p-5"><Spinner animation="border" /></div>;

    return (
        <Container fluid className="p-4">
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">Stock Audit Approvals</h3>
            </div>

            {audits.length === 0 ? (
                <Card className="text-center p-5 text-muted shadow-sm">
                    <h5>No pending stock audits found.</h5>
                </Card>
            ) : (
                <Accordion defaultActiveKey="0">
                    {audits.map((audit, idx) => (
                        <Accordion.Item eventKey={idx.toString()} key={audit.id} className="mb-3 border rounded shadow-sm">
                            <Accordion.Header>
                                <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                                    <div>
                                        <span className="fw-bold me-2">{audit.title || 'Stock Adjustment Audit'}</span>
                                        <span className="text-secondary small">
                                            Submitted {new Date(audit.createdAt).toLocaleString()} by {audit.createdBy || 'System'}
                                        </span>
                                    </div>
                                    <Badge
                                        bg={audit.status === 'PENDING_APPROVAL' ? 'warning' : audit.status === 'APPROVED' ? 'success' : 'secondary'}
                                        text={audit.status === 'PENDING_APPROVAL' ? 'dark' : 'white'}
                                    >
                                        {audit.status}
                                    </Badge>
                                </div>
                            </Accordion.Header>
                            <Accordion.Body>
                                <Table size="sm" responsive hover bordered>
                                    <thead className="table-light">
                                        <tr>
                                            <th>Product</th>
                                            <th>Batch</th>
                                            <th className="text-end">Old Qty</th>
                                            <th className="text-end">New Qty</th>
                                            <th className="text-end">Adjustment</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {audit.items?.map((item, idxx) => (
                                            <tr key={idxx}>
                                                <td>{item.productName || 'Unknown Product'}</td>
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
                                        <Button variant="primary" onClick={() => setApproveDialog(audit)}>Approve & Apply</Button>
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

            <Modal show={!!approveDialog} onHide={() => setApproveDialog(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Audit Approval</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to approve this stock audit? 
                    This will immediately update current stock levels in the system.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setApproveDialog(null)}>Cancel</Button>
                    <Button variant="primary" onClick={handleApprove} disabled={approving}>
                        {approving ? <Spinner as="span" animation="border" size="sm" /> : 'Confirm Approve'}
                    </Button>
                </Modal.Footer>
            </Modal>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
};

export default StockAuditApprovalsPage;
