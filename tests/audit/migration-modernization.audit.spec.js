/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Migration supports responsive read-only opening-balance review', async ({ mockPage: page }) => {
    await page.goto('/#/finance/migration', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Opening balance migration' })).toBeVisible();
    await expect(page.getByText('526,550.50').first()).toBeVisible();
    await expect(page.getByText('311,750.50').first()).toBeVisible();

    const payablesTable = page.getByRole('region', { name: 'Opening payables table' });
    await payablesTable.focus();
    await expect(payablesTable).toBeFocused();
    const invoiceSearch = page.getByRole('textbox', { name: 'Search payables by invoice number' });
    await invoiceSearch.fill('PML-9237');
    await expect(page.getByText('Precision Motion Lanka')).toBeVisible();
    await expect(page.getByText('Colombo Industrial Supplies')).not.toBeVisible();

    await page.getByRole('tab', { name: 'Receivables' }).click();
    await expect(page.getByText('875,000.00').first()).toBeVisible();
    const receivablesTable = page.getByRole('region', { name: 'Opening receivables table' });
    await receivablesTable.focus();
    await expect(receivablesTable).toBeFocused();
    await page.getByRole('textbox', { name: 'Search receivables by project, customer, or invoice' }).fill('CDS-2025-119');
    await expect(page.getByText('Kandy distribution control system')).toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (layout.viewport.width <= 1024) expect(layout.localScrollers.some(item => item.classes.includes('migration-table-scroll'))).toBeTruthy();

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
