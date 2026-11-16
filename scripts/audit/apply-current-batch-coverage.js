const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '../..');
const file = path.join(root, 'docs/audit/route-coverage.json');
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
const now = new Date().toISOString();
const verified = new Map([
    ['ROUTE-inventory-search-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-inventory-view-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-inventory-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-inventory-dashboard-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-inventory-pr-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-inventory-pr-populated-product-list', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-inventory-pr-filtered-products', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-projects-tasks-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-projects-tasks-overview-tab', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-projects-tasks-list-tab', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-projects-tasks-board-tab', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-projects-tasks-gantt-tab', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-projects-tasks-workforce-tab', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-projects-tasks-calendar-tab', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-projects-tasks-reports-tab', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-projects-tasks-task-edit-drawer', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-pos-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-pos-id-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-grns-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/results.json']],
    ['ROUTE-item-my-requests-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/evidence/after-my-requests-chromium-desktop-1440.png']],
    ['ROUTE-stores-fulfil-requests-initial-route-state', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/evidence/after-fulfil-requests-chromium-desktop-1440.png']],
    ['ROUTE-stores-planning-populated-shortages', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/evidence/independent-review-stores-planning-chromium-desktop-1440.png']],
    ['ROUTE-inventory-pr-empty-product-list', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/evidence/after-purchase-request-chromium-desktop-1440.png']],
    ['ROUTE-item-requests-blank-manual-request', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/evidence/after-item-request-chromium-desktop-1440.png']],
    ['ROUTE-item-requests-product-search-results', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/evidence/after-item-request-chromium-desktop-1440.png']],
    ['ROUTE-departments-populated-first-page', ['Chromium', '1440x900, 1024x768, 390x844', 'output/playwright/evidence/after-departments-chromium-desktop-1440.png']],
    ['ROUTE-stores-pending-to-po-empty-pending-purchases', ['Chromium', '1440x900', 'output/playwright/results.json']],
    ['ROUTE-stores-pending-to-po-loading-pending-purchases', ['Chromium', '1440x900', 'output/playwright/results.json']],
    ['ROUTE-stores-pending-to-po-saved-drafts-table', ['Chromium', '1440x900', 'output/playwright/results.json']],
    ['ROUTE-stores-pending-to-po-supplier-and-quotation-interaction', ['Chromium', '1440x900', 'output/playwright/results.json']],
    ['ROUTE-stores-pending-to-po-300-row-performance-baseline', ['Chromium', '1440x900', 'output/playwright/results.json']],
]);

for (const row of manifest.rows) {
    const evidence = verified.get(row.id);
    if (evidence) {
        row.coverage = { status: 'MOCK-VERIFIED', browser: evidence[0], viewport: evidence[1], zoom: null, evidence: [evidence[2]], blocker: null, verifiedAt: now };
    }
    if (row.id === 'ROUTE-stores-pending-to-po-api-error-state') {
        row.coverage = { status: 'FAILED', browser: 'Chromium', viewport: '1440x900', zoom: null, evidence: ['output/playwright/results.json'], blocker: null, verifiedAt: now };
    }
}

fs.writeFileSync(file, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
