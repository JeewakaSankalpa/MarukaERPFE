import React, { useEffect, useState } from 'react';
import { Card, Button, Table, Spinner } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../api/api';
import { QRCodeSVG as QRCode } from 'qrcode.react';

/**
 * Component to display project inventory, consumption, and transfers.
 *
 * @component
 * @param {Object} props
 * @param {string} props.projectId - Project ID
 */
export default function ProjectInventoryCard({ projectId }) {
    const [inventory, setInventory] = useState([]);
    const [loading, setLoading] = useState(false);

    // Consume state
    const [showConsume, setShowConsume] = useState(false);
    const [consumeData, setConsumeData] = useState({ productId: '', quantity: '', note: '' });

    // Return state
    const [showReturn, setShowReturn] = useState(false);
    const [returnData, setReturnData] = useState({ productId: '', batchId: '', quantity: '', reason: '' });
    const [returnBatches, setReturnBatches] = useState([]); // Batches for the selected return product
    const [selectedReturnSerials, setSelectedReturnSerials] = useState({}); // { batchId: Set(serials) }

    const [submitting, setSubmitting] = useState(false);

    const [pendingTransfers, setPendingTransfers] = useState([]);

    // Batch View State
    const [showBatchModal, setShowBatchModal] = useState(false);
    const [selectedBatches, setSelectedBatches] = useState([]);
    const [selectedProductName, setSelectedProductName] = useState("");

    const handleViewBatches = async (product) => {
        try {
            setSelectedProductName(product.productName);
            const res = await api.get(`/inventory/batches?productId=${product.productId}`);
            const projectLoc = `PROJ:${projectId}`;
            const filtered = (res.data || []).filter(b => b.locationId === projectLoc); // Or ownerType=PROJECT ownerId=projectId
            // Note: TransferService uses ownerType/ownerId. Check API returns.
            // If filtering locally, ensure criteria matches backend logic.
            // Better: use filtered API if available.
            setSelectedBatches(filtered);
            setShowBatchModal(true);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load batches");
        }
    };

    useEffect(() => { load(); }, [projectId]);

    const load = async () => {
        if (!projectId) return;
        try {
            setLoading(true);
            const [invRes, trRes] = await Promise.all([
                api.get(`/inventory/project/${projectId}`),
                api.get(`/transfers?status=PENDING_ACCEPTANCE&toLocationId=${encodeURIComponent(projectId)}`)
            ]);

            setInventory(invRes.data || []);
            setPendingTransfers(trRes.data || []);
        } catch (e) {
            console.error('Failed to load inventory or transfers:', e);
            console.error('Error response:', e?.response?.data);
            toast.error('Failed to load inventory or transfers');
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptTransfer = async (id) => {
        try {
            await api.patch(`/transfers/${id}/accept`);
            toast.success("Transfer accepted");
            load();
        } catch (e) {
            toast.error("Failed to accept transfer");
        }
    };

    const handleRejectTransfer = async (id) => {
        if (!window.confirm("Reject this transfer?")) return;
        try {
            await api.patch(`/transfers/${id}/reject`);
            toast.info("Transfer rejected");
            load();
        } catch (e) {
            toast.error("Failed to reject transfer");
        }
    };

    const handleConsume = async () => {
        if (!consumeData.productId || !consumeData.quantity) {
            toast.warn('Product and Quantity are required');
            return;
        }
        try {
            setSubmitting(true);
            await api.post('/consumptions', {
                projectId,
                items: [{
                    productId: consumeData.productId,
                    quantity: Number(consumeData.quantity),
                    serials: consumeData.serials ? consumeData.serials.split(',').map(s => s.trim()).filter(s => s) : [],
                    note: consumeData.note
                }]
            });
            toast.success('Items consumed');
            setShowConsume(false);
            setConsumeData({ productId: '', quantity: '', note: '' });
            load();
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to consume items');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSelectReturnProduct = async (pid) => {
        setReturnData({ ...returnData, productId: pid, batchId: '' });
        if (!pid) {
            setReturnBatches([]);
            return;
        }
        // Fetch batches for this product in this project
        // Note: We need to filter by current Project ownership.
        // Re-using logic: GET /inventory/batches?productId=... then filter?
        try {
            const res = await api.get(`/inventory/batches?productId=${pid}`);
            // Filter where ownerId == projectId (assuming "PROJECT" ownership)
            // Or locationId == PROJ:{id}
            const filtered = (res.data || []).filter(b => b.ownerId === projectId && b.quantity > 0);
            setReturnBatches(filtered);
            setSelectedReturnSerials({});
        } catch (e) {
            console.error("Failed to fetch batches", e);
        }
    };

    const toggleReturnSerial = (batchId, serial) => {
        setSelectedReturnSerials(prev => {
            const batchSet = new Set(prev[batchId] || []);
            if (batchSet.has(serial)) batchSet.delete(serial);
            else batchSet.add(serial);

            const next = { ...prev };
            if (batchSet.size === 0) delete next[batchId];
            else next[batchId] = batchSet;

            // Auto-update quantity based on total selected serials
            const total = Object.values(next).reduce((sum, s) => sum + s.size, 0);
            setReturnData(d => ({ ...d, quantity: total || '' }));

            return next;
        });
    };

    const handleReturn = async () => {
        if (!returnData.productId || !returnData.quantity) {
            toast.warn('Product and Quantity are required');
            return;
        }
        try {
            setSubmitting(true);

            // Build items payload
            // If serials selected, group by batch.
            // If no serials selected but quantity entered, use single item (FIFO or selected batch).
            const items = [];
            const hasSerials = Object.keys(selectedReturnSerials).length > 0;

            if (hasSerials) {
                // Mult-batch / Multi-serial mode
                for (const [bId, set] of Object.entries(selectedReturnSerials)) {
                    if (set.size > 0) {
                        items.push({
                            productId: returnData.productId,
                            quantity: set.size,
                            batchId: bId,
                            serials: Array.from(set),
                            reason: returnData.reason
                        });
                    }
                }
            } else {
                // Legacy / Manual mode
                items.push({
                    productId: returnData.productId,
                    quantity: Number(returnData.quantity),
                    batchId: returnData.batchId, // Send optional batchId
                    serials: returnData.serials ? returnData.serials.split(',').map(s => s.trim()).filter(s => s) : [],
                    reason: returnData.reason
                });
            }

            if (items.length === 0) { toast.warn("No items to return"); setSubmitting(false); return; }

            await api.post('/inventory/returns/internal', {
                projectId,
                fromType: 'PROJECT',
                items: items
            });
            toast.success('Return request created');
            setShowReturn(false);
            setShowReturn(false);
            setReturnData({ productId: '', batchId: '', quantity: '', reason: '' });
            setSelectedReturnSerials({});
        } catch (e) {
            toast.error(e?.response?.data?.message || 'Failed to create return request');
        } finally {
            setSubmitting(false);
        }
    };

    const handleScan = (qrValue, mode) => {
        if (!qrValue) return;
        // Format: V1|grnId|productId|batchId|batchNo|serialNo|expiryDate
        const parts = qrValue.split('|');
        if (parts.length < 5 || parts[0] !== 'V1') {
            toast.error("Invalid QR Code format");
            return;
        }

        const [_, grnId, productId, batchId, batchNo, serialNo, expiryDate] = parts;

        if (mode === 'CONSUME') {
            setConsumeData(prev => {
                // If product matches or is empty
                if (prev.productId && prev.productId !== productId) {
                    toast.warn("Scanned product does not match selected product. Resetting selection.");
                    return {
                        productId,
                        quantity: 1,
                        serials: serialNo ? serialNo : '',
                        note: prev.note
                    };
                }

                // If same product, append logic
                let newSerials = prev.serials ? prev.serials.split(',').map(s => s.trim()).filter(s => s) : [];
                if (serialNo && !newSerials.includes(serialNo)) {
                    newSerials.push(serialNo);
                }

                // If serialized, qty = count of serials. Else increment.
                let newQty = Number(prev.quantity || 0);
                if (serialNo) {
                    newQty = newSerials.length;
                } else {
                    newQty += 1;
                }

                return {
                    ...prev,
                    productId,
                    quantity: newQty,
                    serials: newSerials.join(', ')
                };
            });
            toast.success(`Scanned: ${serialNo || productId}`);
        } else if (mode === 'RETURN') {
            setReturnData(prev => {
                if (prev.productId && prev.productId !== productId) {
                    toast.warn("Scanned product does not match selected product. Resetting.");
                    // Re-fetch batches for new product
                    handleSelectReturnProduct(productId);
                    return {
                        productId,
                        batchId: batchId || '',
                        quantity: 1,
                        serials: serialNo ? serialNo : '',
                        quantity: '', // Quantity will be derived from selectedReturnSerials or incremented
                        reason: prev.reason
                    };
                }

                if (prev.productId !== productId) {
                    handleSelectReturnProduct(productId);
                }

                // Logic to update selectedReturnSerials directly
                // We need to access the state setter outside this callback or use a refined approach.
                // Since we are inside setReturnData setter, we can't easily set other state.
                // So we'll handle state updates sequentially *outside*.
                return {
                    ...prev,
                    productId,
                    batchId: batchId || prev.batchId,
                    // quantity: updated later via sync
                };
            });

            // Update Serial State
            if (batchId && serialNo) {
                setSelectedReturnSerials(prev => {
                    const batchSet = new Set(prev[batchId] || []);
                    batchSet.add(serialNo);

                    const next = { ...prev };
                    next[batchId] = batchSet;

                    // Sync quantity
                    const total = Object.values(next).reduce((sum, s) => sum + s.size, 0);
                    setReturnData(d => ({ ...d, quantity: total || 1 })); // Default to 1 if 0? No, if serials exist, count them.

                    return next;
                });
            } else {
                // Non-serialized scan: just increment qty
                setReturnData(prev => ({ ...prev, quantity: Number(prev.quantity || 0) + 1 }));
            }

            toast.success(`Scanned: ${serialNo || productId}`);
        }
    };

    return (
        <Card className="h-100 mt-3">
            <Card.Header className="d-flex justify-content-between align-items-center">
                <span>Project Inventory</span>
                <div className="d-flex gap-2">
                    <Button size="sm" variant="outline-primary" onClick={() => window.location.href = `#/item/requests?projectId=${projectId}`} disabled={!projectId}>
                        Request Item
                    </Button>
                    <Button size="sm" variant="outline-danger" onClick={() => setShowReturn(true)} disabled={!projectId}>
                        Return Items
                    </Button>
                    <Button size="sm" variant="primary" onClick={() => setShowConsume(true)} disabled={!projectId}>
                        Consume Items
                    </Button>
                </div>
            </Card.Header>
            <Card.Body>
                {loading && <div className="text-muted small"><Spinner size="sm" /> Loading...</div>}
                {!loading && inventory.length === 0 && <div className="text-muted">No inventory records found.</div>}
                {!loading && inventory.length > 0 && (
                    <Table size="sm" bordered hover responsive>
                        <thead>
                            <tr>
                                <th>Product</th>
                                <th className="text-end">Requested</th>
                                <th className="text-end">Received</th>
                                <th className="text-end">Consumed</th>
                                <th className="text-end">On Hand</th>
                                <th className="text-center">QR</th>
                            </tr>
                        </thead>
                        <tbody>
                            {inventory.map(i => (
                                <tr key={i.productId}>
                                    <td>{i.productName}</td>
                                    <td className="text-end">{i.requestedQty}</td>
                                    <td className="text-end">{i.receivedQty}</td>
                                    <td className="text-end">{i.consumedQty}</td>
                                    <td className="text-end fw-bold">{i.onHandQty}</td>
                                    <td className="text-center">
                                        <Button size="sm" variant="light" onClick={() => handleViewBatches(i)}>
                                            <i className="bi bi-qr-code"></i> View
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}

                {/* Batch/QR Modal */}
                {showBatchModal && (
                    <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
                        <div className="modal-dialog modal-lg">
                            <div className="modal-content">
                                <div className="modal-header">
                                    <h5 className="modal-title">Batches: {selectedProductName}</h5>
                                    <button type="button" className="btn-close" onClick={() => setShowBatchModal(false)}></button>
                                </div>
                                <div className="modal-body">
                                    {selectedBatches.length === 0 ? <p>No batches found in this location.</p> : (
                                        <div className="row g-3">
                                            {selectedBatches.map(b => (
                                                <div key={b.id} className="col-md-4">
                                                    <div className="card h-100 p-2 text-center">
                                                        <div className="mb-2 d-flex justify-content-center">
                                                            <QRCode
                                                                value={`V1|${b.grnId || ''}|${b.productId || ''}|${b.id}|${b.batchNumber}||${b.expiryDate || ''}`}
                                                                size={100}
                                                                level={"M"}
                                                            />
                                                        </div>
                                                        <strong>{b.batchNumber}</strong>
                                                        <div className="small">Qty: {b.quantity}</div>
                                                        <div className="small text-muted">Cost: {b.costPrice ? Number(b.costPrice).toFixed(2) : '-'}</div>
                                                        <div className="small text-muted">Exp: {b.expiryDate || '-'}</div>
                                                        {b.serials && b.serials.length > 0 && (
                                                            <div className="mt-1">
                                                                {b.serials.map(s => <span key={s} className="badge bg-secondary me-1">{s}</span>)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <Button variant="secondary" onClick={() => setShowBatchModal(false)}>Close</Button>
                                    {selectedBatches.length > 0 && <Button variant="primary" onClick={() => window.print()}>Print</Button>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <h5 className="mt-4">Incoming Transfers (Pending Acceptance)</h5>
                {loading && <div className="text-muted small"><Spinner size="sm" /> Loading transfers...</div>}
                {!loading && pendingTransfers.length === 0 && <div className="text-muted small">No pending transfers.</div>}
                {!loading && pendingTransfers.length > 0 && (
                    <Table size="sm" bordered hover responsive>
                        <thead>
                            <tr>
                                <th>TR No</th>
                                <th>From</th>
                                <th>Items</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pendingTransfers.map(t => (
                                <tr key={t.id}>
                                    <td>{t.trNumber}</td>
                                    <td>{t.fromLocationId}</td>
                                    <td>
                                        {t.items?.map((item, idx) => {
                                            const qty = item.qty || (item.reservations || []).reduce((s, r) => s + r.reservedQty, 0);
                                            const name = item.productNameSnapshot || item.productId;
                                            return (
                                                <div key={idx} className="small">
                                                    <strong>{name}</strong>: {qty} {item.unit || ''}
                                                </div>
                                            );
                                        })}
                                    </td>
                                    <td>
                                        <Button size="sm" variant="success" className="me-1" onClick={() => handleAcceptTransfer(t.id)}>Accept</Button>
                                        <Button size="sm" variant="danger" onClick={() => handleRejectTransfer(t.id)}>Reject</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card.Body>

            {/* Consume Modal */}
            {showConsume && (
                <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Consume Items</h5>
                                <button type="button" className="btn-close" onClick={() => setShowConsume(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3 p-2 bg-light rounded border">
                                    <label className="form-label small fw-bold">Scan QR to Add</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Click here and scan QR..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleScan(e.target.value, 'CONSUME');
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <div className="form-text small">Scan item to auto-select and increment qty.</div>
                                </div>
                                <form>
                                    <div className="mb-3">
                                        <label className="form-label">Product</label>
                                        <select
                                            className="form-select"
                                            value={consumeData.productId}
                                            onChange={(e) => {
                                                setConsumeData({ ...consumeData, productId: e.target.value });
                                            }}
                                        >
                                            <option value="">Select Product</option>
                                            {inventory.map(i => (
                                                <option key={i.productId} value={i.productId}>{i.productName} (Avail: {i.onHandQty})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Quantity</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={consumeData.quantity}
                                            onChange={(e) => setConsumeData({ ...consumeData, quantity: e.target.value })}
                                            min="1"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Serial Numbers (Optional)</label>
                                        <textarea
                                            className="form-control"
                                            placeholder="Enter serial numbers separated by comma"
                                            value={consumeData.serials || ''}
                                            onChange={(e) => setConsumeData({ ...consumeData, serials: e.target.value })}
                                            rows={2}
                                        />
                                        <small className="text-muted">For serial-tracked items, enter serials here.</small>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Note</label>
                                        <textarea
                                            className="form-control"
                                            value={consumeData.note}
                                            onChange={(e) => setConsumeData({ ...consumeData, note: e.target.value })}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowConsume(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleConsume} disabled={submitting}>
                                    {submitting ? 'Processing...' : 'Consume'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Return Modal */}
            {showReturn && (
                <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1">
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Return to Stores</h5>
                                <button type="button" className="btn-close" onClick={() => setShowReturn(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3 p-2 bg-light rounded border">
                                    <label className="form-label small fw-bold">Scan QR to Add</label>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Click here and scan QR..."
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleScan(e.target.value, 'RETURN');
                                                e.target.value = '';
                                            }
                                        }}
                                    />
                                    <div className="form-text small">Scan item to auto-select and increment qty.</div>
                                </div>
                                <form>
                                    <div className="mb-3">
                                        <label className="form-label">Product</label>
                                        <select
                                            className="form-select"
                                            value={returnData.productId}
                                            onChange={(e) => handleSelectReturnProduct(e.target.value)}
                                        >
                                            <option value="">Select Product</option>
                                            {inventory.map(i => (
                                                <option key={i.productId} value={i.productId}>{i.productName} (Avail: {i.onHandQty})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Batch / Serial No</label>
                                        <select
                                            className="form-select"
                                            value={returnData.batchId}
                                            onChange={(e) => setReturnData({ ...returnData, batchId: e.target.value })}
                                            disabled={!returnData.productId}
                                        >
                                            <option value="">Any Batch / FIFO</option>
                                            {returnBatches.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.batchNumber ? b.batchNumber : '(No Batch No)'} - Qty: {b.quantity} {b.costPrice ? `($${Number(b.costPrice).toFixed(2)})` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Multi-Select Serials (New Feature) */}
                                    {returnData.productId && returnBatches.some(b => b.serials && b.serials.length > 0) && (
                                        <div className="mb-3 border rounded p-2 bg-light">
                                            <label className="form-label small fw-bold">Select Specific Serials (Multi-select)</label>
                                            <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                                {returnBatches.map(b => {
                                                    if (!b.serials || b.serials.length === 0) return null;
                                                    // Only show if "Any Batch" or this batch is selected
                                                    if (returnData.batchId && returnData.batchId !== b.id) return null;

                                                    return (
                                                        <div key={b.id} className="mb-2">
                                                            <div className="small fw-semibold text-muted">Batch: {b.batchNumber}</div>
                                                            <div className="d-flex flex-wrap gap-2">
                                                                {b.serials.map(s => {
                                                                    const isChecked = selectedReturnSerials[b.id]?.has(s);
                                                                    return (
                                                                        <div key={s} className="form-check form-check-inline mb-0">
                                                                            <input
                                                                                className="form-check-input"
                                                                                type="checkbox"
                                                                                id={`ser-${b.id}-${s}`}
                                                                                checked={!!isChecked}
                                                                                onChange={() => toggleReturnSerial(b.id, s)}
                                                                            />
                                                                            <label className="form-check-label small" htmlFor={`ser-${b.id}-${s}`}>
                                                                                {s}
                                                                            </label>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="form-text small text-primary">
                                                Selecting serials will auto-update quantity and handle batch splitting.
                                            </div>
                                        </div>
                                    )}

                                    <div className="mb-3">
                                        <label className="form-label">Quantity</label>
                                        <input
                                            type="number"
                                            className="form-control"
                                            value={returnData.quantity}
                                            onChange={(e) => setReturnData({ ...returnData, quantity: e.target.value })}
                                            min="1"
                                        />
                                    </div>
                                    {/* Legacy Serial Input Removed in favor of Multi-select above */}
                                    {/* If manual serial entry is absolutely needed for non-batched items, we can re-enable it or add a small toggle. 
                            For now, consolidating per user request. */}
                                    <div className="mb-3">
                                        <label className="form-label">Reason</label>
                                        <textarea
                                            className="form-control"
                                            value={returnData.reason}
                                            onChange={(e) => setReturnData({ ...returnData, reason: e.target.value })}
                                        />
                                    </div>
                                </form>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowReturn(false)}>Cancel</button>
                                <button type="button" className="btn btn-primary" onClick={handleReturn} disabled={submitting}>
                                    {submitting ? 'Submitting...' : 'Return Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Card>
    );
}
