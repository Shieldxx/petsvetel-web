import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

for (const path of ['/', '/soukromi', '/tohle-neexistuje']) {
  test(`axe finds no WCAG 2.1 AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
  });
}

test('the skip link is the first stop and becomes visible', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Přeskočit na obsah' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
});
