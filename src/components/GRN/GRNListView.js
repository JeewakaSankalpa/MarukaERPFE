import React, { useEffect, useState } from "react";
import { Container, Button, Form, Table, Badge, Modal, Row, Col } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import GRNPaymentModal from "./GRNPaymentModal";

const qp = (o = {}) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v)); return u.toString(); };
const listGRNs = async ({ q, page = 0, size = 10 }) => (await api.get(`/grns?${qp({ q, page, size, sort: "createdAt,desc" })}`)).data;

export default function GRNListView() {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(0);
    const [data, setData] = useState({ content: [], totalPages: 0 });
    const [selectedGRN, setSelectedGRN] = useState(null); // For payment modal
    const [selectedGRNItems, setSelectedGRNItems] = useState(null); // For items modal

    const load = async () => {
        try { setData(await listGRNs({ q, page })); }
        catch { toast.error("Failed to load GRNs"); }
    };
    useEffect(() => { load(); }, [page]);

    const [showEdit, setShowEdit] = useState(false);
    const [editData, setEditData] = useState({});

    const handleEdit = (grn) => {
        setEditData({
            id: grn.id,
            supplierInvoiceNo: grn.supplierInvoiceNo,
            supplierInvoiceDate: grn.supplierInvoiceDate,
            creditPeriodDays: grn.creditPeriodDays,
            invoiceAmount: grn.invoiceAmount,
            paymentStatus: grn.paymentStatus
        });
        setShowEdit(true);
    };

    const saveEdit = async () => {
        try {
            await api.patch(`/grns/${editData.id}`, editData);
            toast.success("GRN updated");
            setShowEdit(false);
            load();
        } catch (e) {
            toast.error("Failed to update GRN");
        }
    };

    return (
        <Container style={{ width: "85vw", maxWidth: 1200, paddingTop: 24 }}>
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 style={{ fontSize: "1.5rem" }}>Goods Received Notes (GRN)</h2>
                    <div className="d-flex gap-2">
                        <Form.Control placeholder="Search GRN / Supplier" value={q} onChange={e => setQ(e.target.value)} style={{ maxWidth: 260 }} />
                        <Button variant="outline-secondary" onClick={() => { setPage(0); load(); }}>Search</Button>
                    </div>
                </div>

                <Table hover responsive>
                    <thead>
                        <tr>
                            <th>GRN No</th><th>PO No</th><th>Supplier</th><th>Date</th>
                            <th className="text-end">Invoice Amt</th><th className="text-end">Paid</th>
                            <th>Status</th><th>Due Date</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.content || []).map(g => (
                            <tr key={g.id}>
                                <td>{g.grnNumber}</td>
                                <td>{g.poNumber}</td>
                                <td>{g.supplierNameSnapshot}</td>
                                <td>{g.createdAt?.substring(0, 10)}</td>
                                <td className="text-end">{g.invoiceAmount?.toFixed(2)}</td>
                                <td className="text-end">{g.totalPaid?.toFixed(2)}</td>
                                <td>
                                    <Badge bg={
                                        g.paymentStatus === "PAID" ? "success" :
                                            g.paymentStatus === "PARTIALLY_PAID" ? "warning" :
                                                g.paymentStatus === "INVOICED" ? "info" : "secondary"
                                    }>{g.paymentStatus}</Badge>
                                </td>
                                <td>{g.dueDate}</td>
                                <td>
                                    <Button size="sm" variant="outline-primary" className="me-2" onClick={() => handleEdit(g)}>Edit</Button>
                                    <Button size="sm" variant="outline-success" className="me-2" onClick={() => setSelectedGRN(g)}>Payments</Button>
                                    <Button size="sm" variant="outline-dark" onClick={() => setSelectedGRNItems(g)}>Items</Button>
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

            {/* Edit Modal */}
            <Modal show={showEdit} onHide={() => setShowEdit(false)}>
                <Modal.Header closeButton><Modal.Title>Edit GRN Invoice Details</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group className="mb-3">
                            <Form.Label>Supplier Invoice No</Form.Label>
                            <Form.Control
                                value={editData.supplierInvoiceNo || ""}
                                onChange={e => setEditData({ ...editData, supplierInvoiceNo: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Invoice Date</Form.Label>
                            <Form.Control
                                type="date"
                                value={editData.supplierInvoiceDate || ""}
                                onChange={e => setEditData({ ...editData, supplierInvoiceDate: e.target.value })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Credit Period (Days)</Form.Label>
                            <Form.Control
                                type="number"
                                value={editData.creditPeriodDays || ""}
                                onChange={e => setEditData({ ...editData, creditPeriodDays: parseInt(e.target.value) })}
                            />
                        </Form.Group>
                        <Form.Group className="mb-3">
                            <Form.Label>Invoice Amount</Form.Label>
                            <Form.Control
                                type="number"
                                value={editData.invoiceAmount || ""}
                                onChange={e => setEditData({ ...editData, invoiceAmount: parseFloat(e.target.value) })}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEdit(false)}>Close</Button>
                    <Button variant="primary" onClick={saveEdit}>Save Changes</Button>
                </Modal.Footer>
            </Modal>

            {selectedGRN && <GRNPaymentModal grn={selectedGRN} onClose={() => { setSelectedGRN(null); load(); }} />}
            {selectedGRNItems && <ItemsModal grn={selectedGRNItems} onClose={() => setSelectedGRNItems(null)} />}
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

function ItemsModal({ grn, onClose }) {
    return (
        <Modal show={true} onHide={onClose} size="lg">
            <Modal.Header closeButton><Modal.Title>Items in GRN: {grn.grnNumber}</Modal.Title></Modal.Header>
            <Modal.Body>
                <div className="table-responsive">
                    <Table size="sm" bordered hover>
                        <thead className="bg-light">
                            <tr>
                                <th>Product Name</th>
                                <th>SKU</th>
                                <th className="text-end">Received Qty</th>
                                <th className="text-end">Unit Cost</th>
                                <th className="text-end">Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!grn.items || grn.items.length === 0) ? (
                                <tr><td colSpan="5" className="text-center text-muted">No items found</td></tr>
                            ) : (
                                grn.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.productNameSnapshot || "-"}</td>
                                        <td>{item.sku || "-"}</td>
                                        <td className="text-end">{item.receivedQty} {item.unit}</td>
                                        <td className="text-end">{item.unitCost?.toFixed(2)}</td>
                                        <td className="text-end">{(item.receivedQty * (item.unitCost || 0)).toFixed(2)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </Modal.Footer>
        </Modal>
    );
}
