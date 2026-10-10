import { expect, test } from 'vitest';
import { fitWidths } from '../../src/lib/thumbs.ts';

test('fitWidths never asks for a width larger than the source picture', () => {
  expect(fitWidths([480, 960, 1280], 1280)).toEqual([480, 960, 1280]);
  expect(fitWidths([320, 480, 640], 480)).toEqual([320, 480]);
  expect(fitWidths([320, 480], 120)).toEqual([120]);
});
