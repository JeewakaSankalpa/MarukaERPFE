import { createLatestRequestGate, matchedItemLinesForSearch } from "./irFulfilmentViewModel";

describe("IR fulfilment list request coordination", () => {
    test("only the newest request may update the list", () => {
        const gate = createLatestRequestGate();
        const submittedRequest = gate.begin();
        const pendingPurchaseRequest = gate.begin();

        expect(gate.isCurrent(submittedRequest)).toBe(false);
        expect(gate.isCurrent(pendingPurchaseRequest)).toBe(true);
    });
});

describe("IR item search rendering", () => {
    const items = [
        { productId: "product-u041", sku: "U041", productNameSnapshot: "ELR, DELAB" },
        { productId: "product-i008", sku: "I008", productNameSnapshot: "INDICATOR RED" }
    ];

    test("shows only the directly matching line", () => {
        expect(matchedItemLinesForSearch(items, "U041")).toEqual([items[0]]);
    });

    test("does not fall back to unrelated lines", () => {
        expect(matchedItemLinesForSearch(items, "does-not-exist")).toEqual([]);
    });
});
