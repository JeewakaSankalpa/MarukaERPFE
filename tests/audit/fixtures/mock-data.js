const pendingPurchasePlans = [{
    id: 'pending-plan-001', planNumber: 'PP-2026-00142', updatedAt: '2026-11-12T02:15:00Z',
    lines: [
        { lineKey: 'PROJECT:project-001:product-001', productId: 'product-001', productNameSnapshot: 'Industrial Servo Drive Controller 7.5kW', sku: 'DRV-SERVO-7500-LONG', shortageQtyDecimal: 1250.75, originType: 'PROJECT', projectId: 'project-001', jobNumber: 'MJN-2026-00481', inquiryNumber: 'MIN-2026-01992', itemRequestId: 'request-001', itemRequestNumber: 'IR-2026-00841', suppliers: [
            { supplierId: 'supplier-001', supplierName: 'Colombo Industrial Automation & Electrical Supplies (Pvt) Ltd', lastPurchasePrice: 987654.32, active: true },
            { supplierId: 'supplier-002', supplierName: 'Northern Controls and Engineering Solutions', lastPurchasePrice: 1025000, active: true },
        ] },
        { lineKey: 'STORES:product-002', productId: 'product-002', productNameSnapshot: 'Weatherproof Stainless Steel Distribution Enclosure IP66', sku: 'ENC-SS-IP66-1200X800', shortageQtyDecimal: 48, originType: 'STORES', itemRequestId: 'request-002', itemRequestNumber: 'IR-2026-00842', suppliers: [
            { supplierId: 'supplier-003', supplierName: 'Islandwide Panel Accessories and Fabrication Services', lastPurchasePrice: 185750.5, active: true },
        ] },
        { lineKey: 'PROJECT:project-002:product-003', productId: 'product-003', productNameSnapshot: 'Copper Busbar Set with Heat-Shrink Insulation and Supports', sku: 'BUS-CU-100X10-3P-N-E', shortageQtyDecimal: 99999.99, originType: 'PROJECT', projectId: 'project-002', jobNumber: 'MJN-2026-00499', inquiryNumber: 'MIN-2026-02001', itemRequestId: 'request-003', itemRequestNumber: 'IR-2026-00875', suppliers: [
            { supplierId: 'supplier-004', supplierName: 'Advanced Power Distribution Components International', lastPurchasePrice: 8750000.99, active: true },
        ] },
    ],
}, { id: 'pending-plan-002', planNumber: 'PP-2026-00141', updatedAt: '2026-11-11T08:30:00Z', lines: [] }];

const productsPage = {
    content: [
        { id: 'product-001', name: 'Industrial Servo Drive Controller 7.5kW', sku: 'DRV-SERVO-7500-LONG', unit: 'pcs' },
        { id: 'product-002', name: 'Weatherproof Stainless Steel Distribution Enclosure IP66', sku: 'ENC-SS-IP66-1200X800', unit: 'pcs' },
        { id: 'product-003', name: 'Copper Busbar Set with Heat-Shrink Insulation and Supports', sku: 'BUS-CU-100X10-3P-N-E', unit: 'sets' },
    ],
    totalPages: 1,
};

const departmentsPage = {
    content: [
        { id: 'department-001', name: 'Engineering and Project Delivery', description: 'Long operational department description used to verify table proportions and wrapping.', status: 'ACTIVE', createdAt: '2026-01-02', updatedAt: '2026-11-10' },
        { id: 'department-002', name: 'Procurement', description: 'Supplier sourcing and purchasing', status: 'INACTIVE', createdAt: '2026-02-01', updatedAt: '2026-11-11' },
    ],
    totalPages: 1,
};

const planningRows = [
    { productId: 'product-001', productName: 'Industrial Servo Drive Controller 7.5kW', needQty: 2500.75, availableQty: 1249.5 },
    { productId: 'product-002', productName: 'Weatherproof Stainless Steel Distribution Enclosure IP66', needQty: 48, availableQty: 0 },
    { productId: 'product-003', productName: 'Copper Busbar Set with Heat-Shrink Insulation and Supports', needQty: 100000, availableQty: 0.01 },
];

const projectsPage = { content: [{ id: 'project-001', projectName: 'Colombo Distribution Modernisation', status: 'ACTIVE', cargillsInquiry: false }], totalPages: 1 };

module.exports = { departmentsPage, pendingPurchasePlans, planningRows, productsPage, projectsPage };
