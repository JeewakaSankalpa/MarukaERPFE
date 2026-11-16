const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y GRN rate correction is readable, responsive, and read-only', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/grns/grn-001/rate-correction', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Correct a received rate' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Copper Cable 10mm/ })).toBeVisible();
    await expect(page.getByText('Current rate')).toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);

    await page.getByLabel('PROPOSED NET UNIT RATE').fill('190.5000');
    await page.getByLabel('PROPOSED VAT AMOUNT').fill('12.50');
    await page.getByText('I checked this VAT amount against the supplier invoice.').click();
    await page.getByLabel('REASON FOR CORRECTION').fill('Supplier invoice rate confirmed after receipt review.');
    await expect(page.getByRole('button', { name: /Analyze impact/ })).toBeEnabled();
    await page.getByRole('button', { name: /Analyze impact/ }).click();
    await expect(page.locator('.grnc-impact')).toBeVisible();
    await expect(page.getByText('No correction is applied from this review.')).toBeVisible();

    if (testInfo.project.use.viewport.width <= 390) {
        await expect(page.getByText('Adjustment journal to be posted')).toHaveCount(0);
    }

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
