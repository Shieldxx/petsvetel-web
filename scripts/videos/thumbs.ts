import sharp from 'sharp';
import type { ThumbSource, VideoType } from '../../src/lib/types.ts';
import type { FetchLike } from './fetch.ts';

/** Best first. Long: 16:9 sizes. Short: the vertical oar2, then hqdefault (cropped by CSS). */
export const THUMB_CANDIDATES: Record<VideoType, ThumbSource[]> = {
  long: ['maxresdefault', 'hq720', 'hqdefault'],
  short: ['oar2', 'hqdefault'],
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
      return { source, bytes };
    } catch {
      // network error: try the next size
    }
  }
  return null;
}
