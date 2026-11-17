/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Petty cash approvals support responsive read-only queue review', async ({ mockPage: page }) => {
    await page.goto('/#/finance/petty-cash-approvals', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Petty cash approvals' })).toBeVisible();
    await expect(page.getByText('133,750.75')).toBeVisible();

    const requestsTable = page.getByRole('region', { name: 'Petty cash fund requests table' });
    await requestsTable.focus();
    await expect(requestsTable).toBeFocused();
    const requestSearch = page.getByRole('textbox', { name: 'Search fund requests' });
    await requestSearch.fill('Kandy');
    await expect(page.getByText('Kandy control system upgrade')).toBeVisible();
    await expect(page.getByText('Colombo distribution modernisation')).not.toBeVisible();
    await requestSearch.fill('');
    await page.getByRole('button', { name: 'Review' }).first().click();
    await expect(page.getByRole('dialog').getByText('Review Petty Cash Request')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    await page.getByRole('tab', { name: /Pending expenses/ }).click();
    const expensesTable = page.getByRole('region', { name: 'Pending petty cash expenses table' });
    await expensesTable.focus();
    await expect(expensesTable).toBeFocused();
    await page.getByRole('textbox', { name: 'Search pending expenses' }).fill('wiring');
    await expect(page.getByText('Panel wiring consumables')).toBeVisible();
    await expect(page.getByText('Site access equipment hire')).not.toBeVisible();
    await page.getByRole('button', { name: 'Review' }).click();
    await expect(page.getByRole('dialog').getByText('Review Petty Cash Expense')).toBeVisible();
    await page.getByRole('dialog').getByRole('button', { name: 'Close' }).click();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (layout.viewport.width <= 1024) expect(layout.localScrollers.some(item => item.classes.includes('petty-approval-table'))).toBeTruthy();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
