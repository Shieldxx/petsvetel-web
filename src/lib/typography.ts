// Czech typography: a single-letter preposition or conjunction must not end a line.
const SINGLE_LETTER = /(?<=^|[\s(„\u00A0])([kKsSvVzZoOuUaAiI]) (?=\S)/g;

export function nbsp(text: string): string {
  return text.replace(SINGLE_LETTER, '$1\u00A0');
}
