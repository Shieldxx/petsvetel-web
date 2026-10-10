import sharp from 'sharp';
import type { ThumbSource, VideoType } from '../../src/lib/types.ts';
import type { FetchLike } from './fetch.ts';

/**
 * Best first. The custom Shorts thumbnail only exists inside the 16:9 (or 4:3
 * for hqdefault) images, centred, so Shorts use the same candidates as long
 * videos and the vertical picture is cropped out of whichever one lands.
 */
export const THUMB_CANDIDATES: Record<VideoType, ThumbSource[]> = {
  long: ['maxresdefault', 'hq720', 'hqdefault'],
  short: ['maxresdefault', 'hq720', 'hqdefault'],
};

export function thumbUrl(id: string, source: ThumbSource): string {
  return `https://i.ytimg.com/vi/${id}/${source}.jpg`;
}

const THUMB_TIMEOUT_MS = 20_000;

/** YouTube answers a missing size with a grey 120×90 picture, sometimes even with status 200. */
async function isPlaceholder(bytes: Uint8Array): Promise<boolean> {
  try {
    const { width = 0, height = 0 } = await sharp(bytes).metadata();
    return width <= 120 && height <= 90;
  } catch {
    return true;
  }
}

/**
 * YouTube never serves a native vertical thumbnail for Shorts: maxresdefault /
 * hq720 / hqdefault are all 16:9 (or 4:3 for hqdefault's padded picture) with
 * the creator's custom vertical thumbnail centred inside, full height. Cut it
 * back out to a 9:16 crop so Shorts show their actual custom thumbnail.
 */
export async function cropToPortrait(bytes: Uint8Array): Promise<Uint8Array> {
  const { width: w = 0, height: h = 0 } = await sharp(bytes).metadata();
  const contentHeight = Math.min(h, Math.round((w * 9) / 16));
  const top = Math.round((h - contentHeight) / 2);
  const cropWidth = Math.round((contentHeight * 9) / 16);
  const left = Math.round((w - cropWidth) / 2);
  const buffer = await sharp(bytes)
    .extract({ left, top, width: cropWidth, height: contentHeight })
    .jpeg({ quality: 90 })
    .toBuffer();
  return new Uint8Array(buffer);
}

export async function fetchBestThumb(
  id: string,
  type: VideoType,
  fetchImpl: FetchLike,
): Promise<{ source: ThumbSource; bytes: Uint8Array } | null> {
  for (const source of THUMB_CANDIDATES[type]) {
    try {
      const res = await fetchImpl(thumbUrl(id, source), { signal: AbortSignal.timeout(THUMB_TIMEOUT_MS) });
      if (!res.ok) continue;
      const bytes = new Uint8Array(await res.arrayBuffer());
      if (await isPlaceholder(bytes)) continue;
      if (type === 'short') return { source, bytes: await cropToPortrait(bytes) };
      return { source, bytes };
    } catch {
      // network error: try the next size
    }
  }
  return null;
}
