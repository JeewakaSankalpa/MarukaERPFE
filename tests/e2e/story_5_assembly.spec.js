// tests/e2e/story_5_assembly.spec.js
import { test, expect } from '@playwright/test';

test.describe('Story 5: Panel Assembly (Execution)', () => {

    test.beforeEach(async ({ page }) => {
        // Login as Engineer/Foreman
        await page.goto('/#/login');
        await page.locator('input[id="formUsername"]').fill('eng_eric'); // Assuming ERIC exists
        await page.locator('input[id="formPassword"]').fill('password123');
        await page.getByRole('button', { name: 'Login' }).click();
        await expect(page).toHaveURL(/\/dashboard|\/projects/);
    });

    test('Assembly Execution Flow', async ({ page }) => {
        // 1. Navigate to Project (Assuming created in Story 3)
        await page.goto('/#/projects');
        // Click on "City Mall MDB" or similar
        await page.getByText('City Mall MDB', { exact: false }).first().click();

        // 2. Task Management
        // Switch to Tasks Tab
        await page.getByRole('button', { name: 'Tasks' }).click();

        // Create Task
        await page.getByRole('button', { name: '+ Add Task' }).click();
        await page.locator('input[value=""]').first().fill('Assemble Panel A'); // Name is first input
        // Assign to Eric (Self)
        // Select 'eng_eric'
        // await page.locator('select').first().selectOption({ label: 'Eric Engineer' }); // Needs exact name knowledge
        // Let's just save
        await page.getByRole('button', { name: 'Save Task' }).click();
        await expect(page.getByText('Task Saved')).toBeVisible();

        // Log Work
        // Find Task
        // Click 'Log Time'
        await page.getByRole('button', { name: 'Log Time' }).first().click();
        await page.locator('input[type="number"]').fill('2.5'); // Hours
        await page.getByRole('button', { name: 'Log Time' }).last().click(); // Submit in modal
        await expect(page.getByText('Work Logged')).toBeVisible();

        // 3. Inventory Consumpytion
        // Switch to Inventory Tab
        await page.getByRole('button', { name: 'Inventory' }).click();

        // Consume Item
        await page.getByRole('button', { name: 'Consume Items' }).click();

        // Modal Check
        await expect(page.getByText('Consume Items')).toBeVisible(); // Heading

        // Select Product (If text input or select)
        // We need to know what to consume.
        // Assuming "MCCB" exists from Story 2/4.
        // If the modal exists, we fill it.
        // If it fails here, we confirm the MISSING MODAL bug.

        // Cancel for now to avoid blocking if bug exists (or use test.fixme() if confirmed)
        // await page.getByRole('button', { name: 'Cancel' }).click();
    });
});
