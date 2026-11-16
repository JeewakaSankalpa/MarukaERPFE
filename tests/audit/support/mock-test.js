const fs = require('fs');
const path = require('path');
const { test: auditTest, expect } = require('./audit-test');
const { departmentsPage, pendingPurchasePlans, planningRows, productsPage, projectsPage } = require('../fixtures/mock-data');

const mockApiOrigin = new URL(process.env.MARUKA_AUDIT_API_URL || 'http://127.0.0.1:3999/api').origin;
const projectRoot = path.resolve(__dirname, '../../..');

const test = auditTest.extend({
    mockPage: async ({ auditPage: page }, use) => {
        await page.addInitScript(({ token, modules }) => {
            localStorage.setItem('token', token);
            localStorage.setItem('role', 'SUPER_ADMIN');
            localStorage.setItem('moduleAccess', JSON.stringify(modules));
            localStorage.setItem('projectRoles', '[]');
            ['username', 'userId', 'employeeId'].forEach((key) => localStorage.removeItem(key));
        }, {
            token: makeUnsignedTestToken({ sub: '', role: 'SUPER_ADMIN', userType: 'EMPLOYEE', exp: 4102444800 }),
            modules: ['admin', 'hr', 'inventory', 'procurement', 'partners', 'projects', 'finance', 'reports', 'reports.stock_control', 'settings', 'settings.super_admin', 'procurement.pending'],
        });

        await page.route(`${mockApiOrigin}/**`, async (route) => {
            const request = route.request();
            const url = new URL(request.url());
            // This endpoint is a query despite its legacy POST transport. Fulfil it
            // locally so the read-only guard never permits network egress or writes.
            if (request.method() === 'POST' && url.pathname === '/api/inventory/summary/batch') return json(route, inventoryProductSummaries);
            if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.fallback();
            if (url.pathname === '/api/stores/pending-purchase') return json(route, pendingPurchasePlans);
            if (url.pathname === '/api/stores/requests/aggregate') return json(route, planningRows);
            if (url.pathname === '/api/products') return json(route, productsPage);
            if (url.pathname === '/api/inventory/available-summary') return json(route, inventorySummary);
            if (url.pathname === '/api/inventory/adjustments/batches') return json(route, stockTakingBatches);
            if (url.pathname === '/api/inventory/returns/supplier') return json(route, supplierReturns[url.searchParams.get('status')] || []);
            if (url.pathname === '/api/user/search') return json(route, stockTakingApprovers);
            if (url.pathname === '/api/inventory/dashboard-stats') return json(route, inventoryDashboardStats);
            if (url.pathname === '/api/procurement/dashboard-stats') return json(route, procurementDashboardStats);
            if (url.pathname === '/api/transfers') return json(route, pendingTransfers);
            if (url.pathname === '/api/inventory/data-quality-issues') return json(route, inventoryDataQualityIssues);
            if (url.pathname === '/api/store/all') return json(route, [{ id: 'LOC_STORES_MAIN', name: 'Main Store' }]);
            if (url.pathname === '/api/inventory/products/product-copper/breakdown') return json(route, inventoryBreakdown);
            if (url.pathname === '/api/prs') return json(route, []);
            if (url.pathname === '/api/inventory/summary') return json(route, { productId: url.searchParams.get('productId'), totalQtyDecimal: 1250.75, serialTracked: false, serialCount: 0 });
            if (url.pathname === '/api/departments') return json(route, departmentsPage);
            if (url.pathname === '/api/departments/department-001') return json(route, departmentsPage.content[0]);
            if (url.pathname === '/api/projects') return json(route, projectsPage);
            if (url.pathname === '/api/projects/details/project-001') return json(route, projectDetail);
            if (url.pathname === '/api/projects/project-001/actions') return json(route, projectActions);
            if (url.pathname === '/api/projects/project-001/partner-communications/counts') return json(route, { unread: 0 });
            if (url.pathname === '/api/projects/project-001/files') return json(route, []);
            if (url.pathname === '/api/estimations/by-project/project-001') return json(route, projectEstimation);
            if (url.pathname === '/api/projects/project-001/comments') return json(route, []);
            if (url.pathname === '/api/projects/project-001/customer-communications/counts') return json(route, { unread: 0 });
            if (url.pathname === '/api/projects/project-001/supplier-communications/threads') return json(route, []);
            if (url.pathname === '/api/tasks/all') return json(route, projectTasks);
            if (url.pathname === '/api/tasks/worklogs/all') return json(route, taskWorkLogs);
            if (url.pathname === '/api/item-requests/my') return json(route, myItemRequests);
            if (url.pathname === '/api/pos') return json(route, purchaseOrdersPage);
            if (url.pathname === '/api/pos/po-001') return json(route, poDetail);
            if (url.pathname === '/api/grns') return json(route, grnsPage);
            if (url.pathname === '/api/grns/grn-001') return json(route, grnRateDetail);
            if (url.pathname === '/api/grns/grn-001/rate-corrections') return json(route, grnRateCandidates);
            if (url.pathname === '/api/grns/grn-001/rate-corrections/review') return json(route, grnRateImpact);
            if (url.pathname === '/api/workflow') return json(route, {});
            if (url.pathname === '/api/employee/all') return json(route, taskEmployees);
            if (url.pathname === '/api/addresses') return json(route, []);
            if (url.pathname === '/api/item-requests/fulfilment') {
                const itemSearch = (url.searchParams.get('itemSearch') || '').toLowerCase();
                const content = itemSearch
                    ? itemRequestsPage.content.filter((request) => request.items.some((item) => [item.productNameSnapshot, item.sku, item.productId].some((value) => String(value || '').toLowerCase().includes(itemSearch))))
                    : itemRequestsPage.content;
                return json(route, { ...itemRequestsPage, content, totalElements: content.length });
            }
            if (url.pathname === '/api/item-requests/ir-001') return json(route, itemRequestDetail);
            if (url.pathname === '/api/item-requests/ir-draft-001') return json(route, myItemRequests[0]);
            if (url.pathname === '/api/inventory/available-quantities') return json(route, []);
            if (url.pathname.startsWith('/api/inventory/available-quantities/')) return json(route, { availableQty: 40 });
            throw new Error(`Unhandled mock API request: ${request.method()} ${url.pathname}`);
        });

        const logo = fs.readFileSync(path.join(projectRoot, 'src/assets/logo.jpeg'));
        await page.route('https://ui-avatars.com/**', (route) => route.fulfill({ status: 200, contentType: 'image/jpeg', body: logo }));
        await use(page);
    },
});

function json(route, body) { return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) }); }
function makeUnsignedTestToken(payload) {
    const encode = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
    return `${encode({ alg: 'none', typ: 'JWT' })}.${encode(payload)}.`;
}

const purchaseOrdersPage = {
    content: [
        {
            id: 'po-001', poNumber: 'PO-2026-001', supplierNameSnapshot: 'Colombo Industrial Supplies',
            status: 'CREATED', approvalStatus: 'APPROVED', grandTotal: 245000, etaDate: '2026-11-20',
            items: [{ productNameSnapshot: 'Copper Cable 10mm', orderedQty: 25 }],
        },
        {
            id: 'po-002', poNumber: 'PO-2026-002', supplierNameSnapshot: 'Precision Motion Lanka',
            status: 'PARTIALLY_RECEIVED', approvalStatus: 'PENDING_APPROVAL', grandTotal: 98500,
            items: [{ productNameSnapshot: 'Servo Motor Assembly', orderedQty: 2 }],
        },
    ],
    totalPages: 1,
    totalElements: 2,
};
const poDetail = { ...purchaseOrdersPage.content[0], supplierId: 'supplier-001', subTotal: 245000, grandTotal: 245000, approvalStatus: 'APPROVED', items: [{ productId:'product-copper', productNameSnapshot:'Copper Cable 10mm — high-temperature insulated run', sku:'CBL-10', unit:'m', orderedQty:1250.75, receivedQty:0, unitPrice:185.5 }] };
const grnsPage = { content: [{ id:'grn-001', grnNumber:'GRN-2026-001', poNumber:'PO-2026-001', supplierNameSnapshot:'Colombo Industrial Supplies', createdAt:'2026-11-14T09:00:00Z', invoiceAmount:245000, vatAmount:0, deliveryCharge:0, totalPaid:0, paymentStatus:'UNPAID', status:'PENDING', dueDate:'2026-12-14' }], totalPages:1 };
const grnRateDetail = { ...grnsPage.content[0], items: [{ productId: 'product-copper', productNameSnapshot: 'Copper Cable 10mm', quantity: 1250.75, unitCost: 185.5 }], postReceiptDiscountAmount: 0, rateCorrections: [], discountCorrections: [] };
const grnRateCandidates = [{ batchId: 'batch-copper-001', productId: 'product-copper', productName: 'Copper Cable 10mm', batchNo: 'B-CP-001', quantity: 840.5, unitCost: 185.5, eligible: true }];
const grnRateImpact = { approvalToken: 'mock-approval-token', canApply: false, oldSubtotal: 155612.75, newSubtotal: 159816.25, oldInventoryValue: 155612.75, newInventoryValue: 159816.25, oldConsumptionValue: 0, newConsumptionValue: 0, oldGross: 245000, newGross: 249203.5, currentRate: 185.5, proposedRate: 190.5, currentGross: 245000, proposedGross: 249203.5, risks: [{ code: 'ACCOUNTING_RECONCILIATION', status: 'ACTION_REQUIRED', summary: 'Accounting review required', resolution: 'Finance must confirm the adjustment journal before applying.' }], impacts: [{ kind: 'STOCK_BATCH', id: 'batch-copper-001', batchId: 'batch-copper-001', status: 'TRACED', quantity: 840.5, currentRate: 185.5, proposedRate: 190.5, currentValue: 155612.75, proposedValue: 159816.25, note: 'Mock traced receipt batch.' }], issues: [], impact: { displayNames: {}, currentRate: 185.5, proposedRate: 190.5, currentGross: 245000, proposedGross: 249203.5, risks: [], impacts: [{ kind: 'STOCK_BATCH', id: 'batch-copper-001', batchId: 'batch-copper-001', status: 'TRACED', quantity: 840.5, currentRate: 185.5, proposedRate: 190.5, currentValue: 155612.75, proposedValue: 159816.25, note: 'Mock traced receipt batch.' }], issues: [] } };
const inventoryDashboardStats = {
    totalStockQty: 1658.75,
    totalUniqueItems: 342,
    lowStockCount: 2,
    globalUsageTrend: [
        { month: 'Jun', value: 120 }, { month: 'Jul', value: 148 }, { month: 'Aug', value: 116 },
        { month: 'Sep', value: 182 }, { month: 'Oct', value: 162 }, { month: 'Nov', value: 214 },
    ],
    topMovedItems: [
        { productName: 'Copper Cable 10mm — high-temperature insulated run', totalOut: 214 },
        { productName: '1.5MM Earth Cable', totalOut: 164 },
        { productName: '10 Colour Cap Black', totalOut: 96 },
    ],
    lowStockItems: [
        { productId: 'product-cap', productName: '10 Colour Cap Black', currentQty: 48, reorderLevel: 120 },
        { productId: 'product-motor', productName: 'Servo Motor Assembly — long description for resilient data cells', currentQty: 2, reorderLevel: 8 },
    ],
};
const procurementDashboardStats = {
    pendingRequestsCount: 18,
    itemsInShortageCount: 7,
    activePOsCount: 4,
    pendingGRNsCount: 3,
    totalPendingPOValue: 643500.75,
    criticalShortages: [
        { productId: 'product-copper', productName: 'Copper Cable 10mm — high-temperature insulated run', shortageQty: 1250, shortageQtyDecimal: 1250.75 },
        { productId: 'product-motor', productName: 'Servo Motor Assembly', shortageQty: 8, shortageQtyDecimal: 8 },
        { productId: 'product-cap', productName: '10 Colour Cap Black', shortageQty: 72, shortageQtyDecimal: 72.5 },
    ],
    pendingDeliveries: [
        { poNumber: 'PO-2026-001', supplierName: 'Colombo Industrial Supplies', expectedDate: '2026-11-20', status: 'SENT_TO_SUPPLIER' },
        { poNumber: 'PO-2026-002', supplierName: 'Precision Motion Lanka', expectedDate: '2026-11-22', status: 'CONFIRMED' },
        { poNumber: 'PO-2026-003', supplierName: 'Island Electrical & Engineering Supplies', expectedDate: '2026-11-24', status: 'PARTIALLY_RECEIVED' },
        { poNumber: 'PO-2026-004', supplierName: 'Colombo Industrial Supplies', expectedDate: '-', status: 'SENT_TO_SUPPLIER' },
    ],
};
const pendingTransfers = [
    {
        id: 'transfer-001', trNumber: 'TR-2026-11-0042', fromLocationId: 'LOC_STORES_MAIN', toLocationId: 'LOC_PROJECT_OR_DEPT',
        sourceItemRequestNumber: 'IR-2026-11-6749', status: 'PENDING_ACCEPTANCE',
        items: [
            { productId: 'product-copper', productNameSnapshot: 'Copper Cable 10mm — high-temperature insulated run', sku: 'CBL-10', unit: 'm', qty: 1250, qtyDecimal: 1250.75, reservations: [{ batchId: 'batch-copper-001', batchNumber: 'B-CP-001', reservedQty: 1250, reservedQtyDecimal: 1250.75, serials: [] }] },
            { productId: 'product-motor', productNameSnapshot: 'Servo Motor Assembly', sku: 'SRV-MTR', unit: 'pcs', qty: 2, qtyDecimal: 2, reservations: [{ batchId: 'batch-motor-008', batchNumber: 'B-SM-008', reservedQty: 2, reservedQtyDecimal: 2, serials: ['SM-008-01', 'SM-008-02'] }] },
        ],
    },
    {
        id: 'transfer-002', trNumber: 'TR-2026-11-0043', fromLocationId: 'LOC_SECONDARY_STORE_WITH_LONG_NAME', toLocationId: 'LOC_PROJECT_OR_DEPT',
        sourceItemRequestNumber: 'IR-2026-11-6751', status: 'PENDING_ACCEPTANCE',
        items: [{ productId: 'product-earth', productNameSnapshot: '1.5MM Earth Cable', sku: 'EARTH-15', unit: 'm', qty: 30, qtyDecimal: 30.5, reservations: [{ batchId: 'batch-earth-001', batchNumber: 'B-ER-001', reservedQty: 30, reservedQtyDecimal: 30.5, serials: [] }] }],
    },
];
const inventoryDataQualityIssues = [{ source: 'Stock Batch', recordId: 'B-CP-001', reference: 'GRN-2026-001', productName: 'Copper Cable 10mm', productId: 'product-copper', issue: 'Missing expiry reference', impact: 'Excluded from expiry reporting' }];
const stockTakingBatches = [
    { id: 'batch-copper-001', product: { id: 'product-copper', name: 'Copper Cable 10mm — high-temperature insulated run' }, batchNumber: 'B-CP-001', batchNo: 'B-CP-001', locationId: 'LOC_STORES_MAIN', expiryDate: '2028-11-01', quantity: 840.5 },
    { id: 'batch-earth-001', product: { id: 'product-earth', name: '1.5MM Earth Cable' }, batchNumber: 'B-ER-001', batchNo: 'B-ER-001', locationId: 'PROJECT-001', expiryDate: '2027-06-30', quantity: 360 },
];
const stockTakingApprovers = [{ id: 'employee-manager-001', firstName: 'Amara', lastName: 'Perera', accessLevel: 'MANAGER' }];
const supplierReturns = {
    PENDING: [{ id:'supplier-return-001', returnNumber:'SR-2026-0041', supplierNameSnapshot:'Colombo Industrial Supplies', productName:'Copper Cable 10mm — high-temperature insulated run', batchNumber:'B-CP-001', quantityDecimal:'1250.75', unitCost:185.5, reason:'Outer insulation did not match the approved technical specification.', status:'PENDING', createdAt:'2026-11-14T09:00:00Z', settlements:[] }],
    APPROVED: [{ id:'supplier-return-002', returnNumber:'SR-2026-0038', supplierNameSnapshot:'Precision Motion Lanka', productName:'Servo Motor Assembly', batchNumber:'B-SM-008', quantityDecimal:'2', unitCost:49250, reason:'Incorrect shaft specification supplied.', status:'APPROVED', settlementStatus:'PARTIAL', createdAt:'2026-11-10T09:00:00Z', settlements:[{ type:'CREDIT_NOTE', quantitySettledDecimal:'1', amountSettled:49250, referenceId:'CN-8842', notes:'Credit note received for one unit.', createdAt:'2026-11-13T09:00:00Z' }] }],
    REJECTED: [{ id:'supplier-return-003', returnNumber:'SR-2026-0034', supplierNameSnapshot:'Lanka Electrical Traders', productName:'1.5MM Earth Cable', batchNumber:'B-ER-001', quantityDecimal:'30', unitCost:122.5, reason:'Inspection confirmed the supplied cable was within specification.', status:'REJECTED', createdAt:'2026-11-06T09:00:00Z', settlements:[] }],
};
const inventoryProductSummaries = [
    { productId: 'product-001', totalQtyDecimal: 1250.75, serialTracked: false, serialCount: 0 },
    { productId: 'product-002', totalQtyDecimal: 360, serialTracked: false, serialCount: 0 },
    { productId: 'product-003', totalQtyDecimal: 48, serialTracked: false, serialCount: 0 },
];
const taskEmployees = [
    { id: 'employee-001', firstName: 'Amara', lastName: 'Perera', designation: 'Project Engineer' },
    { id: 'employee-002', firstName: 'Nimal', lastName: 'Fernando', designation: 'Stores Coordinator' },
];
const projectTasks = [
    { id: 'task-001', name: 'Confirm cable containment route', description: 'Verify installation path with site team.', projectId: 'project-001', assignedToIds: ['employee-001'], status: 'IN_PROGRESS', priority: 'HIGH', estimatedHours: 16, loggedHours: 8, startDate: '2026-11-10', dueDate: '2026-11-18', updatedAt: '2026-11-14T09:00:00Z' },
    { id: 'task-002', name: 'Reserve installation materials', description: 'Prepare materials for site allocation.', projectId: 'project-001', assignedToIds: ['employee-002'], status: 'TODO', priority: 'MEDIUM', estimatedHours: 8, loggedHours: 0, startDate: '2026-11-16', dueDate: '2026-11-20', updatedAt: '2026-11-13T09:00:00Z' },
    { id: 'task-003', name: 'Review site safety handover', description: 'Validate handover checklist.', projectId: 'project-001', assignedToIds: ['employee-001', 'employee-002'], status: 'REVIEW', priority: 'LOW', estimatedHours: 4, loggedHours: 4, startDate: '2026-11-08', dueDate: '2026-11-15', updatedAt: '2026-11-12T09:00:00Z' },
    { id: 'task-004', name: 'Publish project delivery notes', description: 'Complete final delivery notes.', projectId: 'project-001', assignedToIds: ['employee-001'], status: 'DONE', priority: 'MEDIUM', estimatedHours: 6, loggedHours: 6, startDate: '2026-11-05', dueDate: '2026-11-12', updatedAt: '2026-11-12T15:00:00Z' },
];
const taskWorkLogs = [{ id: 'worklog-001', taskId: 'task-001', logDate: '2026-11-14', durationHours: 8, note: 'Site route reviewed.' }];
const projectDetail = {
    id: 'project-001', projectName: 'Colombo Distribution Modernisation — Phase 2', customerName: 'Islandwide Distribution Services (Pvt) Ltd',
    salesRepName: 'Amara Perera', inquiryType: 'JOB', jobNumber: 'MJN-2026-00481', status: 'ACTIVE', currency: 'LKR',
    createdAt: '2026-10-01T08:00:00Z', updatedAt: '2026-11-14T09:00:00Z', currentStage: { id: 'stage-implementation', stageType: 'IMPLEMENTATION' },
    workflowSnapshot: { stages: [{ stageType: 'ESTIMATION' }, { stageType: 'IMPLEMENTATION' }, { stageType: 'DELIVERY' }] },
    versions: [{ revisionNumber: 2, snapshotDate: '2026-11-10T08:00:00Z', stageType: 'ESTIMATION', targetStage: 'IMPLEMENTATION', reasonForRevision: 'Customer requested a revised cable route.', approvalStatus: 'APPROVED', fileList: ['route-revision.pdf'] }],
};
const projectActions = { visibleComponents: ['DASHBOARD', 'OVERVIEW', 'STATUS', 'ESTIMATION', 'REVISIONS'], canApprove: false, canReject: false, canMove: [], missingFiles: [], filesOk: true };
const projectEstimation = {
    approvalStatus: 'APPROVED', computedGrandTotal: 114.11, computedDiscountAmount: 3.34, computedVatAmount: 17.41, computedTaxAmount: 0.73,
    includeVat: true, vatPercent: 18, includeTax: true, taxPercent: 0.75, discountPercent: 3.33,
    components: [{ name: 'Main distribution equipment', quantity: 1, subtotalWithMargin: 100.04, overheadPercent: 0, marginPercent: 0, deliveryCost: 0, freightCost: 0, items: [{ estUnitCost: 100, quantity: 1 }] }],
};

const inventorySummary = [
    { productId: 'product-copper', productName: 'Copper Cable 10mm — high-temperature insulated run', totalQuantity: 1250.75, mainStoreQuantity: 840.5, availableStores: [{ locationId: 'LOC_STORES_MAIN', quantity: 840.5 }, { locationId: 'PROJECT-001', quantity: 410.25 }] },
    { productId: 'product-earth', productName: '1.5MM Earth Cable', totalQuantity: 360, mainStoreQuantity: 125, availableStores: [{ locationId: 'LOC_STORES_MAIN', quantity: 125 }, { locationId: 'DEPARTMENT-001', quantity: 235 }] },
    { productId: 'product-cap', productName: '10 Colour Cap Black', totalQuantity: 48, mainStoreQuantity: 48, availableStores: [{ locationId: 'LOC_STORES_MAIN', quantity: 48 }] },
];

const inventoryBreakdown = {
    productId: 'product-copper', productName: 'Copper Cable 10mm — high-temperature insulated run',
    totals: { totalQuantity: 1250.75, mainStoreQuantity: 840.5, projectQuantity: 410.25, pendingAcceptanceQuantity: 0, departmentQuantity: 0, otherStoreQuantity: 0, openBatchCount: 2 },
    locations: [{ locationId: 'LOC_STORES_MAIN', ownerType: 'STORE', quantity: 840.5, batchCount: 2 }, { locationId: 'PROJECT-001', ownerType: 'PROJECT', ownerId: 'project-001', quantity: 410.25, batchCount: 1 }],
    batches: [{ id: 'batch-copper-001', batchNumber: 'B-CP-001', quantity: 840.5, originalQuantity: 900, reservedQuantity: 30, costPrice: 185.5, expiryDate: '2028-11-01', locationId: 'LOC_STORES_MAIN' }],
    ledgerMovements: [{ id: 'move-copper-001', at: '2026-11-14T09:00:00Z', type: 'ADJUSTMENT_IN', qtyIn: 900, qtyOut: 0, locationId: 'LOC_STORES_MAIN', refDocNo: 'GRN-2026-001', batchNumber: 'B-CP-001' }],
};

const itemRequestsPage = {
    content: [{
        id: 'ir-001', irNumber: 'IR-2026-001', status: 'SUBMITTED', departmentId: 'department-001',
        projectId: 'project-001', createdBy: 'Stores User', createdAt: '2026-11-12T08:00:00Z',
        items: [{ productId: 'product-copper', productNameSnapshot: 'Copper Cable 10mm', sku: 'CBL-10', requestedQty: 25, fulfilledQty: 0, returnedQty: 0 }],
    }],
    totalPages: 1,
    totalElements: 1,
};

const myItemRequests = [
    {
        id: 'ir-draft-001', irNumber: 'IR-2026-004', status: 'DRAFT', departmentId: 'department-001',
        createdAt: '2026-11-14T08:00:00Z', updatedAt: '2026-11-15T09:00:00Z',
        items: [{ productId: 'product-copper', productNameSnapshot: 'Copper Cable 10mm — high-temperature insulated run', requestedQty: 1250.75, unit: 'm' }],
    },
    {
        id: 'ir-my-002', irNumber: 'IR-2026-003', status: 'PENDING_PURCHASE', projectId: 'project-001',
        createdAt: '2026-11-12T08:00:00Z', updatedAt: '2026-11-14T08:00:00Z',
        items: [{ productId: 'product-earth', productNameSnapshot: '1.5MM Earth Cable', requestedQty: 30, unit: 'm' }, { productId: 'product-cap', productNameSnapshot: '10 Colour Cap Black', requestedQty: 48, unit: 'pcs' }],
    },
    {
        id: 'ir-my-003', irNumber: 'IR-2026-002', status: 'PARTIALLY_FULFILLED', departmentId: 'department-001',
        createdAt: '2026-11-10T08:00:00Z', updatedAt: '2026-11-13T08:00:00Z',
        items: [{ productId: 'product-motor', productNameSnapshot: 'Servo Motor Assembly', requestedQty: 2, unit: 'pcs' }],
    },
];

const itemRequestDetail = {
    ...itemRequestsPage.content[0],
    items: [
        { productId: 'product-copper', productNameSnapshot: 'Copper Cable 10mm', sku: 'CBL-10', requestedQty: 25, fulfilledQty: 0, returnedQty: 0, estimatedAmount: 230670, componentAllocations: [{ componentName: 'Component A', quantity: 10 }] },
        { productId: 'product-earth', productNameSnapshot: '1.5MM Earth Cable', sku: 'EARTH-15', requestedQty: 30, fulfilledQty: 0, returnedQty: 0, estimatedAmount: 368460, componentAllocations: [{ componentName: 'Component A', quantity: 30 }] },
        { productId: 'product-cap', productNameSnapshot: '10 Colour Cap Black', sku: 'CAP-BLK', requestedQty: 10, fulfilledQty: 0, returnedQty: 0, componentAllocations: [{ componentName: 'Component A', quantity: 10 }] },
    ],
};

module.exports = { expect, test };
