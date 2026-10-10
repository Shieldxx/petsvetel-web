import type { Video } from './types.ts';

const pragueDay = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Europe/Prague',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const pragueYear = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Prague', year: 'numeric' });
const czechDate = new Intl.DateTimeFormat('cs-CZ', {
  timeZone: 'Europe/Prague',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** relaunchDate is YYYY-MM-DD; en-CA formats the Prague day the same way, so strings compare */
export function isArchive(video: Video, relaunchDate: string): boolean {
  return pragueDay.format(new Date(video.published)) < relaunchDate;
}

export function formatDate(iso: string): string {
  return czechDate.format(new Date(iso));
}

export function archiveLabel(iso: string): string {
  return `Archiv ${pragueYear.format(new Date(iso))}`;
}

export function byNewest(a: Video, b: Video): number {
  return b.published.localeCompare(a.published) || a.id.localeCompare(b.id);
}

export interface Homepage {
  hero: Video | null;
  more: Video[];
  shorts: Video[];
}

export function selectHomepage(
  videos: Video[],
  relaunchDate: string,
  limits: { more: number; shorts: number } = { more: 3, shorts: 6 },
): Homepage {
  const long = videos.filter((v) => v.type === 'long').sort(byNewest);
  const ordered = [
    ...long.filter((v) => !isArchive(v, relaunchDate)),
    ...long.filter((v) => isArchive(v, relaunchDate)),
  ];
  const shorts = videos.filter((v) => v.type === 'short').sort(byNewest).slice(0, limits.shorts);
  return { hero: ordered[0] ?? null, more: ordered.slice(1, 1 + limits.more), shorts };
}
