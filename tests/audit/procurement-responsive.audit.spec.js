const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout purchase orders use the workspace without page overflow', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/pos', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Purchase Orders' })).toBeVisible();
    await expect(page.locator('.purchase-order-table tbody tr')).toHaveCount(2);

    const geometry = await measureLayout(page);
    const layout = await page.evaluate(() => {
        const pageContent = document.querySelector('.page-content')?.getBoundingClientRect();
        const workspace = document.querySelector('.purchase-order-list-page')?.getBoundingClientRect();
        const scroller = document.querySelector('.purchase-order-table-scroll');
        const filters = [...document.querySelectorAll('.purchase-order-list-filters > *')].map((element) => element.getBoundingClientRect());
        const surface = document.querySelector('.purchase-order-list-surface')?.getBoundingClientRect();
        return {
            utilization: pageContent && workspace ? workspace.width / pageContent.width : 0,
            localScroll: scroller ? scroller.scrollWidth - scroller.clientWidth : null,
            filtersContained: Boolean(surface) && filters.every((rect) => rect.left >= surface.left - 1 && rect.right <= surface.right + 1),
        };
    });

    expect(geometry.document.overflow).toBeLessThanOrEqual(1);
    expect(geometry.clippedOrEscaping).toEqual([]);
    expect(layout.filtersContained).toBe(true);
    if (testInfo.project.use.viewport.width >= 1280) expect(layout.utilization).toBeGreaterThanOrEqual(0.9);
    if (testInfo.project.use.viewport.width === 1440) expect(layout.localScroll).toBeLessThanOrEqual(1);
    if (testInfo.project.use.viewport.width <= 390) {
        expect(layout.localScroll).toBeGreaterThan(0);
        await expect(page.locator('.purchase-order-table-scroll')).toHaveAttribute('tabindex', '0');
    }
});

test('@mock @layout fulfil requests reflow and Enter executes item search', async ({ mockPage: page }, testInfo) => {
    const matchingRequests = [];
    page.on('request', (request) => {
        if (request.url().includes('/api/item-requests/fulfilment') && request.url().includes('itemSearch=Copper')) matchingRequests.push(request.url());
    });

    await page.goto('/#/stores/fulfil-requests', { waitUntil: 'networkidle' });
    await expect(page.getByText('IR-2026-001')).toBeVisible();
    const search = page.getByLabel('Search item used in requests');
    await search.fill('Copper');
    await expect.poll(() => matchingRequests.length).toBeGreaterThanOrEqual(1);
    const beforeEnter = matchingRequests.length;
    await search.press('Enter');
    await expect.poll(() => matchingRequests.length).toBeGreaterThan(beforeEnter);
    await expect(page.getByText('Copper Cable 10mm')).toBeVisible();

    const geometry = await measureLayout(page);
    expect(geometry.document.overflow).toBeLessThanOrEqual(1);
    expect(geometry.clippedOrEscaping).toEqual([]);

    if (testInfo.project.use.viewport.width < 1200) {
        const panes = await page.locator('.ir-master-pane, .ir-detail-pane').evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().width));
        expect(Math.abs(panes[0] - panes[1])).toBeLessThanOrEqual(2);
    }
});

test('@mock @layout fulfil request details fit desktop without horizontal scrolling', async ({ mockPage: page }) => {
    await page.setViewportSize({ width: 1225, height: 768 });
    await page.goto('/#/stores/fulfil-requests', { waitUntil: 'networkidle' });
    await page.getByRole('row', { name: /Open item request IR-2026-001/i }).press('Enter');
    await expect(page.getByRole('heading', { name: 'IR Details' })).toBeVisible();
    await expect(page.locator('.ir-detail-table tbody tr')).toHaveCount(3);

    const detailGeometry = await page.locator('.ir-detail-table').evaluate((table) => {
        const wrapper = table.closest('.table-responsive');
        return {
            tableWidth: table.getBoundingClientRect().width,
            wrapperWidth: wrapper?.getBoundingClientRect().width,
            overflow: wrapper ? wrapper.scrollWidth - wrapper.clientWidth : null,
        };
    });
    expect(detailGeometry.overflow, JSON.stringify(detailGeometry)).toBeLessThanOrEqual(1);
    const geometry = await measureLayout(page);
    expect(geometry.document.overflow).toBeLessThanOrEqual(1);
    expect(geometry.clippedOrEscaping).toEqual([]);

    await page.setViewportSize({ width: 1440, height: 900 });
    const actionsContained = await page.locator('.ir-detail-actions').evaluateAll((cells) => cells.every((cell) => {
        const cellRect = cell.getBoundingClientRect();
        return [...cell.querySelectorAll('button')].every((button) => {
            const rect = button.getBoundingClientRect();
            return rect.left >= cellRect.left - 1 && rect.right <= cellRect.right + 1;
        });
    }));
    expect(actionsContained).toBe(true);
});

test('@mock @layout fulfil request details keep scrolling local on mobile', async ({ mockPage: page }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/#/stores/fulfil-requests', { waitUntil: 'networkidle' });
    await page.getByRole('row', { name: /Open item request IR-2026-001/i }).press('Enter');
    await expect(page.locator('.ir-detail-table tbody tr')).toHaveCount(3);
    const localOverflow = await page.locator('.ir-detail-table').evaluate((table) => {
        const wrapper = table.closest('.table-responsive');
        return wrapper ? wrapper.scrollWidth - wrapper.clientWidth : 0;
    });
    expect(localOverflow).toBeGreaterThan(0);
    const geometry = await measureLayout(page);
    expect(geometry.document.overflow).toBeLessThanOrEqual(1);
    expect(geometry.clippedOrEscaping).toEqual([]);
});

test('@mock @layout pending purchases keeps mobile actions inside its surface', async ({ mockPage: page }) => {
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'networkidle' });
    await expect(page.locator('.pending-to-po-actions')).toBeVisible();
    const boxes = await page.evaluate(() => {
        const surface = document.querySelector('.pending-to-po-page .operational-workspace-surface')?.getBoundingClientRect();
        const actions = document.querySelector('.pending-to-po-actions')?.getBoundingClientRect();
        return { surface: surface && { left: surface.left, right: surface.right }, actions: actions && { left: actions.left, right: actions.right } };
    });
    expect(boxes.actions.left, JSON.stringify(boxes)).toBeGreaterThanOrEqual(boxes.surface.left - 1);
    expect(boxes.actions.right, JSON.stringify(boxes)).toBeLessThanOrEqual(boxes.surface.right + 1);
    const geometry = await measureLayout(page);
    expect(geometry.document.overflow).toBeLessThanOrEqual(1);
    expect(geometry.clippedOrEscaping).toEqual([]);
});
