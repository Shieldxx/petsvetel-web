import { access, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { site } from '../../src/config.ts';
import type { VideoData } from '../../src/lib/types.ts';
import { feedUrls, parseFeed } from './feed.ts';
import { fetchText, type FetchLike } from './fetch.ts';
import { mergeVideos, validateFeeds, type FeedSet } from './merge.ts';
import { fetchBestThumb } from './thumbs.ts';

export interface UpdateOptions {
  /** Repository root: data in src/data/videos.json, thumbnails in src/assets/thumbs */
  root: string;
  now: Date;
  /** Report what would change, write nothing */
  dryRun: boolean;
  /** Re-download thumbnails of videos the feeds still list */
  refreshThumbs: boolean;
  fetchImpl: FetchLike;
  log: (message: string) => void;
  /** Base delay between feed retries; tests pass 0 */
  retryDelayMs?: number;
}

export type UpdateResult =
  | { status: 'skipped'; reason: string }
  | { status: 'unchanged' }
  | { status: 'updated'; added: string[]; removed: string[]; thumbs: string[] };

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function loadFeeds(fetchImpl: FetchLike, delayMs: number): Promise<FeedSet> {
  const urls = feedUrls(site.channelId);
  const load = async (url: string) => parseFeed(await fetchText(url, { fetchImpl, delayMs }));
  const [channel, long, short] = await Promise.all([load(urls.channel), load(urls.long), load(urls.short)]);
  return { channel, long, short };
}

export async function runUpdate(opts: UpdateOptions): Promise<UpdateResult> {
  const dataPath = join(opts.root, 'src', 'data', 'videos.json');
  const thumbsDir = join(opts.root, 'src', 'assets', 'thumbs');
  const stored = JSON.parse(await readFile(dataPath, 'utf8')) as VideoData;

  let feeds: FeedSet;
  try {
    feeds = await loadFeeds(opts.fetchImpl, opts.retryDelayMs ?? 5_000);
  } catch (err) {
    return { status: 'skipped', reason: `feeds unavailable: ${err instanceof Error ? err.message : String(err)}` };
  }
  const problem = validateFeeds(feeds, site.channelId);
  if (problem) return { status: 'skipped', reason: problem };

  const videos = mergeVideos(stored.videos, feeds, opts.now);
  const listed = new Set([feeds.channel, feeds.long, feeds.short].flatMap((f) => f.entries.map((e) => e.id)));

  const thumbWrites = new Map<string, Uint8Array>();
  for (const video of videos) {
    const file = `${video.id}.jpg`;
    const path = join(thumbsDir, file);
    const missing = video.thumb === null || !(await exists(path));
    if (!missing && !(opts.refreshThumbs && listed.has(video.id))) continue;
    const best = await fetchBestThumb(video.id, video.type, opts.fetchImpl);
    if (!best) {
      if (missing) {
        video.thumb = null;
        video.thumbSource = null;
      }
      continue;
    }
    const current = missing ? null : await readFile(path);
    if (!current || !current.equals(best.bytes)) thumbWrites.set(file, best.bytes);
    video.thumb = file;
    video.thumbSource = best.source;
  }

  const storedById = new Map(stored.videos.map((v) => [v.id, v]));
  const keptIds = new Set(videos.map((v) => v.id));
  const added = videos.filter((v) => !storedById.has(v.id));
  const retitled = videos.filter((v) => storedById.has(v.id) && storedById.get(v.id)?.title !== v.title);
  const removed = stored.videos.filter((v) => !keptIds.has(v.id));
  const thumbDeletes = removed.flatMap((v) => (v.thumb ? [v.thumb] : []));
  const next: VideoData = { channelId: site.channelId, videos };

  if (JSON.stringify(next) === JSON.stringify(stored) && thumbWrites.size === 0 && thumbDeletes.length === 0) {
    return { status: 'unchanged' };
  }

  for (const v of added) opts.log(`+ ${v.type} ${v.id} ${v.title}`);
  for (const v of retitled) opts.log(`~ ${v.type} ${v.id} ${v.title}`);
  for (const v of removed) opts.log(`- ${v.type} ${v.id} ${v.title}`);
  for (const file of thumbWrites.keys()) opts.log(`thumbnail ${file}`);

  const result: UpdateResult = {
    status: 'updated',
    added: added.map((v) => v.id),
    removed: removed.map((v) => v.id),
    thumbs: [...thumbWrites.keys()],
  };
  if (opts.dryRun) {
    opts.log('Dry run: nothing written.');
    return result;
  }

  await mkdir(thumbsDir, { recursive: true });
  for (const [file, bytes] of thumbWrites) await writeFile(join(thumbsDir, file), bytes);
  for (const file of thumbDeletes) await rm(join(thumbsDir, file), { force: true });
  await writeFile(dataPath, `${JSON.stringify(next, null, 2)}\n`);
  return result;
}
