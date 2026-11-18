/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Supplier payables supports responsive aging review', async ({ mockPage: page }) => {
    await page.goto('/#/reports/payables', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Supplier payables' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Payables exposure summary' })).toContainText('730,000.75');
    await expect(page.getByText('Colombo Industrial Supplies')).toBeVisible();
    await expect(page.getByText('150,000.00').last()).toBeVisible();
    await page.getByRole('region', { name: 'Supplier aging report' }).focus();
    await expect(page.getByRole('region', { name: 'Supplier aging report' })).toBeFocused();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (layout.viewport.width <= 1024) expect(layout.localScrollers.some(item => item.classes.includes('payables-report-canvas'))).toBeTruthy();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
