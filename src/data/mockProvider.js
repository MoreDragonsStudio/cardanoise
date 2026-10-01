// ?mock=1 — emits realistic fake blocks with random 3-60s gaps, so the rest
// of the app can be built/tested without touching the real chain at all.

const MIN_GAP_MS = 3_000;
const MAX_GAP_MS = 60_000;
const MAX_BLOCK_SIZE = 90_112;

const FAKE_POOLS = [
  'pool1xt7mjrtnsew3v33lu8sf93upf20sxhmcrfnpm82ra46yxk7uy45',
  'pool1z5uqdk7vlh9lhwuyk26qa0rpp3suma2hz2sgahgr0g40gyugzxp',
  'pool1a5fs2sdz6skrs4wg0tkgu28pkvq0czzukcdd20p9xvhf4vrp2nq',
  'pool1qqqqpanw9zc0rzh0yp247nzf2s9rye4etsx3q4yghn0sa37fs0y',
];

function randomHex(len) {
  let s = '';
  while (s.length < len) s += Math.floor(Math.random() * 16).toString(16);
  return s.slice(0, len);
}

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

export function createMockProvider() {
  let timer = null;
  let height = 10_000_000 + Math.floor(Math.random() * 1000);
  let slot = 190_000_000;

  function scheduleNext(onEvent) {
    const gap = randomInt(MIN_GAP_MS, MAX_GAP_MS);
    timer = setTimeout(() => {
      height += 1;
      slot += Math.round(gap / 1000);
      const txCount = randomInt(0, 25);
      const scriptTxCount = randomInt(0, Math.max(1, Math.round(txCount * 0.4)));

      onEvent({
        height,
        hash: randomHex(64),
        slot,
        timestamp: Math.floor(Date.now() / 1000),
        txCount,
        blockSize: randomInt(2_000, MAX_BLOCK_SIZE),
        maxBlockSize: MAX_BLOCK_SIZE,
        totalOutput: String(randomInt(1_000, 500_000) * 1_000_000),
        scriptTxCount,
        mintCount: randomInt(0, 3),
        poolId: FAKE_POOLS[randomInt(0, FAKE_POOLS.length)],
      });

      scheduleNext(onEvent);
    }, gap);
  }

  return {
    start(onEvent, onStatus) {
      onStatus?.({ state: 'live', message: 'mock' });
      scheduleNext(onEvent);
    },
    stop() {
      clearTimeout(timer);
    },
  };
}
