// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://petsvetel.cz',
  trailingSlash: 'never',
  build: {
    // dist/soukromi.html is served at /soukromi by Workers static assets
    format: 'file',
    // keep every stylesheet external so the CSP can stay at style-src 'self'
    inlineStylesheets: 'never',
  },
  integrations: [sitemap()],
});
