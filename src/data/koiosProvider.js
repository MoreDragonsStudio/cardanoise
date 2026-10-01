// Live Koios polling: the default data source when no ?mock=1 or ?replay=
// param is present. Polls /tip every TIP_POLL_INTERVAL_MS; when the block
// height changes, fetches that block's full details. On error or rate
// limiting, backs off exponentially and keeps reporting the last known
// values rather than stalling the music.

import { DEFAULT_BASE_URL, fetchTip, fetchFullBlock } from './koiosClient.js';
import { TIP_POLL_INTERVAL_MS, BACKOFF } from '../config.js';

export function createKoiosProvider({
  baseUrl = DEFAULT_BASE_URL,
  token = import.meta.env.VITE_KOIOS_API_TOKEN,
} = {}) {
  let pollTimer = null;
  let stopped = false;
  let lastHeight = null;
  let backoffMs = BACKOFF.initialMs;

  async function poll(onEvent, onStatus) {
    if (stopped) return;
    try {
      const tip = await fetchTip(baseUrl, token);
      if (tip.block_height !== lastHeight) {
        lastHeight = tip.block_height;
        const raw = await fetchFullBlock(baseUrl, token, tip.hash);
        onEvent(raw);
      }
      backoffMs = BACKOFF.initialMs; // reset after a clean round-trip
      onStatus?.({ state: 'live' });
      pollTimer = setTimeout(() => poll(onEvent, onStatus), TIP_POLL_INTERVAL_MS);
    } catch (err) {
      const isRateLimited = err.status === 429;
      onStatus?.({
        state: 'backoff',
        message: isRateLimited ? 'rate limited' : err.message,
      });
      // Keep playing on last known values — just retry later, further out
      // each time, without ever reporting a new event in the meantime.
      pollTimer = setTimeout(() => poll(onEvent, onStatus), backoffMs);
      backoffMs = Math.min(backoffMs * BACKOFF.factor, BACKOFF.maxMs);
    }
  }

  return {
    start(onEvent, onStatus) {
      stopped = false;
      onStatus?.({ state: 'connecting' });
      poll(onEvent, onStatus);
    },
    stop() {
      stopped = true;
      clearTimeout(pollTimer);
    },
  };
}
