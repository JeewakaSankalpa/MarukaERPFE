import { ArrowLeft } from 'lucide-react';
import React, { useEffect, useState, useMemo } from "react";
import { Container, Row, Col, Button, Table, Badge, Modal, Form } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/api";
import "react-toastify/dist/ReactToastify.css";

/* ========== API HELPERS ========== */
const getPO = async (id) => (await api.get(`/pos/${id}`)).data;
const listEmployeesAPI = async () => (await api.get(`/employee/all`)).data ?? [];
const submitApprovalAPI = async (id, payload) => (await api.post(`/pos/${id}/submit-approval`, payload)).data;
const approveAPI = async (id, payload) => (await api.post(`/pos/${id}/approve`, payload)).data;
const rejectAPI = async (id, payload) => (await api.post(`/pos/${id}/reject`, payload)).data;
const listSavedAddressesAPI = async () => (await api.get(`/addresses`)).data;
const createSavedAddressAPI = async (payload) => (await api.post(`/addresses`, payload)).data;
const updatePOAddressAPI = async (id, payload) => (await api.patch(`/pos/${id}/address`, payload)).data;
const updateFinancialsAPI = async (id, payload) => (await api.patch(`/pos/${id}/financials`, payload)).data;

export default function PurchaseOrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { employeeId } = useAuth();

    const [po, setPo] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [approvalComment, setApprovalComment] = useState("");
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    // Loading states for async actions
    const [submitting, setSubmitting] = useState(false);
    const [approving, setApproving] = useState(false);
    const [rejecting, setRejecting] = useState(false);

    // Address Modal
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [addressForm, setAddressForm] = useState({ name: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "Sri Lanka" });
    const [useSavedAddressId, setUseSavedAddressId] = useState("");

    // Financials Modal
    const [showFinancialsModal, setShowFinancialsModal] = useState(false);
    const [financialsForm, setFinancialsForm] = useState({ deliveryCharge: '', vatRate: '', otherTaxRate: '' });

    const loadData = async () => {
        try {
            setLoading(true);
            const [poData, empData, addrData] = await Promise.all([getPO(id), listEmployeesAPI(), listSavedAddressesAPI()]);
            setPo(poData);
            setEmployees(empData);
            setSavedAddresses(addrData || []);
        } catch (e) {
            toast.error("Failed to load Purchase Order details");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) loadData();
        // eslint-disable-next-line
    }, [id]);

    const isApprover = useMemo(() => {
        if (!po || !po.approverIds) return false;
        return po.approverIds.includes(employeeId);
    }, [po, employeeId]);

    const myApprovalStatus = useMemo(() => {
        if (!po || !po.approvals) return "PENDING";
        const rec = po.approvals.find(r => r.approverId === employeeId && r.status !== 'PENDING');
        return rec ? rec.status : "PENDING";
    }, [po, employeeId]);

    /* ========== ACTIONS ========== */
    const handleSubmitForApproval = async () => {
        setShowSubmitModal(false);
        setSubmitting(true);
        try {
            const updated = await submitApprovalAPI(id, { manualPolicy: "ANY" });
            setPo(updated);
            toast.success("Submitted for approval");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to submit");
        } finally {
            setSubmitting(false);
        }
    };

    const handleApprove = async () => {
        const comment = approvalComment;
        setShowApproveModal(false);
        setApproving(true);
        try {
            const updated = await approveAPI(id, { comment });
            setPo(updated);
            setApprovalComment("");
            toast.success("Approved successfully");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to approve");
        } finally {
            setApproving(false);
        }
    };

    const handleReject = async () => {
        const comment = approvalComment;
        setShowRejectModal(false);
        setRejecting(true);
        try {
            const updated = await rejectAPI(id, { comment });
            setPo(updated);
            setApprovalComment("");
            toast.success("Rejected PO");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to reject");
        } finally {
            setRejecting(false);
        }
    };

    const handleUpdateFinancials = async () => {
        try {
            const deliveryCharge = financialsForm.deliveryCharge !== '' ? parseFloat(financialsForm.deliveryCharge) : 0;
            const taxableBase = (po.subTotal || 0) + deliveryCharge;
            const vatAmount = financialsForm.vatRate !== '' ? taxableBase * (parseFloat(financialsForm.vatRate) / 100) : 0;
            const otherTaxAmount = financialsForm.otherTaxRate !== '' ? taxableBase * (parseFloat(financialsForm.otherTaxRate) / 100) : 0;
            
            const payload = {
                deliveryCharge: deliveryCharge > 0 ? deliveryCharge : null,
                vatAmount: vatAmount > 0 ? vatAmount : null,
                otherTaxAmount: otherTaxAmount > 0 ? otherTaxAmount : null,
            };
            const updated = await updateFinancialsAPI(id, payload);
            setShowFinancialsModal(false);
            setPo(updated);
            toast.success("Totals updated");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to update totals");
        }
    };

    const handleUpdateAddress = async () => {
        try {
            let addrToSave = { ...addressForm };
            if (useSavedAddressId) {
                const found = savedAddresses.find(a => a.id === useSavedAddressId);
                if (found) addrToSave = { ...found.address, name: found.name };
            }
            const cleanAddr = {
                line1: addrToSave.line1,
                line2: addrToSave.line2,
                city: addrToSave.city,
                state: addrToSave.state,
                postalCode: addrToSave.postalCode,
                country: addrToSave.country
            };
            const updated = await updatePOAddressAPI(id, cleanAddr);
            if (!useSavedAddressId && addrToSave.saveToBook) {
                await createSavedAddressAPI({ name: addrToSave.name, address: cleanAddr });
                const refreshList = await listSavedAddressesAPI();
                setSavedAddresses(refreshList);
            }
            setPo(updated);
            setShowAddressModal(false);
            toast.success("Shipping address updated");
        } catch (e) {
            console.error(e);
            toast.error("Failed to update address");
        }
    };

    if (loading) return <Container className="pt-4 text-center">Loading...</Container>;
    if (!po) return <Container className="pt-4 text-center">Purchase Order not found</Container>;

    const { approvalStatus, approverIds = [], approvals = [] } = po;
    const isDraft = !approvalStatus || approvalStatus === 'DRAFT' || approvalStatus === 'REJECTED';

    return (
        <Container className="py-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex gap-2 align-items-center">
                    <button type="button" className="btn btn-light me-1" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
                    <Button variant="outline-secondary" onClick={() => navigate("/pos")}>&larr; Back to List</Button>
                    <Button variant="info" onClick={() => navigate(`/pos/${id}/print`)}>Print View</Button>
                </div>
                <div className="d-flex gap-2">
                    {isDraft && (
                        <>
                            <Button variant="outline-secondary" onClick={() => {
                                const taxableBase = (po.subTotal || 0) + (po.deliveryCharge || 0);
                                const currentVatRate = taxableBase > 0 && po.vatAmount > 0 ? (po.vatAmount / taxableBase * 100).toFixed(2) : '';
                                const currentOtherTaxRate = taxableBase > 0 && po.otherTaxAmount > 0 ? (po.otherTaxAmount / taxableBase * 100).toFixed(2) : '';
                                setFinancialsForm({
                                    deliveryCharge: po.deliveryCharge ?? '',
                                    vatRate: currentVatRate,
                                    otherTaxRate: currentOtherTaxRate
                                });
                                setShowFinancialsModal(true);
                            }}>Edit Totals</Button>
                            <Button
                                variant="primary"
                                disabled={submitting}
                                onClick={() => setShowSubmitModal(true)}
                            >
                                {submitting
                                    ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Submitting&hellip;</>
                                    : 'Submit for Approval'}
                            </Button>
                        </>
                    )}
                    {approvalStatus === 'PENDING_APPROVAL' && isApprover && myApprovalStatus === 'PENDING' && (
                        <div className="d-flex gap-2">
                            <Button
                                variant="success"
                                disabled={approving || rejecting}
                                onClick={() => setShowApproveModal(true)}
                            >
                                {approving
                                    ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Approving&hellip;</>
                                    : 'Approve'}
                            </Button>
                            <Button
                                variant="danger"
                                disabled={approving || rejecting}
                                onClick={() => setShowRejectModal(true)}
                            >
                                {rejecting
                                    ? <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Rejecting&hellip;</>
                                    : 'Reject'}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <Row>
                <Col md={8}>
                    <div className="bg-white shadow rounded p-4 mb-4">
                        <div className="d-flex justify-content-between align-items-start mb-4">
                            <div>
                                <h3 className="mb-1">Purchase Order: {po.poNumber}</h3>
                                <div className="text-muted">Supplier: <strong>{po.supplierNameSnapshot}</strong></div>
                            </div>
                            <div className="text-end">
                                <Button size="sm" variant="outline-primary" className="mb-2" onClick={() => setShowAddressModal(true)}>
                                    Edit Shipping Address
                                </Button>
                                <br />
                                <Badge bg={
                                    po.status === 'FULLY_RECEIVED' ? 'success' :
                                        po.status === 'PARTIALLY_RECEIVED' ? 'info' :
                                            po.status === 'SENT_TO_SUPPLIER' ? 'primary' : 'secondary'
                                } className="fs-6 me-2">{po.status}</Badge>
                                <Badge bg={
                                    approvalStatus === 'APPROVED' ? 'success' :
                                        approvalStatus === 'PENDING_APPROVAL' ? 'warning' :
                                            approvalStatus === 'REJECTED' ? 'danger' : 'secondary'
                                } className="fs-6">
                                    {approvalStatus || 'DRAFT'}
                                </Badge>
                            </div>
                        </div>

                        <Table hover responsive bordered>
                            <thead className="bg-light">
                                <tr>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Unit</th>
                                    <th className="text-end">Qty</th>
                                    <th className="text-end">Unit Price</th>
                                    <th className="text-end">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(po.items || []).map((item, idx) => {
                                    const qty = item.orderedQty;
                                    const price = item.unitPrice || 0;
                                    const total = qty * price;
                                    return (
                                        <tr key={idx}>
                                            <td>{item.productNameSnapshot}</td>
                                            <td>{item.sku}</td>
                                            <td>{item.unit}</td>
                                            <td className="text-end">{qty}</td>
                                            <td className="text-end">{price > 0 ? Number(price).toFixed(2) : "-"}</td>
                                            <td className="text-end">{total > 0 ? total.toFixed(2) : "-"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>

                        {/* Totals Breakdown — always visible */}
                        <div className="d-flex justify-content-end">
                            <div style={{ width: 320 }}>
                                <Table size="sm" borderless className="mb-0">
                                    <tbody>
                                        <tr>
                                            <td className="text-end"><strong>Subtotal:</strong></td>
                                            <td className="text-end">{(po.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-end text-muted">Delivery:</td>
                                            <td className="text-end text-muted">{(po.deliveryCharge || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-end text-muted">
                                                VAT
                                                {po.vatAmount > 0 && (po.subTotal + (po.deliveryCharge || 0)) > 0
                                                    ? ` (${((po.vatAmount / ((po.subTotal || 0) + (po.deliveryCharge || 0))) * 100).toFixed(2)}%)`
                                                    : ''}:
                                            </td>
                                            <td className="text-end text-muted">{(po.vatAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                        <tr>
                                            <td className="text-end text-muted">
                                                Other Tax
                                                {po.otherTaxAmount > 0 && (po.subTotal + (po.deliveryCharge || 0)) > 0
                                                    ? ` (${((po.otherTaxAmount / ((po.subTotal || 0) + (po.deliveryCharge || 0))) * 100).toFixed(2)}%)`
                                                    : ''}:
                                            </td>
                                            <td className="text-end text-muted">{(po.otherTaxAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        </tr>
                                        {(!po.vatAmount && !po.otherTaxAmount && po.taxTotal > 0) && (
                                            <tr>
                                                <td className="text-end text-muted">Tax (legacy):</td>
                                                <td className="text-end text-muted">{po.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )}
                                        <tr className="border-top">
                                            <td className="text-end fs-5"><strong>Grand Total:</strong></td>
                                            <td className="text-end fs-5"><strong>{(po.grandTotal || po.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong></td>
                                        </tr>
                                    </tbody>
                                </Table>
                            </div>
                        </div>

                        {po.note && (
                            <div className="mt-3 p-3 bg-light rounded">
                                <strong>Note:</strong> <span style={{ whiteSpace: "pre-wrap" }}>{po.note}</span>
                            </div>
                        )}
                    </div>
                </Col>

                <Col md={4}>
                    <div className="bg-white shadow rounded p-3 mb-3">
                        <h6 className="mb-3 border-bottom pb-2">Approval Workflow</h6>
                        {(approverIds.length > 0) ? (
                            <ul className="list-unstyled mb-0">
                                {approverIds.map(uid => {
                                    const emp = employees.find(e => e.id === uid);
                                    const name = emp ? `${emp.firstName} ${emp.lastName}` : uid;
                                    const rec = approvals.slice().reverse().find(r => r.approverId === uid);
                                    const status = rec ? rec.status : "PENDING";
                                    const color = status === 'APPROVED' ? 'success' : status === 'REJECTED' ? 'danger' : 'secondary';
                                    return (
                                        <li key={uid} className="mb-2 p-2 border rounded bg-light">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <span className="fw-semibold small">{name}</span>
                                                <Badge bg={color} text={color === 'warning' ? 'dark' : 'white'}>{status}</Badge>
                                            </div>
                                            {rec && rec.comment && (
                                                <div className="small text-muted fst-italic">"{rec.comment}"</div>
                                            )}
                                            {rec && rec.timestamp && (
                                                <div className="small text-muted" style={{ fontSize: "0.75rem" }}>{new Date(rec.timestamp).toLocaleString()}</div>
                                            )}
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="text-muted small">No approvers assigned.</div>
                        )}
                    </div>
                </Col>
            </Row>

            {/* Submit Modal */}
            <Modal show={showSubmitModal} onHide={() => setShowSubmitModal(false)}>
                <Modal.Header closeButton><Modal.Title>Submit for Approval</Modal.Title></Modal.Header>
                <Modal.Body>
                    <p>Submit this Purchase Order for approval?</p>
                    <p className="text-muted small">Approvers will be assigned based on the configured workflow roles.</p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleSubmitForApproval}>Submit</Button>
                </Modal.Footer>
            </Modal>

            {/* Approve Modal */}
            <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)}>
                <Modal.Header closeButton><Modal.Title>Approve Purchase Order</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Comment (Optional)</Form.Label>
                        <Form.Control as="textarea" rows={3} value={approvalComment} onChange={e => setApprovalComment(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowApproveModal(false)}>Cancel</Button>
                    <Button variant="success" onClick={handleApprove}>Confirm Approval</Button>
                </Modal.Footer>
            </Modal>

            {/* Reject Modal */}
            <Modal show={showRejectModal} onHide={() => setShowRejectModal(false)}>
                <Modal.Header closeButton><Modal.Title className="text-danger">Reject Purchase Order</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group>
                        <Form.Label>Reason for Rejection *</Form.Label>
                        <Form.Control as="textarea" rows={3} value={approvalComment} onChange={e => setApprovalComment(e.target.value)} />
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowRejectModal(false)}>Cancel</Button>
                    <Button variant="danger" onClick={handleReject} disabled={!approvalComment.trim()}>Reject PO</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showFinancialsModal} onHide={() => setShowFinancialsModal(false)}>
                <Modal.Header closeButton><Modal.Title>Edit Totals</Modal.Title></Modal.Header>
                <Modal.Body>
                    {/* Live preview of current subtotal */}
                    <div className="alert alert-info py-2 mb-3 small">
                        <strong>Subtotal (items):</strong> {(po.subTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>

                    <Form.Group className="mb-3">
                        <Form.Label>Delivery Charge</Form.Label>
                        <Form.Control
                            type="number" min="0" step="0.01"
                            value={financialsForm.deliveryCharge}
                            onChange={e => setFinancialsForm(f => ({ ...f, deliveryCharge: e.target.value }))}
                            placeholder="0.00"
                        />
                    </Form.Group>

                    {/* Taxable base used for % calculations */}
                    {(() => {
                        const taxableBase = (po.subTotal || 0) + (Number(financialsForm.deliveryCharge) || 0);
                        const vatAmt = (taxableBase * ((Number(financialsForm.vatRate) || 0) / 100));
                        const otherTaxAmt = (taxableBase * ((Number(financialsForm.otherTaxRate) || 0) / 100));
                        const grandTotal = taxableBase + vatAmt + otherTaxAmt;
                        return (
                            <>
                                <Form.Group className="mb-1">
                                    <Form.Label>VAT (%)</Form.Label>
                                    <Form.Control
                                        type="number" min="0" step="0.01"
                                        value={financialsForm.vatRate}
                                        onChange={e => setFinancialsForm(f => ({ ...f, vatRate: e.target.value }))}
                                        placeholder="e.g. 18"
                                    />
                                </Form.Group>
                                {financialsForm.vatRate !== '' && Number(financialsForm.vatRate) > 0 && (
                                    <div className="alert alert-success py-1 px-2 mb-3 small">
                                        {financialsForm.vatRate}% of {taxableBase.toLocaleString(undefined, { minimumFractionDigits: 2 })} = <strong>{vatAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                    </div>
                                )}

                                <Form.Group className="mb-1">
                                    <Form.Label>Other Tax (%)</Form.Label>
                                    <Form.Control
                                        type="number" min="0" step="0.01"
                                        value={financialsForm.otherTaxRate}
                                        onChange={e => setFinancialsForm(f => ({ ...f, otherTaxRate: e.target.value }))}
                                        placeholder="e.g. 2.5"
                                    />
                                </Form.Group>
                                {financialsForm.otherTaxRate !== '' && Number(financialsForm.otherTaxRate) > 0 && (
                                    <div className="alert alert-success py-1 px-2 mb-3 small">
                                        {financialsForm.otherTaxRate}% of {taxableBase.toLocaleString(undefined, { minimumFractionDigits: 2 })} = <strong>{otherTaxAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>
                                    </div>
                                )}

                                <div className="border-top pt-2 mt-2">
                                    <div className="d-flex justify-content-between fw-bold">
                                        <span>Grand Total Preview:</span>
                                        <span>{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowFinancialsModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleUpdateFinancials}>Save Totals</Button>
                </Modal.Footer>
            </Modal>

            {/* Address Modal */}
            <Modal show={showAddressModal} onHide={() => setShowAddressModal(false)} size="lg">
                <Modal.Header closeButton><Modal.Title>Update Shipping Address</Modal.Title></Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Select Saved Address (Optional)</Form.Label>
                        <Form.Select
                            value={useSavedAddressId}
                            onChange={(e) => {
                                const val = e.target.value;
                                setUseSavedAddressId(val);
                                if (val) {
                                    const found = savedAddresses.find(a => a.id === val);
                                    if (found) setAddressForm({ ...found.address, name: found.name, saveToBook: false });
                                } else {
                                    setAddressForm({ name: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "Sri Lanka", saveToBook: false });
                                }
                            }}
                        >
                            <option value="">-- Create New / Type Manually --</option>
                            {savedAddresses.map(sa => (
                                <option key={sa.id} value={sa.id}>{sa.name} - {sa.address?.line1}</option>
                            ))}
                        </Form.Select>
                    </Form.Group>
                    <h6 className="mt-4 border-bottom pb-2">Address Details</h6>
                    <Row>
                        <Col md={12}>
                            <Form.Group className="mb-2">
                                <Form.Label>Location Name (for saving)</Form.Label>
                                <Form.Control placeholder="e.g. Main Warehouse" value={addressForm.name || ""} onChange={e => setAddressForm({ ...addressForm, name: e.target.value })} disabled={!!useSavedAddressId} />
                            </Form.Group>
                        </Col>
                        <Col md={12}><Form.Group className="mb-2"><Form.Label>Address Line 1</Form.Label><Form.Control value={addressForm.line1 || ""} onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })} /></Form.Group></Col>
                        <Col md={12}><Form.Group className="mb-2"><Form.Label>Address Line 2</Form.Label><Form.Control value={addressForm.line2 || ""} onChange={e => setAddressForm({ ...addressForm, line2: e.target.value })} /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-2"><Form.Label>City</Form.Label><Form.Control value={addressForm.city || ""} onChange={e => setAddressForm({ ...addressForm, city: e.target.value })} /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-2"><Form.Label>State / Province</Form.Label><Form.Control value={addressForm.state || ""} onChange={e => setAddressForm({ ...addressForm, state: e.target.value })} /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-2"><Form.Label>Postal Code</Form.Label><Form.Control value={addressForm.postalCode || ""} onChange={e => setAddressForm({ ...addressForm, postalCode: e.target.value })} /></Form.Group></Col>
                        <Col md={6}><Form.Group className="mb-2"><Form.Label>Country</Form.Label><Form.Control value={addressForm.country || "Sri Lanka"} onChange={e => setAddressForm({ ...addressForm, country: e.target.value })} /></Form.Group></Col>
                    </Row>
                    {!useSavedAddressId && (
                        <Form.Check
                            type="checkbox"
                            label="Save this address to Address Book"
                            className="mt-3"
                            checked={addressForm.saveToBook || false}
                            onChange={e => setAddressForm({ ...addressForm, saveToBook: e.target.checked })}
                        />
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowAddressModal(false)}>Cancel</Button>
                    <Button variant="primary" onClick={handleUpdateAddress}>Update Address</Button>
                </Modal.Footer>
            </Modal>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop />
        </Container>
    );
}
