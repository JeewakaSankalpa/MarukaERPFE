const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { test, expect } = require('./support/mock-test');
const { pendingPurchasePlans } = require('./fixtures/mock-data');
const { measureLayout } = require('./support/layout');

const pendingUrl = 'http://127.0.0.1:3999/api/stores/pending-purchase**';

test('@mock @state pending purchases empty response is distinct and usable', async ({ mockPage: page }) => {
    await mockPending(page, []);
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Pending Purchases' })).toBeVisible();
    await expect(page.getByText('No pending purchases found')).toBeVisible();
});

test('@mock @state pending purchases exposes loading before data resolves', async ({ mockPage: page }) => {
    await mockPending(page, pendingPurchasePlans, { delay: 2000 });
    const navigation = page.goto('/#/stores/pending-to-po');
    await expect(page.getByText('Loading…', { exact: true })).toBeVisible();
    await navigation;
    await expect(page.getByRole('heading', { name: 'Pending Purchases → Create POs' })).toBeVisible();
});

test('@mock @state pending purchases API failure is recorded separately from empty data', async ({ mockPage: page }) => {
    test.fail(true, 'Known UX defect: API failure collapses into the empty state and produces failed-request diagnostics');
    await page.route(pendingUrl, route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'Simulated outage' }) }));
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'networkidle' });
    await expect(page.getByText('Failed to load pending purchases').first()).toBeVisible();
    await expect(page.getByText('No pending purchases found')).toBeVisible();
});

test('@mock @interaction supplier choice enables quotation input without mutation', async ({ mockPage: page }) => {
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'networkidle' });
    const supplier = page.getByLabel('Supplier for Industrial Servo Drive Controller 7.5kW');
    await supplier.focus();
    await supplier.press('ArrowDown');
    await supplier.press('ArrowDown');
    await supplier.press('Enter');
    await expect(page.getByLabel('Quotation number for Industrial Servo Drive Controller 7.5kW')).toBeEnabled();
    await page.getByLabel('Quotation number for Industrial Servo Drive Controller 7.5kW').fill('QT-MOCK-0001');
});

test('@mock @state pending purchases renders a seeded local draft without network mutation', async ({ mockPage: page }) => {
    await page.addInitScript(() => localStorage.setItem('maruka.pendingPoDrafts', JSON.stringify([{
        id: 'draft-001', draftNumber: 'PPD-2026-0001', pendingPurchaseId: 'pending-plan-001', title: 'Mock allocation',
        createdAt: '2026-11-10T00:00:00Z', updatedAt: '2026-11-11T00:00:00Z', allocation: {
            'supplier-001': [{ lineKey: 'PROJECT:project-001:product-001', productId: 'product-001', qtyDecimal: 100, quotationRef: 'QT-1' }],
        },
    }])));
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'networkidle' });
    await expect(page.getByText('Created Drafts')).toBeVisible();
    await expect(page.getByText('PPD-2026-0001')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.getByText('Draft loaded')).toBeVisible();
});

test('@mock @performance pending purchases records a 300-row rendering baseline', async ({ mockPage: page }, testInfo) => {
    const base = pendingPurchasePlans[0].lines[0];
    const lines = Array.from({ length: 300 }, (_, index) => ({
        ...base,
        lineKey: `PROJECT:project-${index}:product-${index}`,
        productId: `product-${index}`,
        productNameSnapshot: `Long operational product ${String(index).padStart(3, '0')} with descriptive specification`,
        sku: `SKU-LARGE-${String(index).padStart(4, '0')}`,
        jobNumber: `MJN-2026-${String(index).padStart(5, '0')}`,
        itemRequestNumber: `IR-2026-${String(index).padStart(5, '0')}`,
        shortageQtyDecimal: index + 0.75,
    }));
    await mockPending(page, [{ ...pendingPurchasePlans[0], id: 'large-plan', lines }]);
    const started = performance.now();
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'networkidle' });
    await expect(page.locator('.pending-to-po-lines-table tbody tr')).toHaveCount(300);
    const renderedMs = Math.round(performance.now() - started);
    const renderedDomElements = await page.locator('*').count();
    const filterStarted = performance.now();
    await page.getByLabel('Filter by Product Name').fill('product 299');
    await expect(page.locator('.pending-to-po-lines-table tbody tr')).toHaveCount(1);
    const filterMs = Math.round(performance.now() - filterStarted);
    const geometry = await measureLayout(page);
    const performanceEvidence = { renderedMs, filterMs, renderedDomElements, filteredDomElements: await page.locator('*').count(), geometry };
    const evidenceFile = path.resolve(__dirname, '../../output/playwright/evidence/pending-300-row-performance.json');
    fs.mkdirSync(path.dirname(evidenceFile), { recursive: true });
    fs.writeFileSync(evidenceFile, `${JSON.stringify(performanceEvidence, null, 2)}\n`, 'utf8');
    await testInfo.attach('pending-300-row-performance', {
        body: JSON.stringify(performanceEvidence, null, 2),
        contentType: 'application/json',
    });
    expect(geometry.document.overflow).toBeLessThanOrEqual(1);
    expect(filterMs).toBeLessThan(2000);
});

async function mockPending(page, body, options = {}) {
    await page.route(pendingUrl, async route => {
        if (options.delay) await new Promise(resolve => setTimeout(resolve, options.delay));
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    });
}
