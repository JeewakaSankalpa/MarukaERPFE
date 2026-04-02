import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import api from '../../api/api';
import { Container, Card, Table, Button, Spinner, Badge, Nav } from 'react-bootstrap';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SupplierReturnApprovals = () => {
    const navigate = useNavigate();
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('PENDING');

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
        setProcessingId(ret.id);
        try {
            await api.post(`/inventory/returns/supplier/${ret.id}/approve`);
            toast.success("Supplier return approved successfully.");
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

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;

    return (
        <Container className="py-4">
            <div className="d-flex align-items-center mb-4">
                <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                <h3 className="mb-0">Supplier Returns</h3>
            </div>

            <Nav variant="tabs" className="mb-4" activeKey={statusFilter} onSelect={(k) => setStatusFilter(k)}>
                <Nav.Item>
                    <Nav.Link eventKey="PENDING">Pending Approvals</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link eventKey="APPROVED">Approved History</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                    <Nav.Link eventKey="REJECTED">Rejected History</Nav.Link>
                </Nav.Item>
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
                                <th>Reason</th>
                                {statusFilter !== 'PENDING' && <th>Processed Details</th>}
                                <th>Status</th>
                                {statusFilter === 'PENDING' && <th style={{ width: 180 }}>Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {returns.length === 0 ? (
                                <tr><td colSpan={statusFilter === 'PENDING' ? 7 : 7} className="text-center text-muted">No {statusFilter.toLowerCase()} returns found.</td></tr>
                            ) : (
                                returns.map(r => (
                                    <tr key={r.id}>
                                        <td><small className="text-secondary">{r.returnNumber || r.id}</small></td>
                                        <td>
                                            <strong>{r.supplierNameSnapshot || r.supplierName || r.supplierId}</strong>
                                        </td>
                                        <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <div className="small">
                                                <strong>{r.productName || r.productId}</strong>
                                                <br/>
                                                <Badge bg="info" className="me-2">Qty: {r.quantity}</Badge> 
                                                <Badge bg="secondary">Batch: {r.batchNumber || r.batchNo}</Badge>
                                            </div>
                                        </td>
                                        <td><div style={{ maxWidth: 200, wordWrap: 'break-word', whiteSpace: 'pre-wrap' }} className="small text-muted">{r.reason || '-'}</div></td>
                                        {statusFilter !== 'PENDING' && (
                                            <td>
                                                <div className="small">
                                                    <div>By: <span className="text-primary">{r.updatedBy || 'N/A'}</span></div>
                                                    <div className="text-muted">{r.updatedAt ? new Date(r.updatedAt).toLocaleString() : 'N/A'}</div>
                                                </div>
                                            </td>
                                        )}
                                        <td>
                                            <Badge bg={
                                                r.status === 'PENDING' ? 'warning' :
                                                r.status === 'APPROVED' ? 'success' : 'danger'
                                            }>
                                                {r.status}
                                            </Badge>
                                        </td>
                                        {statusFilter === 'PENDING' && (
                                            <td className="text-nowrap">
                                                <Button 
                                                    variant="success" 
                                                    size="sm" 
                                                    onClick={() => handleApprove(r)}
                                                    disabled={processingId === r.id}
                                                    className="me-2 shadow-sm"
                                                >
                                                    {processingId === r.id ? '...' : 'Approve'}
                                                </Button>
                                                <Button 
                                                    variant="outline-danger" 
                                                    size="sm" 
                                                    onClick={() => handleReject(r)}
                                                    disabled={processingId === r.id}
                                                    className="shadow-sm"
                                                >
                                                    {processingId === r.id ? '...' : 'Reject'}
                                                </Button>
                                            </td>
                                        )}
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

export default SupplierReturnApprovals;
