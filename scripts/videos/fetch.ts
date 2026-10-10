export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface RetryOptions {
  tries?: number;
  /** Base delay; attempt n waits n × delayMs */
  delayMs?: number;
  fetchImpl?: FetchLike;
}

const USER_AGENT = 'petsvetel-web video updater (+https://petsvetel.cz)';
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchText(url: string, { tries = 3, delayMs = 5_000, fetchImpl = fetch }: RetryOptions = {}): Promise<string> {
  let lastError: unknown = new Error(`No attempt made for ${url}`);
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      const res = await fetchImpl(url, { headers: { 'user-agent': USER_AGENT } });
      if (res.ok) return await res.text();
      lastError = new Error(`HTTP ${res.status} for ${url}`);
    } catch (err) {
      lastError = err;
    }
    if (attempt < tries) await sleep(delayMs * attempt);
  }
  throw lastError;
}
