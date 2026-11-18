/* eslint-disable testing-library/prefer-screen-queries */
const { test, expect } = require('./support/mock-test');

const assertChartGeometry = async (chart, { minHeight = 180, minMarks = 1 } = {}) => {
    await expect(chart).toBeVisible();
    const box = await chart.boundingBox();
    expect(box).not.toBeNull();
    expect(box.width).toBeGreaterThan(180);
    expect(box.height).toBeGreaterThanOrEqual(minHeight);

    const svg = chart.locator('svg.recharts-surface[role="application"]');
    await expect(svg).toBeVisible();
    const svgBox = await svg.boundingBox();
    expect(svgBox.width).toBeGreaterThan(180);
    expect(svgBox.height).toBeGreaterThanOrEqual(minHeight - 16);
    expect(await chart.locator('.recharts-bar-rectangle, .recharts-pie-sector').count()).toBeGreaterThanOrEqual(minMarks);
};

test('@mock @layout chart review: Income charts retain data, geometry, labels, and tooltip interaction', async ({ mockPage: page }) => {
    await page.goto('/#/finance/income', { waitUntil: 'domcontentloaded' });

    const trend = page.getByRole('img', { name: 'Bar chart of invoiced income by month' });
    await assertChartGeometry(trend, { minMarks: 2 });
    await expect(trend.getByText('2026-10', { exact: true })).toBeVisible();
    await expect(trend.getByText('2026-11', { exact: true })).toBeVisible();
    await expect(trend.getByText('Invoiced Amount')).toBeVisible();

    const mix = page.getByRole('img', { name: 'Donut chart of invoice counts by status' });
    await assertChartGeometry(mix, { minMarks: 3 });
    await expect(mix.getByText('PAID', { exact: true })).toBeVisible();
    await expect(mix.getByText('PARTIALLY_PAID', { exact: true })).toBeVisible();
    await expect(mix.getByText('CANCELLED', { exact: true })).toBeVisible();

    await trend.locator('.recharts-bar-rectangle').first().hover();
    const tooltip = trend.locator('.recharts-tooltip-wrapper');
    await expect(tooltip).toBeVisible();
    await expect(tooltip).toContainText('Invoiced Amount');
});

test('@mock @layout chart review: Expense charts retain all breakdowns and readable geometry', async ({ mockPage: page }) => {
    await page.goto('/#/finance/expenses', { waitUntil: 'domcontentloaded' });

    const visibleChart = page.locator('.expenses-outflow-panel').locator('.tab-pane.active');
    await assertChartGeometry(visibleChart, { minMarks: 2 });
    await expect(visibleChart.locator('.recharts-legend-wrapper')).toContainText('Loans');
    await expect(visibleChart.locator('.recharts-legend-wrapper')).toContainText('Site Expenses');

    await page.getByRole('tab', { name: 'By Payment Method' }).click();
    const paymentChart = page.locator('.expenses-outflow-panel').locator('.tab-pane.active');
    await assertChartGeometry(paymentChart, { minMarks: 2 });
    await expect(paymentChart.locator('.recharts-legend-wrapper')).toContainText('Credit Card');

    const monthlyChart = page.locator('.expenses-trend-panel');
    await expect(monthlyChart.locator('svg.recharts-surface[role="application"]')).toBeVisible();
    expect(await monthlyChart.locator('.recharts-bar-rectangle').count()).toBeGreaterThanOrEqual(2);
});

test('@mock @layout chart review: Inventory charts render populated axes, series, and values', async ({ mockPage: page }) => {
    await page.goto('/#/inventory/dashboard', { waitUntil: 'networkidle' });

    const charts = page.locator('.inventory-dashboard-chart-body');
    await expect(charts).toHaveCount(2);
    for (const chart of await charts.all()) await assertChartGeometry(chart, { minMarks: 2 });

    await expect(charts.first().getByText('Jun', { exact: true })).toBeVisible();
    await expect(charts.first().getByText('Nov', { exact: true })).toBeVisible();
    await expect(charts.nth(1).locator('.recharts-bar-rectangle')).toHaveCount(3);
});

test('@mock @layout chart review: Procurement status distribution preserves categories and proportional marks', async ({ mockPage: page }) => {
    await page.goto('/#/procurement/dashboard', { waitUntil: 'networkidle' });

    const chart = page.locator('.procurement-status-chart');
    await expect(chart).toBeVisible();
    await expect(chart).toHaveAttribute('aria-label', /Sent to supplier 2/);
    await expect(chart).toHaveAttribute('aria-label', /Partially received 1/);
    const box = await chart.boundingBox();
    expect(box.width).toBeGreaterThan(240);
    expect(box.height).toBeGreaterThan(80);
    const widths = await chart.locator('.procurement-status-fill').evaluateAll(elements => elements.map(element => Number.parseFloat(element.style.width)));
    expect(widths.every(width => width > 0 && width <= 100)).toBe(true);
    expect(Math.max(...widths)).toBe(100);
});

test('@mock @layout chart review: non-chart finance and project visual summaries remain populated', async ({ mockPage: page }) => {
    await page.goto('/#/finance/dashboard', { waitUntil: 'domcontentloaded' });
    const cashFlow = page.getByRole('region', { name: 'Cash flow summary' });
    await expect(cashFlow).toContainText('Total inflow');
    await expect(cashFlow).toContainText('Total outflow');
    await expect(cashFlow).toContainText('Net cash flow');
    await expect(page.locator('.fd-outflow-list > div')).toHaveCount(5);

    await page.goto('/#/finance/reports', { waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Financial statements' })).toBeVisible();
    await expect(page.getByText('2,182,280.00').first()).toBeVisible();

    await page.goto('/#/projects/manage/project-001', { waitUntil: 'domcontentloaded' });
    await expect(page.getByText('LKR 17.41', { exact: true })).toBeVisible();
    await expect(page.getByText('LKR 114.11', { exact: true })).toBeVisible();
});
