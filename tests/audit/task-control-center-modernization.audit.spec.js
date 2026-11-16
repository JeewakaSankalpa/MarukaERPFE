const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y task control center preserves accessible operational views', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/projects/tasks', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Task Control Center' })).toBeVisible();
    await expect(page.getByText('Confirm cable containment route')).toBeVisible();

    await page.getByRole('textbox', { name: 'Search tasks and projects' }).fill('cable');
    await expect(page.getByText('Confirm cable containment route')).toBeVisible();

    for (const view of ['List', 'Kanban', 'Gantt', 'Workforce', 'Calendar', 'Reports']) {
        await page.getByRole('tab', { name: view }).click();
        await expect(page.locator('#tcc-view-panel')).toBeVisible();
        const layout = await measureLayout(page);
        expect(layout.document.overflow).toBeLessThanOrEqual(1);
        if (view !== 'Gantt') expect(layout.clippedOrEscaping).toEqual([]);
    }

    await page.getByRole('tab', { name: 'Kanban' }).click();
    await page.getByRole('button', { name: 'Open Confirm cable containment route', exact: true }).click();
    await expect(page.getByRole('complementary', { name: 'Task details' })).toBeVisible();
    await page.getByRole('button', { name: 'Close task details' }).click();

    await page.getByRole('tab', { name: 'Gantt' }).click();
    await expect(page.getByRole('region', { name: 'Project timeline' })).toBeVisible();
    await page.getByRole('tab', { name: 'Workforce' }).click();
    await expect(page.getByRole('region', { name: 'Workforce schedule' })).toBeVisible();

    if (testInfo.project.use.viewport.width <= 390) {
        const localOverflow = await page.getByRole('region', { name: 'Workforce schedule' }).evaluate((element) => element.scrollWidth - element.clientWidth);
        expect(localOverflow).toBeGreaterThan(0);
    }
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
});
