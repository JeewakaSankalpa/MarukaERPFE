const { test, expect } = require('@playwright/test');
const fs = require('fs');

test('Customer Create Flow with Validations', async ({ page }) => {
    // Clear log file
    fs.writeFileSync('test_logs.txt', '');

    page.on('console', msg => {
        const text = `PAGE LOG: ${msg.text()}\n`;
        console.log(text);
        fs.appendFileSync('test_logs.txt', text);
    });

    // 1. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('#formUsername', 'kasun');
    await page.fill('#formPassword', 'password12');
    await page.click('button[type="submit"]');

    // Wait for navigation to admin dashboard
    await page.waitForURL('**/admin');

    // 2. Navigate to Customer Create
    await page.goto('http://localhost:3000/customer/create');

    // Verify page loaded
    await expect(page.locator('h2', { hasText: 'Add Customer' })).toBeVisible();

    // 3. Trigger Validations (Empty Submit)
    await page.click('button[type="submit"]');

    // Verify red outlines (is-invalid class)
    // We expect at least one field to be invalid.
    // Note: We need to wait a bit for React to update the DOM
    await page.waitForTimeout(1000);
    const invalidInputs = await page.locator('.form-control.is-invalid').count();
    console.log(`Found ${invalidInputs} invalid inputs`);
    expect(invalidInputs).toBeGreaterThan(0);

    // 4. Test Invalid Mobile Number
    await page.fill('input[name="comContactNumber"]', '123');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Contact Number must be 10 digits and start with 0')).toBeVisible();

    // 5. Test Invalid Email
    await page.fill('input[name="comEmail"]', 'invalid-email');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invalid email format')).toBeVisible();

    // 6. Verify BR Number does not require email format
    await page.fill('input[name="businessRegNumber"]', 'BR-12345'); // Non-email format

    // 7. Fill Valid Data
    await page.fill('input[name="comName"]', 'Test Company');
    await page.fill('input[name="comAddress"]', '123 Test St');
    await page.fill('input[name="comEmail"]', 'test@company.com');
    await page.fill('input[name="comContactNumber"]', '0771234567');
    // BR Number already filled
    await page.selectOption('select[name="currency"]', 'VAT'); // Rupees
    await page.fill('input[name="creditPeriod"]', '30');
    await page.fill('input[name="contactPersonData.name"]', 'John Doe');
    await page.fill('input[name="contactPersonData.contactNumber"]', '0719876543');
    await page.fill('input[name="contactPersonData.email"]', 'john@company.com');
    await page.selectOption('select[name="vatType"]', 'VAT');
    await page.fill('input[name="vatNumber"]', 'VAT999');

    // 8. Submit
    page.on('dialog', async dialog => {
        console.log(`Dialog message: ${dialog.message()}`);
        await dialog.accept();
    });

    await page.click('button[type="submit"]');

    // 9. Verify Redirection
    await page.waitForURL('**/customer/search');
});
