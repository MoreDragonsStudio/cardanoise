// Wall-clock <-> Strudel cycle math. This is what makes every listener's
// browser land on the same bar without any server coordinating them: cycle
// position is derived purely from (current time - a fixed anchor) * cps,
// never from when a particular listener pressed play.
//
// How this gets applied to the actual Strudel scheduler (see
// strudelEngine.js): @strudel/web's repl.scheduler exposes now(), setCps()
// and - confirmed by reading the shipped bundle, not documented publicly -
// setCycle(n), which messages the clock worker to realign its internal
// cycle counter. We call setCycle(cycleAtTime(Date.now())) right after
// start(), and periodically re-call it if the scheduler's own clock (which
// free-runs off AudioContext time once started) has drifted from where
// wall-clock time says it should be.

import { CPS, CYCLE_ANCHOR_MS } from '../config.js';

/** What cycle (as a float - integer part is the bar, fractional part is
 * position within the bar) should be playing at a given wall-clock time. */
export function cycleAtTime(epochMs) {
  return ((epochMs - CYCLE_ANCHOR_MS) / 1000) * CPS;
}

/** Milliseconds from `epochMs` until the next integer cycle (bar) boundary. */
export function msUntilNextBar(epochMs = Date.now()) {
  const cycle = cycleAtTime(epochMs);
  const cyclesUntilNext = Math.ceil(cycle) - cycle;
  return (cyclesUntilNext / CPS) * 1000;
}

/** Schedules `callback` to run at the next bar boundary (0-indexed cycle
 * integer), using the wall clock. Not sample-accurate - it's a plain
 * setTimeout - which is fine for "change the chord on the next bar", a
 * musically coarse event, not for sample-accurate audio scheduling. */
export function scheduleAtNextBar(callback) {
  const id = setTimeout(callback, Math.max(0, msUntilNextBar()));
  return () => clearTimeout(id);
}
