import sharp from 'sharp';
import { expect, test } from 'vitest';
import type { FetchLike } from '../../scripts/videos/fetch.ts';
import { fetchBestThumb, thumbUrl } from '../../scripts/videos/thumbs.ts';

const jpeg = async (width: number, height: number) =>
  new Uint8Array(await sharp({ create: { width, height, channels: 3, background: { r: 60, g: 60, b: 60 } } }).jpeg().toBuffer());

test('long video: skips 404 and the grey 120×90 placeholder, takes the next size', async () => {
  const grey = await jpeg(120, 90);
  const hq = await jpeg(480, 360);
  const routes = new Map<string, Response>([
    [thumbUrl('aaaaaaaaaaa', 'maxresdefault'), new Response(grey, { status: 404 })],
    [thumbUrl('aaaaaaaaaaa', 'hq720'), new Response(grey, { status: 200 })],
    [thumbUrl('aaaaaaaaaaa', 'hqdefault'), new Response(hq, { status: 200 })],
  ]);
  const fetchImpl: FetchLike = async (url) => routes.get(url) ?? new Response('', { status: 404 });
  const best = await fetchBestThumb('aaaaaaaaaaa', 'long', fetchImpl);
  expect(best?.source).toBe('hqdefault');
});

test('short: prefers the vertical oar2 picture', async () => {
  const vertical = await jpeg(1080, 1920);
  const fetchImpl: FetchLike = async (url) =>
    url === thumbUrl('sssssssssss', 'oar2') ? new Response(vertical) : new Response('', { status: 404 });
  expect((await fetchBestThumb('sssssssssss', 'short', fetchImpl))?.source).toBe('oar2');
});

test('returns null when nothing usable exists', async () => {
  const fetchImpl: FetchLike = async () => {
    throw new TypeError('fetch failed');
  };
  expect(await fetchBestThumb('aaaaaaaaaaa', 'long', fetchImpl)).toBeNull();
});
