import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Container, Card, Table, Button, Spinner } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const InternalReturnApprovals = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => {
        fetchReturns();
    }, []);

    const fetchReturns = async () => {
        try {
            setLoading(true);
            const response = await api.get('/inventory/returns/internal?status=PENDING');
            setReturns(response.data?.content || response.data || []);
        } catch (err) {
            console.error("Error fetching returns:", err);
            toast.error("Failed to load internal returns.");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (ret) => {
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
                                <th>Date</th>
                                <th>Items</th>
                                <th>Reason</th>
                                <th style={{ width: 120 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {returns.length === 0 ? (
                                <tr><td colSpan="6" className="text-center text-muted">No pending returns found.</td></tr>
                            ) : (
                                returns.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.returnNumber}</td>
                                        <td>{r.projectId}</td>
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
                                            <Button 
                                                variant="success" 
                                                size="sm" 
                                                onClick={() => handleApprove(r)}
                                                disabled={processingId === r.id}
                                            >
                                                Approve
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
