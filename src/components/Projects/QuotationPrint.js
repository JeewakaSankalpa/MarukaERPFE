import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Table, Alert, Modal, Form } from "react-bootstrap";
import ReportLayout from "../ReusableComponents/ReportLayout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const money = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
};

const PRINT_FORMATS = {
    ALL: "all",
    COMPONENTS_ONLY: "componentsOnly",
    COMPONENTS_WITH_ITEMS: "componentsWithItems",
    TOTALS_ONLY: "totalsOnly",
};

const componentAmount = (component) =>
    component?.lineTotalBeforeTax ?? component?.subtotalWithMargin ?? component?.itemsSubtotal ?? 0;

const QuotationPrint = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [estimation, setEstimation] = useState(null);
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [printFormat, setPrintFormat] = useState(PRINT_FORMATS.ALL);

    const fetchData = async () => {
        try {
            const estRes = await api.get(`/estimations/by-project/${projectId}`);
            setEstimation(estRes.data);

            const projRes = await api.get(`/projects/${projectId}`);
            setProject(projRes.data);

            if (projRes.data.customerId) {
                const custRes = await api.get(`/customer/${projRes.data.customerId}`);
                setCustomer(custRes.data);
            }

            try {
                const invRes = await api.get(`/invoices/by-project/${projectId}`);
                setInvoices(invRes.data || []);
            } catch (invErr) {
                console.warn("Could not fetch invoices", invErr);
            }
        } catch (error) {
            console.error("Failed to load data", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line
    }, [projectId]);

    const handleFinalize = async () => {
        if (!window.confirm("Are you sure you want to finalize this quotation? It will be locked.")) return;
        try {
            await api.post(`/estimations/${estimation.id}/finalize`);
            fetchData();
        } catch (error) {
            toast.error("Failed to finalize quotation");
        }
    };

    const handleGenerateInvoice = async () => {
        if (!window.confirm("Generate a proforma invoice from this quotation?")) return;
        setIsGenerating(true);
        try {
            await api.post(`/invoices/generate-from-estimation/${estimation.id}`);
            toast.success("Proforma invoice generated successfully!");
            fetchData();
        } catch (error) {
            console.error(error);
            const msg = error.response?.data?.message || error.response?.data || "Failed to generate invoice";
            toast.error(typeof msg === 'string' ? msg : JSON.stringify(msg));
        } finally {
            setIsGenerating(false);
        }
    };

    const handlePrint = () => window.print();

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
    if (!estimation) return <div className="text-center p-5">No estimation found for this project.</div>;

    const isFinalized = estimation.status === "FINALIZED";
    const hasActiveInvoice = invoices.some(inv => inv.status !== "CANCELLED");
    const today = new Date();
    const validUntil = new Date();
    validUntil.setDate(today.getDate() + 30);
    const projectRef = project?.jobNumber || project?.projectNumber || project?.projectCode || project?.id || projectId;
    const poRef = project?.poNumber || project?.customerPoNo || project?.purchaseOrderNo || "Verbally confirmed";
    const activeInvoice = invoices.find(i => i.status !== "CANCELLED");

    return (
        <div className="bg-white min-vh-100 p-4">
            {/* Processing Modal */}
            <Modal show={isGenerating} backdrop="static" keyboard={false} centered>
                <Modal.Body className="text-center p-5">
                    <Spinner animation="border" variant="primary" className="mb-3" />
                    <h5>Generating Invoice...</h5>
                    <p className="text-muted mb-0">Please wait while the invoice is being created.</p>
                </Modal.Body>
            </Modal>
            {/* Controls */}
            <div className="d-flex justify-content-between mb-4 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <div className="d-flex gap-2 align-items-center">
                    <Form.Select
                        size="sm"
                        className="w-auto"
                        value={printFormat}
                        onChange={(e) => setPrintFormat(e.target.value)}
                        aria-label="Quotation print format"
                    >
                        <option value={PRINT_FORMATS.ALL}>Show everything</option>
                        <option value={PRINT_FORMATS.COMPONENTS_ONLY}>Main components only</option>
                        <option value={PRINT_FORMATS.COMPONENTS_WITH_ITEMS}>Components + subcomponent names</option>
                        <option value={PRINT_FORMATS.TOTALS_ONLY}>Totals only</option>
                    </Form.Select>
                    {!isFinalized && (
                        <Button variant="success" onClick={handleFinalize}>Finalize Quote</Button>
                    )}
                    {isFinalized && !hasActiveInvoice && (
                        <Button variant="warning" onClick={handleGenerateInvoice}>Generate Proforma Invoice</Button>
                    )}
                    {isFinalized && activeInvoice && (
                        <Button variant="success" onClick={() => navigate(`/invoices/${activeInvoice.id}`)}>View Proforma Invoice</Button>
                    )}
                    <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
                </div>
            </div>

            {isFinalized && <Alert variant="success" className="no-print">This quotation is finalized and locked.</Alert>}

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop className="no-print" />

            <ReportLayout
                title="Quotation"
                orientation="portrait"
                subtitle={`Ref: ${projectRef} - v${estimation.version || 1}`}
            >
                <div className="mb-4 d-flex justify-content-between gap-4">
                    <div style={{ maxWidth: "55%" }}>
                        <div className="fw-bold text-uppercase mb-2">Bill To</div>
                        {customer ? (
                            <>
                                <div className="fw-bold">{customer.comName || customer.name}</div>
                                <div>{customer.pAddr || customer.address}</div>
                                <div>{customer.pContact || customer.contactNo}</div>
                                <div>{customer.email || customer.comEmail}</div>
                                {customer.vatNumber && <div><strong>VAT No:</strong> {customer.vatNumber}</div>}
                            </>
                        ) : "Customer Details Not Available"}
                    </div>
                    <div className="text-end" style={{ minWidth: 240 }}>
                        <div><strong>Date:</strong> {formatDate(today)}</div>
                        <div><strong>Valid Until:</strong> {formatDate(validUntil)}</div>
                        <div><strong>PO No:</strong> {poRef}</div>
                        <div><strong>Project No:</strong> {projectRef}</div>
                    </div>
                </div>

                {printFormat !== PRINT_FORMATS.TOTALS_ONLY && (
                    <Table bordered size="sm">
                        <thead className="table-light">
                            <tr>
                                <th>Description</th>
                                {printFormat === PRINT_FORMATS.ALL && (
                                    <>
                                        <th className="text-end" style={{ width: "100px" }}>Qty</th>
                                        <th className="text-end" style={{ width: "150px" }}>Unit Price</th>
                                    </>
                                )}
                                <th className="text-end" style={{ width: "150px" }}>Total</th>
                            </tr>
                        </thead>
                        <tbody>
                            {estimation.components?.map((comp, idx) => (
                                <React.Fragment key={idx}>
                                    <tr className="table-secondary">
                                        <td><strong>{comp.name}</strong></td>
                                        {printFormat === PRINT_FORMATS.ALL && <td colSpan="2" />}
                                        <td className="text-end fw-bold">{money(componentAmount(comp))}</td>
                                    </tr>
                                    {printFormat !== PRINT_FORMATS.COMPONENTS_ONLY && comp.items?.map((item, i) => (
                                        <tr key={`${idx}-${i}`}>
                                            <td className="ps-4">{item.productNameSnapshot || item.productId}</td>
                                            {printFormat === PRINT_FORMATS.ALL && (
                                                <>
                                                    <td className="text-end">{item.quantity}</td>
                                                    <td className="text-end">{money(item.estUnitCost)}</td>
                                                    <td className="text-end">{money((item.quantity || 0) * (item.estUnitCost || 0))}</td>
                                                </>
                                            )}
                                            {printFormat === PRINT_FORMATS.COMPONENTS_WITH_ITEMS && <td />}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </Table>
                )}

                <Table bordered size="sm" className={printFormat === PRINT_FORMATS.TOTALS_ONLY ? "" : "mt-3"}>
                    <tfoot>
                        <tr>
                            <td className="text-end fw-bold">Subtotal</td>
                            <td className="text-end" style={{ width: "150px" }}>{money(estimation.computedSubtotal)}</td>
                        </tr>
                        {estimation.computedVatAmount > 0 && (
                            <tr>
                                <td className="text-end">VAT ({estimation.vatPercent}%)</td>
                                <td className="text-end">{money(estimation.computedVatAmount)}</td>
                            </tr>
                        )}
                        <tr className="table-active fw-bold fs-5">
                            <td className="text-end">GRAND TOTAL</td>
                            <td className="text-end">{money(estimation.computedGrandTotal)}</td>
                        </tr>
                    </tfoot>
                </Table>

                {(estimation.customNote) && (
                    <div className="mt-4 p-3 bg-light border rounded no-print-bg">
                        <strong>Notes:</strong>
                        <p className="mb-0 small" style={{ whiteSpace: "pre-wrap" }}>{estimation.customNote}</p>
                    </div>
                )}

                <div className="mt-4">
                    <strong>Terms & Conditions:</strong>
                    {estimation.terms && estimation.terms.length > 0 ? (
                        <Table size="sm" className="mt-2" bordered>
                            <tbody>
                                {estimation.terms.map((t, idx) => (
                                    <tr key={idx}>
                                        <td style={{ width: "30%", fontWeight: "bold", fontSize: "0.9rem" }}>{t.label}</td>
                                        <td style={{ fontSize: "0.9rem" }}>{t.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    ) : (
                        <ul className="small text-muted mt-2">
                            <li>This quotation is valid for 30 days from the date of issue.</li>
                            <li>Payment terms: 50% advance, 50% upon completion.</li>
                            <li>Delivery timeline: Subject to material availability.</li>
                        </ul>
                    )}
                </div>

                <div className="mt-5 d-flex justify-content-between gap-5">
                    <div style={{ width: "45%" }}>
                        <div className="border-top pt-2 small text-muted">Prepared By</div>
                    </div>
                    <div style={{ width: "45%" }}>
                        <div className="border-top pt-2 small text-muted">Accepted By / Date</div>
                    </div>
                </div>
            </ReportLayout>
        </div>
    );
};

export default QuotationPrint;
