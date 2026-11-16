const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y inventory dashboard presents responsive stock controls', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/inventory/dashboard', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Inventory Overview' })).toBeVisible();
    await expect(page.getByText('1,658.75')).toBeVisible();
    await expect(page.getByText('Copper Cable 10mm')).toBeVisible();

    await page.getByRole('checkbox', { name: 'Select 10 Colour Cap Black' }).check();
    await expect(page.getByRole('button', { name: /Send to Pending Purchase \(1\)/ })).toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);

    if (testInfo.project.use.viewport.width <= 390) {
        const localOverflow = await page.locator('.inventory-dashboard-table-scroll').first().evaluate((element) => element.scrollWidth - element.clientWidth);
        expect(localOverflow).toBeGreaterThan(0);
    }

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
