import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/api";
import { Button, Spinner, Badge, Form, Dropdown, Modal } from "react-bootstrap";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import logo from "../../assets/logo.jpeg";
import { useAuth } from "../../context/AuthContext";

const money = (value) => Number(value || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const formatQuantity = (value) => {
    if (value === "" || value == null) return "";
    const number = Number(value || 0);
    return Number.isFinite(number) ? number.toLocaleString("en-US", { maximumFractionDigits: 6 }) : "";
};

const decimalTotal = (values = []) =>
    values.reduce((sum, value) => sum + Math.round(Number(value || 0) * 100), 0) / 100;

const formatDate = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    const month = String(parsed.getMonth() + 1).padStart(2, "0");
    const day = String(parsed.getDate()).padStart(2, "0");
    return `${month}/${day}/${parsed.getFullYear()}`;
};

const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    return parsed.toLocaleString("en-GB", {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
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
    CUSTOM: "custom",
};

const TAX_PRINT_PRESETS = {
    [PRINT_FORMATS.ALL]: {
        showItemCode: true,
        showComponents: true,
        showComponentPrices: true,
        showItems: false,
        showItemQuantities: true,
        showItemUnits: true,
        showItemUnitPrices: false,
        showItemTotals: false,
        showSubtotal: true,
        showVat: true,
        showOtherTax: true,
        showTotalAmount: true,
        showPayments: true,
        showTotalDue: true,
        showAmountWords: true,
        showModeOfPayment: true,
        showCustomerRef: true,
        showTerms: true,
        showNotes: true,
        showSignatures: true,
    },
    [PRINT_FORMATS.COMPONENTS_ONLY]: {
        showItemCode: true,
        showComponents: true,
        showComponentPrices: true,
        showItems: false,
        showItemQuantities: false,
        showItemUnits: false,
        showItemUnitPrices: false,
        showItemTotals: false,
        showSubtotal: true,
        showVat: true,
        showOtherTax: true,
        showTotalAmount: true,
        showPayments: true,
        showTotalDue: true,
        showAmountWords: true,
        showModeOfPayment: true,
        showCustomerRef: true,
        showTerms: true,
        showNotes: true,
        showSignatures: true,
    },
    [PRINT_FORMATS.COMPONENTS_WITH_ITEMS]: {
        showItemCode: true,
        showComponents: true,
        showComponentPrices: true,
        showItems: true,
        showItemQuantities: true,
        showItemUnits: true,
        showItemUnitPrices: false,
        showItemTotals: false,
        showSubtotal: true,
        showVat: true,
        showOtherTax: true,
        showTotalAmount: true,
        showPayments: true,
        showTotalDue: true,
        showAmountWords: true,
        showModeOfPayment: true,
        showCustomerRef: true,
        showTerms: true,
        showNotes: true,
        showSignatures: true,
    },
    [PRINT_FORMATS.TOTALS_ONLY]: {
        showItemCode: false,
        showComponents: false,
        showComponentPrices: false,
        showItems: false,
        showItemQuantities: false,
        showItemUnits: false,
        showItemUnitPrices: false,
        showItemTotals: false,
        showSubtotal: true,
        showVat: true,
        showOtherTax: true,
        showTotalAmount: true,
        showPayments: true,
        showTotalDue: true,
        showAmountWords: true,
        showModeOfPayment: true,
        showCustomerRef: true,
        showTerms: true,
        showNotes: true,
        showSignatures: true,
    },
};

const TAX_PRINT_OPTION_GROUPS = [
    {
        title: "Main components",
        options: [
            ["showItemCode", "Item codes"],
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
            ["showVat", "VAT"],
            ["showOtherTax", "Other tax"],
            ["showTotalAmount", "Total amount"],
            ["showPayments", "Payments"],
            ["showTotalDue", "Total due"],
            ["showAmountWords", "Amount in words"],
            ["showModeOfPayment", "Mode of payment"],
            ["showCustomerRef", "Customer reference"],
            ["showTerms", "Terms"],
            ["showNotes", "Notes"],
            ["showSignatures", "Signatures"],
        ],
    },
];

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

const componentAmount = (component, includeDelivery = true, includeFreight = true) => {
    if (component?.lineTotalBeforeTax != null) {
        return Number(component.lineTotalBeforeTax || 0);
    }
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
        const freight = includeFreight ? Number(component?.freightCost || 0) * qty : 0;
        return baseForMargin + marginAmount + delivery + freight;
    }
    return Number(component?.lineTotalBeforeTax ?? component?.subtotalWithMargin ?? component?.itemsSubtotal ?? 0);
};

const quotationComponentAmount = (component, includeDelivery = true, includeFreight = true) => {
    const qty = componentQuantity(component);
    const itemsSubtotal = (component?.items || []).reduce((sum, item) => {
        const unit = Number(item?.unitPrice ?? item?.unitCost ?? 0);
        return sum + unit * Number(item?.quantity || 0) * qty;
    }, 0);
    const marginAmount = itemsSubtotal * (Number(component?.marginPercent || 0) / 100);
    const delivery = includeDelivery ? Number(component?.deliveryCost || 0) * qty : 0;
    const freight = includeFreight ? Number(component?.freightCost || 0) * qty : 0;
    return itemsSubtotal + marginAmount + delivery + freight;
};

const componentLabel = (component) => {
    const qty = componentQuantity(component);
    return qty !== 1 ? `${component?.name || "Component"} x ${formatQuantity(qty)}` : (component?.name || "Component");
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

const numberValue = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
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

const getCustomerPhone = (customer) =>
    customer?.comContactNumber || customer?.pContact || customer?.contactNo || "";

const TaxPartyRow = ({ label, children }) => (
    <div className="tax-party-row">
        <span className="tax-label">{label}</span>
        <span className="tax-party-value">{children}</span>
    </div>
);

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
    if (docType === DOC_TYPES.TAX) return rawNumber || "-";

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
    const [deliverySchedule, setDeliverySchedule] = useState(null);
    const [settings, setSettings] = useState({});
    const [poDraft, setPoDraft] = useState("");
    const [notesDraft, setNotesDraft] = useState("");
    const [customerPhoneDraft, setCustomerPhoneDraft] = useState("");
    const [savingPo, setSavingPo] = useState(false);
    const [savingNotes, setSavingNotes] = useState(false);
    const [savingCustomerPhone, setSavingCustomerPhone] = useState(false);
    const [refreshingInvoice, setRefreshingInvoice] = useState(false);
    const [savingPrintLayout, setSavingPrintLayout] = useState(false);
    const [recordingPrint, setRecordingPrint] = useState(false);
    const [previewPrintEntry, setPreviewPrintEntry] = useState(null);
    const [taxPrintFormat, setTaxPrintFormat] = useState(PRINT_FORMATS.ALL);
    const [taxPrintOptions, setTaxPrintOptions] = useState(TAX_PRINT_PRESETS[PRINT_FORMATS.ALL]);
    const { role, projectRoles } = useAuth();
    const rolesHeader = useMemo(() => [role, ...(Array.isArray(projectRoles) ? projectRoles : [])]
        .filter(Boolean)
        .join(","), [role, projectRoles]);
    const isAdmin = ["ADMIN", "SUPER_ADMIN"].includes(String(role || "").toUpperCase());

    const selectedType = searchParams.get("type") || DOC_TYPES.PROFORMA;
    const isProforma = selectedType === DOC_TYPES.PROFORMA;
    const isFinalInvoiceType = selectedType === DOC_TYPES.NORMAL || selectedType === DOC_TYPES.TAX;
    const currentPrintLayout = invoice?.printLayouts?.[selectedType];
    const isPrintLayoutLocked = isFinalInvoiceType && currentPrintLayout?.locked === true;
    const canEditPrintLayout = !isPrintLayoutLocked || isAdmin;
    const currentPrintAuditEntries = Array.isArray(invoice?.printAuditTrail)
        ? invoice.printAuditTrail.filter(entry => entry.documentType === selectedType)
        : [];

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

                    try {
                        const deliveryRes = await api.get(`/projects/${invRes.data.projectId}/delivery`);
                        setDeliverySchedule(deliveryRes.data || null);
                    } catch (deliveryErr) {
                        console.warn("Could not fetch delivery schedule", deliveryErr);
                    }

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

    useEffect(() => {
        const layout = invoice?.printLayouts?.[selectedType];
        if (!layout?.locked || !isFinalInvoiceType) return;
        setTaxPrintFormat(layout.printFormat || PRINT_FORMATS.CUSTOM);
        setTaxPrintOptions({
            ...TAX_PRINT_PRESETS[PRINT_FORMATS.ALL],
            ...(layout.printOptions || {}),
        });
    }, [invoice, selectedType, isFinalInvoiceType]);

    const groupedItems = useMemo(() => {
        if (estimation?.components?.length) {
            return estimation.components.map((comp) => ({
                description: componentLabel(comp),
                quantity: componentQuantity(comp),
                unitPrice: componentQuantity(comp) > 0 ? componentAmount(comp, estimation.includeDelivery !== false, estimation.includeFreight !== false) / componentQuantity(comp) : componentAmount(comp, estimation.includeDelivery !== false, estimation.includeFreight !== false),
                total: componentAmount(comp, estimation.includeDelivery !== false, estimation.includeFreight !== false),
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

    const handleRefreshInvoice = async () => {
        if (!window.confirm("Refresh this invoice from the current project, quotation, estimation, and payment records?")) return;
        setRefreshingInvoice(true);
        try {
            const refreshConfig = { headers: { "X-Roles": rolesHeader } };
            let res;
            try {
                res = await api.post(`/invoices/${id}/refresh`, {}, refreshConfig);
            } catch (postError) {
                if (postError?.response?.status !== 405) {
                    throw postError;
                }
                res = await api.patch(`/invoices/${id}/refresh`, {}, refreshConfig);
            }
            setInvoice(res.data);
            setPoDraft(res.data.poNumber || "");
            setNotesDraft(res.data.notes || "");
            setCustomerPhoneDraft(res.data.customerPhoneSnapshot || getCustomerPhone(customer) || "");
            toast.success("Invoice refreshed");
        } catch (error) {
            console.error("Failed to refresh invoice", error);
            const status = error?.response?.status;
            const message = status === 405
                ? "Refresh endpoint is not available on the running backend. Restart/update the backend, then try again."
                : error.response?.data?.message || "Failed to refresh invoice";
            toast.error(message);
        } finally {
            setRefreshingInvoice(false);
        }
    };

    const currentPrintPayload = () => ({
        documentType: selectedType,
        printFormat: taxPrintFormat,
        printOptions: taxPrintOptions,
    });

    const applyPrintLayoutFromInvoice = (updatedInvoice) => {
        const layout = updatedInvoice?.printLayouts?.[selectedType];
        if (!layout?.locked || !isFinalInvoiceType) return;
        setTaxPrintFormat(layout.printFormat || PRINT_FORMATS.CUSTOM);
        setTaxPrintOptions({
            ...TAX_PRINT_PRESETS[PRINT_FORMATS.ALL],
            ...(layout.printOptions || {}),
        });
    };

    const handleApplyPrintLayout = async () => {
        if (!isAdmin) return;
        setSavingPrintLayout(true);
        try {
            const res = await api.patch(`/invoices/${id}/print-layout`, {
                ...currentPrintPayload(),
                reason: "Admin applied invoice print format",
            }, { headers: { "X-Roles": rolesHeader } });
            setInvoice(res.data);
            applyPrintLayoutFromInvoice(res.data);
            toast.success("Print format version saved");
        } catch (error) {
            console.error("Failed to save print format", error);
            toast.error(error.response?.data?.message || "Failed to save print format");
        } finally {
            setSavingPrintLayout(false);
        }
    };

    const handlePrint = async () => {
        setRecordingPrint(true);
        try {
            const res = await api.post(`/invoices/${id}/print-events`, currentPrintPayload());
            setInvoice(res.data);
            applyPrintLayoutFromInvoice(res.data);
            setTimeout(() => window.print(), 0);
        } catch (error) {
            console.error("Failed to record invoice print", error);
            toast.error(error.response?.data?.message || "Could not record print audit. Print cancelled.");
        } finally {
            setRecordingPrint(false);
        }
    };

    const handleTaxPrintFormatChange = (value) => {
        setTaxPrintFormat(value);
        if (TAX_PRINT_PRESETS[value]) {
            setTaxPrintOptions(TAX_PRINT_PRESETS[value]);
        }
    };

    const toggleTaxPrintOption = (key) => {
        setTaxPrintFormat(PRINT_FORMATS.CUSTOM);
        setTaxPrintOptions((current) => ({
            ...current,
            [key]: !current[key],
        }));
    };

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
    const fallbackDocumentNumber = isTaxInvoice ? "" : invoice.invoiceNumber;
    const invoiceNo = buildDisplayInvoiceNumber(rawDocumentNumber || fallbackDocumentNumber, selectedType);
    const inquiryRef = project?.referenceNumber || project?.inquiryNumber || project?.id || invoice.projectId || "-";
    const jobRef = project?.jobNumber || "-";
    const totalReceived = numberValue(invoice.paidAmount);
    const sourceVatTotal = numberValue(estimation?.computedVatAmount);
    const sourceOtherTaxTotal = numberValue(estimation?.computedTaxAmount);
    const sourceDocumentTotal = numberValue(estimation?.computedGrandTotal);
    const invoiceVatTotal = numberValue(invoice.vatAmount);
    const invoiceOtherTaxTotal = numberValue(invoice.taxAmount);
    const invoiceDocumentTotal = numberValue(invoice.totalAmount);
    const sourceSubtotal = sourceDocumentTotal > 0
        ? sourceDocumentTotal - sourceVatTotal - sourceOtherTaxTotal
        : 0;
    const invoiceSubtotal = numberValue(invoice.subtotal);
    const storedSubtotal = isTaxInvoice && sourceSubtotal > 0 ? sourceSubtotal : invoiceSubtotal;
    const storedVatTotal = isTaxInvoice && sourceDocumentTotal > 0 ? sourceVatTotal : invoiceVatTotal;
    const storedOtherTaxTotal = isTaxInvoice && sourceDocumentTotal > 0 ? sourceOtherTaxTotal : invoiceOtherTaxTotal;
    const storedDocumentTotal = showTax ? (sourceDocumentTotal > 0 ? sourceDocumentTotal : invoiceDocumentTotal) : storedSubtotal;
    const dueDateLabel = isProforma ? "EXPIRATION DATE" : "DUE DATE";
    const deliveryDate = deliverySchedule?.scheduledDate || project?.estimatedEnd || invoice.issuedDate;
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
        const estimationComponentRows = estimation?.components?.length
            ? estimation.components.map((component, index) => {
                const quantity = componentQuantity(component);
                const total = componentAmount(component, estimation.includeDelivery !== false, estimation.includeFreight !== false);
                return {
                    key: `est-component-${index}`,
                    itemCode: inquiryRef,
                    description: componentLabel(component),
                    quantity,
                    unit: "Lot",
                    unitPrice: quantity > 0 ? total / quantity : total,
                    total,
                    items: aggregateLineItems(component.items || [], {
                        getDescription: (item) => item.productNameSnapshot || item.description || item.productId,
                        getUnitPrice: (item) => Number(item.estUnitCost || 0),
                        getQuantity: (item) => Number(item.quantity || 0) * quantity,
                        getTotal: (item) => Number(item.quantity || 0) * quantity * Number(item.estUnitCost || 0),
                    }),
                    isComponent: true,
                };
            })
            : [];
        const quotationComponentRows = !estimationComponentRows.length && quotation?.components?.length
            ? quotation.components.map((component, index) => {
                const quantity = componentQuantity(component);
                const total = quotationComponentAmount(component, quotation.includeDelivery !== false, quotation.includeFreight !== false);
                return {
                    key: `quote-component-${index}`,
                    itemCode: inquiryRef,
                    description: componentLabel(component),
                    quantity,
                    unit: "Lot",
                    unitPrice: quantity > 0 ? total / quantity : total,
                    total,
                    items: aggregateLineItems(component.items || [], {
                        getDescription: (item) => item.productNameSnapshot || item.description || item.productId,
                        getUnitPrice: (item) => Number(item.unitPrice ?? item.unitCost ?? 0),
                        getQuantity: (item) => Number(item.quantity || 0) * quantity,
                        getTotal: (item) => Number(item.quantity || 0) * quantity * Number(item.unitPrice ?? item.unitCost ?? 0),
                    }),
                    isComponent: true,
                };
            })
            : [];
        const componentRows = estimationComponentRows.length ? estimationComponentRows : quotationComponentRows;
        const actualDiscountAmount = numberValue(estimation?.computedDiscountAmount);
        const rowsWithDiscount = actualDiscountAmount > 0.004
            ? [
                ...componentRows,
                {
                    key: "supply-discount",
                    itemCode: "",
                    description: "Discount",
                    quantity: "",
                    unit: "",
                    unitPrice: -actualDiscountAmount,
                    total: -actualDiscountAmount,
                },
            ]
            : componentRows;
        const groupedComponentRows = groupedItems.map((group, index) => ({
            key: `component-${index}`,
            itemCode: inquiryRef,
            description: group.description,
            quantity: group.quantity || 1,
            unit: "Lot",
            unitPrice: Number(group.unitPrice || group.total || 0),
            total: Number(group.total || 0),
            isComponent: true,
        }));

        if (!taxPrintOptions.showComponents && !taxPrintOptions.showItems) return [];

        const sourceRows = componentRows.length ? componentRows : groupedComponentRows;
        if (sourceRows.length && (taxPrintOptions.showComponents || taxPrintOptions.showItems)) {
            const rows = sourceRows.flatMap((group, groupIdx) => [
                ...(taxPrintOptions.showComponents ? [group] : []),
                ...(taxPrintOptions.showItems ? (group.items || []).map((item, itemIdx) => ({
                    key: `component-${groupIdx}-item-${itemIdx}`,
                    itemCode: item.productId || "",
                    description: item.description,
                    quantity: item.quantity,
                    unit: item.unit || "Nos",
                    unitPrice: Number(item.unitPrice || 0),
                    total: Number(item.total || 0),
                    isSubItem: true,
                })) : []),
            ]);
            return actualDiscountAmount > 0.004 && taxPrintOptions.showComponents
                ? [...rows, rowsWithDiscount[rowsWithDiscount.length - 1]]
                : rows;
        }

        return componentRows.length ? rowsWithDiscount : invoiceRows.map((item, index) => ({
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
    const pricedTaxLineRows = taxLineRows.filter((row) => !row.isSubItem);
    const hasSourceDocumentTotal = sourceDocumentTotal > 0;
    const printedSubtotal = isTaxInvoice && pricedTaxLineRows.length && !hasSourceDocumentTotal
        ? decimalTotal(pricedTaxLineRows.map((row) => row.total))
        : storedSubtotal;
    const vatPercent = Number(estimation?.vatPercent ?? quotation?.vatPercent ?? 18);
    const printedVatTotal = isTaxInvoice && pricedTaxLineRows.length && storedVatTotal > 0 && !hasSourceDocumentTotal
        ? decimalTotal([(printedSubtotal * vatPercent) / 100])
        : storedVatTotal;
    const printedOtherTaxTotal = storedOtherTaxTotal;
    const printedTaxTotal = decimalTotal([printedVatTotal, printedOtherTaxTotal]);
    const printedDocumentTotal = isTaxInvoice && pricedTaxLineRows.length && !hasSourceDocumentTotal
        ? decimalTotal([printedSubtotal, printedVatTotal, printedOtherTaxTotal])
        : storedDocumentTotal;
    const balanceDue = Math.max(printedDocumentTotal - totalReceived, 0);
    const showTaxLineColumns = {
        code: taxPrintOptions.showItemCode,
        qty: taxPrintOptions.showItemQuantities,
        unit: taxPrintOptions.showItemUnits,
        unitPrice: taxPrintOptions.showComponentPrices || taxPrintOptions.showItemUnitPrices,
        amount: taxPrintOptions.showComponentPrices
            || taxPrintOptions.showItemTotals
            || taxPrintOptions.showSubtotal
            || taxPrintOptions.showVat
            || taxPrintOptions.showOtherTax
            || taxPrintOptions.showTotalAmount
            || taxPrintOptions.showPayments
            || taxPrintOptions.showTotalDue,
    };
    const taxSummaryColSpan = 1
        + (showTaxLineColumns.code ? 1 : 0)
        + (showTaxLineColumns.qty ? 1 : 0)
        + (showTaxLineColumns.unit ? 1 : 0)
        + (showTaxLineColumns.unitPrice ? 1 : 0);
    const showStandardLines = taxPrintOptions.showComponents || taxPrintOptions.showItems;
    const showStandardQty = taxPrintOptions.showItemQuantities;
    const showStandardRate = taxPrintOptions.showComponentPrices || taxPrintOptions.showItemUnitPrices;
    const showStandardAmount = taxPrintOptions.showComponentPrices || taxPrintOptions.showItemTotals;
    const showStandardSummary = taxPrintOptions.showSubtotal
        || taxPrintOptions.showVat
        || taxPrintOptions.showOtherTax
        || taxPrintOptions.showTotalAmount
        || taxPrintOptions.showPayments
        || taxPrintOptions.showTotalDue;
    const previewOptions = previewPrintEntry
        ? { ...TAX_PRINT_PRESETS[PRINT_FORMATS.ALL], ...(previewPrintEntry.printOptions || {}) }
        : null;
    const previewRows = previewOptions
        ? groupedItems.flatMap((group, groupIdx) => [
            ...(previewOptions.showComponents ? [{
                key: `preview-component-${groupIdx}`,
                description: group.description,
                quantity: group.quantity,
                unit: "Lot",
                unitPrice: group.unitPrice,
                total: group.total,
                isComponent: true,
            }] : []),
            ...(previewOptions.showItems ? (group.items || []).slice(0, 3).map((item, itemIdx) => ({
                key: `preview-item-${groupIdx}-${itemIdx}`,
                description: item.description,
                quantity: item.quantity,
                unit: item.unit || "Nos",
                unitPrice: item.unitPrice,
                total: item.total,
                isSubItem: true,
            })) : []),
        ]).slice(0, 8)
        : [];
    const visiblePreviewOptions = previewPrintEntry
        ? TAX_PRINT_OPTION_GROUPS.flatMap(group => group.options)
            .filter(([key]) => previewOptions?.[key])
            .map(([, label]) => label)
        : [];

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
                .invoice-items th.qty, .invoice-items td.qty { width: 76px; text-align: right; }
                .invoice-items th.rate, .invoice-items td.rate { width: 130px; text-align: right; }
                .invoice-items th.amount, .invoice-items td.amount { width: 140px; text-align: right; }
                .invoice-items th.qty,
                .invoice-items th.rate,
                .invoice-items th.amount,
                .invoice-items td.qty,
                .invoice-items td.rate,
                .invoice-items td.amount {
                    box-sizing: border-box;
                    font-variant-numeric: tabular-nums;
                    white-space: nowrap;
                }
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
                    grid-template-columns: minmax(0, 1fr);
                    gap: 2px;
                    margin-top: 4px;
                    font-size: 13px;
                }
                .tax-contact-line {
                    display: grid;
                    grid-template-columns: 48px minmax(0, 1fr);
                    column-gap: 4px;
                    align-items: start;
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
                .tax-box:not(.tax-party-box) {
                    display: grid;
                    grid-template-columns: 132px minmax(0, 1fr);
                    column-gap: 12px;
                    align-items: start;
                }
                .tax-party-box {
                    min-height: 160px;
                    display: grid;
                    grid-template-rows: auto auto 1fr auto;
                    row-gap: 7px;
                }
                .tax-party-row {
                    display: grid;
                    grid-template-columns: 128px minmax(0, 1fr);
                    column-gap: 12px;
                    align-items: start;
                }
                .tax-party-value {
                    min-width: 0;
                    overflow-wrap: anywhere;
                    white-space: pre-line;
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
                .tax-label { font-weight: 700; }
                .tax-value {
                    font-weight: 700;
                    min-width: 0;
                    overflow-wrap: anywhere;
                }
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

            <Modal show={!!previewPrintEntry} onHide={() => setPreviewPrintEntry(null)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title>
                        Print Version Preview
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {previewPrintEntry && previewOptions && (
                        <>
                            <div className="d-flex justify-content-between gap-3 flex-wrap mb-3">
                                <div>
                                    <div className="fw-semibold">{String(previewPrintEntry.documentType || selectedType).toUpperCase()} version {previewPrintEntry.version || "-"}</div>
                                    <div className="small text-muted">
                                        {previewPrintEntry.action || "FORMAT"} by {previewPrintEntry.performedBy || "system"} on {formatDateTime(previewPrintEntry.performedAt)}
                                    </div>
                                </div>
                                <Badge bg="secondary">{previewPrintEntry.printFormat || "custom"}</Badge>
                            </div>

                            <div className="border rounded p-3 bg-white">
                                <div className="d-flex justify-content-between gap-3 mb-3">
                                    <div>
                                        <div className="fw-bold">{company.name}</div>
                                        <div className="small text-muted">{company.addressLines.join(", ")}</div>
                                    </div>
                                    <div className="text-end">
                                        <div className="fw-bold">{String(previewPrintEntry.documentType || selectedType).toUpperCase()} INVOICE</div>
                                        <div className="small text-muted">{invoiceNo}</div>
                                    </div>
                                </div>
                                <div className="small mb-2">
                                    <strong>Bill To:</strong> {displayCustomer?.comName || displayCustomer?.name || "N/A"}
                                </div>
                                {(previewOptions.showComponents || previewOptions.showItems) && (
                                    <div className="table-responsive">
                                        <table className="table table-sm table-bordered mb-3">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Description</th>
                                                    {previewOptions.showItemQuantities && <th className="text-end">Qty</th>}
                                                    {previewOptions.showItemUnits && <th className="text-end">Unit</th>}
                                                    {(previewOptions.showComponentPrices || previewOptions.showItemUnitPrices) && <th className="text-end">Unit Price</th>}
                                                    {(previewOptions.showComponentPrices || previewOptions.showItemTotals) && <th className="text-end">Amount</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {(previewRows.length ? previewRows : [{ key: "empty", description: "No line items shown" }]).map(row => (
                                                    <tr key={row.key}>
                                                        <td className={row.isSubItem ? "ps-4" : ""}>{row.description}</td>
                                                        {previewOptions.showItemQuantities && <td className="text-end">{row.description && (!row.isSubItem || previewOptions.showItemQuantities) ? formatQuantity(row.quantity) : ""}</td>}
                                                        {previewOptions.showItemUnits && <td className="text-end">{row.unit || ""}</td>}
                                                        {(previewOptions.showComponentPrices || previewOptions.showItemUnitPrices) && (
                                                            <td className="text-end">
                                                                {(row.isComponent && previewOptions.showComponentPrices) || (row.isSubItem && previewOptions.showItemUnitPrices) ? money(row.unitPrice) : ""}
                                                            </td>
                                                        )}
                                                        {(previewOptions.showComponentPrices || previewOptions.showItemTotals) && (
                                                            <td className="text-end">
                                                                {(row.isComponent && previewOptions.showComponentPrices) || (row.isSubItem && previewOptions.showItemTotals) ? money(row.total) : ""}
                                                            </td>
                                                        )}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                                <div className="d-flex justify-content-end">
                                    <div style={{ minWidth: 260 }}>
                                        {previewOptions.showSubtotal && <div className="d-flex justify-content-between"><span>Subtotal</span><span>{money(printedSubtotal)}</span></div>}
                                        {(previewOptions.showVat || previewOptions.showOtherTax) && <div className="d-flex justify-content-between"><span>Tax</span><span>{money(printedTaxTotal)}</span></div>}
                                        {previewOptions.showTotalAmount && <div className="d-flex justify-content-between fw-bold"><span>Total</span><span>{money(printedDocumentTotal)}</span></div>}
                                        {previewOptions.showTotalDue && <div className="d-flex justify-content-between fw-bold border-top mt-2 pt-2"><span>Total Due</span><span>{money(balanceDue)}</span></div>}
                                    </div>
                                </div>
                            </div>

                            <div className="mt-3">
                                <div className="fw-semibold small mb-2">Visible fields in this version</div>
                                <div className="d-flex gap-2 flex-wrap">
                                    {visiblePreviewOptions.length
                                        ? visiblePreviewOptions.map(label => <Badge bg="light" text="dark" key={label}>{label}</Badge>)
                                        : <span className="small text-muted">No optional fields were enabled.</span>}
                                </div>
                            </div>
                        </>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setPreviewPrintEntry(null)}>Close</Button>
                </Modal.Footer>
            </Modal>

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
                    <Form.Select
                        size="sm"
                        className="w-auto"
                        value={taxPrintFormat}
                        onChange={(e) => handleTaxPrintFormatChange(e.target.value)}
                        aria-label="Invoice print format"
                        disabled={!canEditPrintLayout}
                    >
                        <option value={PRINT_FORMATS.ALL}>Show everything</option>
                        <option value={PRINT_FORMATS.COMPONENTS_ONLY}>Main components only</option>
                        <option value={PRINT_FORMATS.COMPONENTS_WITH_ITEMS}>Components + subcomponent names</option>
                        <option value={PRINT_FORMATS.TOTALS_ONLY}>Totals only</option>
                        <option value={PRINT_FORMATS.CUSTOM}>Custom</option>
                    </Form.Select>
                    <Dropdown autoClose="outside" align="end">
                        <Dropdown.Toggle size="sm" variant="outline-secondary" disabled={!canEditPrintLayout}>
                            Customize print
                        </Dropdown.Toggle>
                        <Dropdown.Menu className="p-3" style={{ minWidth: 290 }}>
                            {TAX_PRINT_OPTION_GROUPS.map((group, groupIndex) => (
                                <div key={group.title} className={groupIndex > 0 ? "border-top mt-2 pt-2" : ""}>
                                    <div className="fw-semibold small text-muted mb-1">{group.title}</div>
                                    {group.options.map(([key, label]) => (
                                        <Form.Check
                                            key={key}
                                            type="checkbox"
                                            id={`invoice-print-${key}`}
                                            className="small mb-1"
                                            label={label}
                                            checked={!!taxPrintOptions[key]}
                                            onChange={() => toggleTaxPrintOption(key)}
                                            disabled={!canEditPrintLayout}
                                        />
                                    ))}
                                </div>
                            ))}
                        </Dropdown.Menu>
                    </Dropdown>
                    {isAdmin && isFinalInvoiceType && (
                        <Button size="sm" variant="outline-success" onClick={handleApplyPrintLayout} disabled={savingPrintLayout}>
                            {savingPrintLayout ? "Saving Format..." : "Apply Format"}
                        </Button>
                    )}
                    {isAdmin && (
                        <Button size="sm" variant="outline-warning" onClick={handleRefreshInvoice} disabled={refreshingInvoice}>
                            {refreshingInvoice ? "Refreshing..." : "Refresh Invoice"}
                        </Button>
                    )}
                    <Button variant="primary" onClick={handlePrint} disabled={recordingPrint}>
                        {recordingPrint ? "Recording..." : "Print / Save PDF"}
                    </Button>
                </div>
            </div>

            {(isPrintLayoutLocked || currentPrintAuditEntries.length > 0) && (
                <div className="no-print mb-3 border rounded p-3 bg-light">
                    <div className="d-flex justify-content-between align-items-start gap-3 flex-wrap">
                        <div>
                            <div className="fw-semibold">{isPrintLayoutLocked ? "Print format locked" : "Print activity"}</div>
                            <div className="small text-muted">
                                {isPrintLayoutLocked
                                    ? `Version ${currentPrintLayout.version || 1} applied by ${currentPrintLayout.updatedBy || "system"} on ${formatDateTime(currentPrintLayout.updatedAt)}.`
                                    : "This document type can be reprinted with the selected format."}
                                {isPrintLayoutLocked && !isAdmin && " Only an admin or super admin can change this print format."}
                            </div>
                        </div>
                        <Badge bg="secondary">{selectedType.toUpperCase()}</Badge>
                    </div>
                    {currentPrintAuditEntries.length > 0 && (
                        <div className="mt-3">
                            <div className="fw-semibold small mb-2">Recent print activity</div>
                            <div className="table-responsive">
                                <table className="table table-sm mb-0 align-middle">
                                    <thead>
                                        <tr>
                                            <th>Action</th>
                                            <th>Version</th>
                                            <th>User</th>
                                            <th>Time</th>
                                            <th>Reason</th>
                                            <th className="text-end">Preview</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {currentPrintAuditEntries
                                            .slice(-5)
                                            .reverse()
                                            .map((entry, index) => (
                                                <tr key={`${entry.action}-${entry.performedAt}-${index}`}>
                                                    <td>{entry.action}</td>
                                                    <td>{entry.version || "-"}</td>
                                                    <td>{entry.performedBy || "system"}</td>
                                                    <td>{formatDateTime(entry.performedAt)}</td>
                                                    <td>{entry.reason || "-"}</td>
                                                    <td className="text-end">
                                                        <Button size="sm" variant="outline-secondary" onClick={() => setPreviewPrintEntry(entry)}>
                                                            View
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                    {isTaxInvoice && Array.isArray(invoice.taxInvoiceVersions) && invoice.taxInvoiceVersions.length > 0 && (
                        <div className="mt-3">
                            <div className="fw-semibold small mb-2">Tax invoice version history</div>
                            <div className="table-responsive">
                                <table className="table table-sm mb-0 align-middle">
                                    <thead>
                                        <tr>
                                            <th>Version</th>
                                            <th>Action</th>
                                            <th>User</th>
                                            <th>Time</th>
                                            <th className="text-end">Preview</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoice.taxInvoiceVersions
                                            .slice()
                                            .reverse()
                                            .map((entry, index) => (
                                                <tr key={`${entry.action}-${entry.performedAt}-${index}`}>
                                                    <td>{entry.version || "-"}</td>
                                                    <td>{entry.action}</td>
                                                    <td>{entry.performedBy || "system"}</td>
                                                    <td>{formatDateTime(entry.performedAt)}</td>
                                                    <td className="text-end">
                                                        <Button size="sm" variant="outline-secondary" onClick={() => setPreviewPrintEntry({ ...entry, documentType: DOC_TYPES.TAX })}>
                                                            View
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

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
                                <div className="tax-contact-line"><span>Tel</span><span>: {company.phone || "-"}</span></div>
                                <div className="tax-contact-line"><span>e-mail</span><span>: {company.email || "-"}</span></div>
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
                            <TaxPartyRow label="Supplier's TIN">{company.vatNo || "-"}</TaxPartyRow>
                            <TaxPartyRow label="Supplier's Name">{company.name}</TaxPartyRow>
                            <TaxPartyRow label="Address">{company.addressLines.join("\n")}</TaxPartyRow>
                            <TaxPartyRow label="Telephone No">{company.phone || "-"}</TaxPartyRow>
                        </div>
                        <div className="tax-box tax-party-box">
                            <TaxPartyRow label="Purchaser's TIN">{displayCustomer?.tin || displayCustomer?.taxId || displayCustomer?.vatNumber || "-"}</TaxPartyRow>
                            <TaxPartyRow label="Purchaser's Name">{displayCustomer?.comName || displayCustomer?.name || "N/A"}</TaxPartyRow>
                            <TaxPartyRow label="Address">{splitLines(displayCustomer?.comAddress || displayCustomer?.pAddr || displayCustomer?.address).join("\n") || "-"}</TaxPartyRow>
                            <TaxPartyRow label="Telephone No">{getCustomerPhone(displayCustomer) || "-"}</TaxPartyRow>
                        </div>
                    </div>

                    <div className="tax-meta-grid">
                        <div className="tax-box">
                            <span className="tax-label">Date of Delivery</span>
                            <span className="tax-value">{formatDate(deliveryDate)}</span>
                        </div>
                        <div className="tax-box">
                            <span className="tax-label">Place of Supply</span>
                            <span className="tax-value">{settings["app.company.placeOfSupply"] || settings["app.company.city"] || company.name}</span>
                        </div>
                        <div className="tax-box">
                            <span className="tax-label">Job Number</span>
                            <span className="tax-value">{jobRef !== "-" ? jobRef : inquiryRef}</span>
                        </div>
                        <div className="tax-box">
                            <span className="tax-label">PO Number</span>
                            <span className="tax-value">{invoice.poNumber || "-"}</span>
                        </div>
                    </div>

                    {taxPrintOptions.showNotes && (
                    <div className="tax-full-box">
                        <strong>Additional Information</strong>
                        <div>{invoice.notes || "-"}</div>
                    </div>
                    )}

                    <table className="tax-items">
                        <thead>
                            <tr>
                                {showTaxLineColumns.code && <th className="code">Item Code</th>}
                                <th className="desc">Description of Goods or Services</th>
                                {showTaxLineColumns.qty && <th className="qty">Quantity</th>}
                                {showTaxLineColumns.unit && <th className="uom">UoM</th>}
                                {showTaxLineColumns.unitPrice && <th className="unit">Unit Price</th>}
                                {showTaxLineColumns.amount && <th className="amount">Amount<br />Excluding VAT<br />(Rs.)</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {paddedTaxRows.map((item, index) => (
                                <tr
                                    key={item.key || `${item.description}-${index}`}
                                    className={item.isComponent ? "tax-component-row" : ""}
                                >
                                    {showTaxLineColumns.code && <td className="code">{item.description ? item.itemCode || "" : ""}</td>}
                                    <td className={item.isSubItem ? "tax-subitem" : ""}>{item.description}</td>
                                    {showTaxLineColumns.qty && (
                                        <td className="qty">{item.description && (!item.isSubItem || taxPrintOptions.showItemQuantities) ? formatQuantity(item.quantity) : ""}</td>
                                    )}
                                    {showTaxLineColumns.unit && (
                                        <td className="uom">{item.description && (!item.isSubItem || taxPrintOptions.showItemUnits) ? item.unit || "" : ""}</td>
                                    )}
                                    {showTaxLineColumns.unitPrice && (
                                        <td className="unit">
                                            {item.description && ((item.isComponent && taxPrintOptions.showComponentPrices) || (item.isSubItem && taxPrintOptions.showItemUnitPrices))
                                                ? money(item.unitPrice)
                                                : ""}
                                        </td>
                                    )}
                                    {showTaxLineColumns.amount && (
                                        <td className="amount">
                                            {item.description && ((item.isComponent && taxPrintOptions.showComponentPrices) || (item.isSubItem && taxPrintOptions.showItemTotals))
                                                ? money(item.total)
                                                : ""}
                                        </td>
                                    )}
                                </tr>
                            ))}
                            {taxPrintOptions.showSubtotal && (
                            <tr>
                                <td className="tax-summary-label" colSpan={taxSummaryColSpan}>Total Value of Supply</td>
                                <td className="amount">{money(printedSubtotal)}</td>
                            </tr>
                            )}
                            {taxPrintOptions.showVat && (
                            <tr>
                                <td className="tax-summary-label" colSpan={taxSummaryColSpan}>VAT Amount (Total Value of Supply @ {printedVatTotal > 0 ? `${vatPercent}%` : "0%"})</td>
                                <td className="amount">{money(printedVatTotal)}</td>
                            </tr>
                            )}
                            {taxPrintOptions.showOtherTax && printedOtherTaxTotal > 0 && (
                                <tr>
                                    <td className="tax-summary-label" colSpan={taxSummaryColSpan}>Other Tax Amount</td>
                                    <td className="amount">{money(printedOtherTaxTotal)}</td>
                                </tr>
                            )}
                            {taxPrintOptions.showTotalAmount && (
                            <tr>
                                <td className="tax-summary-label" colSpan={taxSummaryColSpan}><strong>Total Amount</strong></td>
                                <td className="amount">{money(printedDocumentTotal)}</td>
                            </tr>
                            )}
                            {taxPrintOptions.showPayments && totalReceived > 0 && (
                                <tr>
                                    <td className="tax-summary-label" colSpan={taxSummaryColSpan}>Payments Received</td>
                                    <td className="amount">{money(totalReceived)}</td>
                                </tr>
                            )}
                            {taxPrintOptions.showTotalDue && (
                            <tr>
                                <td className="tax-summary-label" colSpan={taxSummaryColSpan}><strong>Total Due</strong></td>
                                <td className="amount"><strong>{money(balanceDue)}</strong></td>
                            </tr>
                            )}
                        </tbody>
                    </table>

                    {(taxPrintOptions.showAmountWords || taxPrintOptions.showModeOfPayment || taxPrintOptions.showCustomerRef) && (
                    <div className="tax-bottom-lines">
                        {taxPrintOptions.showAmountWords && (
                        <div className="tax-bottom-line">
                            <span className="tax-bottom-label">Total Amount In word</span>
                            <span>{amountToWords(printedDocumentTotal)}</span>
                        </div>
                        )}
                        {taxPrintOptions.showModeOfPayment && (
                        <div className="tax-bottom-line">
                            <span className="tax-bottom-label">Mode of Payment</span>
                            <span>{taxModeOfPayment}</span>
                        </div>
                        )}
                        {taxPrintOptions.showCustomerRef && (
                        <div className="tax-bottom-line">
                            <span className="tax-bottom-label">Customer Ref No</span>
                            <span>{invoice.poNumber || "-"}</span>
                        </div>
                        )}
                    </div>
                    )}

                    {((taxPrintOptions.showTerms && taxTerms.length > 0) || (taxPrintOptions.showNotes && taxNotes.length > 0)) && (
                        <div className="tax-terms-notes">
                            {taxPrintOptions.showTerms && taxTerms.length > 0 && (
                                <>
                                    <div className="tax-terms-title">Terms and Conditions</div>
                                    <ol className="tax-terms-list">
                                        {taxTerms.map((term, index) => (
                                            <li key={`term-${index}`}>{term}</li>
                                        ))}
                                    </ol>
                                </>
                            )}
                            {taxPrintOptions.showNotes && taxNotes.length > 0 && (
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

                    {taxPrintOptions.showSignatures && (
                    <div className="tax-signatures">
                        <div>Prepared By</div>
                        <div>Checked By</div>
                        <div>Authorized By</div>
                    </div>
                    )}
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

                {showStandardLines && (
                <table className="invoice-items">
                    <thead>
                        <tr>
                            <th>DESCRIPTION</th>
                            {showStandardQty && <th className="qty">QTY</th>}
                            {showStandardRate && <th className="rate">RATE</th>}
                            {showStandardAmount && <th className="amount">AMOUNT</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {invoiceRows.map((item, index) => (
                            <tr key={item.key || `${item.description}-${index}`}>
                                <td>{item.description}</td>
                                {showStandardQty && <td className="qty">{formatQuantity(item.quantity)}</td>}
                                {showStandardRate && <td className="rate">{money(item.unitPrice)}</td>}
                                {showStandardAmount && <td className="amount">{money(item.total)}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}

                {(taxPrintOptions.showNotes || showStandardSummary) && (
                <div className="invoice-footer-grid">
                    {taxPrintOptions.showNotes && (
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
                    )}

                    {showStandardSummary && (
                    <div className="invoice-summary">
                        {(showTax || isProforma || totalReceived > 0) && (
                            <>
                                {taxPrintOptions.showSubtotal && (
                                <div className="invoice-summary-row">
                                    <span>SUBTOTAL</span>
                                    <span>{money(printedSubtotal)}</span>
                                </div>
                                )}
                                {showTax && (taxPrintOptions.showVat || taxPrintOptions.showOtherTax) && (
                                    <div className="invoice-summary-row">
                                        <span>TAX</span>
                                        <span>{money(printedTaxTotal)}</span>
                                    </div>
                                )}
                                {taxPrintOptions.showTotalAmount && (
                                <div className="invoice-summary-row">
                                    <span>TOTAL</span>
                                    <span>{money(printedDocumentTotal)}</span>
                                </div>
                                )}
                                {taxPrintOptions.showPayments && totalReceived > 0 && (
                                    <div className="invoice-summary-row">
                                        <span>PAYMENTS</span>
                                        <span>{money(totalReceived)}</span>
                                    </div>
                                )}
                            </>
                        )}
                        {taxPrintOptions.showTotalDue && (
                        <div className="invoice-due">
                            <div className="invoice-due-label">TOTAL DUE</div>
                            <div className="invoice-due-value">LKR {money(balanceDue)}</div>
                        </div>
                        )}
                    </div>
                    )}
                </div>
                )}

                {isProforma && taxPrintOptions.showSignatures && (
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
