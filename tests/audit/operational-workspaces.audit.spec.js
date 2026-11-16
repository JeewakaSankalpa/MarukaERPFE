const fs = require('fs');
const path = require('path');
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

const evidenceRoot = path.resolve(__dirname, '../../output/playwright/evidence');
const screens = [
    { id: 'stores-planning', route: '/#/stores/planning', heading: 'Stores Planning (Procurement)', workspace: '.operational-workspace', table: 'table', minRows: 3 },
    { id: 'purchase-request', route: '/#/inventory/pr', heading: 'Create Purchase Request', workspace: '.operational-workspace', table: 'table', minRows: 1, emptyProducts: true },
    { id: 'item-request', route: '/#/item/requests', heading: 'Prepare Item Request', workspace: '.operational-workspace', table: 'table', minRows: 3 },
    { id: 'departments', route: '/#/departments', heading: 'Departments', workspace: '.operational-workspace', table: 'table', minRows: 2 },
];

for (const screen of screens) {
    test(`@mock @workspace @layout ${screen.id} operational geometry`, async ({ mockPage: page }, testInfo) => {
        if (screen.emptyProducts) await useEmptyProducts(page);
        await page.goto(screen.route, { waitUntil: 'networkidle' });
        await expect(page.getByRole('heading', { name: screen.heading })).toBeVisible();
        await expect.poll(() => page.locator(`${screen.table} tbody tr`).count()).toBeGreaterThanOrEqual(screen.minRows);

        const measurements = await page.evaluate(({ workspaceSelector, tableSelector }) => {
            const box = (element) => {
                const rect = element?.getBoundingClientRect();
                return rect ? { left: rect.left, right: rect.right, width: rect.width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth } : null;
            };
            const pageContent = document.querySelector('.page-content');
            const workspace = document.querySelector(workspaceSelector);
            const table = document.querySelector(tableSelector);
            const wrapper = table?.closest('.table-responsive, .stores-planning-table-scroll');
            return {
                pageContent: box(pageContent), workspace: box(workspace), table: box(table), tableWrapper: box(wrapper),
                tableClass: table?.className || null,
                tableStyle: table ? { width: getComputedStyle(table).width, minWidth: getComputedStyle(table).minWidth, tableLayout: getComputedStyle(table).tableLayout } : null,
                workspaceUtilization: pageContent && workspace ? box(workspace).width / box(pageContent).width : null,
                localTableScroll: Boolean(wrapper && table.scrollWidth > wrapper.clientWidth + 1),
            };
        }, { workspaceSelector: screen.workspace, tableSelector: screen.table });
        const geometry = await measureLayout(page);
        await writeEvidence(testInfo, `${screen.id}-measurements`, { measurements, geometry, verification: 'MOCK-VERIFIED' });
        await capture(page, testInfo, screen.id);

        expect(geometry.document.overflow).toBeLessThanOrEqual(1);
        expect(geometry.clippedOrEscaping).toEqual([]);
        if (process.env.MARUKA_AUDIT_EXPECT_DENSITY === '1' && testInfo.project.use.viewport.width >= 1024) {
            expect(measurements.workspaceUtilization).toBeGreaterThanOrEqual(0.9);
        }
    });

    test(`@mock @a11y ${screen.id} has no serious or critical automated violations`, async ({ mockPage: page }, testInfo) => {
        if (screen.emptyProducts) await useEmptyProducts(page);
        await page.goto(screen.route, { waitUntil: 'networkidle' });
        await expect(page.getByRole('heading', { name: screen.heading })).toBeVisible();
        const result = await new AxeBuilder({ page }).analyze();
        await testInfo.attach(`${screen.id}-axe`, { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
        expect(result.violations.filter(({ impact }) => ['serious', 'critical'].includes(impact))).toEqual([]);
    });
}

async function useEmptyProducts(page) {
    await page.route('http://127.0.0.1:3999/api/products**', (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ content: [], totalPages: 0 }),
    }));
}

async function capture(page, testInfo, screen) {
    fs.mkdirSync(evidenceRoot, { recursive: true });
    const phase = process.env.MARUKA_AUDIT_EVIDENCE_PHASE || 'audit';
    const file = path.join(evidenceRoot, `${phase}-${screen}-${testInfo.project.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    await testInfo.attach(`${screen}-screenshot`, { path: file, contentType: 'image/png' });
}

async function writeEvidence(testInfo, name, value) {
    fs.mkdirSync(evidenceRoot, { recursive: true });
    const phase = process.env.MARUKA_AUDIT_EVIDENCE_PHASE || 'audit';
    const file = path.join(evidenceRoot, `${phase}-${name}-${testInfo.project.name}.json`);
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
    await testInfo.attach(name, { path: file, contentType: 'application/json' });
}
