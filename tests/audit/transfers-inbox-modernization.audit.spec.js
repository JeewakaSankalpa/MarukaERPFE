const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y transfers inbox presents a responsive read-only review workflow', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/transfers/inbox', { waitUntil: 'networkidle' });

    await expect(page.getByRole('heading', { name: 'Transfers Inbox' })).toBeVisible();
    await expect(page.getByText('TR-2026-11-0042')).toBeVisible();
    await expect(page.getByText('1,283.25')).toBeVisible();
    await expect(page.getByText('Pending acceptance').first()).toBeVisible();

    const search = page.getByRole('searchbox', { name: 'Search pending transfers' });
    await search.fill('Earth Cable');
    await expect(page.getByText('TR-2026-11-0043')).toBeVisible();
    await expect(page.getByText('TR-2026-11-0042')).toBeHidden();
    await search.clear();

    await page.getByRole('button', { name: 'Review details' }).first().click();
    await expect(page.getByRole('heading', { name: 'Verify transfer items' })).toBeVisible();
    await expect(page.getByText('1,250.75').last()).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accept transfer' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Reject transfer' })).toBeVisible();

    const scan = page.getByLabel('Batch or serial QR');
    await scan.fill('V1|GRN-2026-001|product-copper|batch-copper-001|B-CP-001|');
    await scan.press('Enter');
    await expect(page.getByText('Verified', { exact: true })).toBeVisible();

    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);

    if (testInfo.project.use.viewport.width <= 390) {
        const scroller = page.getByLabel('Items in transfer TR-2026-11-0042');
        await scroller.focus();
        await expect(scroller).toBeFocused();
        expect(await scroller.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeGreaterThan(0);
    }

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
