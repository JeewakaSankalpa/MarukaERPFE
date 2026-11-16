const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y purchase order details use a contained operational workspace', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/pos/po-001', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Purchase Order: PO-2026-001/i })).toBeVisible();
    await expect(page.getByText('Copper Cable 10mm — high-temperature insulated run')).toBeVisible();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    const table = page.locator('.purchase-order-details-table');
    if (testInfo.project.use.viewport.width <= 390) {
        const overflow = await table.evaluate((element) => { const scroller = element.closest('.purchase-order-details-table-scroll'); return scroller ? scroller.scrollWidth - scroller.clientWidth : 0; });
        expect(overflow).toBeGreaterThan(0);
        await expect(page.locator('.purchase-order-details-table-scroll')).toHaveAttribute('tabindex', '0');
    }
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
