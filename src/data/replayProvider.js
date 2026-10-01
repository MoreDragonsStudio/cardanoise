// ?replay=<file>[&speed=<n>] — plays back a fixture recorded by
// scripts/record-fixture.mjs (see public/fixtures/) instead of live or
// mock data. `file` is a filename under public/fixtures/. Gaps between
// blocks are taken from the fixture's recorded timestamps and divided by
// `speed` (default 1 = real recorded pacing); it loops back to the start
// when it runs out of blocks.

export function createReplayProvider(file, { speed = 1, fixturesPath = './fixtures/' } = {}) {
  let timer = null;
  let stopped = false;

  async function run(onEvent, onStatus) {
    onStatus?.({ state: 'connecting', message: `loading ${file}` });
    let fixture;
    try {
      const res = await fetch(`${fixturesPath}${file}`);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      fixture = await res.json();
    } catch (err) {
      onStatus?.({ state: 'error', message: `failed to load fixture: ${err.message}` });
      return;
    }

    const blocks = fixture.blocks ?? [];
    if (blocks.length === 0) {
      onStatus?.({ state: 'error', message: 'fixture has no blocks' });
      return;
    }

    onStatus?.({ state: 'live', message: `replaying ${file}` });

    let i = 0;
    function playNext() {
      if (stopped) return;
      onEvent(blocks[i]);
      const next = blocks[(i + 1) % blocks.length];
      const gapSeconds = Math.max(0.5, next.timestamp - blocks[i].timestamp || 10);
      i = (i + 1) % blocks.length;
      timer = setTimeout(playNext, (gapSeconds * 1000) / speed);
    }
    playNext();
  }

  return {
    start(onEvent, onStatus) {
      stopped = false;
      run(onEvent, onStatus);
    },
    stop() {
      stopped = true;
      clearTimeout(timer);
    },
  };
}
