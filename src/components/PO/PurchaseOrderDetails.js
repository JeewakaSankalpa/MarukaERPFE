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

export default function PurchaseOrderDetails() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { employeeId } = useAuth(); // Logged-in user's Employee ID

    const [po, setPo] = useState(null);
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [approvalComment, setApprovalComment] = useState("");
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);

    // Address Modal
    const [showAddressModal, setShowAddressModal] = useState(false);
    const [savedAddresses, setSavedAddresses] = useState([]);
    const [addressForm, setAddressForm] = useState({ name: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "Sri Lanka" });
    const [useSavedAddressId, setUseSavedAddressId] = useState("");

    const loadData = async () => {
        try {
            setLoading(true);
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

    // Computed Logic
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
        try {
            const updated = await submitApprovalAPI(id, { manualPolicy: "ANY" }); // Defaulting to ANY or config driven
            setPo(updated);
            setShowSubmitModal(false);
            toast.success("Submitted for approval");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to submit");
        }
    };

    const handleApprove = async () => {
        try {
            const updated = await approveAPI(id, { comment: approvalComment });
            setPo(updated);
            setShowApproveModal(false);
            setApprovalComment("");
            toast.success("Approved successfully");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to approve");
        }
    };

    const handleReject = async () => {
        try {
            const updated = await rejectAPI(id, { comment: approvalComment });
            setPo(updated);
            setShowRejectModal(false);
            setApprovalComment("");
            toast.success("Rejected PO");
        } catch (e) {
            toast.error(e.response?.data?.message || "Failed to reject");
        }
    };

    const handleUpdateAddress = async () => {
        try {
            let addrToSave = { ...addressForm };

            // If selecting from saved
            if (useSavedAddressId) {
                const found = savedAddresses.find(a => a.id === useSavedAddressId);
                if (found) addrToSave = { ...found.address, name: found.name };
            } else {
                // If creating new (optional: save to book)
                // For now just update PO
            }

            // Remove name from pure address if backend compliant, but our backend ignores extra fields usually or we can clean it
            // Backend Address object doesn't have 'name'. But SavedAddress does.
            // PO.shippingAddress is type Address.
            // Let's strip 'name' if it's not in Address model. Address.java: line1, line2, city... NO name.
            // So we pass the address fields.
            const cleanAddr = {
                line1: addrToSave.line1,
                line2: addrToSave.line2,
                city: addrToSave.city,
                state: addrToSave.state,
                postalCode: addrToSave.postalCode,
                country: addrToSave.country
            };

            const updated = await updatePOAddressAPI(id, cleanAddr);
            // If user wanted to save to book (we can add a checkbox "Save to address book")
            // For now, let's keep it simple: "Picking Saved" or "Typing New"
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

    return (
        <Container style={{ width: "90vw", maxWidth: 1200, paddingTop: 24 }}>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="d-flex gap-2">
                    <Button variant="outline-secondary" onClick={() => navigate("/pos")}>&larr; Back to List</Button>
                    <Button variant="info" onClick={() => navigate(`/pos/${id}/print`)}>Print View</Button>
                </div>
                <div>
                    {/* Actions based on state */}
                    {(approvalStatus === 'DRAFT' || approvalStatus === 'REJECTED' || !approvalStatus) && (
                        <Button variant="primary" onClick={() => setShowSubmitModal(true)}>Submit for Approval</Button>
                    )}

                    {approvalStatus === 'PENDING_APPROVAL' && isApprover && myApprovalStatus === 'PENDING' && (
                        <div className="d-flex gap-2">
                            <Button variant="success" onClick={() => setShowApproveModal(true)}>Approve</Button>
                            <Button variant="danger" onClick={() => setShowRejectModal(true)}>Reject</Button>
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
                                    <th className="text-end">Price</th>
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
                                            <td className="text-end">{price > 0 ? price.toFixed(2) : "-"}</td>
                                            <td className="text-end">{total > 0 ? total.toFixed(2) : "-"}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </Table>

                        {/* Totals Breakdown */}
                        <div className="d-flex justify-content-end">
                            <div style={{ width: 300 }}>
                                <Table size="sm" borderless className="mb-0">
                                    <tbody>
                                        <tr>
                                            <td className="text-end"><strong>Subtotal:</strong></td>
                                            <td className="text-end">{po.subTotal ? po.subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '0.00'}</td>
                                        </tr>
                                        {po.deliveryCharge > 0 && (
                                            <tr>
                                                <td className="text-end">Delivery:</td>
                                                <td className="text-end">{po.deliveryCharge.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )}
                                        {po.vatAmount > 0 && (
                                            <tr>
                                                <td className="text-end">VAT:</td>
                                                <td className="text-end">{po.vatAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )}
                                        {po.otherTaxAmount > 0 && (
                                            <tr>
                                                <td className="text-end">Other Tax:</td>
                                                <td className="text-end">{po.otherTaxAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )}
                                        {/* Legacy Tax Fallback */}
                                        {(!po.vatAmount && !po.otherTaxAmount && po.taxTotal > 0) && (
                                            <tr>
                                                <td className="text-end">Tax:</td>
                                                <td className="text-end">{po.taxTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                            </tr>
                                        )}
                                        <tr className="border-top">
                                            <td className="text-end fs-5"><strong>Total:</strong></td>
                                            <td className="text-end fs-5"><strong>{po.grandTotal ? po.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : (po.subTotal || 0).toLocaleString()}</strong></td>
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
                    {/* Workflow Status Card */}
                    <div className="bg-white shadow rounded p-3 mb-3">
                        <h6 className="mb-3 border-bottom pb-2">Approval Workflow</h6>

                        {(approverIds.length > 0) ? (
                            <ul className="list-unstyled mb-0">
                                {approverIds.map(uid => {
                                    const emp = employees.find(e => e.id === uid);
                                    const name = emp ? `${emp.firstName} ${emp.lastName}` : uid;

                                    // Check history for latest status from this approver
                                    // Filter approvals by this approver, sort by timestamp desc, pick first? 
                                    // Actually we just check if they approved "APPROVED" in the `approvals` list.
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
                                <Form.Control
                                    placeholder="e.g. Main Warehouse"
                                    value={addressForm.name || ""}
                                    onChange={e => setAddressForm({ ...addressForm, name: e.target.value })}
                                    disabled={!!useSavedAddressId}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group className="mb-2">
                                <Form.Label>Address Line 1</Form.Label>
                                <Form.Control
                                    value={addressForm.line1 || ""}
                                    onChange={e => setAddressForm({ ...addressForm, line1: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={12}>
                            <Form.Group className="mb-2">
                                <Form.Label>Address Line 2</Form.Label>
                                <Form.Control
                                    value={addressForm.line2 || ""}
                                    onChange={e => setAddressForm({ ...addressForm, line2: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>City</Form.Label>
                                <Form.Control
                                    value={addressForm.city || ""}
                                    onChange={e => setAddressForm({ ...addressForm, city: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>State / Province</Form.Label>
                                <Form.Control
                                    value={addressForm.state || ""}
                                    onChange={e => setAddressForm({ ...addressForm, state: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>Postal Code</Form.Label>
                                <Form.Control
                                    value={addressForm.postalCode || ""}
                                    onChange={e => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
                        <Col md={6}>
                            <Form.Group className="mb-2">
                                <Form.Label>Country</Form.Label>
                                <Form.Control
                                    value={addressForm.country || "Sri Lanka"}
                                    onChange={e => setAddressForm({ ...addressForm, country: e.target.value })}
                                />
                            </Form.Group>
                        </Col>
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
