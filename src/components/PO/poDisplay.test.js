import { getDisplayPOItems } from "./poDisplay";

describe("getDisplayPOItems", () => {
    test("combines the same product while retaining source lines and component totals", () => {
        const rows = getDisplayPOItems([
            {
                poLineId: "line-a",
                productId: "pro-a",
                productNameSnapshot: "Pro A",
                orderedQty: 2,
                receivedQty: 1,
                unitPrice: 100,
                componentAllocations: [{ componentName: "Comp A", quantity: 2 }],
            },
            {
                poLineId: "line-b",
                productId: "pro-a",
                productNameSnapshot: "Pro A",
                orderedQty: 3,
                receivedQty: 2,
                unitPrice: 100,
                componentAllocations: [{ componentName: "Comp B", quantity: 3 }],
            },
            {
                poLineId: "line-c",
                productId: "pro-a",
                productNameSnapshot: "Pro A",
                orderedQty: 4,
                receivedQty: 0,
                unitPrice: 100,
                componentAllocations: [{ componentName: "Comp C", quantity: 4 }],
            },
            {
                poLineId: "line-b-pro-b",
                productId: "pro-b",
                productNameSnapshot: "Pro B",
                orderedQty: 7,
                receivedQty: 1,
                unitPrice: 50,
            },
        ]);

        expect(rows).toHaveLength(2);
        expect(rows[0].item.productNameSnapshot).toBe("Pro A");
        expect(rows[0].item.orderedQtyDecimal).toBe(9);
        expect(rows[0].item.receivedQtyDecimal).toBe(3);
        expect(rows[0].amount).toBe(900);
        expect(rows[0].items.map(item => item.poLineId)).toEqual(["line-a", "line-b", "line-c"]);
        expect(rows[0].item.componentAllocations).toEqual([
            { componentName: "Comp A", quantity: 2, quantityDecimal: 2 },
            { componentName: "Comp B", quantity: 3, quantityDecimal: 3 },
            { componentName: "Comp C", quantity: 4, quantityDecimal: 4 },
        ]);
    });

    test("does not show a misleading rate when grouped lines have different rates", () => {
        const [row] = getDisplayPOItems([
            { productId: "pro-a", orderedQty: 1, unitPrice: 100 },
            { productId: "pro-a", orderedQty: 2, unitPrice: 120 },
        ]);

        expect(row.item.unitPrice).toBeNull();
        expect(row.amount).toBe(340);
    });
});
