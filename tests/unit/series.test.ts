import { expect, test } from 'vitest';
import { visibleSeries } from '../../src/lib/series.ts';

test('hides series without a playlist and puts archive series last', () => {
  const list = [
    { title: 'Novinky z F1', description: '', playlistId: 'PL1', archive: true },
    { title: 'Vysvětleno', description: '', playlistId: null },
    { title: 'Měsíc v motorsportu', description: '', playlistId: 'PL2' },
  ];
  expect(visibleSeries(list).map((s) => s.title)).toEqual(['Měsíc v motorsportu', 'Novinky z F1']);
});
