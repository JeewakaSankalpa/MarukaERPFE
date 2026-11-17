/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Loan management supports responsive read-only portfolio review', async ({ mockPage: page }) => {
    await page.goto('/#/finance/loans', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Loan management' })).toBeVisible();
    await expect(page.getByText('LKR 405,000.00').first()).toBeVisible();
    await expect(page.getByText('LKR 135,000.00').first()).toBeVisible();
    await expect(page.getByText('National Development Bank')).toBeVisible();
    await expect(page.getByText('Amara Perera')).toBeVisible();

    const employeeFilter = page.getByRole('button', { name: 'Employee loans' });
    await employeeFilter.focus();
    await expect(employeeFilter).toBeFocused();
    await employeeFilter.click();
    await expect(page.getByText('Amara Perera')).toBeVisible();
    await expect(page.getByText('National Development Bank')).not.toBeVisible();
    await page.getByRole('button', { name: 'Company borrowed' }).click();
    await expect(page.getByText('National Development Bank')).toBeVisible();
    await expect(page.getByText('Amara Perera')).not.toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
