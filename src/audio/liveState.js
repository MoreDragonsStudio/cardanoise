// Shared mutable state the running Strudel pattern reads from on every
// query, and main.js writes to whenever a new NormalizedBlockEvent arrives.
// This is the bridge between chain data and sound. See liveValue() in
// strudelEngine.js for how a getter over this state becomes a live signal —
// it's the same technique Strudel itself uses for mousex/mousey
// (packages/core/signal.mjs: `signal(() => _mouseX)`).

const state = {
  event: null, // last NormalizedBlockEvent (see ../normalize.js), or null before the first block
  lastBlockAt: Date.now(),
};

export function setLatestEvent(event) {
  state.event = event;
  state.lastBlockAt = Date.now();
}

export function getLatestEvent() {
  return state.event;
}

export function msSinceLastBlock() {
  return Date.now() - state.lastBlockAt;
}
