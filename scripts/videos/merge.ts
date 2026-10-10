import type { Video, VideoType } from '../../src/lib/types.ts';
import { byNewest } from '../../src/lib/videos.ts';
import { normalizeChannelId, type Feed, type FeedEntry } from './feed.ts';

/** YouTube feeds list at most this many newest entries */
export const FEED_LIMIT = 15;

export interface FeedSet {
  channel: Feed;
  long: Feed;
  short: Feed;
}

/** Returns null when the feeds can be trusted, otherwise the reason to skip this run. */
export function validateFeeds(feeds: FeedSet, expectedChannelId: string): string | null {
  const expected = normalizeChannelId(expectedChannelId);
  for (const [name, feed] of Object.entries(feeds) as [string, Feed][]) {
    if (feed.channelId !== expected) return `${name} feed belongs to channel ${feed.channelId}, expected ${expected}`;
  }
  const channel = feeds.channel.entries;
  if (channel.length === 0) return 'channel feed has no entries';
  if (channel.some((e) => e.isShortLink) && feeds.short.entries.length === 0) {
    return 'channel feed lists a Short but the Shorts feed is empty';
  }
  if (channel.some((e) => !e.isShortLink) && feeds.long.entries.length === 0) {
    return 'channel feed lists a video but the long-video feed is empty';
  }
  return null;
}

/** Does this feed list everything published at or after `published`? */
function covers(entries: FeedEntry[], published: string): boolean {
  if (entries.length < FEED_LIMIT) return true;
  const oldest = entries.reduce((min, e) => (e.published < min ? e.published : min), entries[0].published);
  return published >= oldest;
}

function classify(entry: FeedEntry, longIds: Set<string>, shortIds: Set<string>): VideoType {
  const inLong = longIds.has(entry.id);
  const inShort = shortIds.has(entry.id);
  if (inShort && !inLong) return 'short';
  if (inLong && !inShort) return 'long';
  return entry.isShortLink ? 'short' : 'long';
}

export function mergeVideos(stored: Video[], feeds: FeedSet, now: Date): Video[] {
  const nowIso = now.toISOString();
  const longIds = new Set(feeds.long.entries.map((e) => e.id));
  const shortIds = new Set(feeds.short.entries.map((e) => e.id));
  const listed = new Map<string, FeedEntry>();
  for (const e of [...feeds.channel.entries, ...feeds.long.entries, ...feeds.short.entries]) {
    if (!listed.has(e.id)) listed.set(e.id, e);
  }

  const result = new Map<string, Video>();
  for (const video of stored) {
    const e = listed.get(video.id);
    if (e) {
      result.set(video.id, { ...video, title: e.title, published: e.published });
      continue;
    }
    const typeFeed = video.type === 'short' ? feeds.short.entries : feeds.long.entries;
    const gone = covers(feeds.channel.entries, video.published) && covers(typeFeed, video.published);
    if (!gone) result.set(video.id, { ...video });
  }

  for (const [id, e] of listed) {
    if (result.has(id) || e.published > nowIso) continue;
    result.set(id, {
      id,
      type: classify(e, longIds, shortIds),
      title: e.title,
      published: e.published,
      thumb: null,
      thumbSource: null,
    });
  }
  return [...result.values()].sort(byNewest);
}
