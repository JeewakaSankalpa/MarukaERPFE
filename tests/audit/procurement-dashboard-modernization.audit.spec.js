const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y procurement dashboard presents responsive, filterable operational data', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/procurement/dashboard', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Procurement Dashboard' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Active POs: 4/ })).toBeVisible();
    await expect(page.getByRole('img', { name: /Sent to supplier 2/ })).toBeVisible();
    await expect(page.getByText('Copper Cable 10mm — high-temperature insulated run')).toBeVisible();
    await expect(page.getByText('1,250.75')).toBeVisible();

    const search = page.getByLabel('Search procurement activity');
    await search.fill('Precision Motion');
    await expect(page.getByText('PO-2026-002')).toBeVisible();
    await expect(page.getByText('PO-2026-001')).toBeHidden();
    await search.clear();

    await page.getByLabel('Filter expected deliveries by status').selectOption('PARTIALLY_RECEIVED');
    await expect(page.getByText('PO-2026-003')).toBeVisible();
    await expect(page.getByText('PO-2026-002')).toBeHidden();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);

    if (testInfo.project.use.viewport.width <= 390) {
        const scrollRegions = page.locator('.procurement-table-scroll');
        const overflow = await scrollRegions.evaluateAll((elements) => elements.map((element) => element.scrollWidth - element.clientWidth));
        expect(overflow.some((amount) => amount > 0)).toBe(true);
    }

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
