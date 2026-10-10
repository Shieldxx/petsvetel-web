import { expect, test } from '@playwright/test';

test('privacy page names the controller and only the public contact', async ({ page }) => {
  await page.goto('/soukromi');
  await expect(page).toHaveTitle('Soukromí | Pět světel');
  await expect(page.getByRole('heading', { level: 1, name: 'Soukromí' })).toBeVisible();
  await expect(page.getByText('David Kohout')).toBeVisible();
  await expect(page.getByRole('link', { name: 'kontakt@petsvetel.cz' })).toHaveAttribute('href', 'mailto:kontakt@petsvetel.cz');
  expect(await page.content()).not.toMatch(/@gmail\.com/);
});

test('unknown path returns 404 with the custom page', async ({ page }) => {
  const response = await page.goto('/tohle-neexistuje');
  expect(response?.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Tahle stránka neexistuje');
  await expect(page.getByRole('link', { name: 'Zpět na úvod' })).toHaveAttribute('href', '/');
});

test('robots.txt and the sitemap exist', async ({ request }) => {
  const robots = await request.get('/robots.txt');
  expect(robots.ok()).toBe(true);
  expect(await robots.text()).toContain('Sitemap: https://petsvetel.cz/sitemap-index.xml');
  const sitemap = await request.get('/sitemap-index.xml');
  expect(sitemap.ok()).toBe(true);
});

test('static pages have no em dash', async ({ page }) => {
  for (const path of ['/soukromi', '/tohle-neexistuje']) {
    await page.goto(path);
    expect(await page.locator('main').innerText()).not.toContain('—');
  }
});
