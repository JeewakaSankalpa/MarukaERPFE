/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Finance dashboard supports responsive cash-flow review', async ({ mockPage: page }) => {
    await page.goto('/#/finance/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Finance dashboard' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Cash flow summary' })).toContainText('2,980,740.75');
    await expect(page.getByRole('heading', { name: 'Outflow breakdown' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Inflow sources' })).toBeVisible();
    await page.getByRole('button', { name: 'Chart of accounts' }).focus();
    await expect(page.getByRole('button', { name: 'Chart of accounts' })).toBeFocused();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
