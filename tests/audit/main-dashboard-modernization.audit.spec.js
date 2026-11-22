const { test, expect } = require('./support/mock-test');

test('@mock @layout @a11y main dashboard keeps its work overview responsive', async ({ mockPage: page }) => {
    await page.route('**/api/dashboard/summary', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
            project: { ongoingList: [
                { id: 'project-1', name: 'Colombo distribution modernisation', status: 'IN_PROGRESS', dueAt: '2026-12-04T00:00:00Z' },
            ] },
            accounts: { projectPayables: [{ projectName: 'Southern warehouse upgrade', amount: 125000.5 }], outstanding: 125000.5 },
            due: {},
        }),
    }));
    await page.route('**/api/tasks/my-tasks', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/reports/payables', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));

    await page.goto('/#/dashboard', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: /Good day,/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick access' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh dashboard summary' })).toBeVisible();
    await expect(page.getByText('Colombo distribution modernisation')).toBeVisible();

    const layout = await page.locator('.dashboard-content').evaluate(element => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        widgetColumns: getComputedStyle(element.querySelector('.dashboard-widget-grid')).gridTemplateColumns,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(layout.widgetColumns).toBeTruthy();

    await page.getByRole('button', { name: 'Refresh dashboard summary' }).click();
    await expect(page.getByRole('button', { name: 'Refresh dashboard summary' })).toHaveText('Refresh summary');
});
