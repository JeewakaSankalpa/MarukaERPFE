export const createLatestRequestGate = () => {
    let latestRequestId = 0;

    return {
        begin: () => ++latestRequestId,
        isCurrent: (requestId) => requestId === latestRequestId,
        invalidate: (requestId) => {
            if (requestId === latestRequestId) latestRequestId += 1;
        }
    };
};

export const matchedItemLinesForSearch = (items, searchText) => {
    const search = String(searchText || "").trim().toLowerCase();
    if (!search) return [];

    return (Array.isArray(items) ? items : []).filter((item) => [
        item?.productNameSnapshot,
        item?.sku,
        item?.productId,
        item?.unit
    ].filter(Boolean).some((value) => String(value).toLowerCase().includes(search)));
};
