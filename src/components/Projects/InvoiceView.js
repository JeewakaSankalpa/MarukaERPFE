import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Badge, Form } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const money = (value) => Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatDate = (value) => {
    if (!value) return "-";
    return new Date(value).toLocaleDateString("en-GB");
};

const DOC_TYPES = {
    PROFORMA: "proforma",
    NORMAL: "normal",
    TAX: "tax",
};

const company = {
    name: "Maruka Technologies (Pvt) Ltd",
    addressLines: ["558/7 ,  Sethsiri Place", "Pannipitiya, Sri Lanka  10230"],
    email: "rohan@maruka.lk",
    vatNo: "174038295-7000",
};

const bankDetails = [
    ["Acc Name", "Maruka Technologies (Pvt) Ltd"],
    ["Acc Number", "008710002399"],
    ["Bank Name", "Sampath Bank"],
    ["Branch", "Pannipitiya"],
];

const componentAmount = (component) =>
    Number(component?.lineTotalBeforeTax ?? component?.subtotalWithMargin ?? component?.itemsSubtotal ?? 0);

const getInvoiceGroups = (items = []) => {
    const groups = new Map();

    items.forEach((item, index) => {
        const description = item.description || "Item";
        const [prefix, ...rest] = description.split(":");
        const canGroup = rest.length > 0 && prefix.trim();
        const componentName = canGroup ? prefix.trim() : "Items";
        const itemName = canGroup ? rest.join(":").trim() : description;

        if (!groups.has(componentName)) {
            groups.set(componentName, {
                description: componentName,
                quantity: 1,
                unitPrice: 0,
                total: 0,
                items: [],
            });
        }

        const group = groups.get(componentName);
        group.total += Number(item.total || 0);
        group.unitPrice = group.total;
        group.items.push({
            ...item,
            description: itemName || description,
            key: `${componentName}-${index}`,
        });
    });

    return Array.from(groups.values());
};

const getCustomerLines = (customer) => {
    if (!customer) return ["N/A"];
    return [
        customer.comName || customer.name,
        customer.pAddr || customer.address,
        customer.pContact || customer.contactNo,
        customer.email || customer.comEmail,
        customer.vatNumber ? `VAT No. ${customer.vatNumber}` : null,
    ].filter(Boolean);
};

const buildDisplayInvoiceNumber = (rawNumber, docType) => {
    const prefix = docType === DOC_TYPES.PROFORMA
        ? "MT/PI/"
        : docType === DOC_TYPES.NORMAL
            ? "MT/CINV/"
            : "MT/INV/";
    if (!rawNumber) return prefix;
    if (rawNumber.startsWith(prefix)) return rawNumber;
    if (rawNumber.startsWith("MT/PI/") || rawNumber.startsWith("MT/CINV/") || rawNumber.startsWith("MT/INV/")) {
        return `${prefix}${rawNumber.split("/").pop()}`;
    }
    const suffix = rawNumber.match(/(\d+)\s*$/)?.[1];
    return suffix ? `${prefix}${suffix}` : rawNumber;
};

const getStatusVariant = (status) => {
    switch (status) {
        case "PAID": return "success";
        case "PENDING": return "warning";
        case "CANCELLED": return "danger";
        default: return "secondary";
    }
};

const InvoiceView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [invoice, setInvoice] = useState(null);
    const [project, setProject] = useState(null);
    const [customer, setCustomer] = useState(null);
    const [payments, setPayments] = useState([]);
    const [estimation, setEstimation] = useState(null);
    const [poDraft, setPoDraft] = useState("");
    const [savingPo, setSavingPo] = useState(false);

    const selectedType = searchParams.get("type") || DOC_TYPES.PROFORMA;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const invRes = await api.get(`/invoices/${id}`);
                setInvoice(invRes.data);
                setPoDraft(invRes.data.poNumber || "");

                if (invRes.data.projectId) {
                    try {
                        const estRes = await api.get(`/estimations/by-project/${invRes.data.projectId}`);
                        setEstimation(estRes.data);
                    } catch (estErr) {
                        console.warn("Could not fetch source estimation", estErr);
                    }

                    const projRes = await api.get(`/projects/${invRes.data.projectId}`);
                    setProject(projRes.data);

                    if (projRes.data.customerId) {
                        const custRes = await api.get(`/customer/${projRes.data.customerId}`);
                        setCustomer(custRes.data);
                    }

                    try {
                        const payRes = await api.get(`/project-accounts/${invRes.data.projectId}/payments`);
                        setPayments(payRes.data || []);
                    } catch (payErr) {
                        console.warn("Could not fetch payments for project", payErr);
                    }
                }
            } catch (error) {
                console.error("Failed to load invoice", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    useEffect(() => {
        if (!invoice?.id) return;

        const fieldByType = {
            [DOC_TYPES.PROFORMA]: "proformaInvoiceNumber",
            [DOC_TYPES.NORMAL]: "normalInvoiceNumber",
            [DOC_TYPES.TAX]: "taxInvoiceNumber",
        };

        const field = fieldByType[selectedType];
        if (!field || invoice[field]) return;

        const ensureNumber = async () => {
            try {
                const res = await api.post(`/invoices/${id}/document-number/${selectedType}`);
                setInvoice(res.data);
            } catch (error) {
                console.error("Failed to assign invoice document number", error);
                toast.error("Failed to assign invoice number");
            }
        };

        ensureNumber();
    }, [id, invoice, selectedType]);

    const groupedItems = useMemo(() => {
        if (estimation?.components?.length) {
            return estimation.components.map((comp) => ({
                description: comp.name,
                quantity: 1,
                unitPrice: componentAmount(comp),
                total: componentAmount(comp),
                items: (comp.items || []).map((item, idx) => ({
                    key: `${comp.name}-${idx}`,
                    description: item.productNameSnapshot || item.productId,
                    quantity: item.quantity,
                    unitPrice: Number(item.estUnitCost || 0),
                    total: Number(item.quantity || 0) * Number(item.estUnitCost || 0),
                })),
            }));
        }

        return getInvoiceGroups(invoice?.items || []);
    }, [estimation, invoice]);

    const handleDocTypeChange = (value) => {
        const params = new URLSearchParams(searchParams);
        params.set("type", value);
        setSearchParams(params);
    };

    const handleSavePo = async () => {
        setSavingPo(true);
        try {
            const res = await api.patch(`/invoices/${id}/po-number`, { poNumber: poDraft });
            setInvoice(res.data);
            setPoDraft(res.data.poNumber || "");
            toast.success("PO number saved");
        } catch (error) {
            console.error("Failed to save PO number", error);
            toast.error("Failed to save PO number");
        } finally {
            setSavingPo(false);
        }
    };

    const handlePrint = () => window.print();

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
    if (!invoice) return <div className="text-center p-5">Invoice not found.</div>;

    const isProforma = selectedType === DOC_TYPES.PROFORMA;
    const isTaxInvoice = selectedType === DOC_TYPES.TAX;
    const showTax = isProforma || isTaxInvoice;
    const showDetails = !isProforma;
    const documentTitle = isProforma ? "PROFORMA INVOICE:" : isTaxInvoice ? "TAX INVOICE NO:" : "INVOICE";
    const addressTitle = isProforma ? "ADDRESS" : "BILL TO";
    const rawDocumentNumber = isProforma
        ? invoice.proformaInvoiceNumber
        : isTaxInvoice
            ? invoice.taxInvoiceNumber
            : invoice.normalInvoiceNumber;
    const invoiceNo = buildDisplayInvoiceNumber(rawDocumentNumber || invoice.invoiceNumber, selectedType);
    const inquiryRef = project?.referenceNumber || project?.inquiryNumber || project?.id || invoice.projectId || "-";
    const jobRef = project?.jobNumber || "-";
    const totalReceived = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const subtotal = Number(invoice.subtotal || 0);
    const taxTotal = Number(invoice.vatAmount || 0) + Number(invoice.taxAmount || 0);
    const documentTotal = showTax ? Number(invoice.totalAmount || 0) : subtotal;
    const balanceDue = Math.max(documentTotal - totalReceived, 0);
    const dueDateLabel = isProforma ? "EXPIRATION DATE" : "DUE DATE";
    const inquiryText = project?.projectName ? `${inquiryRef} (${project.projectName})` : inquiryRef;

    return (
        <div className="invoice-page bg-white min-vh-100 p-4">
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 12mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    body * { visibility: hidden; }
                    .invoice-sheet, .invoice-sheet * { visibility: visible; }
                    .invoice-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; padding: 0 !important; }
                    .no-print { display: none !important; }
                }
                .invoice-sheet {
                    max-width: 820px;
                    min-height: 1040px;
                    margin: 0 auto;
                    padding: 26px 34px;
                    background: #fff;
                    color: #111;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 12px;
                    line-height: 1.35;
                    box-shadow: 0 0 0 1px #e5e7eb, 0 14px 35px rgba(15, 23, 42, 0.08);
                }
                .invoice-company { font-size: 12px; }
                .invoice-company-name { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
                .invoice-top-grid { display: grid; grid-template-columns: 1fr 300px; gap: 42px; margin-top: 28px; }
                .invoice-address-title { font-weight: 700; font-size: 12px; margin-bottom: 10px; }
                .invoice-address-line { min-height: 16px; }
                .invoice-meta { width: 100%; border-collapse: collapse; }
                .invoice-meta td { padding: 2px 0 6px 12px; vertical-align: top; }
                .invoice-meta td:first-child { font-weight: 700; text-align: right; white-space: nowrap; padding-left: 0; }
                .invoice-project-meta { width: 100%; border-collapse: collapse; margin-top: 18px; }
                .invoice-project-meta th { font-weight: 700; text-align: left; padding: 0 0 4px; border-bottom: 1px solid #111; }
                .invoice-project-meta td { padding: 7px 14px 0 0; vertical-align: top; }
                .invoice-items { width: 100%; border-collapse: collapse; margin-top: 26px; }
                .invoice-items th {
                    border-top: 1px solid #111;
                    border-bottom: 1px solid #111;
                    font-weight: 700;
                    padding: 6px 8px;
                    text-align: left;
                }
                .invoice-items th.qty, .invoice-items td.qty { width: 64px; text-align: right; }
                .invoice-items th.rate, .invoice-items td.rate,
                .invoice-items th.amount, .invoice-items td.amount { width: 128px; text-align: right; }
                .invoice-items td { padding: 6px 8px; vertical-align: top; }
                .invoice-component-row td { font-weight: ${showDetails ? 700 : 400}; }
                .invoice-sub-row td:first-child { padding-left: 24px; }
                .invoice-footer-grid { display: grid; grid-template-columns: minmax(0, 1fr) 270px; gap: 24px; margin-top: 34px; align-items: start; }
                .invoice-notes p { margin: 0 0 6px; }
                .bank-table td { padding: 1px 8px 3px 0; }
                .bank-table td:first-child { font-weight: 700; white-space: nowrap; }
                .invoice-totals { width: 100%; border-collapse: collapse; margin-left: auto; }
                .invoice-totals td { padding: 5px 0 5px 14px; }
                .invoice-totals td:first-child { font-weight: 700; text-align: right; white-space: nowrap; }
                .invoice-grand td { font-size: 15px; font-weight: 800; padding-top: 8px; }
                .invoice-due td { font-size: 14px; font-weight: 800; padding-top: 10px; }
                .acceptance { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 54px; }
                .acceptance div { border-top: 1px solid #111; padding-top: 5px; font-weight: 700; }
            `}</style>

            <ToastContainer position="top-right" autoClose={2500} hideProgressBar newestOnTop className="no-print" />

            <div className="d-flex justify-content-between mb-4 no-print">
                <Button variant="secondary" onClick={() => navigate(-1)}>Back</Button>
                <div className="d-flex gap-2 align-items-center flex-wrap justify-content-end">
                    <Badge bg={getStatusVariant(invoice.status)}>{invoice.status}</Badge>
                    <Form.Select
                        size="sm"
                        className="w-auto"
                        value={selectedType}
                        onChange={(e) => handleDocTypeChange(e.target.value)}
                        aria-label="Invoice type"
                    >
                        <option value={DOC_TYPES.PROFORMA}>Proforma Invoice</option>
                        <option value={DOC_TYPES.NORMAL}>Invoice</option>
                        <option value={DOC_TYPES.TAX}>Tax Invoice</option>
                    </Form.Select>
                    <Form.Control
                        size="sm"
                        style={{ width: 220 }}
                        placeholder="Enter PO NO"
                        value={poDraft}
                        onChange={(e) => setPoDraft(e.target.value)}
                    />
                    <Button size="sm" variant="outline-primary" onClick={handleSavePo} disabled={savingPo}>
                        {savingPo ? "Saving..." : "Save PO"}
                    </Button>
                    <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
                </div>
            </div>

            <section className="invoice-sheet">
                <header className="invoice-company">
                    <div className="invoice-company-name">{company.name}</div>
                    {company.addressLines.map((line) => <div key={line}>{line}</div>)}
                    <div>{company.email}</div>
                    <div>Govt. UID VAT Reg: {company.vatNo}</div>
                </header>

                <div className="invoice-top-grid">
                    <div>
                        <div className="invoice-address-title">{addressTitle}</div>
                        {getCustomerLines(customer).map((line, idx) => (
                            <div className="invoice-address-line" key={`${line}-${idx}`}>{line}</div>
                        ))}
                    </div>
                    <div>
                        <table className="invoice-meta">
                            <tbody>
                                <tr>
                                    <td>{documentTitle}</td>
                                    <td>{invoiceNo}</td>
                                </tr>
                                <tr>
                                    <td>DATE</td>
                                    <td>{formatDate(invoice.issuedDate)}</td>
                                </tr>
                                <tr>
                                    <td>{dueDateLabel}</td>
                                    <td>{formatDate(invoice.dueDate)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <table className="invoice-project-meta">
                            <thead>
                                <tr>
                                    <th>PO NO</th>
                                    <th>INQUIRY NO</th>
                                    <th>JOB NO</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>{invoice.poNumber || "-"}</td>
                                    <td>{inquiryText}</td>
                                    <td>{jobRef}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <table className="invoice-items">
                    <thead>
                        <tr>
                            <th>DESCRIPTION</th>
                            <th className="qty">QTY</th>
                            <th className="rate">RATE</th>
                            <th className="amount">AMOUNT</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groupedItems.map((group, index) => (
                            <React.Fragment key={`${group.description}-${index}`}>
                                <tr className="invoice-component-row">
                                    <td>{group.description}</td>
                                    <td className="qty">1</td>
                                    <td className="rate">{money(group.unitPrice)}</td>
                                    <td className="amount">{money(group.total)}</td>
                                </tr>
                                {showDetails && group.items?.map((item) => (
                                    <tr className="invoice-sub-row" key={item.key}>
                                        <td>{item.description}</td>
                                        <td className="qty">{item.quantity || ""}</td>
                                        <td className="rate">{money(item.unitPrice)}</td>
                                        <td className="amount">{money(item.total)}</td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>

                <div className="invoice-footer-grid">
                    <div className="invoice-notes">
                        <p><strong>Warranty</strong></p>
                        <p>One Year Against Manufacturing Defects</p>
                        {isProforma && (
                            <>
                                <p>- Payment Terms: 50% Advance &amp; Balance prior to delivery</p>
                                <table className="bank-table">
                                    <tbody>
                                        {bankDetails.map(([label, value]) => (
                                            <tr key={label}>
                                                <td>{label} :</td>
                                                <td>{value}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </>
                        )}
                    </div>

                    <table className="invoice-totals">
                        <tbody>
                            <tr>
                                <td>SUBTOTAL</td>
                                <td className="text-end">{money(subtotal)}</td>
                            </tr>
                            {showTax && (
                                <tr>
                                    <td>TAX</td>
                                    <td className="text-end">{money(taxTotal)}</td>
                                </tr>
                            )}
                            <tr className="invoice-grand">
                                <td>TOTAL</td>
                                <td className="text-end">{money(documentTotal)}</td>
                            </tr>
                            {!isProforma && totalReceived > 0 && (
                                <tr>
                                    <td>PAYMENT</td>
                                    <td className="text-end">{money(totalReceived)}</td>
                                </tr>
                            )}
                            {!isProforma && (
                                <tr className="invoice-due">
                                    <td>LKR</td>
                                    <td className="text-end">{money(balanceDue)} TOTAL DUE</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {isProforma && (
                    <div className="acceptance">
                        <div>Accepted By</div>
                        <div>Accepted Date</div>
                    </div>
                )}

            </section>
        </div>
    );
};

export default InvoiceView;
