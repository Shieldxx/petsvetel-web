import { expect, test } from '@playwright/test';

test.describe('@deployed', () => {
  test('security headers, HTML without long cache', async ({ request }) => {
    const headers = (await request.get('/')).headers();
    expect(headers['content-security-policy']).toContain('frame-src https://www.youtube-nocookie.com');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['cache-control'] ?? '').not.toContain('max-age=31536000');
  });

  test('fingerprinted assets are cached for a year', async ({ page, request }) => {
    await page.goto('/');
    const href = await page.locator('link[rel="stylesheet"]').first().getAttribute('href');
    expect(href).toMatch(/^\/_astro\//);
    expect((await request.get(href as string)).headers()['cache-control']).toContain('immutable');
  });

  test('preview host is noindex, production host is indexable', async ({ request, baseURL }) => {
    const robots = (await request.get('/')).headers()['x-robots-tag'];
    if (new URL(baseURL as string).hostname.endsWith('.workers.dev')) expect(robots).toContain('noindex');
    else expect(robots).toBeUndefined();
  });

  test('no CSP violations, also after the player loads', async ({ page }) => {
    const problems: string[] = [];
    page.on('console', (message) => {
      if (/Content Security Policy|Refused to/i.test(message.text())) problems.push(message.text());
    });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('[data-player] .player__link').click();
    await expect(page.locator('[data-player] iframe')).toBeVisible();
    expect(problems).toEqual([]);
  });
});
