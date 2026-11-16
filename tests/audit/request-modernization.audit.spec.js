const fs = require('fs');
const path = require('path');
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

const evidenceDir = path.resolve(__dirname, '../../output/playwright/evidence');

test('@mock @layout @a11y my requests uses an operational workspace without document overflow', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/item/my-requests', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'My Item Requests' })).toBeVisible();
    await expect(page.getByText('IR-2026-004')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Continue draft' })).toBeVisible();

    const layout = await measureLayout(page);
    const workspace = await page.evaluate(() => {
        const content = document.querySelector('.page-content')?.getBoundingClientRect();
        const workspace = document.querySelector('.my-requests-workspace')?.getBoundingClientRect();
        const scroller = document.querySelector('.my-requests-table-scroll');
        return {
            utilization: content && workspace ? workspace.width / content.width : 0,
            localOverflow: scroller ? scroller.scrollWidth - scroller.clientWidth : null,
        };
    });
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    expect(workspace.utilization).toBeGreaterThanOrEqual(0.9);
    if (testInfo.project.use.viewport.width <= 390) expect(workspace.localOverflow).toBeLessThanOrEqual(1);

    const axe = await new AxeBuilder({ page }).analyze();
    const serious = axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    expect(serious).toEqual([]);

    fs.mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDir, `after-my-requests-${testInfo.project.name}.png`), fullPage: false });
    await testInfo.attach('my-requests-layout', { body: JSON.stringify({ layout, workspace, axe }, null, 2), contentType: 'application/json' });
});

test('@mock @interaction my requests retains draft continuation', async ({ mockPage: page }) => {
    await page.goto('/#/item/my-requests', { waitUntil: 'networkidle' });
    await page.getByRole('button', { name: 'Continue draft' }).click();
    await expect(page).toHaveURL(/#\/item\/requests\/ir-draft-001$/);

});

test('@mock @interaction fulfil requests search reloads when Enter is pressed', async ({ mockPage: page }, testInfo) => {
    const matchingRequests = [];
    page.on('request', (request) => {
        if (request.url().includes('/api/item-requests/fulfilment') && request.url().includes('itemSearch=Copper')) matchingRequests.push(request.url());
    });
    await page.goto('/#/stores/fulfil-requests', { waitUntil: 'networkidle' });
    const search = page.getByLabel('Search item used in requests');
    await search.fill('Copper');
    await expect.poll(() => matchingRequests.length).toBeGreaterThanOrEqual(1);
    const beforeEnter = matchingRequests.length;
    await search.press('Enter');
    await expect.poll(() => matchingRequests.length).toBeGreaterThan(beforeEnter);
    await expect(page.getByText('Copper Cable 10mm')).toBeVisible();
    fs.mkdirSync(evidenceDir, { recursive: true });
    await page.screenshot({ path: path.join(evidenceDir, `after-fulfil-requests-${testInfo.project.name}.png`), fullPage: false });
});
