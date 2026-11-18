/* eslint-disable testing-library/prefer-screen-queries, jest/no-conditional-expect */
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');

test('@mock @layout @a11y Receivables supports responsive aging review and customer filtering', async ({ mockPage: page }) => {
    await page.goto('/#/reports/receivables', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Customer receivables' })).toBeVisible();
    const summary = page.getByRole('region', { name: 'Receivables exposure summary' });
    await expect(summary).toContainText('730,000.75');
    await expect(summary).toContainText('3 open invoices');
    await expect(page.getByText('Colombo Distribution Partners')).toBeVisible();
    await expect(page.getByText('INV-2026-0901')).toBeVisible();

    const customer = page.getByRole('textbox', { name: 'Filter receivables by customer name' });
    await customer.fill('Lanka Engineering');
    const requestPromise = page.waitForRequest(request => request.url().includes('/api/reports/receivables') && request.url().includes('customerName=Lanka+Engineering'));
    await page.getByRole('button', { name: 'Apply filters' }).click();
    await requestPromise;

    const report = page.getByRole('region', { name: 'Customer aging report' });
    await report.focus();
    await expect(report).toBeFocused();
    const layout = await measureLayout(page);
    expect(layout.document.overflow).toBeLessThanOrEqual(1);
    expect(layout.clippedOrEscaping).toEqual([]);
    if (layout.viewport.width <= 1024) {
        const overflow = await report.evaluate(element => element.scrollWidth - element.clientWidth);
        expect(overflow).toBeGreaterThan(0);
    }
    const axe = await new AxeBuilder({ page }).analyze();
    expect(axe.violations.filter(item => ['serious', 'critical'].includes(item.impact))).toEqual([]);
});

test('@mock @layout Receivables presents an explicit empty result without losing totals', async ({ mockPage: page }) => {
    await page.route('**/api/reports/receivables*', route => route.fulfill({ status: 200, contentType: 'application/json', body: '[]' }));
    await page.goto('/#/reports/receivables', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('No records found')).toBeVisible();
    await expect(page.getByText('TOTAL RECEIVABLE')).toBeVisible();
    await expect(page.getByRole('region', { name: 'Receivables exposure summary' })).toContainText('0 open invoices');
});

