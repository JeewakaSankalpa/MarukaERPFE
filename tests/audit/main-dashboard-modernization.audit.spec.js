const AxeBuilder = require('@axe-core/playwright').default;
const fs = require('fs');
const path = require('path');
const { test, expect } = require('./support/mock-test');

const buildRoot = path.resolve(__dirname, '../../build');

const serveBuiltApp = async (page) => {
    const frontendOrigin = new URL(process.env.MARUKA_AUDIT_BASE_URL).origin;
    await page.route(`${frontendOrigin}/**`, async route => {
        const requestUrl = new URL(route.request().url());
        if (route.request().method() !== 'GET') return route.fallback();
        const relativePath = requestUrl.pathname === '/' ? 'index.html' : requestUrl.pathname.slice(1);
        const filePath = path.resolve(buildRoot, relativePath);
        if (!filePath.startsWith(buildRoot) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return route.fallback();
        const extension = path.extname(filePath);
        const contentType = extension === '.html' ? 'text/html' : extension === '.js' ? 'text/javascript' : extension === '.css' ? 'text/css' : extension === '.jpeg' || extension === '.jpg' ? 'image/jpeg' : 'application/octet-stream';
        return route.fulfill({ status: 200, contentType, body: fs.readFileSync(filePath) });
    });
};

test('@mock @layout @a11y main dashboard keeps its work overview responsive', async ({ mockPage: page }) => {
    await page.addInitScript(() => {
        localStorage.setItem('username', 'amara.perera');
        localStorage.setItem('firstName', 'Amara');
        localStorage.setItem('employeeId', 'employee-001');
        const modules = JSON.parse(localStorage.getItem('moduleAccess') || '[]');
        localStorage.setItem('moduleAccess', JSON.stringify([...new Set([...modules, 'dashboard.my_attendance', 'dashboard.pending_approvals'])]));
    });
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
    await page.route('**/api/tasks/my-tasks', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'task-1', name: 'Confirm distribution milestones', projectName: 'Colombo distribution modernisation', projectId: 'project-1', status: 'IN_PROGRESS', priority: 'HIGH', dueDate: '2026-11-28' },
    ]) }));
    await page.route('**/api/reports/payables', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { supplierName: 'Lanka Industrial Components and Engineering Services', dueDate: '2026-11-24', balance: 875430.5 },
        { supplierName: 'Southern Electrical Supplies', dueDate: '2026-12-02', balance: 129900 },
    ]) }));
    await page.route('**/api/workflow', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    for (const endpoint of [
        'projects/pending-approvals',
        'estimations/pending-approvals',
        'pos/pending-approvals',
        'grns',
        'inventory/adjustments/audit',
        'inventory/returns/internal/pending-approvals',
        'inventory/returns/supplier',
    ]) {
        await page.route(`**/api/${endpoint}*`, route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    }
    await page.route('**/api/attendance/employee-001', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) }));
    await page.route('**/api/leave/quota/employee-001', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ annualLeaveTotal: 14, annualLeaveUsed: 3, casualLeaveTotal: 7, casualLeaveUsed: 1, sickLeaveTotal: 7, sickLeaveUsed: 0 }) }));
    await serveBuiltApp(page);

    await page.goto('/#/dashboard', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Good day, Amara' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quick access' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Refresh dashboard summary' })).toBeVisible();
    await expect(page.getByText('Colombo distribution modernisation').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Check In' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /My Assigned Tasks/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Pending Approvals/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Upcoming Payables' })).toBeVisible();
    await expect(page.getByText('HR & Attendance')).toBeVisible();
    await expect(page.getByText('Lanka Industrial Components and Engineering Services')).toBeVisible();
    await expect(page.getByText('875,430.50')).toBeVisible();

    const layout = await page.locator('.dashboard-content').evaluate(element => ({
        clientWidth: element.clientWidth,
        scrollWidth: element.scrollWidth,
        widgetColumns: getComputedStyle(element.querySelector('.dashboard-widget-grid')).gridTemplateColumns,
        documentClientWidth: document.documentElement.clientWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        payablesClientWidth: element.querySelector('.dashboard-widget-payables').clientWidth,
        payablesScrollWidth: element.querySelector('.dashboard-widget-payables').scrollWidth,
    }));
    expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(layout.documentScrollWidth).toBeLessThanOrEqual(layout.documentClientWidth + 1);
    expect(layout.payablesScrollWidth).toBeLessThanOrEqual(layout.payablesClientWidth + 1);
    expect(layout.widgetColumns).toBeTruthy();

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);

    await page.getByRole('button', { name: 'Refresh dashboard summary' }).click();
    await expect(page.getByRole('button', { name: 'Refresh dashboard summary' })).toHaveText('Refresh summary');
});

test('@mock main dashboard uses authenticated username fallback and compact empty states', async ({ mockPage: page }) => {
    await page.addInitScript(() => {
        localStorage.removeItem('firstName');
        localStorage.setItem('username', 'nimal.fernando');
    });
    await page.route('**/api/dashboard/summary', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/tasks/my-tasks', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/api/reports/payables', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await serveBuiltApp(page);

    await page.goto('/#/dashboard', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Good day, nimal.fernando' })).toBeVisible();
    await expect(page.getByText('You have no active assigned tasks.')).toBeVisible();
    await expect(page.getByText('No pending payables')).toBeVisible();
});

test('@mock main dashboard exposes payables loading and recoverable error states', async ({ mockPage: page }) => {
    await page.route('**/api/dashboard/summary', route => route.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
    await page.route('**/api/tasks/my-tasks', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.route('**/api/reports/payables', async route => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });
    await serveBuiltApp(page);

    await page.goto('/#/dashboard');
    await expect(page.getByRole('status')).toContainText('Loading payables');
    await expect(page.getByRole('alert')).toContainText('Payables could not be loaded.');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
});
