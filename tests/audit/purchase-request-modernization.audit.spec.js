const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y purchase request workspace supports product search and quantity entry', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/inventory/pr', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Create Purchase Request' })).toBeVisible();
    await expect(page.getByText('Industrial Servo Drive Controller 7.5kW')).toBeVisible();
    await expect(page.getByText('1,250.75')).toBeVisible();

    const search = page.getByRole('textbox', { name: 'Search item names or SKU' });
    await search.fill('Servo');
    await search.press('Enter');
    await expect(page.getByText('Industrial Servo Drive Controller 7.5kW')).toBeVisible();

    await page.getByRole('spinbutton', { name: /Requested quantity for Industrial Servo Drive Controller/ }).fill('1250.75');
    await expect(page.getByText('1 selected')).toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (testInfo.project.use.viewport.width <= 390) {
        const localOverflow = await page.locator('.purchase-request-table-scroll').last().evaluate((element) => element.scrollWidth - element.clientWidth);
        expect(localOverflow).toBeGreaterThan(0);
    }

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
