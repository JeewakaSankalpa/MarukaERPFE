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
            if (url.pathname === '/api/finance/expenses') return json(route, financeExpenses);
            if (url.pathname === '/api/reports/payables') return json(route, financePayables);
            if (url.pathname === '/api/finance/reports/summary') return json(route, financeDashboardSummary);
            if (url.pathname === '/api/finance/accounts') return json(route, financeAccounts);
            if (url.pathname === '/api/finance/journals') return json(route, financeJournals);
            if (url.pathname === '/api/finance/reports/income-statement') return json(route, financeIncomeStatement);
            if (url.pathname === '/api/finance/reports/balance-sheet') return json(route, financeBalanceSheet);
            if (url.pathname === '/api/finance/reports/trial-balance') return json(route, financeTrialBalance);
            if (url.pathname === '/api/invoices') return json(route, financeIncomeInvoices);
            if (url.pathname === '/api/project-accounts/petty-cash/requests') return json(route, pettyCashRequests);
            if (url.pathname === '/api/project-accounts/petty-cash/expenses/pending') return json(route, pettyCashExpenses);
            if (url.pathname === '/api/suppliers') return json(route, { content: migrationSuppliers });
            if (url.pathname === '/api/projects/search') return json(route, migrationProjects);
            if (url.pathname === '/api/finance/migration-payables/report') return json(route, migrationPayables);
            if (url.pathname === '/api/projects/receivables') return json(route, migrationReceivables);
            if (url.pathname === '/api/estimations/by-project/project-migration-new') return json(route, {});
            if (url.pathname === '/api/estimations/by-project/project-migration-existing') return json(route, {});
            if (url.pathname === '/api/projects/project-migration-existing/files') return json(route, migrationReceivableDocuments);
            if (url.pathname === '/api/finance/accounts/account-bank-parent/subaccounts') return json(route, financeAccounts.filter(account => account.parentAccountId === 'account-bank-parent'));
            if (url.pathname === '/api/finance/reports/accounts/account-bank-001/ledger') return json(route, financeAccountLedger);
            if (url.pathname === '/api/finance/accounts/payment-accounts') return json(route, financePaymentAccounts);
            if (url.pathname === '/api/assets') return json(route, financeAssets);
            if (url.pathname === '/api/finance/loans') return json(route, financeLoans);
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
const financeExpenses = [
    { id:'expense-001', title:'Colombo site generator service', description:'Preventive maintenance and oil replacement', category:'MAINTENANCE', amount:48650.75, expenseDate:'2026-11-12', status:'PAID', paymentMethod:'BANK_TRANSFER', paymentAccountType:'BANK' },
    { id:'expense-002', title:'November office electricity', description:'Head office utility invoice', category:'UTILITIES', amount:127840.5, expenseDate:'2026-11-08', status:'PENDING', paymentMethod:'CHEQUE', paymentAccountType:'BANK' },
    { id:'expense-003', title:'Supplier payment · GRN-2026-001', description:'Copper cable delivery settlement', category:'SUPPLIER_PAYMENT', amount:245000, expenseDate:'2026-11-14', status:'PAID', paymentMethod:'CARD', paymentAccountType:'CREDIT_CARD', projectId:'grn-001' },
    { id:'expense-004', title:'Workshop rental', description:'Monthly workshop premises rent', category:'RENT', amount:185000, expenseDate:'2026-10-02', status:'PAID', paymentMethod:'BANK_TRANSFER', paymentAccountType:'BANK' },
];
const financePayables = [
    { invoiceNumbers:['INV-CIS-2026-184','INV-CIS-2026-191'], documents:[{ fileName:'supplier-invoice-184.pdf', url:'https://example.test/invoice-184.pdf' }], source:'GRN', supplierName:'Colombo Industrial Supplies', dueDate:'2026-11-05', invoiceAmount:485000.75, paidAmount:125000, balance:360000.75 },
    { invoiceNumber:'INV-PML-2026-077', source:'Opening balance', supplierName:'Precision Motion Lanka', dueDate:'2026-09-01', invoiceAmount:284500, paidAmount:64500, balance:220000 },
    { grnNumber:'GRN-2026-00418', source:'GRN', supplierName:'Island Electrical & Engineering Supplies', dueDate:'2026-07-15', invoiceAmount:198740.5, paidAmount:48740.5, balance:150000 }
];
const financeDashboardSummary = {
    totalInflow: 2980740.75,
    incomeProjects: 2730740.75,
    incomeLoans: 250000,
    grandTotalOutflow: 1326941.25,
    netCashFlow: 1653799.5,
    totalOperationalExpenses: 362491.25,
    totalPayroll: 418500,
    totalSupplierPayments: 327450,
    totalAssetPayments: 128500,
    totalLoanRepayments: 90000,
};
const financeJournals = { content: [
    { id:'journal-001', date:'2026-11-15', reference:'PAY-2026-0921', description:'Supplier settlement for copper cable delivery', status:'POSTED', lines:[
        { accountId:'account-payable-001', accountName:'Trade accounts payable', description:'Clear supplier liability', debit:125000, credit:0 },
        { accountId:'account-bank-001', accountName:'Primary operating account', description:'Bank settlement', debit:0, credit:125000 }
    ] },
    { id:'journal-002', date:'2026-11-08', reference:'RCPT-2026-1842', description:'Customer receipt for Colombo distribution project', status:'POSTED', lines:[
        { accountId:'account-bank-001', accountName:'Primary operating account', description:'Customer funds received', debit:175000.5, credit:0, receiptUrl:'https://audit-files.invalid/receipt-1842.pdf' },
        { accountId:'account-revenue-001', accountName:'Project revenue', description:'Recognise project revenue', debit:0, credit:175000.5 }
    ] },
    { id:'journal-003', date:'2026-11-01', reference:'OPEN-2026-11', description:'Opening operating balance', status:'POSTED', lines:[
        { accountId:'account-bank-001', accountName:'Primary operating account', description:'Opening bank balance', debit:800000, credit:0 },
        { accountId:'account-equity-001', accountName:'Retained earnings', description:'Opening equity position', debit:0, credit:800000 }
    ] }
] };
const financeIncomeStatement = { startDate:'2026-11-01', endDate:'2026-11-17', revenue:[{accountId:'revenue-1',accountName:'Project revenue',code:'4100',balance:2467880.75},{accountId:'revenue-2',accountName:'Service revenue',code:'4200',balance:382500}], expenses:[{accountId:'expense-1',accountName:'Operating expenses',code:'5100',balance:578650.75},{accountId:'expense-2',accountName:'Finance costs',code:'5200',balance:89450}], totalRevenue:2850380.75,totalExpenses:668100.75,netIncome:2182280 };
const financeBalanceSheet = { asOfDate:'2026-11-17',assets:[{accountId:'asset-1',accountName:'Cash and bank',code:'1100',balance:1250800.75},{accountId:'asset-2',accountName:'Trade receivables',code:'1200',balance:756649.5}],liabilities:[{accountId:'liability-1',accountName:'Trade accounts payable',code:'2100',balance:327450.25}],equity:[{accountId:'equity-1',accountName:'Retained earnings',code:'3100',balance:1680000}],totalAssets:2007450.25,totalLiabilities:327450.25,totalEquity:1680000 };
const financeTrialBalance = { startDate:'2026-11-01',endDate:'2026-11-17',isBalanced:true,totalDebit:3188450.5,totalCredit:3188450.5,lines:[{accountId:'asset-1',code:'1100',accountName:'Cash and bank',accountType:'ASSET',totalDebit:1250800.75,totalCredit:0,closingBalance:1250800.75},{accountId:'liability-1',code:'2100',accountName:'Trade accounts payable',accountType:'LIABILITY',totalDebit:0,totalCredit:327450.25,closingBalance:-327450.25},{accountId:'revenue-1',code:'4100',accountName:'Project revenue',accountType:'REVENUE',totalDebit:0,totalCredit:2467880.75,closingBalance:-2467880.75}] };
const financeIncomeInvoices = [
    { id:'invoice-income-001', invoiceNumber:'INV-2026-1042', projectId:'project-001', issuedDate:'2026-11-04', dueDate:'2026-12-04', totalAmount:486750.5, paidAmount:175000, status:'PARTIALLY_PAID' },
    { id:'invoice-income-002', invoiceNumber:'INV-2026-0988', projectId:'project-migration-existing', issuedDate:'2026-10-16', dueDate:'2026-11-16', totalAmount:214800, paidAmount:214800, status:'PAID' },
    { id:'invoice-income-003', invoiceNumber:'INV-2026-1061', projectId:'project-southern-warehouse', issuedDate:'2026-11-12', dueDate:'2026-12-12', totalAmount:328450.75, paidAmount:0, status:'PENDING' },
    { id:'invoice-income-004', invoiceNumber:'INV-2026-0914', projectId:'project-cancelled', issuedDate:'2026-09-08', dueDate:'2026-10-08', totalAmount:98500, paidAmount:0, status:'CANCELLED' }
];
const pettyCashRequests = [
    { id:'petty-request-001', requestDate:'2026-11-15T08:30:00Z', projectName:'Colombo distribution modernisation', requestedBy:'Amara Perera', category:'SITE_OPERATIONS', description:'Emergency access equipment and local transport', amount:87500.75, status:'PENDING', receiptUrl:'' },
    { id:'petty-request-002', requestDate:'2026-11-14T06:15:00Z', projectName:'Kandy control system upgrade', requestedBy:'Nimal Fernando', category:'MATERIALS', description:'Urgent consumables for panel installation', amount:46250, status:'PENDING', receiptUrl:'https://audit-files.invalid/request-002.pdf' }
];
const pettyCashExpenses = [
    { id:'petty-expense-001', expenseDate:'2026-11-16', projectId:'MJN-2026-00481', title:'Site access equipment hire', description:'Daily hire charge with operator', amount:28450.5, status:'PENDING_APPROVAL', attachmentUrl:'' },
    { id:'petty-expense-002', expenseDate:'2026-11-15', projectId:'MJN-2025-00241', title:'Panel wiring consumables', description:'Ferrules, labels, and cable ties', amount:12780.25, status:'PENDING_APPROVAL', attachmentUrl:'https://audit-files.invalid/expense-002.pdf' }
];
const migrationSuppliers = [{ id:'supplier-001', name:'Colombo Industrial Supplies' },{ id:'supplier-002', name:'Precision Motion Lanka' }];
const migrationProjects = [
    { id:'project-migration-new', projectName:'Southern warehouse electrical upgrade', customerName:'Southern Logistics PLC', jobNumber:'MJN-2025-00314' },
    { id:'project-migration-existing', projectName:'Kandy distribution control system', customerName:'Central Distribution Services', jobNumber:'MJN-2025-00241' }
];
const migrationPayables = [
    { id:'migration-payable-001', invoiceNumbers:['CIS-INV-1842','CIS-INV-1851'], supplierName:'Colombo Industrial Supplies', targetType:'PROJECT', projects:[migrationProjects[1]], createdBy:'Nadeesha Perera', createdAt:'2026-10-30T08:15:00Z', payableDate:'2026-10-12', dueDate:'2026-11-12', amount:486750.5, paidAmount:175000, balance:311750.5, status:'PARTIALLY_PAID', documents:[{ fileName:'CIS-opening-invoices.pdf' }], transactions:[{ id:'migration-tx-001', amount:175000, paymentDate:'2026-11-05', addedBy:'Nadeesha Perera', reference:'BANK-1105', paymentMethod:'BANK_TRANSFER', documents:[] }] },
    { id:'migration-payable-002', invoiceNumbers:['PML-9237'], supplierName:'Precision Motion Lanka', targetType:'STOCK', projects:[], createdBy:'Kasun Silva', createdAt:'2026-10-29T06:30:00Z', payableDate:'2026-09-28', dueDate:'2026-10-28', amount:214800, paidAmount:0, balance:214800, status:'UNPAID', documents:[], transactions:[] }
];
const migrationReceivables = [{ projectId:'project-migration-existing', projectName:'Kandy distribution control system', customerName:'Central Distribution Services', totalProjectValue:875000, totalReceived:325000, balance:550000 }];
const migrationReceivableDocuments = [{ fileName:'CDS-opening-invoice.pdf', docType:'MIGRATION_RECEIVABLE', version:'CDS-2025-119', url:'' }];
const financePaymentAccounts = [{ id:'account-bank-001', name:'Primary operating account', paymentAccountType:'BANK', balance:850000, hasSubAccounts:false }];
const financeAccounts = [
    { id:'account-bank-parent', code:'1100', name:'Bank and cash accounts', type:'ASSET', currency:'LKR', balance:1250800.75, hasSubAccounts:true, isActive:true, lastTransactionDate:'2026-11-15T08:30:00Z' },
    { id:'account-bank-001', parentAccountId:'account-bank-parent', code:'1101', name:'Primary operating account', type:'ASSET', currency:'LKR', balance:850000.5, hasSubAccounts:false, isActive:true, lastTransactionDate:'2026-11-15T08:30:00Z' },
    { id:'account-cash-001', parentAccountId:'account-bank-parent', code:'1102', name:'Head office petty cash', type:'ASSET', currency:'LKR', balance:400800.25, hasSubAccounts:false, isActive:true, lastTransactionDate:'2026-11-14T12:15:00Z' },
    { id:'account-payable-001', code:'2100', name:'Trade accounts payable', type:'LIABILITY', currency:'LKR', balance:327450.25, hasSubAccounts:false, isActive:true, lastTransactionDate:'2026-11-13T09:05:00Z' },
    { id:'account-equity-001', code:'3100', name:'Retained earnings', type:'EQUITY', currency:'LKR', balance:580000, hasSubAccounts:false, isActive:true, lastTransactionDate:'2026-10-31T17:00:00Z' },
    { id:'account-revenue-001', code:'4100', name:'Project revenue', type:'REVENUE', currency:'LKR', balance:2467880.75, hasSubAccounts:false, isActive:true, lastTransactionDate:'2026-11-12T10:45:00Z' },
    { id:'account-expense-001', code:'5100', name:'Operating expenses', type:'EXPENSE', currency:'LKR', balance:578650.75, hasSubAccounts:false, isActive:false, lastTransactionDate:'2026-11-14T15:20:00Z' },
    { id:'account-project-001', code:'P-2041', name:'Colombo Distribution Modernisation — Phase 2', type:'ASSET', currency:'LKR', balance:-125000.5, hasSubAccounts:false, isActive:true, projectId:'project-001', lastTransactionDate:'2026-11-15T11:05:00Z' },
];
const financeAccountLedger = [
    { date:'2026-11-01', description:'Opening operating balance', reference:'OPEN-2026-11', debit:800000, credit:0, runningBalance:800000 },
    { date:'2026-11-08', description:'Customer receipt · Colombo distribution project', reference:'RCPT-2026-1842', debit:175000.5, credit:0, runningBalance:975000.5 },
    { date:'2026-11-15', description:'Supplier settlement · GRN-2026-001', reference:'PAY-2026-0921', debit:0, credit:125000, runningBalance:850000.5 },
];
const financeAssets = [
    { id:'asset-001', name:'CNC panel fabrication machine', category:'MACHINERY', serialNumber:'CNC-PFM-2026-001', purchaseDate:'2024-03-15', purchaseCost:6500000, depreciationRate:15, currentValue:4550000, location:'Main workshop', maintenanceHistory:[{ date:'2026-08-12', description:'Annual spindle service', cost:78500 }], attachments:[] },
    { id:'asset-002', name:'Service vehicle · Western region', category:'VEHICLE', serialNumber:'WP-CAB-4281', purchaseDate:'2025-06-02', purchaseCost:8750000, depreciationRate:20, currentValue:7000000, location:'Colombo operations', maintenanceHistory:[], attachments:[] },
    { id:'asset-003', name:'Engineering workstation', category:'PC', serialNumber:'WS-ENG-019', purchaseDate:'2026-01-10', purchaseCost:485000, depreciationRate:20, currentValue:388000, location:'Design office', maintenanceHistory:[], attachments:[] }
];
const financeLoans = [
    { id:'loan-001', loanDirection:'COMPANY_BORROWED', counterpartyName:'National Development Bank', bankName:'National Development Bank', loanReference:'NDB-TERM-2026-18', principalAmount:500000, interestRate:12.5, interestMethod:'REDUCING_BALANCE', durationMonths:24, startDate:'2026-11-01', status:'ACTIVE', totalRepaid:95000, totalInterestPaid:18500, outstandingBalance:405000, repaymentHistory:[{ amount:95000, paymentMethod:'CHEQUE', paymentAccountType:'BANK' }] },
    { id:'loan-002', loanDirection:'EMPLOYEE_LOAN', counterpartyName:'Amara Perera', loanReference:'EMP-2026-0042', principalAmount:180000, interestRate:0, interestMethod:'NO_INTEREST', durationMonths:12, startDate:'2026-10-15', status:'ACTIVE', totalRepaid:45000, totalInterestPaid:0, outstandingBalance:135000, repaymentHistory:[{ amount:45000, paymentMethod:'SALARY_DEDUCTION', paymentAccountType:'PAYROLL' }] }
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
