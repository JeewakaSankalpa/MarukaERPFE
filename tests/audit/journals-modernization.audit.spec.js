/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Journals supports safe financial review and responsive detail', async ({ mockPage: page }) => {
    await page.goto('/#/finance/journals', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Journal entries' })).toBeVisible();
    await expect(page.getByText('LKR 1,100,000.50').first()).toBeVisible();
    await expect(page.getByText('PAY-2026-0921').first()).toBeVisible();

    await page.getByLabel('Search journals').fill('customer receipt');
    await expect(page.getByText('RCPT-2026-1842').first()).toBeVisible();
    await expect(page.getByText('PAY-2026-0921').first()).toBeHidden();
    await page.getByLabel('Search journals').fill('');

    await page.getByRole('button', { name: 'Expand row' }).first().click();
    await expect(page.getByRole('region', { name: /Journal details for/ })).toBeVisible();
    await expect(page.getByText('Trade accounts payable')).toBeVisible();

    await page.getByLabel('Search journals').focus();
    await expect(page.getByLabel('Search journals')).toBeFocused();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (layout.viewport.width <= 1024) expect(layout.localScrollers.some(item => item.classes.includes('journals-table-scroll'))).toBeTruthy();
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});

test('@mock @layout @a11y Journals form is keyboard reachable without posting', async ({ mockPage: page }) => {
    await page.goto('/#/finance/journals', { waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'New journal entry' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText('Debit LKR 0.00')).toBeVisible();
    await page.getByLabel('Reference').focus();
    await expect(page.getByLabel('Reference')).toBeFocused();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
});
