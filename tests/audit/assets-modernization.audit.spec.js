/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Asset register supports responsive read-only portfolio review', async ({ mockPage: page }) => {
    await page.goto('/#/assets', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Fixed assets register' })).toBeVisible();
    await expect(page.getByText('LKR 15,735,000.00')).toBeVisible();
    await expect(page.getByText('LKR 11,938,000.00')).toBeVisible();
    await expect(page.getByText('CNC panel fabrication machine')).toBeVisible();

    const search = page.getByRole('textbox', { name: 'Search assets' });
    await search.focus();
    await expect(search).toBeFocused();
    await search.fill('Western region');
    await expect(page.getByText('Service vehicle · Western region')).toBeVisible();
    await expect(page.getByText('CNC panel fabrication machine')).not.toBeVisible();
    await search.fill('');

    const tableRegion = page.getByRole('region', { name: 'Fixed assets table' });
    await tableRegion.focus();
    await expect(tableRegion).toBeFocused();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});
