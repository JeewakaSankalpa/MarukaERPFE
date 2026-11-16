const { defineConfig, devices } = require('@playwright/test');

const baseURL = process.env.MARUKA_AUDIT_BASE_URL || 'http://audit-target.invalid';

module.exports = defineConfig({
    testDir: './tests/audit',
    testMatch: '**/*.audit.spec.js',
    globalSetup: require.resolve('./tests/audit/support/global-setup'),
    timeout: 45_000,
    expect: { timeout: 10_000 },
    fullyParallel: true,
    forbidOnly: true,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 2 : undefined,
    outputDir: 'output/playwright/test-results',
    reporter: [
        ['list'],
        ['html', { outputFolder: 'output/playwright/report', open: 'never' }],
        ['json', { outputFile: 'output/playwright/results.json' }],
    ],
    use: {
        baseURL,
        channel: process.env.MARUKA_AUDIT_BROWSER_CHANNEL || undefined,
        actionTimeout: 10_000,
        navigationTimeout: 20_000,
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: process.env.MARUKA_AUDIT_DISABLE_VIDEO === '1' ? 'off' : 'retain-on-failure',
        serviceWorkers: 'block',
    },
    projects: [
        { name: 'chromium-desktop-1440', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } },
        { name: 'chromium-laptop-1280', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
        { name: 'chromium-intermediate-1024', use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 768 } } },
        { name: 'chromium-reflow-200-percent', use: { ...devices['Desktop Chrome'], viewport: { width: 640, height: 720 } } },
        { name: 'chromium-tablet-768', use: { ...devices['iPad (gen 7)'], browserName: 'chromium', viewport: { width: 768, height: 1024 } } },
        { name: 'chromium-mobile-390', use: { ...devices['iPhone 13'], browserName: 'chromium', viewport: { width: 390, height: 844 } } },
        { name: 'chromium-mobile-360', use: { ...devices['Galaxy S9+'], browserName: 'chromium', viewport: { width: 360, height: 800 } } },
        { name: 'firefox-desktop-1440', use: { ...devices['Desktop Firefox'], viewport: { width: 1440, height: 900 } } },
        { name: 'webkit-desktop-1440', use: { ...devices['Desktop Safari'], viewport: { width: 1440, height: 900 } } },
    ],
});
