import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { expect, test } from 'vitest';
import Base from '../../src/layouts/Base.astro';

test('Base: Czech page with canonical, Open Graph and description', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Base, {
    props: { path: '/soukromi', title: 'Soukromí' },
    slots: { default: '<p>obsah</p>' },
  });
  expect(html).toContain('<html lang="cs"');
  expect(html).toContain('<title>Soukromí | Pět světel</title>');
  expect(html).toContain('rel="canonical" href="https://petsvetel.cz/soukromi"');
  expect(html).toContain('property="og:image" content="https://petsvetel.cz/og.png"');
  expect(html).toContain('Přeskočit na obsah');
  expect(html).toContain('<p>obsah</p>');
  expect(html).not.toContain('noindex');
});

test('Base: noindex pages drop the canonical link', async () => {
  const container = await AstroContainer.create();
  const html = await container.renderToString(Base, { props: { path: '/404', title: 'Stránka nenalezena', noindex: true } });
  expect(html).toContain('<meta name="robots" content="noindex"');
  expect(html).not.toContain('rel="canonical"');
});
