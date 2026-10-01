// Shared mutable state the running Strudel pattern reads from on every
// query, and main.js writes to whenever a new NormalizedBlockEvent arrives.
// This is the bridge between chain data and sound. See liveValue() in
// strudelEngine.js for how a getter over this state becomes a live signal —
// it's the same technique Strudel itself uses for mousex/mousey
// (packages/core/signal.mjs: `signal(() => _mouseX)`).
//
// Two events are tracked, not one, because block-triggered changes don't
// all happen at the same moment musically (see station-techno.js and the
// spec it follows): the *release* (tension dropping, a fill) happens the
// instant a block is seen, but the *chord change* is quantised to the next
// bar boundary. `event` updates immediately; `chordEvent` only updates when
// strudelEngine's bar-boundary scheduler says it's time.

const state = {
  event: null, // latest NormalizedBlockEvent — drives continuous params (txNorm, fullness, adaNorm)
  chordEvent: null, // the event currently driving root-note choice — only advances on a bar boundary
  lastBlockAt: Date.now(),
  fillActive: false,
};

export function setLatestEvent(event) {
  state.event = event;
  state.lastBlockAt = Date.now();
  state.fillActive = true;
}

export function getLatestEvent() {
  return state.event;
}

export function msSinceLastBlock() {
  return Date.now() - state.lastBlockAt;
}

/** Called by strudelEngine's bar-boundary scheduler to advance the chord to
 * whatever the latest event is, and clear the one-bar fill flag. */
export function advanceChordToLatest() {
  state.chordEvent = state.event;
  state.fillActive = false;
}

export function getChordEvent() {
  return state.chordEvent ?? state.event;
}

export function isFillActive() {
  return state.fillActive;
}
