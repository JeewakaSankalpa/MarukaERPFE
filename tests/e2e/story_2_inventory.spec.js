// tests/e2e/story_2_inventory.spec.js
import { test, expect } from '@playwright/test';

test.describe('Story 2: The Catalog (Inventory Setup)', () => {

    test.beforeEach(async ({ page, request }) => {
        // Debug
        page.on('console', msg => console.log('BROWSER:', msg.text()));

        // Force update 'jeewaka' to valid BCrypt hash match
        try {
            await request.post('http://localhost:8080/api/auth/reset-password', {
                data: {
                    username: 'jeewaka',
                    newPassword: 'wSLmuA3nNo'
                }
            });
        } catch (e) {
            console.log('Password reset attempt failed, proceeding to login...', e);
        }

        // Ensure jeewaka login
        await page.goto('/#/login');
        await page.getByLabel('Username').fill('jeewaka');
        await page.getByLabel('Password').fill('wSLmuA3nNo');
        await page.getByRole('button', { name: 'Login' }).click();

        // Wait for redirect to Dashboard or Admin
        try {
            await expect(page).toHaveURL(/\/dashboard|\/admin/, { timeout: 15000 });
        } catch (e) {
            console.log('Login Redirect Timeout! Current URL:', page.url());
            throw e;
        }
    });

    test('Add Items to Catalog (Product Creation)', async ({ page }) => {
        // Navigate to Product Page
        console.log('Navigated to /product/create');
        await page.goto('/#/product/create');

        // Check list vs form
        // ProductsPage starts in List mode by default (useEffect sets currentId=undefined)

        // Wait for page load (Heading 'Products')
        // Using regex to match exact 'Products'
        await expect(page.getByRole('heading', { name: /^Products$/ })).toBeVisible();
        console.log('Products List Visible');

        // Click New Product
        await page.getByRole('button', { name: '+ New Product' }).click();

        await expect(page.getByRole('heading', { name: 'Create Product' })).toBeVisible();
        console.log('Create Product Form Visible');

        const items = [
            { sku: 'MCCB-100A', name: 'MCCB 100A 4P', cost: '5000', cat: 'Electrical', unit: 'Nos', selling: '7500' },
            { sku: 'RELAY-24V', name: 'Omron Relay 24VDC', cost: '1200', cat: 'Electrical', unit: 'Nos', selling: '1800' },
            { sku: 'ENCLOSURE-S', name: 'Steel Enclosure 400x400', cost: '3000', cat: 'Mechanical', unit: 'Nos', selling: '4500' }
        ];

        for (const item of items) {
            // If we are at List (because previous save succeeded and reset view)
            if (await page.getByRole('heading', { name: /^Products$/ }).isVisible()) {
                await page.getByRole('button', { name: '+ New Product' }).click();
            }

            // Fill Form
            await page.getByLabel(/^SKU/).fill(item.sku);
            await page.getByLabel(/^Name/).fill(item.name);
            await page.getByLabel('Category').fill(item.cat);
            await page.getByLabel('Unit').fill(item.unit);
            await page.getByLabel(/^Original Cost Price/).fill(item.cost);
            await page.getByLabel('Default Selling Price').fill(item.selling);

            // Save
            await page.getByRole('button', { name: 'Save Product' }).click();

            // Verify Success
            await expect(page.getByText('Product created')).toBeVisible();

            // Wait for transition to list
            await expect(page.getByRole('heading', { name: /^Products$/ })).toBeVisible();

            // Verify content
            // Need to clear search if reuse
            // Just search for this item
            const searchBox = page.getByPlaceholder('Search name/SKU/barcode');
            await searchBox.fill(item.sku);
            await page.getByRole('button', { name: 'Search' }).click();
            await expect(page.getByRole('cell', { name: item.name })).toBeVisible();

            // Clear search for next loop?
            // ProductsPage re-mounts on "New Product" -> List transition?
            // Actually, if we are in List mode, and click "+ New Product", we go to Form.
            // When we Save, we go back to List. State resets? 
            // In ProductsPage: const [q, setQ] = useState("");
            // If the whole component remounts, state resets.
            // App.js renders: <Route path="/product/create" element={<ProductsPage />} />
            // ProductsPage manages `currentId` state internally.
            // It does NOT unmount the whole page. It toggles `currentId`.
            // So `q` (search query) MIGHT PERSIST if strict React behavior.
            // But `ProductsPage` defines `currentId` state. 
            // `ProductList` is a sub-component.
            // `<ProductList>` has `const [q, setQ] = useState("");`.
            // When `currentId` changes to `null` (Form), `ProductList` IS UNMOUNTED.
            // When `currentId` changes to `undefined` (List), `ProductList` IS MOUNTED FRESH.
            // So state resets. Search clears.
        }
    });
});
