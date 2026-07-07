import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React, { useEffect, useState } from "react";
import { Container, Button, Form, Table, Badge, Modal, Row, Col } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import api from "../../api/api";
import SafeSelect from '../ReusableComponents/SafeSelect';
import GRNPaymentModal from "./GRNPaymentModal";
import GRNReturnModal from "./GRNReturnModal";
import { QRCodeSVG as QRCode } from 'qrcode.react';

const qp = (o = {}) => { const u = new URLSearchParams(); Object.entries(o).forEach(([k, v]) => (v || v === 0) && v !== "" && u.set(k, v)); return u.toString(); };
const listGRNs = async ({ q, page = 0, size = 10, paymentStatus }) => (await api.get(`/grns?${qp({ q, page, size, sort: "createdAt,desc", paymentStatus: paymentStatus || undefined })}`)).data;
const acceptGRN = async (id, notes) => (await api.patch(`/grns/${id}/accept`, { notes })).data;
const approveGRNPrint = async (id, notes) => (await api.patch(`/grns/${id}/approve-print`, { notes })).data;

export default function GRNListView() {
    const navigate = useNavigate();
    const [q, setQ] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [page, setPage] = useState(0);
    const [data, setData] = useState({ content: [], totalPages: 0 });
    const [selectedGRN, setSelectedGRN] = useState(null); // For payment modal
    const [selectedGRNItems, setSelectedGRNItems] = useState(null); // For items modal
    const [selectedGRNReturn, setSelectedGRNReturn] = useState(null); // For return modal
    const [selectedGRNReport, setSelectedGRNReport] = useState(null);
    const [acceptingId, setAcceptingId] = useState(null);
    const userRole = (localStorage.getItem("role") || "").toUpperCase();
    const userModules = JSON.parse(localStorage.getItem("moduleAccess") || "[]");
    const projectRoles = JSON.parse(localStorage.getItem("projectRoles") || "[]");
    const [workflow, setWorkflow] = useState({});
    const hasWorkflowRole = (roles = []) => {
        const allowed = new Set((roles || []).map(r => String(r || "").trim().toUpperCase()));
        return projectRoles.some(r => allowed.has(String(r || "").trim().toUpperCase()));
    };
    const canAcceptGRN = userRole === "ADMIN" || userModules.includes("procurement.grn_accept") || hasWorkflowRole(workflow.grnAcceptanceRoles);
    const canVerifyGRNPayment = userRole === "ADMIN" || userModules.includes("procurement.grn_payment_verify") || hasWorkflowRole(workflow.grnPaymentVerifierRoles);
    const canApproveGRNPrint = userRole === "ADMIN" || userModules.includes("procurement.grn_print_approve") || hasWorkflowRole(workflow.grnPrintApproverRoles);

    const load = async () => {
        try { setData(await listGRNs({ q, page, paymentStatus: statusFilter })); }
        catch { toast.error("Failed to load GRNs"); }
    };
    useEffect(() => { load(); }, [page]);
    useEffect(() => { setPage(0); }, [statusFilter]);
    useEffect(() => { load(); }, [statusFilter]);
    useEffect(() => {
        api.get("/workflow").then(res => setWorkflow(res.data || {})).catch(() => setWorkflow({}));
    }, []);

    const handleAccept = async (grn) => {
        if (!window.confirm(`Accept ${grn.grnNumber} for supplier payment?`)) return;
        const notes = window.prompt("Approval notes (optional)", "") || "";
        setAcceptingId(grn.id);
        try {
            await acceptGRN(grn.id, notes);
            toast.success("GRN accepted for payment");
            load();
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to accept GRN");
        } finally {
            setAcceptingId(null);
        }
    };

    return (
        <Container className="py-4">
            <div className="bg-white shadow rounded p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <div className="d-flex align-items-center mb-4">
                        <button type="button" className="btn btn-light me-3" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                        <h2 className="mb-0" style={{ fontSize: "1.5rem" }}>Goods Received Notes (GRN)</h2>
                    </div>
                    <div className="d-flex gap-2 align-items-center flex-wrap">
                        <Form.Control
                            placeholder="Search GRN / PO Number / Supplier"
                            value={q}
                            onChange={e => setQ(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') { setPage(0); load(); } }}
                            style={{ maxWidth: 260 }}
                        />
                        <SafeSelect
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                            style={{ maxWidth: 180 }}
                        >
                            <option value="">All Statuses</option>
                            <option value="UNPAID">Unpaid</option>
                            <option value="INVOICED">Invoiced</option>
                            <option value="PARTIALLY_PAID">Partially Paid</option>
                            <option value="PAID">Paid</option>
                        </SafeSelect>
                        <Button variant="outline-secondary" onClick={() => { setPage(0); load(); }}>Search</Button>
                    </div>
                </div>

                <Table hover responsive>
                    <thead>
                        <tr>
                            <th>GRN No</th><th>PO No</th><th>Supplier</th><th>Date</th>
                            <th className="text-end">Gross Total</th><th className="text-end">Paid</th>
                            <th>Status</th><th>GRN</th><th>Due Date</th><th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.content || []).map(g => (
                            <tr key={g.id}>
                                <td>{g.grnNumber}</td>
                                <td>{g.poNumber}</td>
                                <td>{g.supplierNameSnapshot}</td>
                                <td>{g.createdAt?.substring(0, 10)}</td>
                                <td className="text-end">
                                    {((g.invoiceAmount || 0) + (g.vatAmount || 0) + (g.deliveryCharge || 0)).toFixed(2)}
                                </td>
                                <td className="text-end">{g.totalPaid?.toFixed(2)}</td>
                                <td>
                                    <Badge bg={
                                        g.paymentStatus === "PAID" ? "success" :
                                            g.paymentStatus === "PARTIALLY_PAID" ? "warning" :
                                                g.paymentStatus === "INVOICED" ? "info" : "secondary"
                                    }>{g.paymentStatus}</Badge>
                                </td>
                                <td>
                                    <Badge bg={g.status === "ACCEPTED" ? "success" : "warning"} text={g.status === "ACCEPTED" ? undefined : "dark"}>
                                        {g.status || "-"}
                                    </Badge>
                                </td>
                                <td>{g.dueDate}</td>
                                <td>
                                    {g.status !== "ACCEPTED" && canAcceptGRN && (
                                        <Button size="sm" variant="outline-success" className="me-2" onClick={() => handleAccept(g)} disabled={acceptingId === g.id}>
                                            {acceptingId === g.id ? "Accepting..." : "Accept"}
                                        </Button>
                                    )}
                                    <Button size="sm" variant="outline-success" className="me-2" onClick={() => setSelectedGRN(g)}>Payments</Button>
                                    <Button size="sm" variant="outline-dark" className="me-2" onClick={() => setSelectedGRNItems(g)}>Items</Button>
                                    <Button size="sm" variant="outline-primary" className="me-2" onClick={() => setSelectedGRNReport(g)}>Report</Button>
                                    <Button size="sm" variant="outline-danger" onClick={() => setSelectedGRNReturn(g)}>Return</Button>
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

            {selectedGRN && <GRNPaymentModal grn={selectedGRN} canVerifyPayment={canVerifyGRNPayment} onClose={() => { setSelectedGRN(null); load(); }} />}
            {selectedGRNReturn && <GRNReturnModal grn={selectedGRNReturn} onClose={() => { setSelectedGRNReturn(null); load(); }} />}
            {selectedGRNItems && <ItemsModal grn={selectedGRNItems} onClose={() => setSelectedGRNItems(null)} />}
            {selectedGRNReport && <GRNReportModal grn={selectedGRNReport} canApprovePrint={canApproveGRNPrint} onChanged={(updated) => { setSelectedGRNReport(updated); load(); }} onClose={() => setSelectedGRNReport(null)} />}
            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}

function money(value) {
    return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDate(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleDateString("en-GB");
}

function formatDateTime(value) {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? String(value) : parsed.toLocaleString("en-GB");
}

function approvalActionLabel(action) {
    switch (action) {
        case "GRN_ACCEPTED": return "GRN accepted";
        case "PAYMENT_VERIFIED": return "Payment verified";
        case "PRINT_APPROVED": return "Print approved";
        default: return action || "Approval";
    }
}

function lineTotal(item) {
    if (item?.unitCost) return Number(item.receivedQty || 0) * Number(item.unitCost || 0);
    return (item?.batches || []).reduce((sum, batch) => sum + (Number(batch.qty || 0) * Number(batch.unitCost || 0)), 0);
}

function GRNReportModal({ grn, canApprovePrint, onChanged, onClose }) {
    const invoiceTotal = Number(grn.invoiceAmount || 0) + Number(grn.vatAmount || 0) + Number(grn.deliveryCharge || 0);
    const [approvingPrint, setApprovingPrint] = useState(false);
    const printApproved = Boolean(grn.printApprovedAt);

    const handlePrint = () => {
        if (!printApproved) {
            toast.warn("This GRN report must be approved for printing first.");
            return;
        }
        setTimeout(() => window.print(), 50);
    };

    const handleApprovePrint = async () => {
        const notes = window.prompt("Print approval notes (optional)", "") || "";
        setApprovingPrint(true);
        try {
            const updated = await approveGRNPrint(grn.id, notes);
            toast.success("GRN report approved for printing");
            onChanged?.(updated);
        } catch (e) {
            toast.error(e?.response?.data?.message || "Failed to approve GRN printing");
        } finally {
            setApprovingPrint(false);
        }
    };

    return (
        <Modal show={true} onHide={onClose} size="xl" className="grn-report-modal">
            <Modal.Header closeButton className="no-print">
                <Modal.Title>GRN Report: {grn.grnNumber}</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="grn-report-print bg-white text-dark">
                    <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                            <h3 className="fw-bold mb-1">Maruka Technologies (Pvt) Ltd</h3>
                            <div>Goods Received Note Report</div>
                        </div>
                        <div className="text-end">
                            <h4 className="fw-bold mb-1">{grn.grnNumber}</h4>
                            <div>Created: {formatDate(grn.createdAt)}</div>
                            <div>Status: {grn.status || "-"}</div>
                            <div>Print Approval: {printApproved ? `Approved by ${grn.printApprovedBy || "-"}` : "Pending"}</div>
                            {grn.acceptedAt && <div>Accepted: {formatDateTime(grn.acceptedAt)} by {grn.acceptedBy || "-"}</div>}
                        </div>
                    </div>

                    <Table bordered size="sm" className="mb-4">
                        <tbody>
                            <tr>
                                <th style={{ width: "20%" }}>PO Number</th>
                                <td>{grn.poNumber || "-"}</td>
                                <th style={{ width: "20%" }}>Supplier</th>
                                <td>{grn.supplierNameSnapshot || "-"}</td>
                            </tr>
                            <tr>
                                <th>Supplier Invoice</th>
                                <td>{grn.supplierInvoiceNo || "-"}</td>
                                <th>Invoice Date</th>
                                <td>{formatDate(grn.supplierInvoiceDate)}</td>
                            </tr>
                            <tr>
                                <th>Payment Status</th>
                                <td>{grn.paymentStatus || "-"}</td>
                                <th>Due Date</th>
                                <td>{formatDate(grn.dueDate)}</td>
                            </tr>
                        </tbody>
                    </Table>

                    <Table bordered hover size="sm">
                        <thead className="table-light">
                            <tr>
                                <th>Product</th>
                                <th>SKU</th>
                                <th className="text-end">Received Qty</th>
                                <th>Unit</th>
                                <th className="text-end">Unit Cost</th>
                                <th className="text-end">Line Total</th>
                                <th>Batches / Serials</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!grn.items || grn.items.length === 0) ? (
                                <tr><td colSpan="7" className="text-center text-muted">No GRN items found</td></tr>
                            ) : grn.items.map((item, idx) => (
                                <tr key={idx}>
                                    <td>{item.productNameSnapshot || "-"}</td>
                                    <td>{item.sku || "-"}</td>
                                    <td className="text-end">{item.receivedQty || 0}</td>
                                    <td>{item.unit || "-"}</td>
                                    <td className="text-end">{item.unitCost ? money(item.unitCost) : "-"}</td>
                                    <td className="text-end">{money(lineTotal(item))}</td>
                                    <td>
                                        {(item.batches || []).length === 0 ? "-" : (
                                            <div className="d-flex flex-column gap-1">
                                                {item.batches.map((batch, batchIndex) => (
                                                    <span key={batchIndex}>
                                                        {batch.batchNo || "N/A"} | Qty {batch.qty || 0} | Exp {formatDate(batch.expiryDate)}
                                                        {(batch.serials || []).length > 0 ? ` | Serials: ${batch.serials.join(", ")}` : ""}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>

                    <div className="d-flex justify-content-end mt-4">
                        <Table borderless size="sm" style={{ width: 340 }}>
                            <tbody>
                                <tr>
                                    <td className="text-end">Invoice Amount</td>
                                    <td className="text-end">{money(grn.invoiceAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="text-end">VAT</td>
                                    <td className="text-end">{money(grn.vatAmount)}</td>
                                </tr>
                                <tr>
                                    <td className="text-end">Delivery Charge</td>
                                    <td className="text-end">{money(grn.deliveryCharge)}</td>
                                </tr>
                                <tr className="border-top fw-bold">
                                    <td className="text-end">Gross Total</td>
                                    <td className="text-end">LKR {money(invoiceTotal)}</td>
                                </tr>
                                <tr>
                                    <td className="text-end">Total Paid</td>
                                    <td className="text-end">{money(grn.totalPaid)}</td>
                                </tr>
                            </tbody>
                        </Table>
                    </div>

                    {(grn.paymentHistory || []).length > 0 && (
                        <>
                            <h5 className="mt-4 mb-2">Payment History</h5>
                            <Table bordered size="sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>Date</th>
                                        <th>Method</th>
                                        <th>Reference</th>
                                        <th>Added By</th>
                                        <th>Status</th>
                                        <th className="text-end">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grn.paymentHistory.map((payment, idx) => (
                                        <tr key={idx}>
                                            <td>{formatDate(payment.paymentDate)}</td>
                                            <td>{payment.paymentMethod || payment.paymentAccountName || "-"}</td>
                                            <td>{payment.reference || "-"}</td>
                                            <td>{payment.addedBy || "-"}</td>
                                            <td>{payment.verified ? `Verified by ${payment.verifiedBy || "-"}` : "Pending verification"}</td>
                                            <td className="text-end">{money(payment.amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}

                    {(grn.approvalHistory || []).length > 0 && (
                        <>
                            <h5 className="mt-4 mb-2">Approval History</h5>
                            <Table bordered size="sm">
                                <thead className="table-light">
                                    <tr>
                                        <th>Action</th>
                                        <th>Approved By</th>
                                        <th>Approved At</th>
                                        <th>Notes</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {grn.approvalHistory.map((record, idx) => (
                                        <tr key={record.id || idx}>
                                            <td>{approvalActionLabel(record.action)}</td>
                                            <td>{record.actor || "-"}</td>
                                            <td>{formatDateTime(record.actedAt)}</td>
                                            <td>{record.notes || "-"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </Table>
                        </>
                    )}
                </div>
            </Modal.Body>
            <Modal.Footer className="no-print">
                <Button variant="secondary" onClick={onClose}>Close</Button>
                {!printApproved && canApprovePrint && (
                    <Button variant="outline-success" onClick={handleApprovePrint} disabled={approvingPrint || grn.status !== "ACCEPTED"}>
                        {approvingPrint ? "Approving..." : "Approve Print"}
                    </Button>
                )}
                <Button variant="primary" onClick={handlePrint} disabled={!printApproved}>Print Report</Button>
            </Modal.Footer>
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body * { visibility: hidden !important; }
                    .grn-report-print, .grn-report-print * { visibility: visible !important; }
                    .grn-report-print {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        padding: 0 !important;
                    }
                    .no-print, .no-print * { display: none !important; }
                    .modal, .modal-dialog, .modal-content, .modal-body {
                        position: static !important;
                        transform: none !important;
                        width: 100% !important;
                        max-width: none !important;
                        height: auto !important;
                        overflow: visible !important;
                        box-shadow: none !important;
                        border: 0 !important;
                    }
                }
            `}</style>
        </Modal>
    );
}

function ItemsModal({ grn, onClose }) {
    const [showQrModal, setShowQrModal] = useState(false);
    const [batches, setBatches] = useState([]);
    const [printBatches, setPrintBatches] = useState([]);

    useEffect(() => {
        const fetchBatches = async () => {
            try {
                const res = await api.get(`/inventory/batches?grnId=${grn.id}`);
                setBatches(res.data || []);
            } catch (e) {
                console.error("Failed to load batches for GRN", e);
            }
        };
        fetchBatches();
    }, [grn.id]);

    const buildQrItems = (batches) => batches.flatMap(batch => {
        if (batch.serials && batch.serials.length > 0) {
            return batch.serials.map(serial => ({
                ...batch,
                isSerial: true,
                serialNo: serial,
                qrValue: `V1|${batch.grnId || ''}|${batch.productId || ''}|${batch.id}|${batch.batchNumber}|${serial}|${batch.expiryDate || ''}`
            }));
        }
        return [{
            ...batch,
            isSerial: false,
            serialNo: '',
            qrValue: `V1|${batch.grnId || ''}|${batch.productId || ''}|${batch.id}|${batch.batchNumber}||${batch.expiryDate || ''}`
        }];
    });

    const handlePrintOne = (item) => {
        setPrintBatches([item]);
        setTimeout(() => { window.print(); setPrintBatches([]); }, 500);
    };

    const handlePrintAll = () => {
        setPrintBatches(buildQrItems(batches));
        setTimeout(() => { window.print(); setPrintBatches([]); }, 500);
    };

    return (
        <Modal show={true} onHide={onClose} size="xl">
            <Modal.Header closeButton><Modal.Title>GRN Information: {grn.grnNumber}</Modal.Title></Modal.Header>
            <Modal.Body>
                <Row className="mb-3">
                    <Col md={3}><strong>PO No:</strong> {grn.poNumber || "-"}</Col>
                    <Col md={3}><strong>Supplier:</strong> {grn.supplierNameSnapshot || "-"}</Col>
                    <Col md={3}><strong>Supplier Inv No:</strong> {grn.supplierInvoiceNo || "-"}</Col>
                    <Col md={3}><strong>Invoice Date:</strong> {grn.supplierInvoiceDate || "-"}</Col>
                </Row>
                <Row className="mb-3">
                    <Col md={4}><strong>Accepted By:</strong> {grn.acceptedBy || "-"}</Col>
                    <Col md={4}><strong>Accepted At:</strong> {formatDateTime(grn.acceptedAt)}</Col>
                    <Col md={4}><strong>Acceptance Notes:</strong> {grn.acceptanceNote || "-"}</Col>
                </Row>
                <Row className="mb-4 bg-light p-2 rounded align-items-center">
                    <Col md={3}><strong>Gross Total:</strong> Rs. {((grn.invoiceAmount || 0) + (grn.vatAmount || 0) + (grn.deliveryCharge || 0)).toFixed(2)}</Col>
                    <Col md={3}><strong>VAT Amount:</strong> Rs. {(grn.vatAmount || 0).toFixed(2)}</Col>
                    <Col md={3}><strong>Delivery Charge:</strong> Rs. {(grn.deliveryCharge || 0).toFixed(2)}</Col>
                    <Col md={3} className="text-end">
                        <Badge bg={
                            grn.paymentStatus === "PAID" ? "success" :
                                grn.paymentStatus === "PARTIALLY_PAID" ? "warning" :
                                    grn.paymentStatus === "INVOICED" ? "info" : "secondary"
                        }>{grn.paymentStatus}</Badge>
                    </Col>
                </Row>

                <div className="table-responsive">
                    <Table size="sm" bordered hover>
                        <thead className="bg-light">
                            <tr>
                                <th>Product Name</th>
                                <th>SKU</th>
                                <th className="text-end">Received Qty</th>
                                <th className="text-end">Unit Cost</th>
                                <th className="text-end">Total</th>
                                <th>Batches</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(!grn.items || grn.items.length === 0) ? (
                                <tr><td colSpan="6" className="text-center text-muted">No items found</td></tr>
                            ) : (
                                grn.items.map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.productNameSnapshot || "-"}</td>
                                        <td>{item.sku || "-"}</td>
                                        <td className="text-end">{item.receivedQty} {item.unit}</td>
                                        <td className="text-end">
                                            {(() => {
                                                if (item.unitCost) return item.unitCost.toFixed(2);
                                                if (!item.batches || item.batches.length === 0) return "-";
                                                const totalBatchesCost = item.batches.reduce((sum, b) => sum + ((Number(b.qty)||0) * (Number(b.unitCost)||0)), 0);
                                                return item.receivedQty > 0 ? (totalBatchesCost / item.receivedQty).toFixed(2) : "-";
                                            })()}
                                        </td>
                                        <td className="text-end">
                                            {(() => {
                                                if (item.unitCost) return (item.receivedQty * (item.unitCost || 0)).toFixed(2);
                                                if (!item.batches || item.batches.length === 0) return "0.00";
                                                return item.batches.reduce((sum, b) => sum + ((Number(b.qty)||0) * (Number(b.unitCost)||0)), 0).toFixed(2);
                                            })()}    
                                        </td>
                                        <td>
                                            {!item.batches || item.batches.length === 0 ? "No batches" : (
                                                <div className="d-flex flex-column gap-1">
                                                    {item.batches.map((b, bi) => (
                                                        <div key={bi} className="border p-1 rounded" style={{fontSize: "0.85rem"}}>
                                                            <strong>Batch:</strong> {b.batchNo || "N/A"} | <strong>Qty:</strong> {b.qty} | <strong>Exp:</strong> {b.expiryDate || "N/A"} | <strong>Cost:</strong> {b.unitCost || "N/A"}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </Table>
                </div>
            </Modal.Body>
            <Modal.Footer>
                {batches.length > 0 && <Button variant="outline-dark" onClick={() => setShowQrModal(true)}>Show QR Codes</Button>}
                <Button variant="secondary" onClick={onClose}>Close</Button>
            </Modal.Footer>

            {/* Nested QR Modal */}
            {showQrModal && (
                <div className="modal show d-block bg-dark bg-opacity-50" tabIndex="-1" style={{ zIndex: 1060 }}>
                    <div className="modal-dialog modal-xl">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">GRN Batches - QR Codes</h5>
                                <button type="button" className="btn-close" onClick={() => setShowQrModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="row g-3">
                                    {buildQrItems(batches).map((item, idx) => (
                                        <div key={`${item.id}-${idx}`} className="col-md-4 col-lg-3">
                                            <div className="card h-100 p-3 text-center">
                                                <div className="mb-2 d-flex justify-content-center">
                                                    <QRCode value={item.qrValue} size={120} level="M" />
                                                </div>
                                                <h6 className="mb-1">{item.batchNumber || item.batchNo}</h6>
                                                {item.isSerial && <div className="badge bg-info text-dark mb-1">{item.serialNo}</div>}
                                                <small className="d-block text-muted">Product: {item.productNameSnapshot || item.productId || "-"}</small>
                                                <small className="d-block text-muted">Qty: {item.isSerial ? 1 : (item.quantity || item.receivedQty)}</small>
                                                <small className="d-block text-muted">Exp: {item.expiryDate || "N/A"}</small>
                                                <Button size="sm" variant="outline-dark" className="mt-2" onClick={() => handlePrintOne(item)}>Print Sticker</Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowQrModal(false)}>Close QRs</button>
                                <button className="btn btn-primary" onClick={handlePrintAll}>Print All</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Hidden Print Section */}
            <div className="print-only-section">
                <style>{`@media print { .modal, .modal-backdrop { display: none !important; } }`}</style>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px' }}>
                    {printBatches.map((item, idx) => (
                        <div key={idx} style={{
                            border: '1px dashed #000', padding: '10px', textAlign: 'center',
                            width: '200px', height: '200px', display: 'flex',
                            flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            pageBreakInside: 'avoid'
                        }}>
                            <QRCode value={item.qrValue} size={100} level="M" />
                            <div style={{ fontSize: '12px', marginTop: '5px', fontWeight: 'bold' }}>{item.batchNumber || item.batchNo}</div>
                            {item.isSerial && <div style={{ fontSize: '10px' }}>SN: {item.serialNo}</div>}
                            <div style={{ fontSize: '10px' }}>Qty: {item.isSerial ? 1 : (item.quantity || item.receivedQty)}</div>
                        </div>
                    ))}
                </div>
            </div>
        </Modal>
    );
}

