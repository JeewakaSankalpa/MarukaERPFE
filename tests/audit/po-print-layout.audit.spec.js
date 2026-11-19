const fs = require('fs');
const { test, expect } = require('./support/mock-test');

const longDescription = 'Industrial sewage pump panel status monitoring system with remote telemetry, weatherproof enclosure, automatic changeover, alarms, installation accessories, testing, commissioning, operator training, and complete technical documentation';

const items = Array.from({ length: 28 }, (_, index) => ({
    productId: `product-${index + 1}`,
    productNameSnapshot: `${longDescription} - line ${index + 1}`,
    orderedQty: index + 1,
    unitPrice: 12345.67 + index,
    componentAllocations: [
        { componentName: `Control component ${index + 1} with an intentionally long specification`, quantity: index + 0.5 },
    ],
    itemRequestNumber: `IR-2026-11-${String(index + 1).padStart(4, '0')}`,
    inquiryNumber: `MIN-26-${String(index + 1).padStart(5, '0')}`,
    jobNumber: `MJN-26-${String(index + 1).padStart(5, '0')}`,
}));

const purchaseOrder = {
    id: 'po-print-layout',
    poNumber: 'MT/PO-26-11-TEST',
    supplierNameSnapshot: 'Isolated Test Supplier',
    approvalStatus: 'APPROVED',
    quotationRef: 'QY-2026-TEST-LONG',
    createdAt: '2026-11-19T09:00:00Z',
    subTotal: 9999999.99,
    vatAmount: 1799999.99,
    grandTotal: 11799999.98,
    items,
    approvals: [{ status: 'APPROVED', timestamp: '2026-11-19T10:00:00Z' }],
};

test('@mock @layout purchase order preview and print keep all item content visible', async ({ mockPage: page }, testInfo) => {
    await page.route('**/api/pos/po-print-layout', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(purchaseOrder),
    }));

    await page.goto('/#/pos/po-print-layout/print', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Purchase Order' })).toBeVisible();
    await expect(page.locator('.po-print-items tbody tr')).toHaveCount(items.length);

    const screenLayout = await page.locator('.po-print-page .table-responsive').evaluate(element => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflowX: getComputedStyle(element).overflowX,
        tableWidth: element.querySelector('table').getBoundingClientRect().width,
        tableCssWidth: getComputedStyle(element.querySelector('table')).width,
        tableLayout: getComputedStyle(element.querySelector('table')).tableLayout,
    }));
    if (testInfo.project.use.viewport.width <= 390) {
        expect(screenLayout.overflowX).toBe('auto');
        expect(screenLayout.scrollWidth).toBeGreaterThan(screenLayout.clientWidth);
    } else {
        expect(screenLayout.scrollWidth).toBeLessThanOrEqual(screenLayout.clientWidth + 1);
    }

    await page.emulateMedia({ media: 'print' });
    const printLayout = await page.locator('.po-print-page .table-responsive').evaluate(element => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        overflowX: getComputedStyle(element).overflowX,
        tableWidth: element.querySelector('table').getBoundingClientRect().width,
    }));
    expect(printLayout.overflowX).toBe('visible');
    expect(printLayout.scrollWidth).toBeLessThanOrEqual(printLayout.clientWidth + 1);
    expect(printLayout.tableWidth).toBeLessThanOrEqual(printLayout.clientWidth + 1);

    const pdf = await page.pdf({ format: 'A4', printBackground: true });
    expect(pdf.length).toBeGreaterThan(50_000);
    expect((pdf.toString('latin1').match(/\/Type\s*\/Page\b/g) || []).length).toBeGreaterThan(1);
    fs.writeFileSync(testInfo.outputPath('purchase-order-print.pdf'), pdf);
    expect(await page.locator('.po-print-items tbody tr').count()).toBe(items.length);
    await expect(page.getByText(`${longDescription} - line 28`, { exact: true })).toHaveCount(1);
    await expect(page.getByText('LKR 11,799,999.98', { exact: true })).toHaveCount(1);
});
