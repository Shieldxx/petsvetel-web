import type { ImageMetadata } from 'astro';

const files = import.meta.glob<ImageMetadata>('../assets/thumbs/*.jpg', { eager: true, import: 'default' });

export function thumbFor(file: string | null): ImageMetadata | undefined {
  return file ? files[`../assets/thumbs/${file}`] : undefined;
}

/** Responsive widths never larger than the source picture. */
export function fitWidths(wanted: number[], sourceWidth: number): number[] {
  const fitting = wanted.filter((w) => w <= sourceWidth);
  return fitting.length > 0 ? fitting : [sourceWidth];
}
