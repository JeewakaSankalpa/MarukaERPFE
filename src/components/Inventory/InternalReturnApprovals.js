import React, { useEffect, useState } from 'react';
import { Card, Table, Button, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api/api';

export default function InternalReturnApprovals() {
    const [returns, setReturns] = useState([]);
    const [loading, setLoading] = useState(false);
    const [processingId, setProcessingId] = useState(null);

    useEffect(() => { load(); }, []);

    const load = async () => {
        try {
            setLoading(true);
            const res = await api.get('/inventory/returns/internal?status=PENDING');
            setReturns(res.data.content || res.data || []);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load pending returns");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (ret) => {
        if (!window.confirm(`Approve return ${ret.returnNumber}? Stock will be moved to Store.`)) return;
        try {
            setProcessingId(ret.id);
            await api.post(`/inventory/returns/internal/${ret.id}/approve`, []);
            toast.success(`Return ${ret.returnNumber} approved`);
            load();
        } catch (e) {
            console.error(e);
            toast.error(e?.response?.data?.message || "Failed to approve return");
        } finally {
            setProcessingId(null);
        }
    };

    // Note: Reject endpoint might not exist in controller yet (only approve was explicitly added/checked).
    // InternalReturnService has no reject method exposed in controller?
    // Let's check previously viewed files. Rejection usually just updates status.
    // If not exposed, I will skip Reject button for now or implement it if I missed it.
    // Controller only had create and approve.
    // I will leave Reject out to avoid 404s unless I confirm backend support.
    // Actually TransferService had reject, InternalReturnService logic I read had approve. 
    // ReturnRequest model has REJECTED status.
    // I'll stick to Approve for now as per user request "We need to allow the store to approve".

    return (
        <div className="container-fluid p-4">
            <h2 className="mb-4">Internal Return Approvals</h2>
            <Card>
                <Card.Header>Pending Requests (Project to Store)</Card.Header>
                <Card.Body>
                    {loading && <div className="text-center p-3"><Spinner animation="border" /> Loading...</div>}
                    {!loading && returns.length === 0 && <div className="text-muted text-center p-3">No pending returns found.</div>}
                    {!loading && returns.length > 0 && (
                        <Table responsive hover bordered>
                            <thead>
                                <tr>
                                    <th>Return #</th>
                                    <th>Project</th>
                                    <th>Date</th>
                                    <th>Items</th>
                                    <th>Reason</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {returns.map(r => (
                                    <tr key={r.id}>
                                        <td>{r.returnNumber}</td>
                                        <td>{r.projectId}</td>
                                        <td>{new Date(r.createdAt).toLocaleDateString()}</td>
                                        <td>
                                            <ul className="list-unstyled mb-0">
                                                {r.items?.map((item, idx) => (
                                                    <li key={idx}>
                                                        <strong>{item.productId}</strong>: {item.quantity}
                                                        {item.batchId && <span className="text-muted ms-1 small">(Batch: {item.batchId.substring(0, 8)}...)</span>}
                                                    </li>
                                                ))}
                                            </ul>
                                        </td>
                                        <td>{r.items?.[0]?.reason || '-'}</td>
                                        <td>
                                            <Button
                                                variant="success"
                                                size="sm"
                                                onClick={() => handleApprove(r)}
                                                disabled={processingId === r.id}
                                            >
                                                {processingId === r.id ? 'Processing...' : 'Approve'}
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    )}
                </Card.Body>
            </Card>
        </div>
    );
}
