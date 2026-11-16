const fs = require('fs');
const path = require('path');
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

const evidenceRoot = path.resolve(__dirname, '../../output/playwright/evidence');

test('@mock @workspace @layout pending purchases uses the operational workspace', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'Pending Purchases → Create POs' })).toBeVisible();
    await expect(page.locator('.pending-to-po-lines-table tbody tr')).toHaveCount(3);

    const measurements = await page.evaluate(() => {
        const rect = (selector) => {
            const element = document.querySelector(selector);
            const box = element?.getBoundingClientRect();
            return box ? { left: box.left, right: box.right, width: box.width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth } : null;
        };
        const pageContent = rect('.page-content');
        const workspace = rect('.pending-to-po-page');
        const table = document.querySelector('.pending-to-po-lines-table');
        const tableWrapper = table?.closest('.table-responsive');
        return {
            pageContent,
            workspace,
            surface: rect('.pending-to-po-page > .bg-white'),
            table: rect('.pending-to-po-lines-table'),
            tableWrapper: tableWrapper ? {
                ...rect('.table-responsive'),
                localScrollRequired: table.scrollWidth > tableWrapper.clientWidth + 1,
            } : null,
            workspaceUtilization: pageContent && workspace ? workspace.width / pageContent.width : null,
        };
    });
    const geometry = await measureLayout(page);
    await attachJson(testInfo, 'workspace-measurements', { measurements, geometry, verification: 'MOCK-VERIFIED' });
    await writeEvidenceJson(testInfo, 'workspace-measurements', { measurements, geometry, verification: 'MOCK-VERIFIED' });
    await capture(page, testInfo, 'pending-purchases-populated');

    expect(geometry.document.overflow, 'No document-level horizontal overflow').toBeLessThanOrEqual(1);
    expect(geometry.clippedOrEscaping, 'No content may be clipped outside the workspace').toEqual([]);
    if (testInfo.project.use.viewport.width >= 1024 && process.env.MARUKA_AUDIT_EXPECT_DENSITY === '1') {
        expect(measurements.workspaceUtilization, 'Operational workspace should use at least 90% of available page width').toBeGreaterThanOrEqual(0.9);
    }

    await page.getByLabel('Filter by Product Name').fill('servo');
    await expect(page.locator('.pending-to-po-lines-table tbody tr')).toHaveCount(1);
    await expect(page.getByText('1 of 3 pending item(s)')).toBeVisible();
    await capture(page, testInfo, 'pending-purchases-filtered');
});

test('@mock @a11y pending purchases has no serious or critical automated violations', async ({ mockPage: page }, testInfo) => {
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'networkidle' });
    const result = await new AxeBuilder({ page }).analyze();
    const significant = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    await attachJson(testInfo, 'axe-results', result);
    expect(significant).toEqual([]);
});

async function capture(page, testInfo, state) {
    fs.mkdirSync(evidenceRoot, { recursive: true });
    const phase = process.env.MARUKA_AUDIT_EVIDENCE_PHASE || 'audit';
    const file = path.join(evidenceRoot, `${phase}-${state}-${testInfo.project.name}.png`);
    await page.screenshot({ path: file, fullPage: false });
    await testInfo.attach(`${state}-screenshot`, { path: file, contentType: 'image/png' });
}

async function attachJson(testInfo, name, value) {
    await testInfo.attach(name, { body: JSON.stringify(value, null, 2), contentType: 'application/json' });
}

async function writeEvidenceJson(testInfo, name, value) {
    fs.mkdirSync(evidenceRoot, { recursive: true });
    const phase = process.env.MARUKA_AUDIT_EVIDENCE_PHASE || 'audit';
    const file = path.join(evidenceRoot, `${phase}-${name}-${testInfo.project.name}.json`);
    fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}
