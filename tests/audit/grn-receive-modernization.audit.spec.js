const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Receive GRN supports responsive receipt entry', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/grn', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Receive goods received note' })).toBeVisible();

    const poSearch = page.getByRole('textbox', { name: 'Purchase order or job number' });
    await poSearch.fill('PO-2026-001');
    await poSearch.press('Enter');
    await expect(page.getByText('PO-2026-001', { exact: false }).first()).toBeVisible();
    await expect(page.locator('.grn-receive-table')).toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);

    const tableScroller = page.locator('.grn-receive-table-scroll');
    if (testInfo.project.use.viewport.width <= 390) {
        expect(await tableScroller.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
    }

    await page.getByRole('button', { name: '+ Batch' }).click();
    await expect(page.getByPlaceholder('Batch No')).toBeVisible();
    await expect(page.getByLabel(/Remove batch 1/)).toBeVisible();

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
