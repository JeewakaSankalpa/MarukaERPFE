const { test, expect } = require('./support/audit-test');
const { measureLayout } = require('./support/layout');
const AxeBuilder = require('@axe-core/playwright').default;

test('@smoke @layout public login renders without page-level overflow', async ({ auditPage: page }, testInfo) => {
    await page.goto('/#/login', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).not.toBeEmpty();
    const geometry = await measureLayout(page);
    await testInfo.attach('layout-geometry', {
        body: JSON.stringify(geometry, null, 2),
        contentType: 'application/json',
    });
    expect(geometry.document.overflow, 'Document-level horizontal overflow').toBeLessThanOrEqual(1);
    expect(geometry.clippedOrEscaping, 'Content clipped or escaping the viewport').toEqual([]);
});

test('@a11y public login has no automatically detectable serious or critical violations', async ({ auditPage: page }, testInfo) => {
    await page.goto('/#/login', { waitUntil: 'domcontentloaded' });
    const result = await new AxeBuilder({ page }).analyze();
    const significant = result.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact));
    await testInfo.attach('axe-results', {
        body: JSON.stringify(result, null, 2),
        contentType: 'application/json',
    });
    expect(significant, 'Serious or critical automated accessibility violations').toEqual([]);
});
