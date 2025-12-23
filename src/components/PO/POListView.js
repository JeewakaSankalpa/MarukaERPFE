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

export default function POListView({ onOpenGRN }) {
    const [q, setQ] = useState(""); const [status, setStatus] = useState("");
    const [page, setPage] = useState(0); const [size] = useState(10);
    const [data, setData] = useState({ content: [], totalPages: 0 });

    // ETA State
    const [etaFor, setEtaFor] = useState(null); const [etaDate, setEtaDate] = useState("");

    // Send/Email State
    const [sendFor, setSendFor] = useState(null);
    const [sendEmailAddr, setSendEmailAddr] = useState("");
    const [sending, setSending] = useState(false);

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
    }

    const openEta = (id) => { setEtaFor(id); setEtaDate(""); };
    const saveEta = async () => { await setEta(etaFor, etaDate); setEtaFor(null); toast.success("ETA updated"); load(); };

    return (
        <Container style={{ width: "80vw", maxWidth: 1100, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 style={{ fontSize: "1.5rem" }}>Purchase Orders</h2>
                    <div className="d-flex gap-2">
                        <Form.Select value={status} onChange={e => setStatus(e.target.value)} style={{ maxWidth: 220 }}>
                            <option value="">All Statuses</option>
                            <option value="CREATED">CREATED</option>
                            <option value="SENT_TO_SUPPLIER">SENT_TO_SUPPLIER</option>
                            <option value="PARTIALLY_RECEIVED">PARTIALLY_RECEIVED</option>
                            <option value="FULLY_RECEIVED">FULLY_RECEIVED</option>
                        </Form.Select>
                        <Form.Control placeholder="Search PO# / Supplier" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 260 }} />
                        <Button variant="outline-secondary" onClick={() => { setPage(0); load(); }}>Search</Button>
                    </div>
                </div>

                <Table hover responsive>
                    <thead>
                        <tr>
                            <th>PO No</th><th>Supplier</th><th>Items</th><th>Status</th><th>ETA</th><th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.content || []).map(po => (
                            <tr key={po.id}>
                                <td>{po.poNumber}</td>
                                <td>{po.supplierNameSnapshot || po.supplierName}</td>
                                <td>{(po.items || []).map(i => `${i.productNameSnapshot || i.productName} x${i.orderedQty}`).slice(0, 3).join(", ")}{(po.items?.length > 3) ? "…" : ""}</td>
                                <td>
                                    <Badge bg={
                                        po.status === "FULLY_RECEIVED" ? "success" :
                                            po.status === "PARTIALLY_RECEIVED" ? "info" :
                                                po.status === "SENT_TO_SUPPLIER" ? "primary" : "secondary"
                                    }>{po.status}</Badge>
                                </td>
                                <td>{po.etaDate || "-"}</td>
                                <td className="d-flex gap-2">
                                    <Button size="sm" variant="info" onClick={() => window.location.hash = `#/pos/${po.id}`}>View</Button>
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
                                        disabled={po.approvalStatus !== 'APPROVED'}
                                        title={po.approvalStatus !== 'APPROVED' ? "Approve PO first" : ""}
                                    >
                                        Receive (GRN)
                                    </Button>
                                </td>
                            </tr>
                        ))}
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

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
