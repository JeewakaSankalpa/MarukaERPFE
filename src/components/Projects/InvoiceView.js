import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Badge, Form } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from "../../assets/logo.jpeg";

const money = (value) => Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
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

const DOC_TYPE_OPTIONS = [
    { value: DOC_TYPES.PROFORMA, label: "Proforma Invoice", field: "proformaInvoiceNumber" },
    { value: DOC_TYPES.NORMAL, label: "Cash Invoice", field: "normalInvoiceNumber" },
    { value: DOC_TYPES.TAX, label: "Tax Invoice", field: "taxInvoiceNumber" },
];

const PRINT_FORMATS = {
    ALL: "all",
    COMPONENTS_ONLY: "componentsOnly",
    COMPONENTS_WITH_ITEMS: "componentsWithItems",
    TOTALS_ONLY: "totalsOnly",
};

const getAvailableDocTypes = (invoice) =>
    DOC_TYPE_OPTIONS.filter(option => Boolean(invoice?.[option.field]));

const fallbackCompany = {
    name: "Maruka Technologies (Pvt) Ltd",
    address: "558/7 ,  Sethsiri Place\nPannipitiya, Sri Lanka  10230",
    email: "rohan@maruka.lk",
    phone: "",
    vatNo: "174038295-7000",
};

const bankDetails = [
    ["Acc Name", "Maruka Technologies (Pvt) Ltd"],
    ["Acc Number", "008710002399"],
    ["Bank Name", "Sampath Bank"],
    ["Branch", "Pannipitiya"],
];

const componentQuantity = (component) => Math.max(1, Number(component?.quantity || 1) || 1);

const componentAmount = (component, includeDelivery = true) => {
    const qty = componentQuantity(component);
    const itemsSubtotal = (component?.items || []).reduce(
        (sum, item) => sum + Number(item?.estUnitCost || 0) * Number(item?.quantity || 0) * qty,
        0
    );
    if (component?.items?.length) {
        const overheadAmount = itemsSubtotal * (Number(component?.overheadPercent || 0) / 100);
        const baseForMargin = itemsSubtotal + overheadAmount;
        const marginAmount = baseForMargin * (Number(component?.marginPercent || 0) / 100);
        const delivery = includeDelivery ? Number(component?.deliveryCost || 0) * qty : 0;
        return baseForMargin + marginAmount + delivery;
    }
    return Number(component?.lineTotalBeforeTax ?? component?.subtotalWithMargin ?? component?.itemsSubtotal ?? 0);
};

const componentLabel = (component) => {
    const qty = componentQuantity(component);
    return qty > 1 ? `${component?.name || "Component"} x ${qty}` : (component?.name || "Component");
};

const splitLines = (value) => String(value || "")
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean);

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

const cleanDescription = (description) => {
    const value = String(description || "Item");
    const parts = value.split(":");
    return parts.length > 1 ? parts.slice(1).join(":").trim() || value : value;
};

const normalizeLineText = (value) => String(value || "").trim().replace(/\s+/g, " ").toLowerCase();

const aggregateLineItems = (items = [], options = {}) => {
    const groups = new Map();
    const getDescription = options.getDescription || ((item) => item.description || item.productNameSnapshot || item.productId || "Item");
    const getUnitPrice = options.getUnitPrice || ((item) => Number(item.unitPrice ?? item.estUnitCost ?? 0));
    const getQuantity = options.getQuantity || ((item) => Number(item.quantity || 0));
    const getTotal = options.getTotal || ((item) => Number(item.total ?? (Number(item.quantity || 0) * getUnitPrice(item))));
    const getKey = options.getKey || ((item) => item.productId
        ? `product:${item.productId}`
        : `manual:${normalizeLineText(getDescription(item))}:${Number(getUnitPrice(item) || 0)}`);

    items.forEach((item, index) => {
        const description = getDescription(item);
        const quantity = getQuantity(item);
        const total = getTotal(item);
        const key = getKey(item);

        if (!groups.has(key)) {
            groups.set(key, {
                ...item,
                key: `${key}-${index}`,
                description,
                quantity,
                unitPrice: quantity > 0 ? total / quantity : Number(getUnitPrice(item) || 0),
                total,
            });
            return;
        }

        const group = groups.get(key);
        group.quantity += quantity;
        group.total += total;
        if (group.quantity > 0) {
            group.unitPrice = group.total / group.quantity;
        }
    });

    return Array.from(groups.values());
};

const titleCase = (value) => value
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

const integerToWords = (value) => {
    const ones = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten",
        "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
    const tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

    if (value === 0) return "zero";
    if (value < 20) return ones[value];
    if (value < 100) return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`;
    if (value < 1000) {
        return `${ones[Math.floor(value / 100)]} hundred${value % 100 ? ` ${integerToWords(value % 100)}` : ""}`;
    }
    if (value < 100000) {
        return `${integerToWords(Math.floor(value / 1000))} thousand${value % 1000 ? ` ${integerToWords(value % 1000)}` : ""}`;
    }
    if (value < 10000000) {
        return `${integerToWords(Math.floor(value / 100000))} lakh${value % 100000 ? ` ${integerToWords(value % 100000)}` : ""}`;
    }
    return `${integerToWords(Math.floor(value / 10000000))} crore${value % 10000000 ? ` ${integerToWords(value % 10000000)}` : ""}`;
};

const amountToWords = (value) => {
    const amount = Number(value || 0);
    const rupees = Math.floor(amount);
    const cents = Math.round((amount - rupees) * 100);
    const rupeeText = `${titleCase(integerToWords(rupees))} Rupees`;
    return cents ? `${rupeeText} And Cents ${titleCase(integerToWords(cents))} Only` : `${rupeeText} Only`;
};

const getCustomerLines = (customer) => {
    if (!customer) return ["N/A"];
    return [
        customer.comName || customer.name,
        ...(splitLines(customer.comAddress || customer.pAddr || customer.address)),
        customer.comContactNumber || customer.pContact || customer.contactNo,
        customer.comEmail || customer.email,
        customer.vatNumber ? `VAT No. ${customer.vatNumber}` : null,
    ].filter(Boolean);
};

const getCompanyAddress = (customer) =>
    splitLines(customer?.comAddress || customer?.pAddr || customer?.address).join(", ");

const getCustomerPhone = (customer) =>
    customer?.comContactNumber || customer?.pContact || customer?.contactNo || "";

const formatTermEntry = (term) => {
    const label = term?.label || term?.category || "";
    const value = term?.value || term?.content || term?.description || "";
    if (label && value) return `${label}: ${value}`;
    return label || value;
};

const getTermValueByLabel = (terms = [], labels = []) => {
    const normalizedLabels = labels.map(normalizeLineText);
    const match = terms.find((term) => {
        const label = normalizeLineText(term?.label || term?.category || term?.description || "");
        return normalizedLabels.some((needle) => label.includes(needle));
    });
    return match ? formatTermEntry(match) : "";
};

const getSnapshotCustomer = (invoice) => ({
    comName: invoice?.customerNameSnapshot,
    name: invoice?.customerNameSnapshot,
    comEmail: invoice?.customerEmailSnapshot,
    email: invoice?.customerEmailSnapshot,
    comAddress: invoice?.customerAddressSnapshot,
    address: invoice?.customerAddressSnapshot,
    comContactNumber: invoice?.customerPhoneSnapshot,
});

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
    const [quotation, setQuotation] = useState(null);
    const [payments, setPayments] = useState([]);
    const [estimation, setEstimation] = useState(null);
    const [settings, setSettings] = useState({});
    const [poDraft, setPoDraft] = useState("");
    const [notesDraft, setNotesDraft] = useState("");
    const [customerPhoneDraft, setCustomerPhoneDraft] = useState("");
    const [savingPo, setSavingPo] = useState(false);
    const [savingNotes, setSavingNotes] = useState(false);
    const [savingCustomerPhone, setSavingCustomerPhone] = useState(false);
    const [taxPrintFormat, setTaxPrintFormat] = useState(PRINT_FORMATS.ALL);

    const selectedType = searchParams.get("type") || DOC_TYPES.PROFORMA;
    const isProforma = selectedType === DOC_TYPES.PROFORMA;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const invRes = await api.get(`/invoices/${id}`);
                setInvoice(invRes.data);
                setPoDraft(invRes.data.poNumber || "");
                setNotesDraft(invRes.data.notes || "");

                try {
                    const settingsRes = await api.get("/admin/config");
                    setSettings(settingsRes.data || {});
                } catch (settingsErr) {
                    console.warn("Could not fetch invoice company profile", settingsErr);
                }

                if (invRes.data.quotationId) {
                    try {
                        const quoteRes = await api.get(`/quotations/${invRes.data.quotationId}`);
                        setQuotation(quoteRes.data);
                    } catch (quoteErr) {
                        console.warn("Could not fetch source quotation", quoteErr);
                    }
                }

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
        if (!invoice) return;
        setCustomerPhoneDraft(invoice.customerPhoneSnapshot || getCustomerPhone(customer) || "");
    }, [invoice, customer]);

    useEffect(() => {
        if (!invoice?.id) return;
        const availableTypes = getAvailableDocTypes(invoice);
        const fallbackType = invoice.downloadDocumentType || availableTypes[0]?.value;
        if (!fallbackType || availableTypes.some(option => option.value === selectedType)) return;

        const params = new URLSearchParams(searchParams);
        params.set("type", fallbackType);
        setSearchParams(params, { replace: true });
    }, [invoice, searchParams, selectedType, setSearchParams]);

    const groupedItems = useMemo(() => {
        if (estimation?.components?.length) {
            return estimation.components.map((comp) => ({
                description: componentLabel(comp),
                quantity: componentQuantity(comp),
                unitPrice: componentQuantity(comp) > 0 ? componentAmount(comp, estimation.includeDelivery !== false) / componentQuantity(comp) : componentAmount(comp, estimation.includeDelivery !== false),
                total: componentAmount(comp, estimation.includeDelivery !== false),
                items: aggregateLineItems(comp.items || [], {
                    getDescription: (item) => item.productNameSnapshot || item.description || item.productId,
                    getUnitPrice: (item) => Number(item.estUnitCost || 0),
                    getQuantity: (item) => Number(item.quantity || 0) * componentQuantity(comp),
                    getTotal: (item) => Number(item.quantity || 0) * componentQuantity(comp) * Number(item.estUnitCost || 0),
                }).map((item, idx) => ({
                    key: item.key || `${comp.name}-${idx}`,
                    productId: item.productId,
                    unit: item.unit,
                    description: item.description,
                    quantity: Number(item.quantity || 0),
                    unitPrice: Number(item.unitPrice || 0),
                    total: Number(item.total || 0),
                })),
            }));
        }

        return getInvoiceGroups(invoice?.items || []);
    }, [estimation, invoice]);

    const invoiceRows = useMemo(() => {
        if (isProforma) return groupedItems;
        if (invoice?.items?.length) {
            return aggregateLineItems(invoice.items, {
                getDescription: (item) => cleanDescription(item.description),
                getUnitPrice: (item) => Number(item.unitPrice || 0),
                getTotal: (item) => Number(item.total || 0),
                getKey: (item) => `invoice:${normalizeLineText(cleanDescription(item.description))}`,
            }).map((item, idx) => ({
                key: item.key || `invoice-item-${idx}`,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit,
                unitPrice: Number(item.unitPrice || 0),
                total: Number(item.total || 0),
            }));
        }
        return groupedItems.flatMap((group, groupIdx) => {
            if (group.items?.length) {
                return group.items.map((item, itemIdx) => ({
                    key: `${groupIdx}-${itemIdx}`,
                    productId: item.productId,
                    unit: item.unit,
                    description: item.description,
                    quantity: item.quantity,
                    unitPrice: Number(item.unitPrice || 0),
                    total: Number(item.total || 0),
                }));
            }
            return [{
                key: `group-${groupIdx}`,
                description: group.description,
                quantity: group.quantity,
                unitPrice: Number(group.unitPrice || 0),
                total: Number(group.total || 0),
            }];
        });
    }, [groupedItems, invoice, isProforma]);

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

    const handleSaveNotes = async () => {
        setSavingNotes(true);
        try {
            const res = await api.patch(`/invoices/${id}/notes`, { notes: notesDraft });
            setInvoice(res.data);
            setNotesDraft(res.data.notes || "");
            toast.success("Additional information saved");
        } catch (error) {
            console.error("Failed to save additional information", error);
            toast.error("Failed to save additional information");
        } finally {
            setSavingNotes(false);
        }
    };

    const handleSaveCustomerPhone = async () => {
        setSavingCustomerPhone(true);
        try {
            const res = await api.post(`/invoices/${id}/customer-phone`, { customerPhone: customerPhoneDraft });
            setInvoice(res.data);
            setCustomerPhoneDraft(res.data.customerPhoneSnapshot || getCustomerPhone(customer) || "");
            toast.success("Customer telephone saved");
        } catch (error) {
            console.error("Failed to save customer telephone", error);
            toast.error("Failed to save customer telephone");
        } finally {
            setSavingCustomerPhone(false);
        }
    };

    const handlePrint = () => window.print();

    if (loading) return <div className="text-center p-5"><Spinner animation="border" /></div>;
    if (!invoice) return <div className="text-center p-5">Invoice not found.</div>;

    const isTaxInvoice = selectedType === DOC_TYPES.TAX;
    const availableDocTypes = getAvailableDocTypes(invoice);
    const showTax = isProforma || isTaxInvoice;
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
    const projectText = project?.projectName ? `${inquiryRef} (${project.projectName})` : inquiryRef;
    const baseCustomer = customer || getSnapshotCustomer(invoice);
    const customerPhone = invoice.customerPhoneSnapshot || getCustomerPhone(baseCustomer);
    const displayCustomer = baseCustomer ? { ...baseCustomer, comContactNumber: customerPhone } : null;
    const displaySubject = project?.projectName || quotation?.subject || invoice.subjectSnapshot;
    const company = {
        name: settings["app.company.name"] || fallbackCompany.name,
        addressLines: splitLines(settings["app.company.address"] || fallbackCompany.address),
        email: settings["app.company.email"] || fallbackCompany.email,
        phone: settings["app.company.phone"] || fallbackCompany.phone,
        vatNo: settings["app.company.vatNo"] || settings["app.company.vat"] || fallbackCompany.vatNo,
    };
    const estimationTerms = estimation?.terms || [];
    const paymentTermText = getTermValueByLabel(estimationTerms, ["payment", "credit"]);
    const taxModeOfPayment = paymentTermText || payments[0]?.paymentMethod || (totalReceived > 0 ? "Part Payment Received" : "Credit");
    const taxTerms = estimationTerms.map(formatTermEntry).filter(Boolean);
    const taxNotes = String(estimation?.customNote || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
    const taxLineRows = (() => {
        const componentRows = groupedItems.map((group, index) => ({
            key: `component-${index}`,
            itemCode: inquiryRef,
            description: group.description,
            quantity: group.quantity || 1,
            unit: "Lot",
            unitPrice: Number(group.unitPrice || group.total || 0),
            total: Number(group.total || 0),
            isComponent: true,
        }));

        if (taxPrintFormat === PRINT_FORMATS.TOTALS_ONLY) return [];
        if (taxPrintFormat === PRINT_FORMATS.COMPONENTS_ONLY) return componentRows;
        if (taxPrintFormat === PRINT_FORMATS.COMPONENTS_WITH_ITEMS && groupedItems.length) {
            return groupedItems.flatMap((group, groupIdx) => [
                {
                    key: `component-${groupIdx}`,
                    itemCode: inquiryRef,
                    description: group.description,
                    quantity: group.quantity || 1,
                    unit: "Lot",
                    unitPrice: Number(group.unitPrice || group.total || 0),
                    total: Number(group.total || 0),
                    isComponent: true,
                },
                ...(group.items || []).map((item, itemIdx) => ({
                    key: `component-${groupIdx}-item-${itemIdx}`,
                    itemCode: item.productId || "",
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit || "Nos",
                    unitPrice: Number(item.unitPrice || 0),
                    total: Number(item.total || 0),
                    isSubItem: true,
                })),
            ]);
        }

        return invoiceRows.map((item, index) => ({
            key: item.key || `tax-line-${index}`,
            itemCode: item.productId || inquiryRef,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit || "Nos",
            unitPrice: Number(item.unitPrice || 0),
            total: Number(item.total || 0),
        }));
    })();
    const paddedTaxRows = [
        ...taxLineRows,
        ...Array.from({ length: Math.max(0, 4 - taxLineRows.length) }, (_, index) => ({
            key: `blank-${index}`,
            description: "",
        })),
    ];

    return (
        <div className="invoice-page bg-white min-vh-100 p-4">
            <style>{`
                @media print {
                    @page { size: A4 portrait; margin: 12mm; }
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    body * { visibility: hidden; }
                    .invoice-sheet, .invoice-sheet *,
                    .tax-invoice-sheet, .tax-invoice-sheet * { visibility: visible; }
                    .invoice-sheet,
                    .tax-invoice-sheet { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none !important; }
                    .no-print { display: none !important; }
                }
                .invoice-sheet {
                    max-width: 820px;
                    min-height: 1040px;
                    margin: 0 auto;
                    padding: 46px 26px 46px;
                    background: #fff;
                    color: #111;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 14px;
                    line-height: 1.28;
                    box-shadow: 0 0 0 1px #e5e7eb, 0 14px 35px rgba(15, 23, 42, 0.08);
                }
                .invoice-accent { color: #3f929b; }
                .invoice-header {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 340px;
                    align-items: start;
                    gap: 40px;
                    margin: 0 48px 56px;
                }
                .invoice-company { font-size: 16px; }
                .invoice-company-name { font-size: 16px; font-weight: 800; margin-bottom: 4px; }
                .invoice-company div { min-height: 21px; }
                .invoice-logo-wrap { text-align: right; padding-top: 2px; }
                .invoice-logo { width: 240px; max-height: 110px; object-fit: contain; }
                .invoice-top-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 342px;
                    gap: 40px;
                    align-items: end;
                    margin: 0 0 0 48px;
                }
                .invoice-address { min-height: 132px; }
                .invoice-address-title { font-weight: 800; font-size: 16px; margin-bottom: 4px; letter-spacing: 0; }
                .invoice-address-line { min-height: 21px; font-size: 16px; }
                .invoice-meta-panel { display: grid; gap: 14px; }
                .invoice-title,
                .invoice-meta-row {
                    background: #3f929b;
                    color: #fff;
                    min-height: 42px;
                    display: flex;
                    align-items: center;
                    padding: 0 6px;
                }
                .invoice-title {
                    font-size: 22px;
                    font-weight: 800;
                    line-height: 1.1;
                }
                .invoice-meta-row {
                    gap: 4px;
                    font-size: 16px;
                }
                .invoice-meta-label { font-weight: 800; }
                .invoice-reference-rule {
                    height: 10px;
                    background: #3f929b;
                    margin: 0px 0px 14px 0;
                }
                .invoice-project-meta {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 70px;
                    margin: 0 48px 42px;
                }
                .invoice-project-label { font-weight: 800; margin-bottom: 2px; font-size: 16px; }
                .invoice-project-value { min-height: 20px; font-size: 16px; }
                .invoice-items { width: 100%; border-collapse: collapse; table-layout: fixed; }
                .invoice-items th {
                    background: #3f929b;
                    color: #fff;
                    font-weight: 800;
                    padding: 8px 8px;
                    text-align: left;
                    font-size: 14px;
                }
                .invoice-items th:first-child, .invoice-items td:first-child { padding-left: 48px; }
                .invoice-items th.qty, .invoice-items td.qty { width: 70px; text-align: right; }
                .invoice-items th.rate, .invoice-items td.rate,
                .invoice-items th.amount, .invoice-items td.amount { width: 86px; text-align: right; }
                .invoice-items td {
                    padding: 3px 8px;
                    vertical-align: top;
                    font-size: 16px;
                    border-bottom: 1px solid #a9c2c6;
                }
                .invoice-footer-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) 398px;
                    gap: 30px;
                    margin-top: 28px;
                    align-items: start;
                    padding: 0 0 0 46px;
                }
                .invoice-notes { font-size: 16px; }
                .invoice-notes p { margin: 0 0 2px; }
                .bank-table td { padding: 1px 8px 3px 0; }
                .bank-table td:first-child { white-space: nowrap; }
                .invoice-summary { font-size: 14px; }
                .invoice-summary-row {
                    display: grid;
                    grid-template-columns: 1fr 160px;
                    gap: 20px;
                    margin-bottom: 8px;
                    text-align: right;
                }
                .invoice-due {
                    display: grid;
                    grid-template-columns: 185px 1fr;
                    margin-top: 10px;
                    align-items: stretch;
                }
                .invoice-due-label,
                .invoice-due-value {
                    background: #3f929b;
                    color: #fff;
                    min-height: 41px;
                    display: flex;
                    align-items: center;
                }
                .invoice-due-label {
                    justify-content: flex-start;
                    padding-left: 6px;
                    font-size: 16px;
                }
                .invoice-due-value {
                    justify-content: flex-end;
                    padding-right: 48px;
                    font-size: 22px;
                    font-weight: 800;
                }
                .acceptance { display: grid; grid-template-columns: 1fr 1fr; gap: 86px; margin-top: 72px; max-width: 560px; }
                .acceptance div { padding-top: 5px; }
                .tax-invoice-sheet {
                    max-width: 820px;
                    min-height: 1040px;
                    margin: 0 auto;
                    padding: 28px 34px 34px;
                    background: #fff;
                    color: #111;
                    font-family: Arial, Helvetica, sans-serif;
                    font-size: 13px;
                    line-height: 1.2;
                    box-shadow: 0 0 0 1px #e5e7eb, 0 14px 35px rgba(15, 23, 42, 0.08);
                    box-sizing: border-box;
                    overflow-wrap: anywhere;
                }
                .tax-invoice-sheet *,
                .tax-invoice-sheet *::before,
                .tax-invoice-sheet *::after {
                    box-sizing: border-box;
                }
                .tax-company-header {
                    display: grid;
                    grid-template-columns: 170px minmax(0, 1fr);
                    gap: 20px;
                    align-items: start;
                    margin-bottom: 8px;
                }
                .tax-company-logo {
                    width: 160px;
                    max-height: 80px;
                    object-fit: contain;
                }
                .tax-company-name {
                    font-size: 25px;
                    font-weight: 800;
                    letter-spacing: 0;
                    text-transform: uppercase;
                }
                .tax-company-details {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                    gap: 2px 18px;
                    margin-top: 4px;
                    font-size: 13px;
                }
                .tax-title {
                    width: 100%;
                    max-width: 100%;
                    margin: 8px auto 10px;
                    font-weight: 800;
                    font-size: 21px;
                    text-align: center;
                    text-transform: uppercase;
                }
                .tax-topline {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) auto;
                    align-items: center;
                    gap: 14px;
                }
                .tax-page-no { font-weight: 700; }
                .tax-two-col {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                    gap: 6px 26px;
                    margin-bottom: 8px;
                }
                .tax-box {
                    border: 1.5px solid #222;
                    min-height: 37px;
                    padding: 6px 8px;
                    min-width: 0;
                    overflow-wrap: anywhere;
                    word-break: break-word;
                }
                .tax-party-box {
                    min-height: 160px;
                    display: grid;
                    grid-template-rows: auto auto 1fr auto;
                    row-gap: 7px;
                }
                .tax-meta-grid {
                    display: grid;
                    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
                    gap: 6px 26px;
                    margin-bottom: 8px;
                }
                .tax-full-box {
                    border: 1.5px solid #222;
                    min-height: 72px;
                    padding: 7px 9px;
                    margin-bottom: 10px;
                    overflow-wrap: anywhere;
                    word-break: break-word;
                    white-space: pre-wrap;
                }
                .tax-label { font-weight: 700; display: inline-block; min-width: 128px; }
                .tax-value { font-weight: 700; }
                .tax-items {
                    width: 100%;
                    border-collapse: collapse;
                    table-layout: fixed;
                    margin-top: 6px;
                }
                .tax-items th,
                .tax-items td {
                    border: 1.2px solid #222;
                    padding: 5px 5px;
                    vertical-align: top;
                    max-width: 0;
                    overflow: hidden;
                    overflow-wrap: anywhere;
                    word-break: break-word;
                }
                .tax-items th {
                    height: 34px;
                    text-align: center;
                    vertical-align: middle;
                    font-weight: 700;
                }
                .tax-items td { height: 30px; }
                .tax-items .code { width: 11%; }
                .tax-items .desc { width: 34%; }
                .tax-items .qty { width: 9%; text-align: right; }
                .tax-items .uom { width: 8%; text-align: center; }
                .tax-items .unit { width: 18%; text-align: right; }
                .tax-items .amount { width: 20%; text-align: right; }
                .tax-items .qty,
                .tax-items .unit,
                .tax-items .amount {
                    font-variant-numeric: tabular-nums;
                    line-height: 1.15;
                    white-space: normal;
                }
                .tax-component-row td { font-weight: 700; background: #f4f4f4; }
                .tax-subitem { padding-left: 16px !important; }
                .tax-summary-label { text-align: left; }
                .tax-bottom-lines {
                    display: grid;
                    gap: 5px;
                    margin-top: 14px;
                    font-size: 13px;
                }
                .tax-bottom-line {
                    display: grid;
                    grid-template-columns: 170px minmax(0, 1fr);
                    gap: 12px;
                }
                .tax-bottom-label { font-weight: 700; }
                .tax-terms-notes {
                    margin-top: 14px;
                    font-size: 12px;
                    line-height: 1.28;
                }
                .tax-terms-title {
                    font-weight: 800;
                    margin-top: 8px;
                    margin-bottom: 4px;
                }
                .tax-terms-list {
                    margin: 0 0 8px 18px;
                    padding: 0;
                }
                .tax-terms-list li {
                    margin-bottom: 3px;
                    white-space: pre-wrap;
                }
                .tax-signatures {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 54px;
                    margin-top: 34px;
                    text-align: center;
                    font-size: 12px;
                }
                .tax-signatures div {
                    border-top: 1.2px dotted #222;
                    padding-top: 5px;
                }
                @media print {
                    .tax-invoice-sheet {
                        max-width: none;
                        min-height: 0;
                        padding: 0;
                    }
                    .tax-items th,
                    .tax-items td {
                        padding-left: 4px;
                        padding-right: 4px;
                    }
                    .tax-items .qty,
                    .tax-items .unit,
                    .tax-items .amount {
                        font-size: 12px;
                    }
                }
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
                        disabled={availableDocTypes.length <= 1}
                    >
                        {(availableDocTypes.length ? availableDocTypes : DOC_TYPE_OPTIONS.slice(0, 1)).map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
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
                    <Form.Control
                        size="sm"
                        style={{ width: 220 }}
                        placeholder="Customer telephone"
                        value={customerPhoneDraft}
                        onChange={(e) => setCustomerPhoneDraft(e.target.value)}
                    />
                    <Button size="sm" variant="outline-primary" onClick={handleSaveCustomerPhone} disabled={savingCustomerPhone}>
                        {savingCustomerPhone ? "Saving..." : "Save Tel"}
                    </Button>
                    {isTaxInvoice && (
                        <Form.Select
                            size="sm"
                            className="w-auto"
                            value={taxPrintFormat}
                            onChange={(e) => setTaxPrintFormat(e.target.value)}
                            aria-label="Tax invoice print format"
                        >
                            <option value={PRINT_FORMATS.ALL}>Show everything</option>
                            <option value={PRINT_FORMATS.COMPONENTS_ONLY}>Main components only</option>
                            <option value={PRINT_FORMATS.COMPONENTS_WITH_ITEMS}>Components + subcomponent names</option>
                            <option value={PRINT_FORMATS.TOTALS_ONLY}>Totals only</option>
                        </Form.Select>
                    )}
                    <Button variant="primary" onClick={handlePrint}>Print / Save PDF</Button>
                </div>
            </div>

            {isTaxInvoice && (
                <div className="no-print mb-3 border rounded p-3 bg-light">
                    <Form.Label className="fw-semibold">Tax invoice additional information</Form.Label>
                    <Form.Control
                        as="textarea"
                        rows={3}
                        value={notesDraft}
                        onChange={(e) => setNotesDraft(e.target.value)}
                        placeholder="Type any extra information to print on the tax invoice"
                    />
                    <div className="mt-2 text-end">
                        <Button size="sm" variant="outline-primary" onClick={handleSaveNotes} disabled={savingNotes}>
                            {savingNotes ? "Saving..." : "Save Additional Information"}
                        </Button>
                    </div>
                </div>
            )}

            {isTaxInvoice ? (
                <section className="tax-invoice-sheet">
                    <header className="tax-company-header">
                        <div>
                            <img className="tax-company-logo" src={logo} alt="Maruka Technologies" />
                        </div>
                        <div>
                            <div className="tax-company-name">{company.name}</div>
                            <div>{company.addressLines.join(", ")}</div>
                            <div className="tax-company-details">
                                <div>Tel : {company.phone || "-"}</div>
                                <div>e-mail : {company.email || "-"}</div>
                            </div>
                        </div>
                    </header>

                    <div className="tax-topline">
                        <div className="tax-title">Tax Invoice</div>
                        <div className="tax-page-no">1/1</div>
                    </div>

                    <div className="tax-two-col">
                        <div className="tax-box">
                            <span className="tax-label">Date of Invoice</span>
                            <span className="tax-value">{formatDate(invoice.issuedDate)}</span>
                        </div>
                        <div className="tax-box">
                            <span className="tax-label">Tax Invoice No</span>
                            <span className="tax-value">{invoiceNo}</span>
                        </div>
                        <div className="tax-box tax-party-box">
                            <div><span className="tax-label">Supplier's TIN</span><span>{company.vatNo || "-"}</span></div>
                            <div><span className="tax-label">Supplier's Name</span><span>{company.name}</span></div>
                            <div><span className="tax-label">Address</span><span>{company.addressLines.join(", ")}</span></div>
                            <div><span className="tax-label">Telephone No</span><span>{company.phone || "-"}</span></div>
                        </div>
                        <div className="tax-box tax-party-box">
                            <div><span className="tax-label">Purchaser's TIN</span><span>{displayCustomer?.tin || displayCustomer?.taxId || displayCustomer?.vatNumber || "-"}</span></div>
                            <div><span className="tax-label">Purchaser's Name</span><span>{displayCustomer?.comName || displayCustomer?.name || "N/A"}</span></div>
                            <div><span className="tax-label">Address</span><span>{getCompanyAddress(displayCustomer) || "-"}</span></div>
                            <div><span className="tax-label">Telephone No</span><span>{getCustomerPhone(displayCustomer) || "-"}</span></div>
                        </div>
                    </div>

                    <div className="tax-meta-grid">
                        <div className="tax-box">
                            <span className="tax-label">Date of Delivery</span>
                            <span>{formatDate(project?.deliveryDate || project?.endDate || invoice.issuedDate)}</span>
                        </div>
                        <div className="tax-box">
                            <span className="tax-label">Place of Supply</span>
                            <span>{settings["app.company.placeOfSupply"] || settings["app.company.city"] || company.name}</span>
                        </div>
                        <div className="tax-box">
                            <span className="tax-label">Job Number</span>
                            <span>{jobRef !== "-" ? jobRef : inquiryRef}</span>
                        </div>
                        <div className="tax-box">
                            <span className="tax-label">PO Number</span>
                            <span>{invoice.poNumber || "-"}</span>
                        </div>
                    </div>

                    <div className="tax-full-box">
                        <strong>Additional Information</strong>
                        <div>{invoice.notes || "-"}</div>
                    </div>

                    <table className="tax-items">
                        <thead>
                            <tr>
                                <th className="code">Item Code</th>
                                <th className="desc">Description of Goods or Services</th>
                                <th className="qty">Quantity</th>
                                <th className="uom">UoM</th>
                                <th className="unit">Unit Price</th>
                                <th className="amount">Amount<br />Excluding VAT<br />(Rs.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paddedTaxRows.map((item, index) => (
                                <tr
                                    key={item.key || `${item.description}-${index}`}
                                    className={item.isComponent ? "tax-component-row" : ""}
                                >
                                    <td className="code">{item.description ? item.itemCode || "" : ""}</td>
                                    <td className={item.isSubItem ? "tax-subitem" : ""}>{item.description}</td>
                                    <td className="qty">{item.quantity || ""}</td>
                                    <td className="uom">{item.description ? item.unit || "" : ""}</td>
                                    <td className="unit">{item.description && taxPrintFormat !== PRINT_FORMATS.COMPONENTS_WITH_ITEMS ? money(item.unitPrice) : item.isComponent ? money(item.unitPrice) : ""}</td>
                                    <td className="amount">{item.description ? money(item.total) : ""}</td>
                                </tr>
                            ))}
                            <tr>
                                <td className="tax-summary-label" colSpan="5">Total Value of Supply</td>
                                <td className="amount">{money(subtotal)}</td>
                            </tr>
                            <tr>
                                <td className="tax-summary-label" colSpan="5">VAT Amount (Total Value of Supply @ {Number(invoice.vatAmount || 0) > 0 ? "18%" : "0%"})</td>
                                <td className="amount">{money(taxTotal)}</td>
                            </tr>
                            <tr>
                                <td className="tax-summary-label" colSpan="5"><strong>Total Amount</strong></td>
                                <td className="amount">{money(documentTotal)}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div className="tax-bottom-lines">
                        <div className="tax-bottom-line">
                            <span className="tax-bottom-label">Total Amount In word</span>
                            <span>{amountToWords(documentTotal)}</span>
                        </div>
                        <div className="tax-bottom-line">
                            <span className="tax-bottom-label">Mode of Payment</span>
                            <span>{taxModeOfPayment}</span>
                        </div>
                        <div className="tax-bottom-line">
                            <span className="tax-bottom-label">Customer Ref No</span>
                            <span>{invoice.poNumber || "-"}</span>
                        </div>
                    </div>

                    {(taxTerms.length > 0 || taxNotes.length > 0) && (
                        <div className="tax-terms-notes">
                            {taxTerms.length > 0 && (
                                <>
                                    <div className="tax-terms-title">Terms and Conditions</div>
                                    <ol className="tax-terms-list">
                                        {taxTerms.map((term, index) => (
                                            <li key={`term-${index}`}>{term}</li>
                                        ))}
                                    </ol>
                                </>
                            )}
                            {taxNotes.length > 0 && (
                                <>
                                    <div className="tax-terms-title">Notes</div>
                                    <ol className="tax-terms-list">
                                        {taxNotes.map((note, index) => (
                                            <li key={`note-${index}`}>{note}</li>
                                        ))}
                                    </ol>
                                </>
                            )}
                        </div>
                    )}

                    <div className="tax-signatures">
                        <div>Prepared By</div>
                        <div>Checked By</div>
                        <div>Authorized By</div>
                    </div>
                </section>
            ) : (
            <section className="invoice-sheet">
                <header className="invoice-header">
                    <div className="invoice-company">
                        <div className="invoice-company-name">{company.name}</div>
                        {company.addressLines.map((line) => <div key={line}>{line}</div>)}
                        {company.phone && <div>{company.phone}</div>}
                        {company.email && <div>{company.email}</div>}
                        {company.vatNo && <div>Govt. UID VAT Reg: {company.vatNo}</div>}
                    </div>
                    <div className="invoice-logo-wrap">
                        <img className="invoice-logo" src={logo} alt="Maruka Technologies" />
                    </div>
                </header>

                <div className="invoice-top-grid">
                    <div className="invoice-address">
                        <div className="invoice-address-title">{addressTitle}</div>
                        {getCustomerLines(displayCustomer).map((line, idx) => (
                            <div className="invoice-address-line" key={`${line}-${idx}`}>{line}</div>
                        ))}
                    </div>
                    <div className="invoice-meta-panel">
                        <div className="invoice-title">{documentTitle} {invoiceNo}</div>
                        <div className="invoice-meta-row">
                            <span className="invoice-meta-label">DATE</span>
                            <span>{formatDate(invoice.issuedDate)}</span>
                        </div>
                        <div className="invoice-meta-row">
                            <span className="invoice-meta-label">{dueDateLabel}</span>
                            <span>{formatDate(invoice.dueDate)}</span>
                        </div>
                    </div>
                </div>

                <div className="invoice-reference-rule" />

                <div className="invoice-project-meta">
                    <div>
                        <div className="invoice-project-label">PO NO</div>
                        <div className="invoice-project-value">{invoice.poNumber || "-"}</div>
                    </div>
                    <div>
                        <div className="invoice-project-label">PROJECT NO</div>
                        <div className="invoice-project-value">{jobRef !== "-" ? `${jobRef} (${projectText})` : (displaySubject || projectText)}</div>
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
                        {invoiceRows.map((item, index) => (
                            <tr key={item.key || `${item.description}-${index}`}>
                                <td>{item.description}</td>
                                <td className="qty">{item.quantity || ""}</td>
                                <td className="rate">{money(item.unitPrice)}</td>
                                <td className="amount">{money(item.total)}</td>
                            </tr>
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

                    <div className="invoice-summary">
                        {(showTax || isProforma || totalReceived > 0) && (
                            <>
                                <div className="invoice-summary-row">
                                    <span>SUBTOTAL</span>
                                    <span>{money(subtotal)}</span>
                                </div>
                                {showTax && (
                                    <div className="invoice-summary-row">
                                        <span>TAX</span>
                                        <span>{money(taxTotal)}</span>
                                    </div>
                                )}
                                <div className="invoice-summary-row">
                                    <span>TOTAL</span>
                                    <span>{money(documentTotal)}</span>
                                </div>
                                {!isProforma && totalReceived > 0 && (
                                    <div className="invoice-summary-row">
                                        <span>PAYMENT</span>
                                        <span>{money(totalReceived)}</span>
                                    </div>
                                )}
                            </>
                        )}
                        <div className="invoice-due">
                            <div className="invoice-due-label">{isProforma ? "LKR" : "TOTAL DUE"}</div>
                            <div className="invoice-due-value">LKR {money(isProforma ? documentTotal : balanceDue)}</div>
                        </div>
                    </div>
                </div>

                {isProforma && (
                    <div className="acceptance">
                        <div>Accepted By</div>
                        <div>Accepted Date</div>
                    </div>
                )}

            </section>
            )}
        </div>
    );
};

export default InvoiceView;
