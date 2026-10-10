import { describe, expect, test } from 'vitest';
import type { Video } from '../../src/lib/types.ts';
import { archiveLabel, formatDate, isArchive, selectHomepage } from '../../src/lib/videos.ts';

const video = (name: string, type: Video['type'], published: string): Video => ({
  id: name.padEnd(11, 'x'),
  type,
  title: name,
  published,
  thumb: null,
  thumbSource: null,
});
const names = (list: Video[]) => list.map((v) => v.title);
const RELAUNCH = '2026-09-25';

describe('isArchive', () => {
  test('uses the Prague calendar day', () => {
    // 23:59 on 24 Sep in Prague
    expect(isArchive(video('a', 'long', '2026-09-24T21:59:00.000Z'), RELAUNCH)).toBe(true);
    // 00:30 on 25 Sep in Prague
    expect(isArchive(video('b', 'long', '2026-09-24T22:30:00.000Z'), RELAUNCH)).toBe(false);
  });
});

describe('formatDate and archiveLabel', () => {
  test('absolute Czech date in Prague time', () => {
    expect(formatDate('2026-09-25T16:39:48.000Z')).toBe('25. září 2026');
    expect(formatDate('2026-12-31T23:30:00.000Z')).toBe('1. ledna 2027');
  });
  test('archive label carries the Prague year', () => {
    expect(archiveLabel('2022-02-13T22:00:12.000Z')).toBe('Archiv 2022');
  });
});

describe('selectHomepage', () => {
  test('no videos at all', () => {
    expect(selectHomepage([], RELAUNCH)).toEqual({ hero: null, more: [], shorts: [] });
  });

  test('newest fresh long video leads, archive follows the fresh ones', () => {
    const result = selectHomepage(
      [
        video('old1', 'long', '2022-02-13T22:00:12.000Z'),
        video('new1', 'long', '2026-09-25T16:39:48.000Z'),
        video('old2', 'long', '2022-02-06T22:47:32.000Z'),
        video('new2', 'long', '2026-10-16T16:00:00.000Z'),
        video('old3', 'long', '2022-01-30T19:25:17.000Z'),
        video('short1', 'short', '2026-10-03T18:25:54.000Z'),
      ],
      RELAUNCH,
    );
    expect(result.hero?.title).toBe('new2');
    expect(names(result.more)).toEqual(['new1', 'old1', 'old2']);
    expect(names(result.shorts)).toEqual(['short1']);
  });

  test('only archive videos: the newest archive one becomes the hero', () => {
    const result = selectHomepage(
      [video('old2', 'long', '2022-02-06T22:47:32.000Z'), video('old1', 'long', '2022-02-13T22:00:12.000Z')],
      RELAUNCH,
    );
    expect(result.hero?.title).toBe('old1');
    expect(names(result.more)).toEqual(['old2']);
  });

  test('shorts are newest first and capped at six', () => {
    const shorts = Array.from({ length: 8 }, (_, i) => video(`s${i}`, 'short', `2026-10-0${i + 1}T10:00:00.000Z`));
    const result = selectHomepage(shorts, RELAUNCH);
    expect(result.hero).toBeNull();
    expect(names(result.shorts)).toEqual(['s7', 's6', 's5', 's4', 's3', 's2']);
  });
});
