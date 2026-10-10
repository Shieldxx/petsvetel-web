import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';

export interface SvgShape {
  viewBox: [number, number, number, number];
  /** Everything between <svg …> and </svg> */
  body: string;
}

export function readSvgShape(svg: string): SvgShape {
  const values = svg.match(/viewBox="([^"]+)"/)?.[1]?.trim().split(/[\s,]+/).map(Number);
  if (!values || values.length !== 4 || values.some(Number.isNaN)) throw new Error('SVG without a valid viewBox');
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return { viewBox: values as [number, number, number, number], body };
}

function place(shape: SvgShape, x: number, y: number, width: number): string {
  const [vx, vy, vw] = shape.viewBox;
  const scale = width / vw;
  return `<g transform="translate(${x} ${y}) scale(${scale}) translate(${-vx} ${-vy})">${shape.body}</g>`;
}

/** The avatar look: the mark centred on the dark background. */
export function faviconSvg(mark: SvgShape, rounded: boolean): string {
  const width = 900;
  const height = (width * mark.viewBox[3]) / mark.viewBox[2];
  const radius = rounded ? 192 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024"><rect width="1024" height="1024" rx="${radius}" fill="#1C1C1E"/>${place(mark, (1024 - width) / 2, (1024 - height) / 2, width)}</svg>\n`;
}

/** 1200×630 share card: the full logo centred on the plain dark background, at most 760×440. */
export function ogSvg(logo: SvgShape): string {
  const W = 1200;
  const H = 630;
  const width = Math.min(760, (440 * logo.viewBox[2]) / logo.viewBox[3]);
  const height = (width * logo.viewBox[3]) / logo.viewBox[2];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="#1C1C1E"/>
${place(logo, (W - width) / 2, (H - height) / 2, width)}
</svg>\n`;
}

/** ICO container holding a single PNG image (supported by every current browser). */
export function pngToIco(png: Buffer, size: number): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16);
  entry.writeUInt8(size >= 256 ? 0 : size, 0);
  entry.writeUInt8(size >= 256 ? 0 : size, 1);
  entry.writeUInt16LE(1, 4);
  entry.writeUInt16LE(32, 6);
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  return Buffer.concat([header, entry, png]);
}

export async function makeIcons(root: string): Promise<void> {
  const brand = join(root, 'src', 'assets', 'brand');
  const mark = readSvgShape(await readFile(join(brand, 'logomark.svg'), 'utf8'));
  // the full logo (lettering + mark) once David exports it from Figma, the mark until then
  const logoFile = existsSync(join(brand, 'logo.svg')) ? 'logo.svg' : 'logomark.svg';
  const logo = readSvgShape(await readFile(join(brand, logoFile), 'utf8'));
  const out = join(root, 'public');
  await mkdir(out, { recursive: true });

  const rounded = faviconSvg(mark, true);
  await writeFile(join(out, 'favicon.svg'), rounded);
  const png32 = await sharp(Buffer.from(rounded)).resize(32, 32).png().toBuffer();
  await writeFile(join(out, 'favicon-32x32.png'), png32);
  await writeFile(join(out, 'favicon.ico'), pngToIco(png32, 32));
  // iOS rounds the corners itself
  await sharp(Buffer.from(faviconSvg(mark, false))).resize(180, 180).png().toFile(join(out, 'apple-touch-icon.png'));
  await sharp(Buffer.from(ogSvg(logo))).png().toFile(join(out, 'og.png'));
}

const isMain = process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  await makeIcons(process.cwd());
  console.log('Icons written to public/');
}
