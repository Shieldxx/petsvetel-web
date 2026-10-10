import { copyFile, mkdir, mkdtemp, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { expect, test } from 'vitest';
import { makeIcons, pngToIco, readSvgShape } from '../../scripts/make-icons.ts';

test('pngToIco wraps one PNG in a valid ICO container', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 1, 2, 3]);
  const ico = pngToIco(png, 32);
  expect([...ico.subarray(0, 6)]).toEqual([0, 0, 1, 0, 1, 0]);
  expect(ico[6]).toBe(32);
  expect(ico[7]).toBe(32);
  expect(ico.readUInt16LE(10)).toBe(1);
  expect(ico.readUInt16LE(12)).toBe(32);
  expect(ico.readUInt32LE(14)).toBe(png.length);
  expect(ico.readUInt32LE(18)).toBe(22);
  expect(ico.subarray(22)).toEqual(png);
});

test('readSvgShape reads the viewBox and the inner markup', () => {
  const shape = readSvgShape(
    '<svg width="924" height="353" viewBox="0 0 924 353" fill="none" xmlns="http://www.w3.org/2000/svg">\n<path d="M0 0H1V1Z" fill="#FF1D25"/>\n</svg>\n',
  );
  expect(shape.viewBox).toEqual([0, 0, 924, 353]);
  expect(shape.body.trim()).toBe('<path d="M0 0H1V1Z" fill="#FF1D25"/>');
});

test('makeIcons writes every icon in the right size', async () => {
  const root = await mkdtemp(join(tmpdir(), 'petsvetel-icons-'));
  await mkdir(join(root, 'src', 'assets', 'brand'), { recursive: true });
  await copyFile(join('src', 'assets', 'brand', 'logomark.svg'), join(root, 'src', 'assets', 'brand', 'logomark.svg'));
  await makeIcons(root);
  const size = async (file: string) => {
    const meta = await sharp(join(root, 'public', file)).metadata();
    return [meta.width, meta.height];
  };
  expect(await size('favicon-32x32.png')).toEqual([32, 32]);
  expect(await size('apple-touch-icon.png')).toEqual([180, 180]);
  expect(await size('og.png')).toEqual([1200, 630]);
  expect(await readFile(join(root, 'public', 'favicon.svg'), 'utf8')).toContain('viewBox="0 0 1024 1024"');
  expect((await readFile(join(root, 'public', 'favicon.ico'))).readUInt16LE(2)).toBe(1);
});
