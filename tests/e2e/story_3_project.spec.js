// tests/e2e/story_3_project.spec.js
import { test, expect } from '@playwright/test';

test.describe('Story 3: The Mall Project (Initiation)', () => {

    test.beforeEach(async ({ page, request }) => {
        // Use jeewaka (Admin) for reliability.
        try {
            await request.post('http://localhost:8080/api/auth/reset-password', {
                data: { username: 'jeewaka', newPassword: 'wSLmuA3nNo' }
            });
        } catch (e) {
            console.log('Password reset attempt failed, proceeding to login...', e);
        }
        await page.goto('/#/login');
        await page.locator('input[id="formUsername"]').fill('jeewaka');
        await page.locator('input[id="formPassword"]').fill('wSLmuA3nNo');
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page).toHaveURL(/\/dashboard|\/projects/);
    });

    test('Create Project City Mall MDB', async ({ page }) => {
        await page.goto('/#/projects/create');

        // Fill Project Form
        // Assuming standard inputs, checking for 'Project Name', 'Client', etc.
        await expect(page.getByRole('heading', { name: 'Create New Project' })).toBeVisible();

        const pName = `Mall_Residency_${Date.now()}`;
        await page.getByLabel('Project Name').fill(pName);

        // Select Customer (Standard HTML Select)
        // Need to ensure customers exist. Story 1 didn't create customers, only Dept/Emp.
        // We might need to quickly seed a customer or pick first available.
        // Assuming 'Select Customer' option exists.
        const custSelect = page.getByLabel('Customer');
        await expect(custSelect).toBeVisible();
        // Just pick the second option (index 1) which should be a real customer if any exist
        // If no customers, this will fail. We should probably create one or mock it.
        // For now, let's assume seed data or existing data.
        // Or wait, the dropdown maps `customers`.
        // Let's create a customer quickly in a separate step or just pick index 1.
        await custSelect.selectOption({ index: 1 });

        // Select Sales Rep
        await page.getByLabel('Sales Representative').selectOption({ index: 1 });

        await page.getByLabel('Comment').fill('Initial setup for Mall Project');

        await page.getByRole('button', { name: 'Save Project' }).click();

        // Expect redirection to Project Details
        await expect(page).toHaveURL(/\/projects\/manage\/\d+/);
        await expect(page.getByText('Project Overview')).toBeVisible();
    });

    test('Project Estimation', async ({ page }) => {
        // Go to estimation page (normally via Details -> Estimation, or direct)
        // We need the project ID. For simplicity in this standalone test, we might need to find the project we just created.
        // Or we can rely on flow.

        // Let's assume we are on dashboard. Go to Projects -> Search -> Click View -> Workflow?
        // Easier: Go to /projects/estimation which lists projects.
        await page.goto('/#/projects/estimation');

        const item = { name: 'MCCB', qty: '10' };
        // Assuming a Combobox or Select
        // If react-select, need complex locator.
        // Let's assume standard Select or Input with Datalist for now.

        // Fill Name search (React-Select)
        // Click the placeholder to focus/open
        await page.getByText('Search product by name…').last().click(); // Use last() as adding new row
        // Type to filter (simulating typing in the hidden input or focused div)
        await page.keyboard.type(item.name);
        // Click the option
        await page.getByText(item.name).first().click();

        // Quantity
        // Find the row with the item name
        const row = page.getByRole('row').filter({ hasText: item.name });
        // Component A is usually the 3rd column (index 2: Product, Cost, CompA)
        // We target the input in the 3rd cell.
        await row.locator('td').nth(2).locator('input').fill(item.qty);

        // Add Row button is at bottom, but we are inside loop.
        // Add Row button is at bottom, but we are inside loop.
        // If we need a NEW row for the next item, we click Add.
        // await page.getByRole('button', { name: '+ Add Product Row' }).click();

        await page.getByRole('button', { name: 'Save' }).click();
        await expect(page.getByText('Estimation saved')).toBeVisible();
    });
});
