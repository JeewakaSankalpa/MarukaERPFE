const clean = (value) => String(value || "").trim();

const hasText = (value) => clean(value).length > 0;

export const quantityNumber = (value) => Number(value ?? 0) || 0;

export const orderedQty = (item = {}) => quantityNumber(item.orderedQtyDecimal ?? item.orderedQty);

export const receivedQty = (item = {}) => quantityNumber(item.receivedQtyDecimal ?? item.receivedQty);

export const allocationQty = (allocation = {}) => quantityNumber(allocation.quantityDecimal ?? allocation.quantity);

export const formatQty = (value) => {
    const number = quantityNumber(value);
    if (Number.isInteger(number)) return String(number);
    return number.toFixed(2).replace(/\.?0+$/, "");
};

const sourceKey = (source) => [
    clean(source.jobNumber),
    clean(source.inquiryNumber),
    clean(source.projectId),
].join("|");

export const getPurchaseForSources = (po = {}) => {
    const sources = [];
    const addSource = (source = {}) => {
        const normalized = {
            projectId: clean(source.projectId),
            inquiryNumber: clean(source.inquiryNumber),
            jobNumber: clean(source.jobNumber),
        };

        if (!hasText(normalized.projectId) && !hasText(normalized.inquiryNumber) && !hasText(normalized.jobNumber)) {
            return;
        }

        if (!sources.some(existing => sourceKey(existing) === sourceKey(normalized))) {
            sources.push(normalized);
        }
    };

    (po.items || []).forEach(addSource);

    if (sources.length === 0) {
        addSource({
            projectId: po.projectId || po.projectRef,
            inquiryNumber: po.inquiryNumber || po.projectInquiryNumber,
            jobNumber: po.jobNumber || po.projectJobNumber,
        });
    }

    return sources;
};

export const formatSourceRef = (source = {}) => {
    const inquiryRef = clean(source.inquiryNumber || source.projectId);
    const jobRef = clean(source.jobNumber);

    if (jobRef && inquiryRef) return `MIN: ${inquiryRef} / MJN: ${jobRef}`;
    if (jobRef) return `MJN: ${jobRef}`;
    if (inquiryRef) return `MIN: ${inquiryRef}`;
    return "";
};

export const formatPurchaseForText = (po = {}) => {
    const sources = getPurchaseForSources(po);
    if (sources.length === 0) return "Main Store";

    const jobRefs = sources.map(source => clean(source.jobNumber)).filter(Boolean);
    if (jobRefs.length > 0 && jobRefs.length === sources.length) {
        return `MJN: ${jobRefs.join(", ")}`;
    }

    return sources.map(formatSourceRef).filter(Boolean).join(", ") || "Main Store";
};

export const getGrnProgress = (po = {}) => {
    if (po.status === "FULLY_RECEIVED") {
        return { value: "FULLY_RECEIVED", label: "Full GRN", variant: "success" };
    }
    if (po.status === "PARTIALLY_RECEIVED") {
        return { value: "PARTIALLY_RECEIVED", label: "Partial GRN", variant: "info" };
    }

    const items = po.items || [];
    const totalReceivedQty = items.reduce((sum, item) => sum + receivedQty(item), 0);
    const totalOrderedQty = items.reduce((sum, item) => sum + orderedQty(item), 0);

    if (totalOrderedQty > 0 && totalReceivedQty >= totalOrderedQty) {
        return { value: "FULLY_RECEIVED", label: "Full GRN", variant: "success" };
    }
    if (totalReceivedQty > 0) {
        return { value: "PARTIALLY_RECEIVED", label: "Partial GRN", variant: "info" };
    }

    return { value: "NOT_RECEIVED", label: "No GRN", variant: "secondary" };
};
