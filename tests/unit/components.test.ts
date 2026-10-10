import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, test } from 'vitest';
import Hero from '../../src/components/Hero.astro';
import SeriesList from '../../src/components/SeriesList.astro';
import ShortList from '../../src/components/ShortList.astro';
import VideoList from '../../src/components/VideoList.astro';
import type { Video } from '../../src/lib/types.ts';

const video = (title: string, published = '2026-10-01T10:00:00.000Z'): Video => ({
  id: 'abcdefghijk',
  type: 'long',
  title,
  published,
  thumb: null,
  thumbSource: null,
});

describe('components', () => {
  test('hero without any video shows the brand and no player', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, { props: { video: null } });
    expect(html).toContain('Odebírat na YouTube');
    expect(html).toContain('Pět světel');
    expect(html).not.toContain('data-player');
    expect(html).not.toContain('player.js');
  });

  test('hero with a video but no thumbnail file still renders the play link', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, { props: { video: video('Měsíc v motorsportu') } });
    expect(html).toContain('data-video-id="abcdefghijk"');
    expect(html).toContain('href="https://www.youtube.com/watch?v=abcdefghijk"');
    expect(html).toContain('/player.js');
  });

  test('empty lists render no section', async () => {
    const container = await AstroContainer.create();
    expect(await container.renderToString(VideoList, { props: { videos: [], relaunchDate: '2026-09-25' } })).not.toContain('<section');
    expect(await container.renderToString(ShortList, { props: { shorts: [] } })).not.toContain('<section');
    expect(await container.renderToString(SeriesList, { props: { items: [] } })).not.toContain('<section');
  });

  test('titles are escaped exactly once', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(VideoList, {
      props: { videos: [video('Tom & Jerry <3 "GP"')], relaunchDate: '2026-09-25' },
    });
    expect(html).toContain('Tom &amp; Jerry &lt;3');
    expect(html).not.toContain('&amp;amp;');
  });

  test('archive badge only on videos before the relaunch', async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(VideoList, {
      props: { videos: [video('Starý díl', '2022-02-13T22:00:12.000Z')], relaunchDate: '2026-09-25' },
    });
    expect(html).toContain('Archiv 2022');
    expect(html).toContain('13. února 2022');
  });
});
