import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Table, Alert, Modal, Form, Tabs, Tab, Badge } from "react-bootstrap";
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

const INVOICE_TYPES = {
    PROFORMA: "proforma",
    NORMAL: "normal",
    TAX: "tax",
};

const invoiceTypeLabels = {
    [INVOICE_TYPES.PROFORMA]: "Proforma Invoice",
    [INVOICE_TYPES.NORMAL]: "Cash Invoice",
    [INVOICE_TYPES.TAX]: "Tax Invoice",
};

const getInvoiceDocumentType = (invoice) => {
    if (!invoice) return INVOICE_TYPES.PROFORMA;
    if (invoice.downloadDocumentType) return invoice.downloadDocumentType;
    if (invoice.taxInvoiceNumber) return INVOICE_TYPES.TAX;
    if (invoice.normalInvoiceNumber) return INVOICE_TYPES.NORMAL;
    return INVOICE_TYPES.PROFORMA;
};

const getInvoiceDocumentNumber = (invoice) =>
    invoice?.taxInvoiceNumber || invoice?.normalInvoiceNumber || invoice?.proformaInvoiceNumber || invoice?.invoiceNumber;

const formatDateTime = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
};

const invoiceTypeVariant = (invoice) => {
    const type = getInvoiceDocumentType(invoice);
    if (type === INVOICE_TYPES.TAX) return "success";
    if (type === INVOICE_TYPES.NORMAL) return "primary";
    return "info";
};

const statusVariant = (status) => {
    switch (status) {
        case "PAID": return "success";
        case "CANCELLED": return "danger";
        case "PARTIALLY_PAID": return "info";
        default: return "warning";
    }
};

const componentAmount = (component) =>
    component?.lineTotalBeforeTax ?? component?.subtotalWithMargin ?? component?.itemsSubtotal ?? 0;

const itemDescription = (item) =>
    item?.description || item?.productNameSnapshot || item?.productId || "";

const normalizeLineText = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

const aggregateItems = (items = []) => {
    const groups = new Map();

    items.forEach((item, index) => {
        const description = itemDescription(item);
        const key = item?.productId
            ? `product:${item.productId}`
            : `manual:${normalizeLineText(description)}:${normalizeLineText(item?.unit)}:${Number(item?.estUnitCost || 0)}`;
        const quantity = Number(item?.quantity || 0);
        const unitCost = Number(item?.estUnitCost || 0);

        if (!groups.has(key)) {
            groups.set(key, {
                ...item,
                key: `${key}-${index}`,
                description,
                quantity,
                estUnitCost: unitCost,
                __quantity: quantity,
                __extendedCost: quantity * unitCost,
            });
            return;
        }

        const group = groups.get(key);
        group.quantity += quantity;
        group.__quantity += quantity;
        group.__extendedCost += quantity * unitCost;
        if (group.__quantity > 0) {
            group.estUnitCost = group.__extendedCost / group.__quantity;
        }
    });

    return Array.from(groups.values()).map(({ __quantity, __extendedCost, ...item }) => item);
};

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
    const [invoiceType, setInvoiceType] = useState(INVOICE_TYPES.PROFORMA);
    const [activeTab, setActiveTab] = useState("quotation");

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

    useEffect(() => {
        const hasFinalInvoice = invoices
            .filter(inv => inv.status !== "CANCELLED")
            .some(inv => {
                const type = getInvoiceDocumentType(inv);
                return type === INVOICE_TYPES.NORMAL || type === INVOICE_TYPES.TAX;
            });

        if (hasFinalInvoice && invoiceType !== INVOICE_TYPES.PROFORMA) {
            setInvoiceType(INVOICE_TYPES.PROFORMA);
        }
    }, [invoices, invoiceType]);

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
        const label = invoiceTypeLabels[invoiceType] || "invoice";
        if (!window.confirm(`Generate ${label} from this quotation?`)) return;
        setIsGenerating(true);
        try {
            await api.post(`/invoices/generate-from-estimation/${estimation.id}?type=${invoiceType}`);
            toast.success(`${label} generated successfully!`);
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
    const activeInvoices = invoices.filter(inv => inv.status !== "CANCELLED");
    const hasActiveFinalInvoice = activeInvoices.some(inv => {
        const type = getInvoiceDocumentType(inv);
        return type === INVOICE_TYPES.NORMAL || type === INVOICE_TYPES.TAX;
    });
    const availableInvoiceTypes = [
        INVOICE_TYPES.PROFORMA,
        ...(!hasActiveFinalInvoice ? [INVOICE_TYPES.NORMAL, INVOICE_TYPES.TAX] : []),
    ];
    const today = new Date();
    const validUntil = new Date();
    validUntil.setDate(today.getDate() + 30);
    const inquiryRef = project?.id || project?.inquiryNumber || project?.referenceNumber || projectId || "-";
    const jobRef = project?.jobNumber || "-";
    const subtitleParts = [`Inquiry: ${inquiryRef}`];
    if (project?.jobNumber) subtitleParts.push(`Job: ${project.jobNumber}`);

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
                    {activeTab === "quotation" && (
                        <>
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
                            <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
                        </>
                    )}
                </div>
            </div>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop className="no-print" />

            <Tabs
                activeKey={activeTab}
                onSelect={(key) => setActiveTab(key || "quotation")}
                className="mb-3 no-print"
            >
                <Tab eventKey="quotation" title="Quotation" />
                <Tab eventKey="invoices" title={`Invoices (${activeInvoices.length})`} />
            </Tabs>

            {activeTab === "invoices" ? (
                <div className="no-print">
                    <div className="border rounded bg-white">
                        <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap p-3 border-bottom">
                            <div>
                                <h5 className="mb-1">Invoice history</h5>
                                <div className="text-muted small">
                                    Every generated invoice is recorded here with its number, version, creator, timestamp, and total.
                                </div>
                            </div>
                            {isFinalized && (
                                <div className="d-flex gap-2 align-items-center">
                                    <Form.Select
                                        size="sm"
                                        className="w-auto"
                                        value={invoiceType}
                                        onChange={(e) => setInvoiceType(e.target.value)}
                                        aria-label="Invoice type to generate"
                                        disabled={isGenerating}
                                    >
                                        {availableInvoiceTypes.map(type => (
                                            <option key={type} value={type}>{invoiceTypeLabels[type]}</option>
                                        ))}
                                    </Form.Select>
                                    <Button variant="warning" size="sm" onClick={handleGenerateInvoice} disabled={isGenerating}>
                                        Generate {invoiceTypeLabels[invoiceType]}
                                    </Button>
                                </div>
                            )}
                        </div>
                        <div className="p-3">
                            {!isFinalized ? (
                                <Alert variant="warning" className="mb-0">
                                    Finalize the quotation before generating proforma, cash, or tax invoices.
                                </Alert>
                            ) : activeInvoices.length === 0 ? (
                                <div className="text-center text-muted py-5">
                                    No invoices generated yet.
                                </div>
                            ) : (
                                <Table responsive hover size="sm" className="align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Invoice no</th>
                                            <th>Type</th>
                                            <th>Version</th>
                                            <th>Generated by</th>
                                            <th>Generated at</th>
                                            <th>Status</th>
                                            <th className="text-end">Total</th>
                                            <th className="text-end">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[...activeInvoices]
                                            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
                                            .map(invoice => {
                                                const type = getInvoiceDocumentType(invoice);
                                                return (
                                                    <tr key={invoice.id}>
                                                        <td className="fw-semibold">{getInvoiceDocumentNumber(invoice) || "-"}</td>
                                                        <td><Badge bg={invoiceTypeVariant(invoice)}>{invoiceTypeLabels[type] || type}</Badge></td>
                                                        <td>{invoice.documentVersion || 1}</td>
                                                        <td>{invoice.createdBy || "system"}</td>
                                                        <td>{formatDateTime(invoice.createdAt)}</td>
                                                        <td><Badge bg={statusVariant(invoice.status)}>{invoice.status || "PENDING"}</Badge></td>
                                                        <td className="text-end">LKR {money(invoice.totalAmount)}</td>
                                                        <td className="text-end">
                                                            <Button
                                                                size="sm"
                                                                variant="outline-primary"
                                                                onClick={() => navigate(`/invoices/${invoice.id}?type=${type}`)}
                                                            >
                                                                View
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                    </tbody>
                                </Table>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <>
                    {isFinalized && <Alert variant="success" className="no-print">This quotation is finalized and locked.</Alert>}

                    <ReportLayout
                        title="Quotation"
                        orientation="portrait"
                        subtitle={`${subtitleParts.join(" | ")} - v${estimation.version || 1}`}
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
                        <div><strong>Inquiry No:</strong> {inquiryRef}</div>
                        <div><strong>Job No:</strong> {jobRef}</div>
                    </div>
                </div>

                {printFormat !== PRINT_FORMATS.TOTALS_ONLY && (
                    <Table bordered size="sm">
                        <thead className="table-light">
                            <tr>
                                <th>Description</th>
                                {(printFormat === PRINT_FORMATS.ALL ||
                                    printFormat === PRINT_FORMATS.COMPONENTS_WITH_ITEMS) && (
                                    <th className="text-end" style={{ width: "100px" }}>Qty</th>
                                )}
                                {printFormat === PRINT_FORMATS.ALL && (
                                    <>
                                        <th className="text-end" style={{ width: "90px" }}>Unit</th>
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
                                        {printFormat === PRINT_FORMATS.ALL && <td colSpan="3" />}
                                        {printFormat === PRINT_FORMATS.COMPONENTS_WITH_ITEMS && <td />}
                                        <td className="text-end fw-bold">{money(componentAmount(comp))}</td>
                                    </tr>
                                    {printFormat !== PRINT_FORMATS.COMPONENTS_ONLY && aggregateItems(comp.items).map((item, i) => (
                                        <tr key={item.key || `${idx}-${i}`}>
                                            <td className="ps-4">{itemDescription(item)}</td>
                                            {printFormat === PRINT_FORMATS.ALL && (
                                                <>
                                                    <td className="text-end">{item.quantity}</td>
                                                    <td className="text-end">{item.unit || "-"}</td>
                                                    <td className="text-end">{money(item.estUnitCost)}</td>
                                                    <td className="text-end">{money((item.quantity || 0) * (item.estUnitCost || 0))}</td>
                                                </>
                                            )}
                                            {printFormat === PRINT_FORMATS.COMPONENTS_WITH_ITEMS && (
                                                <>
                                                    <td className="text-end">{item.quantity}</td>
                                                    <td />
                                                </>
                                            )}
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
                </>
            )}
        </div>
    );
};

export default QuotationPrint;
