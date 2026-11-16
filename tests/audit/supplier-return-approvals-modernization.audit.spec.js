const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Supplier return approvals supports safe responsive review', async ({ mockPage: page }) => {
    await page.goto('/#/inventory/supplier-returns/approvals', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Supplier return approvals' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Pending approval' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('SR-2026-0041')).toBeVisible();

    await page.getByLabel('Search supplier returns').fill('no matching supplier');
    await expect(page.getByText('No matching returns')).toBeVisible();
    await page.getByLabel('Search supplier returns').fill('Copper');
    await expect(page.getByText('SR-2026-0041')).toBeVisible();

    await page.getByRole('tab', { name: 'Approved & settled' }).click();
    await expect(page.getByText('SR-2026-0038')).toBeVisible();
    await expect(page.getByText('49,250.00', { exact: false }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Record settlement' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Past settlements' })).toBeVisible();
    await expect(page.getByText('CN-8842')).toBeVisible();
    await page.getByRole('button', { name: 'Close', exact: true }).last().click();

    await page.getByRole('tab', { name: 'Rejected history' }).click();
    await expect(page.getByText('SR-2026-0034')).toBeVisible();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
