const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y project search keeps discovery and project access usable', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/projects/search', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'My Projects' })).toBeVisible();
    await expect(page.getByText('Southern warehouse electrical upgrade')).toBeVisible();
    await expect(page.getByText('Galle retail fit-out inquiry with a resilient project title')).toBeVisible();
    await expect(page.getByText('Inquiry only', { exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: /ID columns:/ }).click();
    await expect(page.getByRole('columnheader', { name: /Job number/ })).toHaveCount(0);
    if (testInfo.project.use.viewport.width > 390) await page.getByRole('button', { name: /Inquiry #/ }).click();
    await page.getByLabel('Project name').fill('warehouse');
    await expect(page.getByText('1 active')).toBeVisible();
    await page.getByRole('button', { name: 'Clear filters' }).click();
    await expect(page.getByLabel('Project name')).toHaveValue('');
    const tableRegion = page.getByLabel('Projects table');
    await tableRegion.focus();
    await expect(tableRegion).toBeFocused();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (testInfo.project.use.viewport.width <= 390) await expect(page.getByRole('button', { name: 'Manage' }).first()).toHaveCSS('min-height', '44px');
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(violation => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});

test('@mock project search presents empty and recoverable error states', async ({ mockPage: page }) => {
    await page.route('**/api/projects/search**', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('/#/projects/search', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('No projects found')).toBeVisible();
    await page.unroute('**/api/projects/search**');
    // The 503 is deliberate synthetic evidence for the recoverable inline state.
    page.removeAllListeners('console');
    await page.route('**/api/projects/search**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{}' }));
    await page.getByRole('button', { name: 'Refresh' }).click();
    await expect(page.locator('.project-search-error')).toContainText('Projects could not be loaded');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
