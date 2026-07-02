import { ArrowLeft, Download } from 'lucide-react';
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
    const [rejectDialog, setRejectDialog] = useState(null);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);

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
            if (approveDialog.sourceType === 'IMPORT_SYNC') {
                await api.post(`/admin/import/inventory/approve-audit/${approveDialog.id}`);
            } else {
                // Backend handles approver via Principal (JWT)
                await api.post(`/inventory/adjustments/audit/${approveDialog.id}/approve`);
            }
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

    const handleReject = async () => {
        if (!rejectDialog) return;

        setRejecting(true);
        try {
            await api.post(`/inventory/adjustments/audit/${rejectDialog.id}/reject`);
            toast.success("Audit rejected. No stock changes were applied.");
            setRejectDialog(null);
            fetchAudits();
        } catch (err) {
            console.error("Error rejecting audit:", err);
            toast.error(err.response?.data || "Failed to reject audit.");
        } finally {
            setRejecting(false);
        }
    };

    const handleDownloadReport = async (audit) => {
        try {
            const response = await api.get(`/inventory/adjustments/audit/${audit.id}/report`, {
                responseType: 'blob',
                headers: { Accept: 'application/pdf' }
            });
            const contentType = response.headers?.['content-type'] || '';
            if (!contentType.includes('application/pdf')) {
                const text = await response.data.text();
                throw new Error(text || 'Server did not return a PDF report.');
            }
            const blob = new Blob([response.data], { type: 'application/pdf' });
            if (blob.size === 0) {
                throw new Error('The generated PDF was empty.');
            }
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = audit.sourceType === 'IMPORT_SYNC'
                ? `inventory-bulk-import-${audit.id}.pdf`
                : `stock-audit-${audit.id}.pdf`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => window.URL.revokeObjectURL(url), 30000);
            toast.success(audit.sourceType === 'IMPORT_SYNC' ? "Inventory bulk import report downloaded." : "Audit report downloaded.");
        } catch (err) {
            console.error("Error downloading audit report:", err);
            toast.error(err.message || "Failed to download audit report.");
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
                                        {audit.sourceType === 'IMPORT_SYNC' && <Badge bg="info" className="me-2">Import Sync</Badge>}
                                        <span className="text-secondary small">
                                            Uploaded {new Date(audit.uploadedAt || audit.createdAt).toLocaleString()} by {audit.uploadedBy || audit.createdBy || 'System'}
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
                                <div className="d-flex justify-content-between align-items-center mb-3">
                                    <div className="small text-secondary">
                                        {audit.status === 'APPROVED'
                                            ? <>Accepted by {audit.approvedBy || 'System'} on {audit.approvedAt ? new Date(audit.approvedAt).toLocaleString() : '-'}</>
                                            : <>Waiting for stock audit approval</>}
                                    </div>
                                    <Button variant="outline-secondary" size="sm" onClick={() => handleDownloadReport(audit)}>
                                        <Download size={14} className="me-1" /> {audit.sourceType === 'IMPORT_SYNC' ? 'Import Report PDF' : 'Report PDF'}
                                    </Button>
                                </div>

                                {audit.sourceType === 'IMPORT_SYNC' ? (
                                    <Table size="sm" responsive hover bordered>
                                        <thead className="table-light">
                                            <tr>
                                                <th>SKU</th>
                                                <th>Item</th>
                                                <th>Status</th>
                                                <th className="text-end">Old Qty</th>
                                                <th className="text-end">Excel Qty</th>
                                                <th className="text-end">Delta</th>
                                                <th>Changes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {audit.importRows?.map((item, idxx) => (
                                                <tr key={idxx}>
                                                    <td>{item.sku}</td>
                                                    <td>{item.name || 'Unknown Product'}</td>
                                                    <td>{item.status}</td>
                                                    <td className="text-end">{item.currentQty ?? '-'}</td>
                                                    <td className="text-end fw-bold">{item.importedQty ?? '-'}</td>
                                                    <td className={`text-end ${(item.stockDelta || 0) < 0 ? 'text-danger' : 'text-success'}`}>
                                                        {item.stockDelta > 0 ? `+${item.stockDelta}` : item.stockDelta ?? '-'}
                                                    </td>
                                                    <td>
                                                        {item.changes?.length
                                                            ? item.changes.map(change => `${change.field}: ${change.currentValue || '-'} -> ${change.newValue || '-'}`).join('; ')
                                                            : '-'}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </Table>
                                ) : (
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
                                )}

                                {audit.status === 'PENDING_APPROVAL' && (
                                    <div className="d-flex justify-content-end gap-2 mt-3">
                                        <Button variant="outline-danger" onClick={() => setRejectDialog(audit)}>Reject</Button>
                                        <Button variant="primary" onClick={() => setApproveDialog(audit)}>Approve & Apply</Button>
                                    </div>
                                )}

                                {audit.status === 'APPROVED' && audit.sourceType !== 'IMPORT_SYNC' && (
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
            <Modal show={!!rejectDialog} onHide={() => setRejectDialog(null)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Confirm Audit Rejection</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    Are you sure you want to reject this stock audit?
                    This will close the pending approval without changing stock levels.
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setRejectDialog(null)}>Cancel</Button>
                    <Button variant="danger" onClick={handleReject} disabled={rejecting}>
                        {rejecting ? <Spinner as="span" animation="border" size="sm" /> : 'Confirm Reject'}
                    </Button>
                </Modal.Footer>
            </Modal>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
};

export default StockAuditApprovalsPage;
