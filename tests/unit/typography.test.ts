import { describe, expect, test } from 'vitest';
import { nbsp } from '../../src/lib/typography.ts';

const N = ' ';

describe('nbsp', () => {
  test.each([
    ['Měsíc v motorsportu', `Měsíc v${N}motorsportu`],
    ['a v Praze', `a${N}v${N}Praze`],
    ['K čemu je VSC', `K${N}čemu je VSC`],
    ['F1, NLS, IMSA a simracing.', `F1, NLS, IMSA a${N}simracing.`],
    ['(s Maxem)', `(s${N}Maxem)`],
    ['Jdu k', 'Jdu k'],
    ['Max Verstappen', 'Max Verstappen'],
  ])('%s', (input, expected) => {
    expect(nbsp(input)).toBe(expected);
  });
});
