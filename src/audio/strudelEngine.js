import { initStrudel, signal } from '@strudel/web';
import { buildPattern } from './patterns/station-techno.js';
import * as liveState from './liveState.js';
import { cycleAtTime, scheduleAtNextBar } from './clock.js';

/**
 * Wraps a plain JS getter into a continuously-sampled Strudel Pattern, so
 * live chain data can drive pattern parameters. This is the exact technique
 * Strudel itself uses for mousex/mousey (packages/core/signal.mjs):
 * `signal(() => externalMutableValue)`.
 */
export function liveValue(getter) {
  return signal(getter);
}

// How far the wall-clock/scheduler relationship is allowed to drift before
// we re-apply the phase shift. Small enough that any correction is
// inaudible, large enough that we're not re-patterning every tick over
// normal AudioContext clock jitter.
const DRIFT_CORRECTION_THRESHOLD_CYCLES = 0.03;
const RESYNC_INTERVAL_MS = 5_000;

let repl = null;
let basePattern = null;
let appliedOffset = 0;
let cancelBarLoop = null;
let resyncTimer = null;

// @strudel/web's scheduler is a Cyclist (this environment has no
// SharedWorker, so it's never upgraded to NeoCyclist) — confirmed by
// testing: Cyclist has no setCycle(), only NeoCyclist does, and that's
// undocumented/internal either way. Relying on it would also be a real
// cross-browser risk (Android Chrome's SharedWorker support isn't a given).
// So instead of asking the scheduler to jump to a cycle, we shift the
// *pattern* itself with the public .late()/.early() API: basePattern.late(n)
// queries basePattern n cycles earlier, so picking n = (what the scheduler
// thinks "now" is) - (what wall-clock time says it should be) makes the
// shifted pattern, played against the scheduler's own clock, sound like
// it's at the correct wall-clock phase.
function applyWallClockSync(autostart) {
  const actualCycle = repl.scheduler.now();
  const targetCycle = cycleAtTime(Date.now());
  appliedOffset = actualCycle - targetCycle;
  repl.setPattern(basePattern.late(appliedOffset), autostart);
}

function startBarBoundaryLoop() {
  cancelBarLoop = scheduleAtNextBar(() => {
    liveState.advanceChordToLatest();
    startBarBoundaryLoop();
  });
}

function startResyncLoop() {
  resyncTimer = setInterval(() => {
    const currentDiff = repl.scheduler.now() - cycleAtTime(Date.now());
    if (Math.abs(currentDiff - appliedOffset) > DRIFT_CORRECTION_THRESHOLD_CYCLES) {
      applyWallClockSync(false);
    }
  }, RESYNC_INTERVAL_MS);
}

/**
 * Must be called from within a user gesture handler (e.g. the Tune In
 * button's click handler) — browsers require that for audio to be allowed
 * to start at all.
 */
export async function startAudio() {
  if (!repl) {
    // No `prebake` option: initStrudel registers the synth engine (sine,
    // sawtooth, square, noise, etc.) and nothing else — no external sample
    // banks are fetched. See the comment in patterns/station-techno.js.
    repl = await initStrudel({});
  }
  basePattern = buildPattern({ liveValue, liveState });

  // Land on the bar wall-clock time says we should be on right now, not
  // bar 0 of whenever this particular listener happened to press play —
  // that's what puts independent listeners audibly in step.
  applyWallClockSync(true);
  startBarBoundaryLoop();
  startResyncLoop();

  return repl;
}

export function stopAudio() {
  repl?.stop();
  cancelBarLoop?.();
  clearInterval(resyncTimer);
}

export { liveState };
