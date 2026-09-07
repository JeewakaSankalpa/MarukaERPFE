import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/api';
import { Container, Card, Table, Button, Spinner, Badge } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { confirmAction, promptAction } from '../../utils/brandedDialogs';

const InternalReturnApprovals = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const employeeId = localStorage.getItem('employeeId');

    const fetchReturns = useCallback(async () => {
        try {
            setLoading(true);
            if (!employeeId) {
                setReturns([]);
                return;
            }
            const response = await api.get('/inventory/returns/internal/pending-approvals', { params: { employeeId } });
            setReturns(response.data?.content || response.data || []);
        } catch (err) {
            console.error("Error fetching returns:", err);
            toast.error("Failed to load internal returns.");
        } finally {
            setLoading(false);
        }
    }, [employeeId]);

    useEffect(() => {
        fetchReturns();
    }, [fetchReturns]);

    const handleApprove = async (ret) => {
        if (!await confirmAction({
            title: "Approve internal return",
            message: `Approve return ${ret.returnNumber || ret.id}? Inventory will only be restored for usable returned items.`,
            confirmLabel: "Approve return",
        })) return;
        setProcessingId(ret.id);
        try {
            await api.post(`/inventory/returns/internal/${ret.id}/approve`);
            toast.success("Return approved successfully.");
            fetchReturns();
        } catch (err) {
            console.error(err);
            toast.error("Failed to approve return.");
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (ret) => {
        const comment = await promptAction({
            title: "Reject internal return",
            label: "Reason",
            message: `Reject return ${ret.returnNumber || ret.id}?`,
            confirmLabel: "Reject return",
            tone: "danger",
        });
        if (comment == null) return;
        setProcessingId(ret.id);
        try {
            await api.post(`/inventory/returns/internal/${ret.id}/reject`, { comment });
            toast.success("Return rejected.");
            fetchReturns();
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || "Failed to reject return.");
        } finally {
            setProcessingId(null);
        }
    };

    const formatReturnType = (value) => {
        if (value === 'NORMAL_RETURN') return 'Normal return';
        if (value === 'DAMAGED_AFTER_CONSUMPTION') return 'Damaged';
        if (value === 'WRONG_ITEM_USED') return 'Wrong item';
        return 'Customer changed mind';
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <Container className="py-4">
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">Internal Return Approvals</h3>
            </div>

            <Card className="shadow-sm">
                <Card.Body>
                    <Table responsive hover bordered>
                        <thead className="table-light">
                            <tr>
                                <th>Ref #</th>
                                <th>Project</th>
                                <th>Type</th>
                                <th>Date</th>
                                <th>Items</th>
                                <th>Reason</th>
                                <th>Approvals</th>
                                <th style={{ width: 170 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returns.length === 0 ? (
                                <tr><td colSpan="8" className="text-center text-muted">No pending returns found.</td></tr>
                            ) : (
                                returns.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.returnNumber}</td>
                                        <td>{r.projectId}</td>
                                        <td>
                                            <Badge bg={r.returnType === 'DAMAGED_AFTER_CONSUMPTION' ? 'danger' : 'info'} text={r.returnType === 'DAMAGED_AFTER_CONSUMPTION' ? undefined : 'dark'}>
                                                {formatReturnType(r.returnType)}
                                            </Badge>
                                            {r.sourceConsumptionId && <div className="small text-muted mt-1">From consumption</div>}
                                        </td>
                                        <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            {r.items?.map((item, idx) => (
                                                <div key={idx} className="small border-bottom mb-1 pb-1">
                                                    <strong>{item.productNameSnapshot || item.productName || item.productId}</strong>
                                                    <br/>
                                                    Qty: {item.quantity} | Batch: {item.batchNumber || item.batchId}
                                                </div>
                                            ))}
                                        </td>
                                        <td>{r.items?.[0]?.reason || '-'}</td>
                                        <td>
                                            <div className="small">{r.approvalPolicy || 'ALL'}</div>
                                            <div className="small text-muted">
                                                {(r.approvals || []).filter(a => a.status === 'APPROVED').length} / {(r.approverIds || []).length}
                                            </div>
                                        </td>
                                        <td>
                                            <Button 
                                                variant="success" 
                                                size="sm" 
                                                className="me-1"
                                                onClick={() => handleApprove(r)}
                                                disabled={processingId === r.id}
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                variant="outline-danger"
                                                size="sm"
                                                onClick={() => handleReject(r)}
                                                disabled={processingId === r.id}
                                            >
                                                Reject
                                            </Button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </Card.Body>
            </Card>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
};

export default InternalReturnApprovals;
