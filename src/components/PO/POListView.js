import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import { Container, Button, Form, Table, Badge, Modal } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";

/* ========== INLINE API HELPERS ========== */
const qp = (o = {}) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v)); return u.toString(); };
const listPOs = async ({ q, status, page = 0, size = 10 }) =>
    (await api.get(`/pos?${qp({ q, status, page, size, sort: "createdAt,desc" })}`)).data;
const markSent = async (id, email) => (await api.patch(`/pos/${id}/send?email=${encodeURIComponent(email || "")}`)).data;
const setEta = async (id, etaDate) => (await api.patch(`/pos/${id}/eta`, { etaDate })).data;
const getSupplier = async (id) => (await api.get(`/suppliers/${id}`)).data;
const cancelPOApi = async (id, reason) => (await api.patch(`/pos/${id}/cancel`, { reason })).data;
const returnPOApi = async (id, reason) => (await api.patch(`/pos/${id}/return`, { reason })).data;

/* ========== RECEIPT STATUS BADGE ========== */
const receiptBadge = (receiptStatus) => {
    if (receiptStatus === 'FULLY_RECEIVED')     return <Badge bg="success">Fully Received</Badge>;
    if (receiptStatus === 'PARTIALLY_RECEIVED') return <Badge bg="warning" text="dark">Partially Received</Badge>;
    return <Badge bg="secondary">Not Received</Badge>;
};

export default function POListView({ onOpenGRN }) {
    const navigate = useNavigate();
    const [q, setQ] = useState(""); const [status, setStatus] = useState("");
    const [page, setPage] = useState(0); const [size] = useState(10);
    const [data, setData] = useState({ content: [], totalPages: 0 });

    // ETA State
    const [etaFor, setEtaFor] = useState(null); const [etaDate, setEtaDate] = useState("");

    // Send/Email State
    const [sendFor, setSendFor] = useState(null);
    const [sendEmailAddr, setSendEmailAddr] = useState("");
    const [sending, setSending] = useState(false);

    // Cancel Modal State
    const [cancelFor, setCancelFor] = useState(null);
    const [cancelReason, setCancelReason] = useState("");
    const [cancelling, setCancelling] = useState(false);

    // Return Modal State
    const [returnFor, setReturnFor] = useState(null);
    const [returnReason, setReturnReason] = useState("");
    const [returning, setReturning] = useState(false);

    const load = async () => {
        try { setData(await listPOs({ q, status, page, size })); }
        catch { toast.error("Failed to load POs"); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { load(); }, [page, status, q]);

    const openSendModal = async (po) => {
        setSendFor(po.id);
        setSendEmailAddr("");
        try {
            if (po.supplierId) {
                const sup = await getSupplier(po.supplierId);
                if (sup && sup.email) setSendEmailAddr(sup.email);
            }
        } catch {
            // ignore if supplier fetch fails
        }
    };

    const confirmSend = async () => {
        if (!sendFor) return;
        setSending(true);
        try {
            await markSent(sendFor, sendEmailAddr);
            toast.success("Marked as sent & email dispatched");
            setSendFor(null);
            load();
        } catch (e) {
            toast.error("Failed to send PO");
        } finally {
            setSending(false);
        }
    };

    const openEta = (id) => { setEtaFor(id); setEtaDate(""); };
    const saveEta = async () => { await setEta(etaFor, etaDate); setEtaFor(null); toast.success("ETA updated"); load(); };

    /* ---- Cancel ---- */
    const openCancelModal = (po) => { setCancelFor(po.id); setCancelReason(""); };
    const confirmCancel = async () => {
        if (!cancelFor) return;
        setCancelling(true);
        try {
            await cancelPOApi(cancelFor, cancelReason);
            toast.success("Purchase Order cancelled successfully");
            setCancelFor(null);
            load();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to cancel PO");
        } finally {
            setCancelling(false);
        }
    };

    /* ---- Return ---- */
    const openReturnModal = (po) => { setReturnFor(po.id); setReturnReason(""); };
    const confirmReturn = async () => {
        if (!returnFor) return;
        setReturning(true);
        try {
            await returnPOApi(returnFor, returnReason);
            toast.success("Return initiated successfully");
            setReturnFor(null);
            load();
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to initiate return");
        } finally {
            setReturning(false);
        }
    };

    const approvalBadge = (approvalStatus) => {
        const color = approvalStatus === 'APPROVED' ? 'success'
            : approvalStatus === 'PENDING_APPROVAL' ? 'warning'
            : approvalStatus === 'REJECTED' ? 'danger' : 'secondary';
        return (
            <Badge bg={color} text={color === 'warning' ? 'dark' : 'white'}>
                {approvalStatus || 'DRAFT'}
            </Badge>
        );
    };

    return (
        <Container className="py-4">
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="d-flex align-items-center mb-4">
                        <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                        <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Purchase Orders</h2>
                    </div>
                    <div className="d-flex gap-2">
                        <Form.Select value={status} onChange={e => setStatus(e.target.value)} style={{ maxWidth: 220 }}>
                            <option value="">All Statuses</option>
                            <option value="CREATED">CREATED</option>
                            <option value="SENT_TO_SUPPLIER">SENT_TO_SUPPLIER</option>
                            <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
                            <option value="FULLY_RECEIVED">FULLY_RECEIVED</option>
                            <option value="CONFIRMED">CONFIRMED</option>
                            <option value="CANCELLED">CANCELLED</option>
                            <option value="CLOSED">CLOSED (Returned)</option>
                        </Form.Select>
                        <Form.Control placeholder="Search PO# / Supplier" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 260 }} />
                        <Button variant="outline-secondary" onClick={() => { setPage(0); load(); }}>Search</Button>
                    </div>
                </div>

                <Table hover responsive>
                    <thead>
                        <tr>
                            <th>PO No</th>
                            <th>Supplier</th>
                            <th>Items</th>
                            <th>Status</th>
                            <th>Receipt Status</th>
                            <th>Approval</th>
                            <th className="text-end">Grand Total</th>
                            <th>ETA</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.content || []).map(po => {
                            const receiptStatus = po.receiptStatus || 'NOT_RECEIVED';
                            const isCancelled = po.status === 'CANCELLED' || po.status === 'CLOSED';
                            const canCancel = !isCancelled && receiptStatus === 'NOT_RECEIVED';
                            const canReturn = !isCancelled && (receiptStatus === 'FULLY_RECEIVED' || receiptStatus === 'PARTIALLY_RECEIVED');

                            return (
                                <tr key={po.id} style={isCancelled ? { opacity: 0.65, background: '#f8f9fa' } : {}}>
                                    <td>
                                        {po.poNumber}
                                        {po.status === 'CANCELLED' && (
                                            <Badge bg="danger" className="ms-2" style={{ fontSize: '0.7rem' }}>CANCELLED</Badge>
                                        )}
                                        {po.status === 'CLOSED' && (
                                            <Badge bg="dark" className="ms-2" style={{ fontSize: '0.7rem' }}>RETURNED</Badge>
                                        )}
                                    </td>
                                    <td>{po.supplierNameSnapshot || po.supplierName}</td>
                                    <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {(po.items || []).map(i => `${i.productNameSnapshot || i.productName} x${i.orderedQty}`).slice(0, 2).join(", ")}{(po.items?.length > 2) ? "…" : ""}
                                    </td>
                                    <td>
                                        <Badge bg={
                                            po.status === "FULLY_RECEIVED" ? "success" :
                                                po.status === "PARTIALLY_RECEIVED" ? "info" :
                                                    po.status === "SENT_TO_SUPPLIER" ? "primary" :
                                                        po.status === "CANCELLED" ? "danger" :
                                                            po.status === "CLOSED" ? "dark" : "secondary"
                                        }>{po.status}</Badge>
                                    </td>
                                    <td>{receiptBadge(receiptStatus)}</td>
                                    <td>{approvalBadge(po.approvalStatus)}</td>
                                    <td className="text-end">
                                        {po.grandTotal ? po.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                                    </td>
                                    <td>{po.etaDate || "-"}</td>
                                    <td className="d-flex gap-1 flex-wrap">
                                        <Button size="sm" variant="info" onClick={() => navigate(`/pos/${po.id}`)}>View</Button>

                                        {!isCancelled && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline-primary"
                                                    onClick={() => openSendModal(po)}
                                                    disabled={po.approvalStatus !== 'APPROVED'}
                                                    title={po.approvalStatus !== 'APPROVED' ? "Approve PO first" : ""}
                                                >
                                                    Mark Sent
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline-secondary"
                                                    onClick={() => openEta(po.id)}
                                                    disabled={po.approvalStatus !== 'APPROVED'}
                                                    title={po.approvalStatus !== 'APPROVED' ? "Approve PO first" : ""}
                                                >
                                                    Set ETA
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    onClick={() => onOpenGRN?.(po.id)}
                                                    disabled={po.approvalStatus !== 'APPROVED' || po.status === 'FULLY_RECEIVED'}
                                                    title={po.approvalStatus !== 'APPROVED' ? "Approve PO first" : po.status === 'FULLY_RECEIVED' ? "Already fully received" : ""}
                                                >
                                                    Receive (GRN)
                                                </Button>
                                            </>
                                        )}

                                        {/* Cancel — only for Not Received orders */}
                                        {canCancel && (
                                            <Button
                                                size="sm"
                                                variant="outline-danger"
                                                onClick={() => openCancelModal(po)}
                                                title="Cancel this order (no items received yet)"
                                            >
                                                Cancel
                                            </Button>
                                        )}

                                        {/* Return — only for Partially or Fully Received orders */}
                                        {canReturn && (
                                            <Button
                                                size="sm"
                                                variant="outline-warning"
                                                onClick={() => openReturnModal(po)}
                                                title="Initiate return for received items"
                                            >
                                                Return
                                            </Button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </Table>

                <div className="d-flex justify-content-between align-items-center">
                    <div>Page {page + 1} / {Math.max(1, data.totalPages || 1)}</div>
                    <div className="d-flex gap-2">
                        <Button disabled={page === 0} onClick={() => setPage(p => p - 1)} variant="outline-secondary">Prev</Button>
                        <Button disabled={page + 1 >= (data.totalPages || 1)} onClick={() => setPage(p => p + 1)} variant="outline-secondary">Next</Button>
                    </div>
                </div>
            </div>

            {/* ETA Modal */}
            <Modal show={!!etaFor} onHide={() => setEtaFor(null)}>
                <Modal.Header closeButton><Modal.Title>Set ETA</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Control type="date" value={etaDate} onChange={e => setEtaDate(e.target.value)} />
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setEtaFor(null)}>Cancel</Button>
                    <Button onClick={saveEta}>Save</Button>
                </Modal.Footer>
            </Modal>

            {/* SEND MODAL */}
            <Modal show={!!sendFor} onHide={() => setSendFor(null)}>
                <Modal.Header closeButton><Modal.Title>Send to Supplier</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Supplier Email</Form.Label>
                        <Form.Control
                            type="email"
                            value={sendEmailAddr}
                            onChange={e => setSendEmailAddr(e.target.value)}
                            placeholder="Enter email to notify supplier"
                        />
                        <Form.Text className="text-muted">
                            Leave empty to mark as sent without sending email.
                        </Form.Text>
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setSendFor(null)}>Cancel</Button>
                    <Button variant="primary" onClick={confirmSend} disabled={sending}>
                        {sending ? "Sending..." : "Confirm & Send"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* CANCEL MODAL */}
            <Modal show={!!cancelFor} onHide={() => setCancelFor(null)}>
                <Modal.Header closeButton>
                    <Modal.Title className="text-danger">Cancel Purchase Order</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted">
                        This order has <strong>not been received</strong> yet. Cancelling will mark it as
                        <strong> CANCELLED</strong> — the record will be kept for audit history.
                    </p>
                    <Form.Group>
                        <Form.Label>Reason for Cancellation (Optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={cancelReason}
                            onChange={e => setCancelReason(e.target.value)}
                            placeholder="e.g. Supplier unavailable, order no longer needed..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setCancelFor(null)}>Go Back</Button>
                    <Button variant="danger" onClick={confirmCancel} disabled={cancelling}>
                        {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                    </Button>
                </Modal.Footer>
            </Modal>

            {/* RETURN MODAL */}
            <Modal show={!!returnFor} onHide={() => setReturnFor(null)}>
                <Modal.Header closeButton>
                    <Modal.Title className="text-warning">Initiate Return</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p className="text-muted">
                        Items have been received for this order. Initiating a return will mark the PO as
                        <strong> CLOSED (Return)</strong> — the record is preserved for audit history.
                    </p>
                    <Form.Group>
                        <Form.Label>Reason for Return (Optional)</Form.Label>
                        <Form.Control
                            as="textarea"
                            rows={3}
                            value={returnReason}
                            onChange={e => setReturnReason(e.target.value)}
                            placeholder="e.g. Defective items, wrong delivery..."
                        />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setReturnFor(null)}>Go Back</Button>
                    <Button variant="warning" onClick={confirmReturn} disabled={returning}>
                        {returning ? "Processing..." : "Confirm Return"}
                    </Button>
                </Modal.Footer>
            </Modal>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
