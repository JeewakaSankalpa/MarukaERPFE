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

const displayItemKey = (item = {}) => {
    const productId = clean(item.productId);
    if (productId) return `PRODUCT:${productId}`;
    const sku = clean(item.sku);
    if (sku) return `SKU:${sku}`;
    return `NAME:${clean(item.productNameSnapshot || item.productName).toLowerCase()}`;
};

const mergeAllocations = (items, field) => {
    const byComponent = new Map();
    (items || []).forEach(item => {
        (item?.[field] || []).forEach(allocation => {
            const name = clean(allocation?.componentName) || "Unassigned";
            const existing = byComponent.get(name) || { componentName: name, quantity: 0 };
            const quantity = allocationQty(allocation);
            existing.quantity += quantity;
            existing.quantityDecimal = existing.quantity;
            byComponent.set(name, existing);
        });
    });
    return [...byComponent.values()];
};

/**
 * Groups identical products for presentation only. The original lines are
 * retained on each group so GRN matching, audit history, and line traceability
 * never depend on the aggregated display row.
 */
export const getDisplayPOItems = (items = []) => {
    const groups = new Map();
    (items || []).filter(Boolean).forEach(item => {
        const key = displayItemKey(item);
        const existing = groups.get(key);
        if (existing) {
            existing.items.push(item);
            existing.orderedQty += orderedQty(item);
            existing.receivedQty += receivedQty(item);
            existing.amount += orderedQty(item) * quantityNumber(item.unitPrice);
            return;
        }

        groups.set(key, {
            key,
            item: { ...item },
            items: [item],
            orderedQty: orderedQty(item),
            receivedQty: receivedQty(item),
            amount: orderedQty(item) * quantityNumber(item.unitPrice),
            componentAllocations: mergeAllocations([item], "componentAllocations"),
        });
    });

    return [...groups.values()].map(group => {
        const itemsInGroup = group.items;
        const displayItem = {
            ...group.item,
            orderedQtyDecimal: group.orderedQty,
            orderedQty: Math.trunc(group.orderedQty),
            receivedQtyDecimal: group.receivedQty,
            receivedQty: Math.trunc(group.receivedQty),
            componentAllocations: mergeAllocations(itemsInGroup, "componentAllocations"),
            // A single rate is only shown when every source line has the same rate.
            unitPrice: itemsInGroup.every(source => quantityNumber(source.unitPrice) === quantityNumber(itemsInGroup[0].unitPrice))
                ? itemsInGroup[0].unitPrice
                : null,
        };
        return { ...group, item: displayItem };
    });
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
