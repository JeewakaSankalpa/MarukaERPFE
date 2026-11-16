const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

for (const route of ['/inventory/search', '/inventory/view']) {
    test(`@mock @layout @a11y ${route} uses the responsive inventory workspace`, async ({ mockPage: page }, testInfo) => {
        await page.goto(`/#${route}`, { waitUntil: 'networkidle' });
        await expect(page.getByRole('heading', { name: 'Inventory Summary' })).toBeVisible();
        await expect(page.getByText('Copper Cable 10mm — high-temperature insulated run')).toBeVisible();
        await expect(page.locator('.inventory-view-table tbody tr')).toHaveCount(3);

        const layout = await measureLayout(page);
        const workspace = await page.evaluate(() => {
            const pageContent = document.querySelector('.page-content')?.getBoundingClientRect();
            const workspace = document.querySelector('.inventory-view-workspace')?.getBoundingClientRect();
            const tableScroller = document.querySelector('.inventory-view-table-scroll');
            return {
                utilization: pageContent && workspace ? workspace.width / pageContent.width : 0,
                localOverflow: tableScroller ? tableScroller.scrollWidth - tableScroller.clientWidth : null,
            };
        });
        expect(layout.document.overflow).toBeLessThanOrEqual(1);
        expect(layout.clippedOrEscaping).toEqual([]);
        if (testInfo.project.use.viewport.width > 767) expect(workspace.utilization).toBeGreaterThanOrEqual(0.9);
        if (testInfo.project.use.viewport.width <= 390) {
            expect(workspace.utilization).toBeGreaterThanOrEqual(0.85);
            expect(workspace.localOverflow).toBeLessThanOrEqual(1);
        }

        const axe = await new AxeBuilder({ page }).analyze();
        expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
    });
}

test('@mock @interaction inventory search and product detail remain functional', async ({ mockPage: page }) => {
    await page.goto('/#/inventory/search', { waitUntil: 'networkidle' });
    const search = page.getByLabel('Search inventory');
    await search.fill('Copper');
    await search.press('Enter');
    await expect(page.locator('.inventory-view-table tbody tr')).toHaveCount(1);
    await page.getByRole('button', { name: 'View Details' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog').getByText(/Details: Copper Cable/i)).toBeVisible();
    await expect(page.getByText('Open Batch Breakdown')).toBeVisible();
});
