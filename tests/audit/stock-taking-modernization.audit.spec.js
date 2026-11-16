const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Stock Taking supports responsive discrepancy review', async ({ mockPage: page }) => {
    await page.goto('/#/inventory/stock-taking', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Manual stock taking' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'All Batches' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Copper Cable 10mm', { exact: false }).first()).toBeVisible();

    const quantity = page.getByLabel(/Physical quantity for Copper Cable/);
    await quantity.fill('830.5');
    await expect(page.locator('.stock-taking-count strong')).toHaveText('1');
    await page.getByRole('tab', { name: 'Show Changes Only' }).click();
    await expect(page.getByRole('tab', { name: 'Show Changes Only' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByLabel(/Physical quantity for Copper Cable/)).toBeVisible();
    await expect(page.getByText('-10')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Submit Audit' })).toBeEnabled();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    const scroller = page.locator('.stock-taking-table-scroll');
    if (page.viewportSize().width <= 390) expect(await scroller.evaluate((node) => node.scrollWidth - node.clientWidth)).toBeGreaterThan(0);

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
