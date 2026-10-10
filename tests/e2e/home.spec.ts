import { expect, test } from '@playwright/test';

const GOOGLE = /(^|\.)(youtube\.com|youtube-nocookie\.com|ytimg\.com|googlevideo\.com|google\.com|gstatic\.com|googleapis\.com|doubleclick\.net)$/;
// 25 Sep 2026 00:00 in Prague
const RELAUNCH_UTC = '2026-09-24T22:00:00.000Z';

test('homepage shows the brand, the subscribe button and the latest video', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle('Pět světel: český kanál o motorsportu');
  await expect(page.getByRole('heading', { level: 1, name: 'Pět světel' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Odebírat na YouTube' })).toHaveAttribute(
    'href',
    'https://www.youtube.com/@PetSvetel?sub_confirmation=1',
  );
  await expect(page.locator('[data-player]')).toHaveCount(1);
});

test('no request leaves for Google before the visitor clicks play', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (GOOGLE.test(new URL(request.url()).hostname)) external.push(request.url());
  });
  await page.goto('/');
  await page.mouse.wheel(0, 5000);
  await page.waitForLoadState('networkidle');
  expect(external).toEqual([]);
});

test('clicking play swaps in the youtube-nocookie player', async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) => route.fulfill({ status: 200, body: '' }));
  await page.goto('/');
  const player = page.locator('[data-player]');
  const id = await player.getAttribute('data-video-id');
  await player.getByRole('link', { name: /Přehrát video/ }).click();
  await expect(player.locator('iframe')).toHaveAttribute('src', `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('the play button is a plain YouTube link', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-player] .player__link')).toHaveAttribute(
      'href',
      /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/,
    );
  });
});

test('video cards: Czech dates, archive badge only before the relaunch', async ({ page }) => {
  await page.goto('/');
  const cards = page.locator('#videa .card');
  const count = await cards.count();
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    const datetime = (await card.locator('time').getAttribute('datetime')) ?? '';
    await expect(card.locator('time')).toHaveText(/^\d{1,2}\.\s\p{Ll}+\s\d{4}$/u);
    await expect(card.locator('.badge')).toHaveCount(datetime < RELAUNCH_UTC ? 1 : 0);
  }
});

test('Shorts open the Shorts player and there are at most six', async ({ page }) => {
  await page.goto('/');
  const links = page.locator('#shorts .short__link');
  const count = await links.count();
  expect(count).toBeLessThanOrEqual(6);
  for (let i = 0; i < count; i++) {
    await expect(links.nth(i)).toHaveAttribute('href', /^https:\/\/www\.youtube\.com\/shorts\/[A-Za-z0-9_-]{11}$/);
  }
});

test('phone: no horizontal scroll, brand above the player', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await page.goto('/');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  const brand = await page.locator('.hero__brand').boundingBox();
  const player = await page.locator('[data-player]').boundingBox();
  expect(brand?.y ?? 0).toBeLessThan(player?.y ?? 0);
});

test('the About text has no em dash', async ({ page }) => {
  await page.goto('/');
  expect(await page.locator('#o-kanalu').innerText()).not.toContain('—');
});
