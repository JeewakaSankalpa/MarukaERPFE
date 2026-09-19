export const quantityNumber = value => Number(value ?? 0) || 0;

export const quantityCents = value => {
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0 || !Number.isInteger(Math.round(number * 100))
        || Math.abs(number * 100 - Math.round(number * 100)) > 1e-8) {
        throw new Error("Quantity must be nonnegative with at most two decimal places");
    }
    return Math.round(number * 100);
};

export const quantityValue = cents => (cents / 100).toFixed(2);
export const roundQuantity = value => Math.round(value * 100) / 100;

export const withDecimalQtyFields = row => {
    const normalized = { ...row };
    Object.entries(row || {}).forEach(([key, value]) => {
        if (key.endsWith("QtyDecimal") && value != null) {
            normalized[key.slice(0, -7)] = quantityNumber(value);
        }
    });
    return normalized;
};

export const normalizeItemRequest = request => request && ({
    ...request,
    items: (request.items || []).map(item => ({
        ...item,
        requestedQty: quantityNumber(item.requestedQtyDecimal ?? item.requestedQty),
        fulfilledQty: quantityNumber(item.fulfilledQtyDecimal ?? item.fulfilledQty),
        returnedQty: quantityNumber(item.returnedQtyDecimal ?? item.returnedQty),
        componentAllocations: (item.componentAllocations || []).map(allocation => ({
            ...allocation,
            quantity: quantityNumber(allocation.quantityDecimal ?? allocation.quantity)
        }))
    }))
});
