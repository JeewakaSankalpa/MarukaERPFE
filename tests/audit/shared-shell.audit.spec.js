const { test, expect } = require('./support/mock-test');

test('@mock @shell sidebar exposes native keyboard navigation and current route', async ({ mockPage: page }) => {
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'domcontentloaded' });
    const navigation = page.getByRole('navigation', { name: 'Primary navigation' });
    await expect(navigation).toBeVisible();
    const current = navigation.getByRole('button', { name: 'Pending Items' });
    await expect(current).toHaveAttribute('aria-current', 'page');
    await current.focus();
    await expect(current).toBeFocused();
});

test('@mock @shell command palette is modal, focuses search, closes on Escape, and restores focus', async ({ mockPage: page }) => {
    await page.goto('/#/stores/pending-to-po', { waitUntil: 'domcontentloaded' });
    const trigger = page.getByRole('button', { name: 'Open command search' });
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Global search' });
    await expect(dialog).toBeVisible();
    await expect(page.locator('.cmdk-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
});
