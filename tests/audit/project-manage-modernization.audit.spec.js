const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y project manage keeps overview, saved totals, and revision history usable', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/projects/manage/project-001', { waitUntil: 'domcontentloaded' });

    await expect(page.getByRole('heading', { name: /Colombo Distribution Modernisation/ })).toBeVisible();
    await expect(page.getByText('Project overview')).toBeVisible();
    await expect(page.getByText('LKR 17.41', { exact: true })).toBeVisible();
    await expect(page.getByText('LKR 0.73', { exact: true })).toBeVisible();
    await expect(page.getByText('LKR 114.11', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Email' }).click();
    await expect(page.getByText('Send Project Email', { exact: true })).toBeVisible();
    await page.locator('.modal-footer').getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: 'Revisions' }).click();
    await expect(page.getByRole('heading', { name: 'Version History' })).toBeVisible();
    await expect(page.getByText('Customer requested a revised cable route.')).toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);

    if (testInfo.project.use.viewport.width <= 390) {
        const tabs = page.getByRole('region', { name: 'Project workspace sections' });
        await tabs.focus();
        await expect(tabs).toBeFocused();
    }

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
