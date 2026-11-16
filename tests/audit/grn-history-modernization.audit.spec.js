const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./support/mock-test');
const { measureLayout } = require('./support/layout');
test('@mock @layout @a11y GRN history is responsive and searchable', async ({ mockPage: page }, testInfo) => {
  await page.goto('/#/grns', { waitUntil:'networkidle' });
  await expect(page.getByRole('heading',{name:'Goods Received Notes'})).toBeVisible();
  await expect(page.getByText('GRN-2026-001')).toBeVisible();
  await page.getByPlaceholder('Search GRN / PO Number / Supplier').fill('GRN-2026');
  await page.getByPlaceholder('Search GRN / PO Number / Supplier').press('Enter');
  const layout=await measureLayout(page); expect(layout.document.overflow).toBeLessThanOrEqual(1); expect(layout.clippedOrEscaping).toEqual([]);
  if(testInfo.project.use.viewport.width<=390){const n=await page.locator('.grn-list-table-scroll').evaluate(e=>e.scrollWidth-e.clientWidth);expect(n).toBeGreaterThan(0);}
  const axe=await new AxeBuilder({page}).analyze(); expect(axe.violations.filter(v=>['serious','critical'].includes(v.impact))).toEqual([]);
});
