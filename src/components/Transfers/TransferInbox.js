import React, { useEffect, useState } from "react";
import { Container, Button, Table, Badge } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";

/* ========== INLINE API HELPERS ========== */
const listPendingTransfers = async (toLocationId) =>
    (await api.get(`/transfers?status=PENDING_ACCEPTANCE&toLocationId=${encodeURIComponent(toLocationId)}`)).data; // implement paging if needed
const acceptTransfer = async (id) => (await api.patch(`/transfers/${id}/accept`)).data;
const rejectTransfer = async (id) => (await api.patch(`/transfers/${id}/reject`)).data;

export default function TransfersInbox() {
    const [toLocationId, setToLocationId] = useState("LOC_PROJECT_OR_DEPT");
    const [rows, setRows] = useState([]);

    // Scan logic
    const [expandedId, setExpandedId] = useState(null);
    const [scanInput, setScanInput] = useState("");
    const [scannedKeys, setScannedKeys] = useState(new Set()); // batchId or serialNo

    const load = async () => {
        try { setRows(await listPendingTransfers(toLocationId)); }
        catch { toast.error("Failed to load transfers"); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [toLocationId]);

    const onAccept = async (id) => { await acceptTransfer(id); toast.success("Accepted"); load(); };
    const onReject = async (id) => { await rejectTransfer(id); toast.info("Rejected"); load(); };

    const handleScan = (qrValue) => {
        if (!expandedId) return;
        const parts = qrValue.split('|');
        if (parts.length < 5 || parts[0] !== 'V1') {
            toast.error("Invalid QR");
            return;
        }
        // eslint-disable-next-line no-unused-vars
        const [v1, grn, productId, batchId, batchNo, serialNo] = parts;

        const transfer = rows.find(r => r.id === expandedId);
        if (!transfer) return;

        // Find if this item exists in transfer
        let found = false;
        (transfer.items || []).forEach(it => {
            if (it.productId === productId) {
                // Check reservations
                (it.reservations || []).forEach(res => {
                    if (res.batchId === batchId) {
                        found = true;
                    }
                });
            }
        });

        if (found) {
            const key = serialNo || batchId;
            setScannedKeys(prev => {
                const next = new Set(prev);
                next.add(key);
                return next;
            });
            toast.success("Verified: " + (serialNo || batchNo));
        } else {
            toast.warn("Item not in this transfer: " + batchNo);
        }
    };

    return (
        <Container style={{ width: "90vw", maxWidth: 1200, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={{ fontSize: "1.5rem" }}>Transfers Inbox</h2>
                    <input value={toLocationId} onChange={e => setToLocationId(e.target.value)} className="form-control" style={{ maxWidth: 280 }} />
                </div>

                <Table hover responsive>
                    <thead>
                        <tr><th>TR No</th><th>From</th><th>To</th><th>Items</th><th>Status</th><th>Actions</th></tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <React.Fragment key={r.id}>
                                <tr style={{ cursor: 'pointer', backgroundColor: expandedId === r.id ? '#f8f9fa' : 'inherit' }} onClick={() => {
                                    if (expandedId === r.id) setExpandedId(null);
                                    else { setExpandedId(r.id); setScanInput(""); setScannedKeys(new Set()); }
                                }}>
                                    <td>{r.trNumber}</td>
                                    <td>{r.fromLocationId}</td>
                                    <td>{r.toLocationId}</td>
                                    <td>{(r.items || []).length} items</td>
                                    <td><Badge bg="warning">Pending</Badge></td>
                                    <td onClick={e => e.stopPropagation()}>
                                        <Button size="sm" onClick={() => onAccept(r.id)} className="me-2">Accept</Button>
                                        <Button size="sm" variant="outline-danger" onClick={() => onReject(r.id)}>Reject</Button>
                                    </td>
                                </tr>
                                {expandedId === r.id && (
                                    <tr>
                                        <td colSpan={6} className="bg-light p-3">
                                            <div className="mb-3 p-2 bg-white border rounded">
                                                <div className="d-flex justify-content-between align-items-center mb-2">
                                                    <strong>Verify Items</strong>
                                                    <input
                                                        className="form-control form-control-sm"
                                                        style={{ maxWidth: 300 }}
                                                        placeholder="Scan QR to verify..."
                                                        value={scanInput}
                                                        onChange={e => setScanInput(e.target.value)}
                                                        onKeyDown={e => {
                                                            if (e.key === 'Enter') {
                                                                e.preventDefault();
                                                                handleScan(scanInput);
                                                                setScanInput("");
                                                            }
                                                        }}
                                                        autoFocus
                                                    />
                                                </div>
                                                <Table size="sm" className="mb-0">
                                                    <thead><tr><th>Product</th><th>Qty</th><th>Batches</th><th>Verification</th></tr></thead>
                                                    <tbody>
                                                        {(r.items || []).map((it, idx) => (
                                                            <tr key={idx}>
                                                                <td>{it.productNameSnapshot} <span className="text-muted small">({it.sku})</span></td>
                                                                <td>{it.qty}</td>
                                                                <td>
                                                                    {(it.reservations || []).map(res => (
                                                                        <div key={res.batchId}>
                                                                            <span className="badge bg-secondary me-1">{res.reservedQty}</span>
                                                                            <small className="text-muted">Batch: {res.batchNumber || res.batchId}</small>
                                                                        </div>
                                                                    ))}
                                                                </td>
                                                                <td>
                                                                    {(it.reservations || []).some(res => scannedKeys.has(res.batchId) || (res.serials || []).some(s => scannedKeys.has(s))) ? (
                                                                        <Badge bg="success">Verified</Badge>
                                                                    ) : (
                                                                        <Badge bg="light" text="dark">Not Verified</Badge>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </Table>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                        {rows.length === 0 && <tr><td colSpan={6} className="text-center">No pending transfers</td></tr>}
                    </tbody>
                </Table>
            </div>
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
