import { XMLParser } from 'fast-xml-parser';

export interface FeedEntry {
  id: string;
  title: string;
  /** ISO 8601 in UTC */
  published: string;
  /** true when the entry links to youtube.com/shorts/ */
  isShortLink: boolean;
}

export interface Feed {
  /** Channel id without the leading "UC" (the channel feed reports it that way) */
  channelId: string;
  entries: FeedEntry[];
}

export class FeedError extends Error {}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  // keep titles like "2026" as text
  parseTagValue: false,
  // decodes &#39; and friends, once
  htmlEntities: true,
  isArray: (name) => name === 'entry' || name === 'link',
});

type XmlNode = Record<string, unknown>;

export function normalizeChannelId(id: string): string {
  return id.startsWith('UC') ? id.slice(2) : id;
}

export function feedUrls(channelId: string): { channel: string; long: string; short: string } {
  const bare = normalizeChannelId(channelId);
  const base = 'https://www.youtube.com/feeds/videos.xml';
  return {
    channel: `${base}?channel_id=UC${bare}`,
    long: `${base}?playlist_id=UULF${bare}`,
    short: `${base}?playlist_id=UUSH${bare}`,
  };
}

export function parseFeed(xml: string): Feed {
  let doc: XmlNode;
  try {
    doc = parser.parse(xml) as XmlNode;
  } catch (err) {
    throw new FeedError(`invalid XML: ${err instanceof Error ? err.message : String(err)}`);
  }
  const feed = doc?.feed as XmlNode | undefined;
  if (!feed || typeof feed !== 'object') throw new FeedError('not an Atom feed');
  const channelId = String(feed['yt:channelId'] ?? '').trim();
  if (!channelId) throw new FeedError('feed has no yt:channelId');

  const entries: FeedEntry[] = [];
  for (const raw of (feed.entry as XmlNode[] | undefined) ?? []) {
    const id = String(raw['yt:videoId'] ?? '').trim();
    const published = Date.parse(String(raw.published ?? ''));
    if (!VIDEO_ID.test(id) || Number.isNaN(published)) continue;
    const links = (raw.link as XmlNode[] | undefined) ?? [];
    const href = String(links.find((link) => link['@_rel'] === 'alternate')?.['@_href'] ?? '');
    entries.push({
      id,
      title: String(raw.title ?? '').trim(),
      published: new Date(published).toISOString(),
      isShortLink: href.includes('/shorts/'),
    });
  }
  return { channelId: normalizeChannelId(channelId), entries };
}
