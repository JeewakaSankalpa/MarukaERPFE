/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Income supports responsive read-only financial review', async ({ mockPage: page }) => {
    await page.goto('/#/finance/income', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Income and receivables' })).toBeVisible();
    await expect(page.getByText('1,030,001.25').first()).toBeVisible();
    await expect(page.getByText('325,000.00').first()).toBeVisible();

    const table = page.getByRole('region', { name: 'Income invoice table' });
    await table.focus();
    await expect(table).toBeFocused();
    const search = page.getByRole('textbox', { name: 'Search invoices by project or invoice number' });
    await search.fill('INV-2026-0988');
    await expect(page.getByText('INV-2026-0988')).toBeVisible();
    await expect(page.getByText('INV-2026-1042')).not.toBeVisible();
    await search.fill('');

    const statusFilter = page.getByRole('combobox', { name: 'Filter invoices by status' });
    await statusFilter.focus();
    await expect(statusFilter).toBeFocused();
    await page.getByText('All Statuses', { exact: true }).click();
    await page.getByText('Partially Paid', { exact: true }).click();
    await expect(page.getByText('INV-2026-1042')).toBeVisible();
    await expect(page.getByText('INV-2026-0988')).not.toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (layout.viewport.width <= 1024) expect(layout.localScrollers.some(item => item.classes.includes('income-table-scroll'))).toBeTruthy();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
