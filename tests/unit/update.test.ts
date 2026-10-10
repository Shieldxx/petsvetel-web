import { mkdir, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { describe, expect, test } from 'vitest';
import { feedUrls } from '../../scripts/videos/feed.ts';
import type { FetchLike } from '../../scripts/videos/fetch.ts';
import { thumbUrl } from '../../scripts/videos/thumbs.ts';
import { MAX_REMOVALS, runUpdate, type UpdateOptions } from '../../scripts/videos/update.ts';
import { site } from '../../src/config.ts';
import type { VideoData } from '../../src/lib/types.ts';
import { atomFeed, type FixtureEntry } from './fixtures/feeds.ts';

const urls = feedUrls(site.channelId);
const LONG: FixtureEntry = { id: '6qjHnsmyirA', title: "Měsíc v motorsportu - Září 26'", published: '2026-09-25T16:39:48+00:00' };
const SHORT: FixtureEntry = { id: 'W4g0j0E5lpg', title: 'Kdo podle mě vyhraje v Malaysii?', published: '2026-10-03T18:25:54+00:00', short: true };

const jpeg = async (width: number, height: number, shade = 60) =>
  new Uint8Array(await sharp({ create: { width, height, channels: 3, background: { r: shade, g: shade, b: shade } } }).jpeg().toBuffer());

type Route = () => Response;

function fakeFetch(routes: Map<string, Route>): { impl: FetchLike; calls: string[] } {
  const calls: string[] = [];
  const impl: FetchLike = async (url) => {
    calls.push(url);
    return routes.get(url)?.() ?? new Response('missing', { status: 404 });
  };
  return { impl, calls };
}

async function standardRoutes(): Promise<Map<string, Route>> {
  const maxres = await jpeg(1280, 720);
  const vertical = await jpeg(1080, 1920);
  return new Map<string, Route>([
    [urls.channel, () => new Response(atomFeed({ kind: 'channel', entries: [SHORT, LONG] }))],
    [urls.long, () => new Response(atomFeed({ kind: 'long', entries: [LONG] }))],
    [urls.short, () => new Response(atomFeed({ kind: 'short', entries: [SHORT] }))],
    [thumbUrl(LONG.id, 'maxresdefault'), () => new Response(maxres)],
    [thumbUrl(SHORT.id, 'oar2'), () => new Response(vertical)],
  ]);
}

async function makeRoot(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'petsvetel-'));
  await mkdir(join(root, 'src', 'data'), { recursive: true });
  await mkdir(join(root, 'src', 'assets', 'thumbs'), { recursive: true });
  await writeFile(join(root, 'src', 'data', 'videos.json'), `${JSON.stringify({ channelId: site.channelId, videos: [] }, null, 2)}\n`);
  return root;
}

const readData = async (root: string) =>
  JSON.parse(await readFile(join(root, 'src', 'data', 'videos.json'), 'utf8')) as VideoData;
const thumbsIn = (root: string) => readdir(join(root, 'src', 'assets', 'thumbs'));

function options(root: string, fetchImpl: FetchLike, extra: Partial<UpdateOptions> = {}): UpdateOptions {
  return {
    root,
    now: new Date('2026-10-10T12:00:00.000Z'),
    dryRun: false,
    refreshThumbs: false,
    fetchImpl,
    log: () => {},
    retryDelayMs: 0,
    ...extra,
  };
}

describe('runUpdate', () => {
  test('first run writes data and thumbnails', async () => {
    const root = await makeRoot();
    const { impl } = fakeFetch(await standardRoutes());
    const result = await runUpdate(options(root, impl));
    expect(result).toEqual({ status: 'updated', added: [SHORT.id, LONG.id], removed: [], thumbs: [`${SHORT.id}.jpg`, `${LONG.id}.jpg`] });
    const data = await readData(root);
    expect(data.videos.map((v) => [v.id, v.type, v.thumbSource])).toEqual([
      [SHORT.id, 'short', 'oar2'],
      [LONG.id, 'long', 'maxresdefault'],
    ]);
    expect((await thumbsIn(root)).sort()).toEqual([`${LONG.id}.jpg`, `${SHORT.id}.jpg`].sort());
  });

  test('second run with the same feeds changes nothing and fetches no thumbnails', async () => {
    const root = await makeRoot();
    const { impl, calls } = fakeFetch(await standardRoutes());
    await runUpdate(options(root, impl));
    calls.length = 0;
    expect(await runUpdate(options(root, impl))).toEqual({ status: 'unchanged' });
    expect(calls.sort()).toEqual([urls.channel, urls.long, urls.short].sort());
  });

  test('a feed outage keeps the last good data', async () => {
    const root = await makeRoot();
    const routes = await standardRoutes();
    await runUpdate(options(root, fakeFetch(routes).impl));
    const before = await readFile(join(root, 'src', 'data', 'videos.json'), 'utf8');
    routes.set(urls.channel, () => new Response('down', { status: 503 }));
    const { impl, calls } = fakeFetch(routes);
    const result = await runUpdate(options(root, impl));
    expect(result.status).toBe('skipped');
    expect(calls.filter((u) => u === urls.channel)).toHaveLength(3);
    expect(await readFile(join(root, 'src', 'data', 'videos.json'), 'utf8')).toBe(before);
  });

  test('a feed of another channel is refused', async () => {
    const root = await makeRoot();
    const routes = await standardRoutes();
    routes.set(urls.channel, () => new Response(atomFeed({ kind: 'channel', channelId: 'someoneElse', entries: [LONG] })));
    const result = await runUpdate(options(root, fakeFetch(routes).impl));
    expect(result).toMatchObject({ status: 'skipped', reason: expect.stringContaining('someoneElse') });
    expect((await readData(root)).videos).toEqual([]);
  });

  test('an empty Shorts feed while the channel lists a Short is refused', async () => {
    const root = await makeRoot();
    const routes = await standardRoutes();
    routes.set(urls.short, () => new Response(atomFeed({ kind: 'short', entries: [] })));
    expect((await runUpdate(options(root, fakeFetch(routes).impl))).status).toBe('skipped');
  });

  test('dry run reports changes but writes nothing', async () => {
    const root = await makeRoot();
    const result = await runUpdate(options(root, fakeFetch(await standardRoutes()).impl, { dryRun: true }));
    expect(result.status).toBe('updated');
    expect((await readData(root)).videos).toEqual([]);
    expect(await thumbsIn(root)).toEqual([]);
  });

  test('missing maxres falls back now and is upgraded on the daily refresh', async () => {
    const root = await makeRoot();
    const routes = await standardRoutes();
    const grey = await jpeg(120, 90, 200);
    const hq = await jpeg(480, 360);
    routes.set(thumbUrl(LONG.id, 'maxresdefault'), () => new Response(grey, { status: 404 }));
    routes.set(thumbUrl(LONG.id, 'hq720'), () => new Response(grey, { status: 200 }));
    routes.set(thumbUrl(LONG.id, 'hqdefault'), () => new Response(hq));
    await runUpdate(options(root, fakeFetch(routes).impl));
    expect((await readData(root)).videos.find((v) => v.id === LONG.id)?.thumbSource).toBe('hqdefault');

    const maxres = await jpeg(1280, 720, 90);
    routes.set(thumbUrl(LONG.id, 'maxresdefault'), () => new Response(maxres));
    const result = await runUpdate(options(root, fakeFetch(routes).impl, { refreshThumbs: true }));
    expect(result).toMatchObject({ status: 'updated', thumbs: [`${LONG.id}.jpg`] });
    expect((await readData(root)).videos.find((v) => v.id === LONG.id)?.thumbSource).toBe('maxresdefault');
  });

  test('a deleted video disappears together with its thumbnail', async () => {
    const root = await makeRoot();
    const routes = await standardRoutes();
    await runUpdate(options(root, fakeFetch(routes).impl));
    routes.set(urls.channel, () => new Response(atomFeed({ kind: 'channel', entries: [SHORT] })));
    routes.set(urls.long, () => new Response(atomFeed({ kind: 'long', entries: [] })));
    const result = await runUpdate(options(root, fakeFetch(routes).impl));
    expect(result).toMatchObject({ status: 'updated', removed: [LONG.id] });
    expect((await readData(root)).videos.map((v) => v.id)).toEqual([SHORT.id]);
    expect(await thumbsIn(root)).toEqual([`${SHORT.id}.jpg`]);
  });

  test('a new video whose thumbnail is still unavailable logs it and keeps thumb: null', async () => {
    const root = await makeRoot();
    const routes = await standardRoutes();
    routes.set(thumbUrl(LONG.id, 'maxresdefault'), () => new Response('missing', { status: 404 }));
    routes.set(thumbUrl(LONG.id, 'hq720'), () => new Response('missing', { status: 404 }));
    routes.set(thumbUrl(LONG.id, 'hqdefault'), () => new Response('missing', { status: 404 }));
    const logs: string[] = [];
    const result = await runUpdate(options(root, fakeFetch(routes).impl, { log: (message) => logs.push(message) }));
    expect(result.status).toBe('updated');
    expect((await readData(root)).videos.find((v) => v.id === LONG.id)?.thumb).toBeNull();
    expect(logs).toContain(`no thumbnail yet for ${LONG.id}`);
  });

  async function setupMassRemoval(): Promise<{ root: string; routes: Map<string, Route>; ghostIds: string[] }> {
    const root = await makeRoot();
    const ghostIds = ['ghostVideo01', 'ghostVideo02', 'ghostVideo03'];
    const stored: VideoData = {
      channelId: site.channelId,
      videos: [
        { id: LONG.id, type: 'long', title: LONG.title, published: LONG.published, thumb: `${LONG.id}.jpg`, thumbSource: 'maxresdefault' },
        ...ghostIds.map((id, i) => ({
          id,
          type: 'long' as const,
          title: `Ghost ${i}`,
          published: '2026-01-01T00:00:00.000Z',
          thumb: `${id}.jpg`,
          thumbSource: 'maxresdefault' as const,
        })),
      ],
    };
    await writeFile(join(root, 'src', 'data', 'videos.json'), `${JSON.stringify(stored, null, 2)}\n`);
    for (const id of [LONG.id, ...ghostIds]) {
      await writeFile(join(root, 'src', 'assets', 'thumbs', `${id}.jpg`), await jpeg(1280, 720));
    }
    const routes = new Map<string, Route>([
      [urls.channel, () => new Response(atomFeed({ kind: 'channel', entries: [LONG] }))],
      [urls.long, () => new Response(atomFeed({ kind: 'long', entries: [LONG] }))],
      [urls.short, () => new Response(atomFeed({ kind: 'short', entries: [] }))],
    ]);
    return { root, routes, ghostIds };
  }

  test('a feed truncation that would remove many videos at once is refused', async () => {
    const { root, routes, ghostIds } = await setupMassRemoval();
    const before = await readFile(join(root, 'src', 'data', 'videos.json'), 'utf8');
    const result = await runUpdate(options(root, fakeFetch(routes).impl));
    expect(result).toMatchObject({
      status: 'skipped',
      reason: expect.stringContaining(`would remove ${ghostIds.length} videos`),
    });
    expect(await readFile(join(root, 'src', 'data', 'videos.json'), 'utf8')).toBe(before);
    expect((await thumbsIn(root)).sort()).toEqual([LONG.id, ...ghostIds].map((id) => `${id}.jpg`).sort());
  });

  test('allowMassRemoval lets a genuine mass removal through', async () => {
    const { root, routes, ghostIds } = await setupMassRemoval();
    const result = await runUpdate(options(root, fakeFetch(routes).impl, { allowMassRemoval: true }));
    expect(result).toMatchObject({ status: 'updated', removed: expect.arrayContaining(ghostIds) });
    if (result.status === 'updated') expect(result.removed).toHaveLength(ghostIds.length);
    expect(await thumbsIn(root)).toEqual([`${LONG.id}.jpg`]);
  });

  test('MAX_REMOVALS is 2', () => {
    expect(MAX_REMOVALS).toBe(2);
  });
});
