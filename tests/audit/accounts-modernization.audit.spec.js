const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Accounts supports financial review, nested views, and keyboard interactions', async ({ mockPage: page }) => {
    await page.goto('/#/finance/accounts', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Chart of accounts' })).toBeVisible();
    await expect(page.getByText('LKR 1,250,800.75')).toBeVisible();
    await expect(page.getByText('Trade accounts payable')).toBeVisible();

    await page.getByLabel('Search accounts').fill('petty cash');
    await expect(page.getByText('Head office petty cash')).toBeVisible();
    await expect(page.getByText('Trade accounts payable')).toBeHidden();
    await page.getByLabel('Search accounts').fill('');
    await page.getByRole('button', { name: 'Collapse row' }).click();
    await expect(page.getByText('Head office petty cash')).toBeHidden();
    await page.getByRole('button', { name: 'Expand row' }).click();
    await expect(page.getByText('Head office petty cash')).toBeVisible();

    await page.getByRole('tab', { name: /Project accounts/ }).click();
    await expect(page.getByText('Colombo Distribution Modernisation — Phase 2')).toBeVisible();
    await page.getByRole('tab', { name: /General accounts/ }).click();

    await page.getByRole('button', { name: /Ledger/ }).first().click();
    await expect(page.getByText('Sub-account summary')).toBeVisible();
    await page.getByRole('button', { name: 'View Ledger' }).first().click();
    await expect(page.getByText('Transaction ledger')).toBeVisible();
    await expect(page.getByText('Supplier settlement · GRN-2026-001')).toBeVisible();
    await page.keyboard.press('Escape');

    await page.getByLabel('Search accounts').focus();
    await expect(page.getByLabel('Search accounts')).toBeFocused();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (layout.viewport.width <= 1024) {
        expect(layout.localScrollers.some(scroller => scroller.classes.includes('accounts-table-scroll'))).toBeTruthy();
    }
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
