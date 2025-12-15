// tests/e2e/story_0_master.spec.js
import { test, expect } from '@playwright/test';

test.describe('Story 0: Master Data Setup (Suppliers & Customers)', () => {

    test.beforeEach(async ({ page, request }) => {
        try {
            await request.post('http://localhost:8080/api/auth/reset-password', {
                data: { username: 'jeewaka', newPassword: 'wSLmuA3nNo' }
            });
        } catch (e) { }

        await page.goto('/#/login');
        await page.getByLabel('Username').fill('jeewaka');
        await page.getByLabel('Password').fill('wSLmuA3nNo');
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page).toHaveURL(/\/dashboard|\/admin/);
    });

    test('Create Supplier (Electro World)', async ({ page }) => {
        await page.goto('/#/supplier/create');

        const heading = page.getByRole('heading', { name: /Suppliers/i });
        if (await heading.isVisible()) {
            await page.getByRole('button', { name: '+ New Supplier' }).click();
        }

        await expect(page.getByRole('heading', { name: 'Create Supplier' })).toBeVisible();

        const inputs = page.locator('input[type="text"]');
        // Index strategy based on SupplierPage.js DOM structure
        // 0: SupplierCode (visible if !id), 1: Name, 2: TaxID, 3: Email, 4: Phone, 5: Line1
        await inputs.nth(1).fill('Electro World');
        await inputs.nth(3).fill('sales@electroworld.com');
        await inputs.nth(4).fill('0112233445');
        await inputs.nth(5).fill('123 Electric Ave');

        await page.getByRole('button', { name: 'Save Supplier' }).click();
        await expect(page.getByText('Supplier created')).toBeVisible();
    });

    test('Create Customer (Mall Builders Inc)', async ({ page }) => {
        await page.goto('/#/customer/create');
        await expect(page.getByRole('heading', { name: 'Add Customer' })).toBeVisible();

        await page.getByLabel('Company Name').fill('Mall Builders Inc');
        await page.getByLabel('Company Address').fill('456 Construction Rd');
        await page.getByLabel('Company Email').fill('info@mallbuilders.com');
        await page.getByLabel('Company Contact Number').fill('0771234567');
        await page.getByLabel('Company Business Register Number').fill('BR-9988');
        await page.getByLabel('Currency').selectOption({ label: 'Rupees' });
        await page.getByLabel('Credit Period (days)').fill('30');
        await page.getByLabel('Contact Person Name').fill('Bob Builder');
        await page.getByLabel('Contact Person Mobile Number').fill('0777654321');
        await page.getByLabel('Contact Person Email').fill('bob@mallbuilders.com');
        await page.getByLabel('Password').fill('password123');
        await page.getByLabel('VAT Type').selectOption({ value: 'VAT' });
        await page.getByPlaceholder(/Enter your VAT number/i).fill('123456789-V');

        const buffer = Buffer.from('dummy pdf content');
        await page.getByLabel('VAT Registration Document *').setInputFiles({
            name: 'vat.pdf',
            mimeType: 'application/pdf',
            buffer: buffer
        });

        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Customer saved!')).toBeVisible();
    });

});
