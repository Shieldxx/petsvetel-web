import sharp from 'sharp';
import { expect, test } from 'vitest';
import type { FetchLike } from '../../scripts/videos/fetch.ts';
import { cropToPortrait, fetchBestThumb, thumbUrl } from '../../scripts/videos/thumbs.ts';

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

test('short: cuts the custom vertical thumbnail out of the 16:9 maxresdefault', async () => {
  const maxres = await jpeg(1280, 720);
  const fetchImpl: FetchLike = async (url) =>
    url === thumbUrl('sssssssssss', 'maxresdefault') ? new Response(maxres) : new Response('', { status: 404 });
  const best = await fetchBestThumb('sssssssssss', 'short', fetchImpl);
  expect(best?.source).toBe('maxresdefault');
  const metadata = await sharp(best?.bytes).metadata();
  expect(metadata.width).toBe(405);
  expect(metadata.height).toBe(720);
});

test('short: falls back to hqdefault and crops inside its 16:9 band', async () => {
  const grey = await jpeg(120, 90);
  const hqdefault = await jpeg(480, 360);
  const fetchImpl: FetchLike = async (url) => {
    if (url === thumbUrl('sssssssssss', 'maxresdefault')) return new Response(grey, { status: 404 });
    if (url === thumbUrl('sssssssssss', 'hq720')) return new Response(grey, { status: 404 });
    if (url === thumbUrl('sssssssssss', 'hqdefault')) return new Response(hqdefault);
    return new Response('', { status: 404 });
  };
  const best = await fetchBestThumb('sssssssssss', 'short', fetchImpl);
  expect(best?.source).toBe('hqdefault');
  const metadata = await sharp(best?.bytes).metadata();
  expect(metadata.width).toBe(152);
  expect(metadata.height).toBe(270);
});

test('cropToPortrait is deterministic', async () => {
  const maxres = await jpeg(1280, 720);
  const first = await cropToPortrait(maxres);
  const second = await cropToPortrait(maxres);
  expect(Buffer.from(first).equals(Buffer.from(second))).toBe(true);
});

test('returns null when nothing usable exists', async () => {
  const fetchImpl: FetchLike = async () => {
    throw new TypeError('fetch failed');
  };
  expect(await fetchBestThumb('aaaaaaaaaaa', 'long', fetchImpl)).toBeNull();
});
