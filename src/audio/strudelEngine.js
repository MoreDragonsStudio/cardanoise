import { initStrudel, signal } from '@strudel/web';
import { buildPattern } from './patterns/station-techno.js';
import * as liveState from './liveState.js';

/**
 * Wraps a plain JS getter into a continuously-sampled Strudel Pattern, so
 * live chain data can drive pattern parameters. This is the exact technique
 * Strudel itself uses for mousex/mousey (packages/core/signal.mjs):
 * `signal(() => externalMutableValue)`.
 */
export function liveValue(getter) {
  return signal(getter);
}

let repl = null;

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
  const pattern = buildPattern({ liveValue, liveState });
  repl.setPattern(pattern, true);
  return repl;
}

export function stopAudio() {
  repl?.stop();
}

export { liveState };
