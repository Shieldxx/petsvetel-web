export interface FixtureEntry {
  id: string;
  /** Already XML-escaped, exactly as YouTube sends it */
  title: string;
  published: string;
  short?: boolean;
}

const BARE = 'cj_RIb74fEMw3RbdQWCLIg';

/** Atom feed shaped like YouTube's: the channel feed reports the id without "UC", playlist feeds with it. */
export function atomFeed(opts: { kind: 'channel' | 'long' | 'short'; channelId?: string; entries: FixtureEntry[] }): string {
  const feedChannelId = opts.channelId ?? (opts.kind === 'channel' ? BARE : `UC${BARE}`);
  const entries = opts.entries
    .map(
      (e) => `
 <entry>
  <id>yt:video:${e.id}</id>
  <yt:videoId>${e.id}</yt:videoId>
  <yt:channelId>UC${BARE}</yt:channelId>
  <title>${e.title}</title>
  <link rel="alternate" href="https://www.youtube.com/${e.short ? `shorts/${e.id}` : `watch?v=${e.id}`}"/>
  <published>${e.published}</published>
  <updated>${e.published}</updated>
 </entry>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <link rel="self" href="http://www.youtube.com/feeds/videos.xml"/>
 <yt:channelId>${feedChannelId}</yt:channelId>
 <title>Pět Světel</title>${entries}
</feed>`;
}
