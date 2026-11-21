/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Tax presents read-only configuration responsively', async ({ mockPage: page }) => {
    await page.goto('/#/finance/tax', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Tax & VAT management' })).toBeVisible();
    const summary = page.getByRole('region', { name: 'Tax configuration summary' });
    await expect(summary).toContainText('18%');
    await expect(summary).toContainText('2.5%');
    await expect(summary).toContainText('2 of 2');

    const table = page.getByRole('region', { name: 'Tax configuration table' });
    await expect(table).toContainText('GLOBAL_VAT_PERCENT');
    await table.focus();
    await expect(table).toBeFocused();
    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.getByText('Tax reporting is not connected yet')).toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});

test('@mock Tax presents loading and recoverable error states', async ({ mockPage: page }) => {
    await page.route('**/api/settings', async route => {
        await new Promise(resolve => setTimeout(resolve, 300));
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await page.goto('/#/finance/tax', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('status')).toContainText('Loading tax configuration');
    await expect(page.getByRole('alert')).toContainText('Tax configuration unavailable');
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
});
