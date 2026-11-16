const { test, expect } = require('./support/mock-test');

test('@mock @performance task drawer open and close timing', async ({ mockPage: page }) => {
    await page.goto('/#/projects/tasks', { waitUntil: 'networkidle' });
    const drawer = page.getByRole('complementary', { name: 'Task details' });
    await page.evaluate(() => {
        const state = { start: 0, inserted: null, animationStart: null, closeStart: 0, removed: null, longTasks: [] };
        const observer = new MutationObserver(() => {
            const visibleDrawer = document.querySelector('.tcc-drawer');
            if (visibleDrawer && state.inserted === null) state.inserted = performance.now();
            if (!visibleDrawer && state.inserted !== null && state.removed === null) state.removed = performance.now();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        document.addEventListener('animationstart', (event) => {
            if (event.target.classList?.contains('tcc-drawer')) state.animationStart = performance.now();
        });
        if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
            new PerformanceObserver((entries) => state.longTasks.push(...entries.getEntries().map((entry) => entry.duration))).observe({ type: 'longtask' });
        }
        window.__taskDrawerTiming = state;
    });

    await page.evaluate(() => document.querySelector('.tcc-primary-button').addEventListener('click', () => { window.__taskDrawerTiming.start = performance.now(); }, { once: true }));
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(drawer).toBeVisible();
    const openAnimation = await drawer.evaluate((element) => getComputedStyle(element).animationDuration);

    await page.evaluate(() => document.querySelector('.tcc-drawer .tcc-icon-button').addEventListener('click', () => { window.__taskDrawerTiming.closeStart = performance.now(); }, { once: true }));
    await page.getByRole('button', { name: 'Close task details' }).click();
    await expect(drawer).toBeHidden();

    const timing = await page.evaluate(() => window.__taskDrawerTiming);
    console.log(`[task-drawer] open-dom=${(timing.inserted - timing.start).toFixed(1)}ms open-animation-start=${(timing.animationStart - timing.start).toFixed(1)}ms open-animation=${openAnimation} close-dom=${(timing.removed - timing.closeStart).toFixed(1)}ms long-tasks=${Math.max(0, ...timing.longTasks).toFixed(1)}ms`);
    expect(timing.inserted - timing.start).toBeLessThan(500);
    expect(timing.removed - timing.closeStart).toBeLessThan(500);
});
