import { describe, expect, test } from 'vitest';
import type { Feed, FeedEntry } from '../../scripts/videos/feed.ts';
import { FEED_LIMIT, mergeVideos, validateFeeds, type FeedSet } from '../../scripts/videos/merge.ts';
import type { Video } from '../../src/lib/types.ts';

const CHANNEL = 'UCcj_RIb74fEMw3RbdQWCLIg';
const NOW = new Date('2026-10-10T12:00:00.000Z');
const feed = (entries: FeedEntry[], channelId = 'cj_RIb74fEMw3RbdQWCLIg'): Feed => ({ channelId, entries });
const entry = (name: string, published: string, isShortLink = false, title = name): FeedEntry => ({
  id: name.padEnd(11, '_'),
  title,
  published,
  isShortLink,
});
const stored = (name: string, type: Video['type'], published: string, title = name): Video => ({
  id: name.padEnd(11, '_'),
  type,
  title,
  published,
  thumb: `${name.padEnd(11, '_')}.jpg`,
  thumbSource: type === 'short' ? 'oar2' : 'maxresdefault',
});
const ids = (videos: Video[]) => videos.map((v) => v.id.replace(/_+$/, ''));

describe('validateFeeds', () => {
  const long = entry('long', '2026-09-25T16:39:48.000Z');
  const short = entry('short', '2026-10-03T18:25:54.000Z', true);
  const ok: FeedSet = { channel: feed([short, long]), long: feed([long]), short: feed([short]) };

  test('accepts consistent feeds', () => {
    expect(validateFeeds(ok, CHANNEL)).toBeNull();
  });
  test('rejects a feed of another channel', () => {
    expect(validateFeeds({ ...ok, long: feed([long], 'someoneElse') }, CHANNEL)).toMatch(/long feed belongs to channel someoneElse/);
  });
  test('rejects an empty channel feed', () => {
    expect(validateFeeds({ ...ok, channel: feed([]) }, CHANNEL)).toMatch(/no entries/);
  });
  test('rejects an empty Shorts feed while the channel lists a Short', () => {
    expect(validateFeeds({ ...ok, short: feed([]) }, CHANNEL)).toMatch(/Shorts feed is empty/);
  });
  test('rejects an empty long-video feed while the channel lists a video', () => {
    expect(validateFeeds({ ...ok, long: feed([]) }, CHANNEL)).toMatch(/long-video feed is empty/);
  });
});

describe('mergeVideos', () => {
  test('classifies by playlist feed and falls back to the link', () => {
    const a = entry('a', '2026-10-01T10:00:00.000Z');
    const s = entry('s', '2026-10-02T10:00:00.000Z', true);
    const x = entry('x', '2026-10-03T10:00:00.000Z', true);
    const y = entry('y', '2026-10-04T10:00:00.000Z');
    const result = mergeVideos([], { channel: feed([y, x, s, a]), long: feed([a]), short: feed([s]) }, NOW);
    expect(result.map((v) => [v.id.replace(/_+$/, ''), v.type])).toEqual([
      ['y', 'long'],
      ['x', 'short'],
      ['s', 'short'],
      ['a', 'long'],
    ]);
    expect(result[0]).toMatchObject({ thumb: null, thumbSource: null, published: '2026-10-04T10:00:00.000Z' });
  });

  test('keeps stored type and thumbnail, refreshes title and date from the feed', () => {
    const before = [stored('a', 'long', '2026-10-01T10:00:00.000Z', 'Starý titulek')];
    const a = entry('a', '2026-10-01T11:00:00.000Z', false, 'Nový titulek');
    const [video] = mergeVideos(before, { channel: feed([a]), long: feed([a]), short: feed([]) }, NOW);
    expect(video).toEqual({ ...before[0], title: 'Nový titulek', published: '2026-10-01T11:00:00.000Z' });
  });

  test('skips videos scheduled in the future', () => {
    const premiere = entry('premiere', '2026-10-16T16:00:00.000Z');
    const result = mergeVideos([], { channel: feed([premiere]), long: feed([premiere]), short: feed([]) }, NOW);
    expect(result).toEqual([]);
  });

  test('drops a stored video that YouTube no longer lists', () => {
    const a = entry('a', '2026-10-01T10:00:00.000Z');
    const before = [stored('a', 'long', a.published), stored('gone', 'long', '2026-10-02T10:00:00.000Z')];
    expect(ids(mergeVideos(before, { channel: feed([a]), long: feed([a]), short: feed([]) }, NOW))).toEqual(['a']);
  });

  test('keeps history older than a full feed window', () => {
    const full = Array.from({ length: FEED_LIMIT }, (_, i) => entry(`n${i}`, `2026-10-0${(i % 9) + 1}T1${i % 10}:00:00.000Z`));
    const before = [stored('old', 'long', '2022-02-13T22:00:12.000Z')];
    const result = mergeVideos(before, { channel: feed(full), long: feed(full), short: feed([]) }, NOW);
    expect(ids(result)).toContain('old');
  });

  test('does not mutate its inputs', () => {
    const before = [stored('a', 'long', '2026-10-01T10:00:00.000Z')];
    const snapshot = structuredClone(before);
    const a = entry('a', '2026-10-01T10:00:00.000Z', false, 'Jiný');
    mergeVideos(before, { channel: feed([a]), long: feed([a]), short: feed([]) }, NOW);
    expect(before).toEqual(snapshot);
  });
});
