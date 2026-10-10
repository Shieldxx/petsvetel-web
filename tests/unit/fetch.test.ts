import { expect, test } from 'vitest';
import { fetchText, type FetchLike } from '../../scripts/videos/fetch.ts';

test('returns the body of the first successful response', async () => {
  const responses = [new Response('down', { status: 500 }), new Response('ok', { status: 200 })];
  const calls: string[] = [];
  const fetchImpl: FetchLike = async (url) => {
    calls.push(url);
    return responses.shift() as Response;
  };
  expect(await fetchText('https://example.test/feed', { delayMs: 0, fetchImpl })).toBe('ok');
  expect(calls).toHaveLength(2);
});

test('gives up after the configured number of tries', async () => {
  let attempts = 0;
  const fetchImpl: FetchLike = async () => {
    attempts++;
    return new Response('nope', { status: 404 });
  };
  await expect(fetchText('https://example.test/feed', { tries: 3, delayMs: 0, fetchImpl })).rejects.toThrow('HTTP 404');
  expect(attempts).toBe(3);
});

test('network errors are retried too', async () => {
  let attempts = 0;
  const fetchImpl: FetchLike = async () => {
    attempts++;
    if (attempts < 3) throw new TypeError('fetch failed');
    return new Response('ok');
  };
  expect(await fetchText('https://example.test/feed', { delayMs: 0, fetchImpl })).toBe('ok');
});

test('each attempt is sent with an abort signal', async () => {
  let signal: AbortSignal | null | undefined;
  const fetchImpl: FetchLike = async (_url, init) => {
    signal = init?.signal;
    return new Response('ok');
  };
  await fetchText('https://example.test/feed', { delayMs: 0, fetchImpl });
  expect(signal).toBeInstanceOf(AbortSignal);
});
