import React, { useState, useEffect } from "react";
import { Modal, Button, Table, Row, Col, Alert, Form } from "react-bootstrap";
import { toast } from "react-toastify";
import api from "../../api/api";

export default function GRNReturnModal({ grn, onClose }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [returnQty, setReturnQty] = useState({}); // batch.id -> quantity
    const [returnInvoiceNumber, setReturnInvoiceNumber] = useState('');
    const [returnNote, setReturnNote] = useState('');
    const [pendingReturns, setPendingReturns] = useState([]);

    useEffect(() => {
        if (!grn) return;
        const generateReturnNo = () => {
            const date = new Date();
            const day = date.toISOString().slice(0, 10);
            setReturnInvoiceNumber(`GRN-${grn.grnNumber}-RET-${day}`);
        };
        generateReturnNo();

        const fetchData = async () => {
            setLoading(true);
            try {
                // Fetch live batches for this GRN and ALL pending supplier returns simultaneously
                const [batchRes, pendingRes] = await Promise.all([
                    api.get(`/inventory/batches?grnId=${grn.id}`),
                    api.get(`/inventory/returns/supplier?status=PENDING&size=1000`)
                ]);
                
                setBatches(batchRes.data || []);
                setPendingReturns(pendingRes.data?.content || pendingRes.data || []);
            } catch (e) {
                console.error("Failed to fetch return data:", e);
                toast.error("Failed to load inventory or pending approval data for this GRN.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [grn]);

    const handleQtyChange = (batchId, val, maxQty) => {
        let v = Number(val);
        if (v < 0) v = 0;
        if (v > maxQty) v = maxQty;
        setReturnQty(prev => ({ ...prev, [batchId]: v }));
    };

    const handleSubmit = async () => {
        // Collect items to return
        const returnItems = batches
            .filter(b => returnQty[b.id] > 0)
            .map(b => {
                const bNum = String(b.batchNumber || b.batchNo);
                const originalItem = grn.items?.find(i => 
                    i.batches?.some(sb => String(sb.batchNo) === bNum)
                ) || grn.items?.find(i => String(i.productId) === String(b.productId || b.product?.id) || i.productNameSnapshot === b.productNameSnapshot);

                return {
                    supplierId: grn.supplierId || "UNKNOWN",
                    supplierName: grn.supplierNameSnapshot || "Unknown",
                    productId: b.productId || b.product?.id,
                    productName: b.productNameSnapshot || originalItem?.productNameSnapshot || "Unknown Product",
                    batchId: b.id, // The inventory batch ID
                    batchNo: b.batchNumber || b.batchNo,
                    quantity: returnQty[b.id],
                    reason: returnNote.trim() || `Returned from GRN ${grn.grnNumber}`
                };
            });

        if (returnItems.length === 0) {
            toast.warn("Please enter a return quantity for at least one item.");
            return;
        }

        const storeId = localStorage.getItem("store") || grn.locationId || "LOC_STORES_MAIN";
        const createdBy = localStorage.getItem("firstName") || "Admin";

        setSubmitting(true);
        try {
            // Execute returns iteratively due to backend accepting a single item object
            const promises = returnItems.map(item => api.post('/inventory/returns/supplier', item));
            await Promise.all(promises);
            
            toast.success("Return processed successfully");
            onClose();
        } catch (e) {
            console.error("Return submission failed:", e);
            toast.error(e.response?.data?.message || "Failed to process supplier return");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal show={true} onHide={onClose} size="xl">
            <Modal.Header closeButton>
                <Modal.Title>Return to Supplier (GRN: {grn.grnNumber})</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Row className="mb-3">
                    <Col md={4}><strong>Supplier:</strong> {grn.supplierNameSnapshot}</Col>
                    <Col md={4}><strong>Supplier Invoice No:</strong> {grn.supplierInvoiceNo || "-"}</Col>
                    <Col md={4}><strong>Return Ref No:</strong> {returnInvoiceNumber}</Col>
                </Row>
                <Alert variant="info">
                    Select the quantity to return for each available batch. You cannot return more than the currently available inventory quantity.
                </Alert>

                {loading ? (
                    <div className="text-center py-4">Loading active inventory batches...</div>
                ) : (
                    <div className="table-responsive">
                        <Table size="sm" bordered hover>
                            <thead className="bg-light">
                                <tr>
                                    <th>Product Name</th>
                                    <th>Batch Number</th>
                                    <th className="text-center">Location</th>
                                    <th className="text-end">Original Qty</th>
                                    <th className="text-end text-warning">Waiting Approval</th>
                                    <th className="text-end text-success">Available Space/Qty</th>
                                    <th style={{ width: 140 }}>Return Qty</th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.length === 0 ? (
                                    <tr><td colSpan="7" className="text-center text-muted">No available inventory found for this GRN.</td></tr>
                                ) : (
                                    batches.map(b => {
                                        // Try to find original info from GRN items by matching batch number
                                        const bNum = String(b.batchNumber || b.batchNo);
                                        const originalItem = grn.items?.find(i => 
                                            i.batches?.some(sb => String(sb.batchNo) === bNum)
                                        ) || grn.items?.find(i => String(i.productId) === String(b.productId || b.product?.id) || i.productNameSnapshot === b.productNameSnapshot);
                                        
                                        // Original Qty logic
                                        let origQty = "-";
                                        if (originalItem) {
                                            const subBatch = originalItem.batches?.find(sb => String(sb.batchNo) === bNum);
                                            origQty = subBatch ? subBatch.qty : originalItem.receivedQty;
                                        }

                                        let available = (b.freeQuantity !== undefined && b.freeQuantity !== null) ? b.freeQuantity
                                            : (b.free !== undefined && b.free !== null) ? b.free 
                                            : ((b.quantity || 0) > 0 ? b.quantity : 0);
                                        
                                        // Calculate pending waiting approvals for this batch
                                        const pendingForThisBatch = pendingReturns
                                            .filter(pr => String(pr.batchId) === String(b.id) || String(pr.batchNo) === bNum)
                                            .reduce((sum, pr) => sum + (pr.quantity || 0), 0);

                                        const isOrigNumber = !isNaN(Number(origQty)) && origQty !== "-";
                                        const maxQtyCap = isOrigNumber ? Math.min(available, Number(origQty)) : available;
                                        
                                        // Final absolute max limit minus any stock currently locked in pending return steps
                                        const maxQty = Math.max(0, maxQtyCap - pendingForThisBatch);

                                        const locationLabel = b.ownerType === 'PROJECT' ? `Proj: ${b.ownerId}` :
                                            b.ownerType === 'DEPARTMENT' ? `Dept: ${b.ownerId}` :
                                            (b.locationId === 'LOC_STORES_MAIN' ? 'Main Store' : b.locationId || "Main Store");

                                        return (
                                            <tr key={b.id}>
                                                <td>{b.productNameSnapshot || originalItem?.productNameSnapshot || b.productId || b.product?.id}</td>
                                                <td>{b.batchNumber || b.batchNo}</td>
                                                <td className="text-center">{locationLabel}</td>
                                                <td className="text-end">{origQty}</td>
                                                <td className="text-end text-warning fw-bold">{pendingForThisBatch > 0 ? pendingForThisBatch : '-'}</td>
                                                <td className="text-end text-success fw-bold">{maxQty}</td>
                                                <td>
                                                    <Form.Control 
                                                        type="number" 
                                                        size="sm"
                                                        min={0}
                                                        max={maxQty}
                                                        value={returnQty[b.id] || ""}
                                                        onChange={(e) => handleQtyChange(b.id, e.target.value, maxQty)}
                                                        disabled={maxQty === 0}
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </Table>
                    </div>
                )}
                
                {!loading && batches.length > 0 && (
                    <div className="mt-3">
                        <Form.Group>
                            <Form.Label fw="bold">Return Note</Form.Label>
                            <Form.Control 
                                as="textarea" 
                                rows={2} 
                                value={returnNote} 
                                onChange={(e) => setReturnNote(e.target.value)} 
                                placeholder="Enter reason for return (optional)"
                            />
                        </Form.Group>
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose} disabled={submitting}>Cancel</Button>
                <Button variant="danger" onClick={handleSubmit} disabled={submitting || batches.length === 0}>
                    {submitting ? "Processing..." : "Process Return"}
                </Button>
            </Modal.Footer>
        </Modal>
    );
}
