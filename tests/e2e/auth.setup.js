// tests/e2e/auth.setup.js
import { test as setup, expect } from '@playwright/test';

const adminFile = 'playwright/.auth/admin.json';

setup('authenticate as admin', async ({ page, request }) => {
    // 1. Reset Password (Fix: Force update 'jeewaka' to valid BCrypt hash match)
    try {
        await request.post('http://localhost:8080/api/auth/reset-password', {
            data: {
                username: 'jeewaka',
                newPassword: 'wSLmuA3nNo'
            }
        });
    } catch (e) {
        console.log('Auth setup: Password reset failed', e);
    }

    // 2. Navigate to Login
    await page.goto('/#/login');

    // 3. Fill Credentials
    await page.getByLabel('Username').fill('jeewaka');
    await page.getByLabel('Password').fill('wSLmuA3nNo');

    // 3. Click Login
    await page.getByRole('button', { name: 'Login' }).click();

    // 4. Wait for redirection to Dashboard or Admin Panel
    await expect(page).toHaveURL(/\/dashboard|\/admin/);

    // 5. Save state
    await page.context().storageState({ path: adminFile });
});
