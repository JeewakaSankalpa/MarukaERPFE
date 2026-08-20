import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Table, Alert, Modal, Form, Tabs, Tab, Badge, Dropdown } from "react-bootstrap";
import ReportLayout from "../ReusableComponents/ReportLayout";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const money = (value) => Number(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const roundMoney = (value) => {
    const number = Number(value || 0);
    return Number.isFinite(number) ? Math.round(number * 100) / 100 : 0;
};

const decimalTotal = (values = []) =>
    values.reduce((sum, value) => roundMoney(sum + roundMoney(value)), 0);

const formatQuantity = (value) => {
    const number = Number(value || 0);
    return Number.isFinite(number) ? number.toLocaleString("en-US", { maximumFractionDigits: 6 }) : "";
};

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString();
};

const PRINT_FORMATS = {
    ALL: "all",
    COMPONENTS_ONLY: "componentsOnly",
    COMPONENTS_WITH_ITEMS: "componentsWithItems",
    TOTALS_ONLY: "totalsOnly",
    CUSTOM: "custom",
};

const PRINT_PRESETS = {
    [PRINT_FORMATS.ALL]: {
        showComponents: true,
        showComponentPrices: true,
        showItems: true,
        showItemQuantities: true,
        showItemUnits: true,
        showItemUnitPrices: true,
        showItemTotals: true,
        showSubtotal: true,
        showDiscount: true,
        showVat: true,
        showOtherTax: true,
        showGrandTotal: true,
        showNotes: true,
        showTerms: true,
        showSignatures: true,
    },
    [PRINT_FORMATS.COMPONENTS_ONLY]: {
        showComponents: true,
        showComponentPrices: true,
        showItems: false,
        showItemQuantities: false,
        showItemUnits: false,
        showItemUnitPrices: false,
        showItemTotals: false,
        showSubtotal: true,
        showDiscount: true,
        showVat: true,
        showOtherTax: true,
        showGrandTotal: true,
        showNotes: true,
        showTerms: true,
        showSignatures: true,
    },
    [PRINT_FORMATS.COMPONENTS_WITH_ITEMS]: {
        showComponents: true,
        showComponentPrices: true,
        showItems: true,
        showItemQuantities: true,
        showItemUnits: false,
        showItemUnitPrices: false,
        showItemTotals: false,
        showSubtotal: true,
        showDiscount: true,
        showVat: true,
        showOtherTax: true,
        showGrandTotal: true,
        showNotes: true,
        showTerms: true,
        showSignatures: true,
    },
    [PRINT_FORMATS.TOTALS_ONLY]: {
        showComponents: false,
        showComponentPrices: false,
        showItems: false,
        showItemQuantities: false,
        showItemUnits: false,
        showItemUnitPrices: false,
        showItemTotals: false,
        showSubtotal: true,
        showDiscount: true,
        showVat: true,
        showOtherTax: true,
        showGrandTotal: true,
        showNotes: true,
        showTerms: true,
        showSignatures: true,
    },
};

const PRINT_OPTION_GROUPS = [
    {
        title: "Main components",
        options: [
            ["showComponents", "Names"],
            ["showComponentPrices", "Prices"],
        ],
    },
    {
        title: "Subcomponents",
        options: [
            ["showItems", "Names"],
            ["showItemQuantities", "Quantities"],
            ["showItemUnits", "Units"],
            ["showItemUnitPrices", "Unit prices"],
            ["showItemTotals", "Totals"],
        ],
    },
    {
        title: "Totals and footer",
        options: [
            ["showSubtotal", "Subtotal"],
            ["showDiscount", "Discount"],
            ["showVat", "VAT"],
            ["showOtherTax", "Other tax"],
            ["showGrandTotal", "Grand total"],
            ["showNotes", "Notes"],
            ["showTerms", "Terms"],
            ["showSignatures", "Signatures"],
        ],
    },
];

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

const normalizeRole = (role) => String(role || "").trim().toUpperCase();

const componentQuantity = (component) => Math.max(1, Number(component?.quantity || 1) || 1);
const roundDownToPlace = (value, place) => {
    const amount = Number(value || 0);
    const step = Math.max(1, Number(place || 1));
    if (!Number.isFinite(amount) || amount === 0) return 0;
    return Math.floor(amount / step) * step;
};

const componentAmount = (component, includeDelivery = true, includeFreight = true) => {
    if (component?.lineTotalBeforeTax != null) {
        return roundMoney(component.lineTotalBeforeTax);
    }
    const qty = componentQuantity(component);
    const itemsSubtotal = (component?.items || []).reduce(
        (sum, item) => decimalTotal([sum, Number(item?.estUnitCost || 0) * Number(item?.quantity || 0) * qty]),
        0
    );
    if (component?.items?.length) {
        const overheadAmount = roundMoney(itemsSubtotal * (Number(component?.overheadPercent || 0) / 100));
        const baseForMargin = decimalTotal([itemsSubtotal, overheadAmount]);
        const marginAmount = roundMoney(baseForMargin * (Number(component?.marginPercent || 0) / 100));
        const delivery = includeDelivery ? roundMoney(Number(component?.deliveryCost || 0) * qty) : 0;
        const freight = includeFreight ? roundMoney(Number(component?.freightCost || 0) * qty) : 0;
        return decimalTotal([baseForMargin, marginAmount, delivery, freight]);
    }
    return roundMoney(component?.lineTotalBeforeTax ?? component?.subtotalWithMargin ?? component?.itemsSubtotal ?? 0);
};

const computeQuotationTotals = (estimation) => {
    const components = estimation?.components || [];
    const includeDelivery = estimation?.includeDelivery !== false;
    const includeFreight = estimation?.includeFreight !== false;
    const includeVat = estimation?.includeVat !== false;
    const includeTax = estimation?.includeTax === true;
    const roundSubtotal = estimation?.roundingEnabled === true;
    const roundingPlace = estimation?.roundingPlace || 1;
    let taxableBaseRaw = 0;
    let nonTaxableRaw = 0;

    components.forEach((component) => {
        const qty = componentQuantity(component);
        const itemsSubtotal = (component?.items || []).reduce(
            (sum, item) => decimalTotal([sum, Number(item?.estUnitCost || 0) * Number(item?.quantity || 0) * qty]),
            0
        );
        const overheadAmount = component?.subtotalWithMargin != null
            ? 0
            : roundMoney(itemsSubtotal * (Number(component?.overheadPercent || 0) / 100));
        const baseForMargin = decimalTotal([itemsSubtotal, overheadAmount]);
        const marginAmount = component?.subtotalWithMargin != null
            ? 0
            : roundMoney(baseForMargin * (Number(component?.marginPercent || 0) / 100));
        const afterMargin = component?.subtotalWithMargin != null
            ? roundMoney(component.subtotalWithMargin || 0)
            : decimalTotal([baseForMargin, marginAmount]);
        const delivery = includeDelivery ? roundMoney(Number(component?.deliveryCost || 0) * qty) : 0;
        const deliveryTaxable = includeDelivery && component?.deliveryTaxable === true;
        const freight = includeFreight ? roundMoney(Number(component?.freightCost || 0) * qty) : 0;
        const freightTaxable = includeFreight && component?.freightTaxable === true;
        const taxableRaw = decimalTotal([afterMargin, deliveryTaxable ? delivery : 0, freightTaxable ? freight : 0]);
        const nonTaxableRawPart = decimalTotal([deliveryTaxable ? 0 : delivery, freightTaxable ? 0 : freight]);
        const lineTotalRaw = decimalTotal([taxableRaw, nonTaxableRawPart]);
        const lineTotal = component?.lineTotalBeforeTax != null
            ? Number(component.lineTotalBeforeTax || 0)
            : (roundSubtotal ? roundDownToPlace(lineTotalRaw, roundingPlace) : lineTotalRaw);
        const roundingDelta = lineTotal - lineTotalRaw;

        taxableBaseRaw = decimalTotal([taxableBaseRaw, taxableRaw > 0 ? taxableRaw + roundingDelta : taxableRaw]);
        nonTaxableRaw = decimalTotal([nonTaxableRaw, taxableRaw > 0 ? nonTaxableRawPart : nonTaxableRawPart + roundingDelta]);
    });

    const discountPct = Number(estimation?.discountPercent || 0);
    const totalBeforeDiscount = taxableBaseRaw + nonTaxableRaw;
    const discountAmount = roundMoney(totalBeforeDiscount * (Number.isFinite(discountPct) ? discountPct / 100 : 0));
    let taxableBase = taxableBaseRaw;
    let nonTaxable = nonTaxableRaw;

    if (totalBeforeDiscount > 0) {
        const taxableRatio = taxableBaseRaw / totalBeforeDiscount;
        taxableBase = roundMoney(taxableBase - roundMoney(discountAmount * taxableRatio));
        nonTaxable = roundMoney(nonTaxable - roundMoney(discountAmount * (1 - taxableRatio)));
    }

    const vatPct = includeVat ? Number(estimation?.vatPercent || 0) : 0;
    const taxPct = includeTax ? Number(estimation?.taxPercent || 0) : 0;
    const computedDiscountAmount = estimation?.computedDiscountAmount != null
        ? roundMoney(estimation.computedDiscountAmount)
        : null;
    const discountTotal = computedDiscountAmount ?? discountAmount;
    const vatAmount = estimation?.computedVatAmount != null
        ? roundMoney(estimation.computedVatAmount)
        : roundMoney(taxableBase * (Number.isFinite(vatPct) ? vatPct / 100 : 0));
    const taxAmount = estimation?.computedTaxAmount != null
        ? roundMoney(estimation.computedTaxAmount)
        : roundMoney(taxableBase * (Number.isFinite(taxPct) ? taxPct / 100 : 0));
    const grandTotal = estimation?.computedGrandTotal != null
        ? roundMoney(estimation.computedGrandTotal)
        : decimalTotal([taxableBase, nonTaxable, vatAmount, taxAmount]);
    const subtotal = estimation?.computedGrandTotal != null
        ? decimalTotal([grandTotal, -vatAmount, -taxAmount, discountTotal])
        : totalBeforeDiscount;

    return {
        subtotal: subtotal || roundMoney(estimation?.computedSubtotal || 0),
        discountAmount: discountTotal,
        vatAmount,
        taxAmount,
        taxTotal: vatAmount + taxAmount,
        grandTotal,
    };
};

const componentLabel = (component) => {
    const qty = componentQuantity(component);
    return qty !== 1 ? `${component?.name || "Component"} x ${formatQuantity(qty)}` : (component?.name || "Component");
};

const itemDescription = (item) =>
    item?.description || item?.productNameSnapshot || item?.productId || "";

const normalizeLineText = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

const getApiErrorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (typeof data === "string") return data;
    return data?.message || data?.error || error?.message || fallback;
};

const aggregateItems = (items = [], multiplier = 1) => {
    const groups = new Map();
    const qtyMultiplier = Math.max(1, Number(multiplier || 1) || 1);

    items.forEach((item, index) => {
        const description = itemDescription(item);
        const key = item?.productId
            ? `product:${item.productId}`
            : `manual:${normalizeLineText(description)}:${normalizeLineText(item?.unit)}:${Number(item?.estUnitCost || 0)}`;
        const quantity = Number(item?.quantity || 0) * qtyMultiplier;
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
    const [loadError, setLoadError] = useState("");
    const [estimation, setEstimation] = useState(null);
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [invoices, setInvoices] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [printFormat, setPrintFormat] = useState(PRINT_FORMATS.ALL);
    const [printOptions, setPrintOptions] = useState(PRINT_PRESETS[PRINT_FORMATS.ALL]);
    const [invoiceType, setInvoiceType] = useState(INVOICE_TYPES.PROFORMA);
    const [activeTab, setActiveTab] = useState("quotation");
    const [workflow, setWorkflow] = useState({});
    const [approvingPrint, setApprovingPrint] = useState(false);

    const fetchData = async () => {
        try {
            setLoadError("");
            const estRes = await api.get(`/estimations/by-project/${projectId}/quotation`);
            setEstimation(estRes.data);

            try {
                const workflowRes = await api.get("/workflow");
                setWorkflow(workflowRes.data || {});
            } catch (workflowErr) {
                console.warn("Could not fetch workflow", workflowErr);
                setWorkflow({});
            }

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
            setLoadError(getApiErrorMessage(error, "Quotation cannot be opened until the estimation is fully approved."));
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
        if (!estimation?.id) {
            toast.error("Estimation not loaded");
            return;
        }
        if (!["APPROVED", "FINALIZED"].includes(String(estimation.approvalStatus || estimation.status || "").toUpperCase())) {
            toast.warn("Estimation must be approved before finalizing the quotation.");
            return;
        }
        if (!project?.customerId) {
            toast.warn("A customer record is required before finalizing the quotation.");
            return;
        }
        if (!project?.jobNumber) {
            toast.warn("Record the customer Purchase Order before finalizing the quotation.");
            return;
        }
        if (!window.confirm("Are you sure you want to finalize this quotation? It will be locked.")) return;
        try {
            await api.post(`/estimations/${estimation.id}/finalize`);
            toast.success("Quotation finalized");
            await fetchData();
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to finalize quotation"));
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

    const quotationPrintApproverRoles = workflow?.quotationPrintApproverRoles || [];
    const quotationPrintApprovalRequired = quotationPrintApproverRoles.length > 0;
    const quotationPrintApproved = !quotationPrintApprovalRequired || Boolean(estimation?.quotationPrintApprovedAt);
    const userRole = normalizeRole(localStorage.getItem("role"));
    const projectRoles = JSON.parse(localStorage.getItem("projectRoles") || "[]");
    const isPrintApprover = ["ADMIN", "SUPER_ADMIN"].includes(userRole)
        || projectRoles.some((role) => quotationPrintApproverRoles.map(normalizeRole).includes(normalizeRole(role)));

    const handlePrint = () => {
        if (!quotationPrintApproved) {
            toast.warn("Quotation print/PDF approval is required before printing or saving this quotation.");
            return;
        }
        window.print();
    };

    const handleApprovePrint = async () => {
        if (!estimation?.id) {
            toast.error("Estimation not loaded");
            return;
        }
        const comment = window.prompt("Print/PDF approval note (optional)", "") || "";
        setApprovingPrint(true);
        try {
            const res = await api.post(`/estimations/${estimation.id}/approve-quotation-print`, { comment });
            setEstimation(res.data);
            if (res.data?.quotationPrintApprovedAt) {
                toast.success("Quotation print/PDF approved");
            } else {
                toast.success("Print/PDF approval recorded. Waiting for the remaining required approval(s).");
            }
        } catch (error) {
            toast.error(getApiErrorMessage(error, "Failed to approve quotation print/PDF"));
        } finally {
            setApprovingPrint(false);
        }
    };

    const handlePrintFormatChange = (value) => {
        setPrintFormat(value);
        if (PRINT_PRESETS[value]) {
            setPrintOptions(PRINT_PRESETS[value]);
        }
    };

    const togglePrintOption = (key) => {
        setPrintFormat(PRINT_FORMATS.CUSTOM);
        setPrintOptions((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
    if (loadError) {
        return (
            <div className="container py-5">
                <Alert variant="warning">
                    {loadError}
                </Alert>
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
            </div>
        );
    }
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
    const quoteTotals = computeQuotationTotals(estimation);
    const showQuotationLines = printOptions.showComponents || printOptions.showItems;
    const showQuotationQtyColumn = printOptions.showItemQuantities;
    const showQuotationUnitColumn = printOptions.showItemUnits;
    const showQuotationUnitPriceColumn = printOptions.showItemUnitPrices;
    const showQuotationTotalColumn = printOptions.showComponentPrices || printOptions.showItemTotals;
    const showQuotationTotalsTable = printOptions.showSubtotal
        || (printOptions.showDiscount && quoteTotals.discountAmount > 0)
        || (printOptions.showVat && quoteTotals.vatAmount > 0)
        || (printOptions.showOtherTax && quoteTotals.taxAmount > 0)
        || printOptions.showGrandTotal;

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
                                onChange={(e) => handlePrintFormatChange(e.target.value)}
                                aria-label="Quotation print format"
                            >
                                <option value={PRINT_FORMATS.ALL}>Show everything</option>
                                <option value={PRINT_FORMATS.COMPONENTS_ONLY}>Main components only</option>
                                <option value={PRINT_FORMATS.COMPONENTS_WITH_ITEMS}>Components + subcomponent names</option>
                                <option value={PRINT_FORMATS.TOTALS_ONLY}>Totals only</option>
                                <option value={PRINT_FORMATS.CUSTOM}>Custom</option>
                            </Form.Select>
                            <Dropdown autoClose="outside" align="end">
                                <Dropdown.Toggle size="sm" variant="outline-secondary">
                                    Customize print
                                </Dropdown.Toggle>
                                <Dropdown.Menu className="p-3" style={{ minWidth: 280 }}>
                                    {PRINT_OPTION_GROUPS.map((group, groupIndex) => (
                                        <div key={group.title} className={groupIndex > 0 ? "border-top mt-2 pt-2" : ""}>
                                            <div className="fw-semibold small text-muted mb-1">{group.title}</div>
                                            {group.options.map(([key, label]) => (
                                                <Form.Check
                                                    key={key}
                                                    type="checkbox"
                                                    id={`quotation-print-${key}`}
                                                    className="small mb-1"
                                                    label={label}
                                                    checked={!!printOptions[key]}
                                                    onChange={() => togglePrintOption(key)}
                                                />
                                            ))}
                                        </div>
                                    ))}
                                </Dropdown.Menu>
                            </Dropdown>
                            {!isFinalized && (
                                <Button variant="success" onClick={handleFinalize}>Finalize Quote</Button>
                            )}
                            {quotationPrintApprovalRequired && !quotationPrintApproved && isPrintApprover && (
                                <Button variant="outline-success" onClick={handleApprovePrint} disabled={approvingPrint}>
                                    {approvingPrint ? "Approving..." : "Approve Print/PDF"}
                                </Button>
                            )}
                            <Button
                                variant="primary"
                                onClick={handlePrint}
                                disabled={!quotationPrintApproved}
                                title={!quotationPrintApproved ? "Selected quotation print/PDF approvers must approve first" : ""}
                            >
                                Print / Save PDF
                            </Button>
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
                    {quotationPrintApprovalRequired && !quotationPrintApproved && (
                        <Alert variant="warning" className="no-print">
                            Quotation print/PDF approval is pending. The quotation can be reviewed here, but printing and saving as PDF are locked until the selected approver rule is satisfied.
                        </Alert>
                    )}
                    {quotationPrintApprovalRequired && quotationPrintApproved && (
                        <Alert variant="success" className="no-print">
                            Print/PDF approved by {estimation.quotationPrintApprovedBy || "-"}.
                        </Alert>
                    )}

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

                {showQuotationLines && (
                    <Table bordered size="sm">
                        <thead className="table-light">
                            <tr>
                                <th>Description</th>
                                {showQuotationQtyColumn && (
                                    <th className="text-end" style={{ width: "100px" }}>Qty</th>
                                )}
                                {showQuotationUnitColumn && (
                                    <th className="text-end" style={{ width: "90px" }}>Unit</th>
                                )}
                                {showQuotationUnitPriceColumn && (
                                    <th className="text-end" style={{ width: "150px" }}>Unit Price</th>
                                )}
                                {showQuotationTotalColumn && (
                                    <th className="text-end" style={{ width: "150px" }}>Total</th>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {estimation.components?.map((comp, idx) => (
                                <React.Fragment key={idx}>
                                    {printOptions.showComponents && (
                                        <tr className="table-secondary">
                                            <td><strong>{componentLabel(comp)}</strong></td>
                                            {showQuotationQtyColumn && <td />}
                                            {showQuotationUnitColumn && <td />}
                                            {showQuotationUnitPriceColumn && <td />}
                                            {showQuotationTotalColumn && (
                                                <td className="text-end fw-bold">
                                                    {printOptions.showComponentPrices ? money(componentAmount(comp, estimation.includeDelivery !== false, estimation.includeFreight !== false)) : ""}
                                                </td>
                                            )}
                                        </tr>
                                    )}
                                    {printOptions.showItems && aggregateItems(comp.items, componentQuantity(comp)).map((item, i) => (
                                        <tr key={item.key || `${idx}-${i}`}>
                                            <td className="ps-4">{itemDescription(item)}</td>
                                            {showQuotationQtyColumn && (
                                                <td className="text-end">{printOptions.showItemQuantities ? formatQuantity(item.quantity) : ""}</td>
                                            )}
                                            {showQuotationUnitColumn && (
                                                <td className="text-end">{printOptions.showItemUnits ? item.unit || "-" : ""}</td>
                                            )}
                                            {showQuotationUnitPriceColumn && (
                                                <td className="text-end">{printOptions.showItemUnitPrices ? money(item.estUnitCost) : ""}</td>
                                            )}
                                            {showQuotationTotalColumn && (
                                                <td className="text-end">{printOptions.showItemTotals ? money((item.quantity || 0) * (item.estUnitCost || 0)) : ""}</td>
                                            )}
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </Table>
                )}

                {showQuotationTotalsTable && (
                <Table bordered size="sm" className={showQuotationLines ? "mt-3" : ""}>
                    <tfoot>
                        {printOptions.showSubtotal && (
                        <tr>
                            <td className="text-end fw-bold">Subtotal</td>
                            <td className="text-end" style={{ width: "150px" }}>{money(quoteTotals.subtotal)}</td>
                        </tr>
                        )}
                        {printOptions.showDiscount && quoteTotals.discountAmount > 0 && (
                            <tr>
                                <td className="text-end">Discount ({estimation.discountPercent || 0}%)</td>
                                <td className="text-end">-{money(quoteTotals.discountAmount)}</td>
                            </tr>
                        )}
                        {printOptions.showVat && quoteTotals.vatAmount > 0 && (
                            <tr>
                                <td className="text-end">VAT ({estimation.vatPercent}%)</td>
                                <td className="text-end">{money(quoteTotals.vatAmount)}</td>
                            </tr>
                        )}
                        {printOptions.showOtherTax && quoteTotals.taxAmount > 0 && (
                            <tr>
                                <td className="text-end">Other Tax ({estimation.taxPercent}%)</td>
                                <td className="text-end">{money(quoteTotals.taxAmount)}</td>
                            </tr>
                        )}
                        {printOptions.showGrandTotal && (
                        <tr className="table-active fw-bold fs-5">
                            <td className="text-end">GRAND TOTAL</td>
                            <td className="text-end">{money(quoteTotals.grandTotal)}</td>
                        </tr>
                        )}
                    </tfoot>
                </Table>
                )}

                {(printOptions.showNotes && estimation.customNote) && (
                    <div className="mt-4 p-3 bg-light border rounded no-print-bg">
                        <strong>Notes:</strong>
                        <p className="mb-0 small" style={{ whiteSpace: "pre-wrap" }}>{estimation.customNote}</p>
                    </div>
                )}

                {printOptions.showTerms && (
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
                )}

                {printOptions.showSignatures && (
                <div className="mt-5 d-flex justify-content-between gap-5">
                    <div style={{ width: "45%" }}>
                        <div className="border-top pt-2 small text-muted">Prepared By</div>
                    </div>
                    <div style={{ width: "45%" }}>
                        <div className="border-top pt-2 small text-muted">Accepted By / Date</div>
                    </div>
                </div>
                )}
                    </ReportLayout>
                </>
            )}
        </div>
    );
};

export default QuotationPrint;
