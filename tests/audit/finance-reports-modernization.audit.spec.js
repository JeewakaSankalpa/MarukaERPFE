/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Financial statements support responsive read-only review', async ({ mockPage: page }) => {
    await page.goto('/#/finance/reports', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Financial statements' })).toBeVisible();
    await expect(page.getByText('2,182,280.00').first()).toBeVisible();
    await page.getByRole('tab', { name: /Balance sheet/ }).click();
    await expect(page.getByText('2,007,450.25').first()).toBeVisible();
    await page.getByRole('tab', { name: /Trial balance/ }).click();
    await expect(page.getByText('Debits and credits are balanced')).toBeVisible();
    await page.getByRole('region', { name: 'Trial balance table' }).focus();
    await expect(page.getByRole('region', { name: 'Trial balance table' })).toBeFocused();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (layout.viewport.width <= 1024) expect(layout.localScrollers.some(item => item.classes.includes('fr-table-scroll'))).toBeTruthy();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
