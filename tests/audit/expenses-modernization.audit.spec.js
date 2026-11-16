const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Expenses supports safe financial review and responsive interactions', async ({ mockPage: page }) => {
    await page.goto('/#/finance/expenses', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Expense management' })).toBeVisible();
    await expect(page.getByText('Rs. 578,650.75')).toBeVisible();
    await expect(page.getByText('Supplier payment · GRN-2026-001').first()).toBeVisible();

    await page.getByLabel('Search expense records').fill('electricity');
    await expect(page.getByText('November office electricity')).toBeVisible();
    await expect(page.getByText('Colombo site generator service')).toBeHidden();
    await page.getByLabel('Search expense records').fill('');

    await page.getByRole('tab', { name: 'By Payment Method' }).click();
    await expect(page.getByRole('tab', { name: 'By Payment Method' })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByText('Credit Card').first()).toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
