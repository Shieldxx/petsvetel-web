import { readFile } from 'node:fs/promises';
import { describe, expect, test } from 'vitest';
import { FeedError, feedUrls, parseFeed } from '../../scripts/videos/feed.ts';
import { atomFeed } from './fixtures/feeds.ts';

describe('feedUrls', () => {
  test('channel feed plus the long-video and Shorts playlists', () => {
    expect(feedUrls('UCcj_RIb74fEMw3RbdQWCLIg')).toEqual({
      channel: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCcj_RIb74fEMw3RbdQWCLIg',
      long: 'https://www.youtube.com/feeds/videos.xml?playlist_id=UULFcj_RIb74fEMw3RbdQWCLIg',
      short: 'https://www.youtube.com/feeds/videos.xml?playlist_id=UUSHcj_RIb74fEMw3RbdQWCLIg',
    });
  });
});

describe('parseFeed', () => {
  test('channel feed: bare channel id, links tell Shorts apart', () => {
    const feed = parseFeed(
      atomFeed({
        kind: 'channel',
        entries: [
          { id: 'W4g0j0E5lpg', title: 'Kdo podle mě vyhraje v Malaysii?', published: '2026-10-03T18:25:54+00:00', short: true },
          { id: '6qjHnsmyirA', title: "Měsíc v motorsportu - Září 26'", published: '2026-09-25T16:39:48+00:00' },
        ],
      }),
    );
    expect(feed.channelId).toBe('cj_RIb74fEMw3RbdQWCLIg');
    expect(feed.entries).toEqual([
      { id: 'W4g0j0E5lpg', title: 'Kdo podle mě vyhraje v Malaysii?', published: '2026-10-03T18:25:54.000Z', isShortLink: true },
      { id: '6qjHnsmyirA', title: "Měsíc v motorsportu - Září 26'", published: '2026-09-25T16:39:48.000Z', isShortLink: false },
    ]);
  });

  test('playlist feed: the UC-prefixed id is normalised the same way', () => {
    const feed = parseFeed(atomFeed({ kind: 'short', entries: [] }));
    expect(feed).toEqual({ channelId: 'cj_RIb74fEMw3RbdQWCLIg', entries: [] });
  });

  test('decodes entities exactly once and keeps numeric titles as text', () => {
    const feed = parseFeed(
      atomFeed({
        kind: 'long',
        entries: [
          { id: 'aaaaaaaaaaa', title: 'Tom &amp; Jerry &#39;26 &quot;GP&quot; &lt;3 &amp;#39;', published: '2026-10-01T10:00:00+00:00' },
          { id: 'bbbbbbbbbbb', title: '2026', published: '2026-10-02T10:00:00+00:00' },
        ],
      }),
    );
    expect(feed.entries.map((e) => e.title)).toEqual([`Tom & Jerry '26 "GP" <3 &#39;`, '2026']);
  });

  test('skips entries with an invalid id or date', () => {
    const feed = parseFeed(
      atomFeed({
        kind: 'long',
        entries: [
          { id: 'tooShort', title: 'x', published: '2026-10-01T10:00:00+00:00' },
          { id: 'ccccccccccc', title: 'x', published: 'not a date' },
          { id: 'ddddddddddd', title: 'ok', published: '2026-10-01T10:00:00+00:00' },
        ],
      }),
    );
    expect(feed.entries.map((e) => e.id)).toEqual(['ddddddddddd']);
  });

  test('rejects documents that are not a YouTube feed', () => {
    expect(() => parseFeed('')).toThrow(FeedError);
    expect(() => parseFeed('<html><body>Error 404</body></html>')).toThrow(FeedError);
    expect(() => parseFeed('<feed><title>bez kanálu</title></feed>')).toThrow(FeedError);
  });

  test('real Shorts feed snapshot', async () => {
    const feed = parseFeed(await readFile(new URL('./fixtures/real-uush.xml', import.meta.url), 'utf8'));
    expect(feed.channelId).toBe('cj_RIb74fEMw3RbdQWCLIg');
    expect(feed.entries.length).toBeGreaterThanOrEqual(3);
    expect(feed.entries.every((e) => e.isShortLink)).toBe(true);
  });

  test('real channel feed snapshot has both kinds', async () => {
    const feed = parseFeed(await readFile(new URL('./fixtures/real-channel.xml', import.meta.url), 'utf8'));
    expect(feed.channelId).toBe('cj_RIb74fEMw3RbdQWCLIg');
    expect(feed.entries.some((e) => e.isShortLink)).toBe(true);
    expect(feed.entries.some((e) => !e.isShortLink)).toBe(true);
  });
});
