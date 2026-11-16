const { chromium, firefox, webkit } = require('@playwright/test');

const engines = { chromium, firefox, webkit };

(async () => {
    let failures = 0;
    for (const [name, engine] of Object.entries(engines)) {
        try {
            const browser = await engine.launch({ headless: true });
            const page = await browser.newPage();
            await page.setContent('<title>Maruka audit browser check</title><main>ok</main>');
            const title = await page.title();
            await browser.close();
            console.log(`${name}: PASS (${title})`);
        } catch (error) {
            failures += 1;
            console.error(`${name}: BLOCKED (${String(error.message).split('\n')[0]})`);
        }
    }
    process.exitCode = failures ? 1 : 0;
})();
