import type { Series } from './types.ts';

export function visibleSeries(list: Series[]): Series[] {
  const live = list.filter((s) => s.playlistId !== null);
  return [...live.filter((s) => !s.archive), ...live.filter((s) => s.archive)];
}
