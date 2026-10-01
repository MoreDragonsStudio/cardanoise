// The actual track. One station: minimal techno, 124 BPM, one cycle = one
// bar (4 beats) — see src/config.js for the tempo constants this assumes.
// Edit this file like you'd edit a track in a DAW; normalize.js is where the
// *meaning* of chain data is decided, this file is just what it sounds like.
//
// Everything here is pure synthesis (oscillators + noise + envelopes/filters)
// — no sample packs — so there's no sample-licensing question to worry
// about. initStrudel() with no `prebake` option (see strudelEngine.js)
// confirms this: it registers the synth engine only and fetches no external
// sample banks.
//
// A note on how live chain data gets in here: liveValue(getter) wraps a
// plain JS function into a continuously-sampled Strudel signal — the same
// technique Strudel itself uses for mousex/mousey. Signals are only
// re-sampled when a pattern event actually fires, so anything that should
// *sweep* smoothly (not just step between hits) is pushed through
// .segment(n) to force frequent re-sampling.

import { note, sound, stack } from '@strudel/web';

const TENSION_WINDOW_MS = 20_000; // ~ one typical Cardano mainnet block interval

// Root notes a block's seed can land on. Deliberately a small, related set
// (natural minor-ish neighbours) so seed-driven changes always sound like
// they belong together, never jarring.
const ROOTS = ['c2', 'eb2', 'g2', 'bb2', 'ab2', 'f2'];

export function buildPattern({ liveValue, liveState }) {
  const latest = () => liveState.getLatestEvent();

  const txNorm = liveValue(() => latest()?.txNorm ?? 0);
  const fullness = liveValue(() => latest()?.fullness ?? 0);
  const adaNorm = liveValue(() => latest()?.adaNorm ?? 0);
  const tension = liveValue(() => Math.min(1, liveState.msSinceLastBlock() / TENSION_WINDOW_MS));

  const hatsN = liveValue(() =>
    Math.max(1, Math.min(8, Math.round(1 + (latest()?.txNorm ?? 0) * 7))),
  );

  // Root note is quantised to the next bar boundary (see liveState's
  // chordEvent / strudelEngine's bar-boundary loop), not updated the
  // instant a block arrives — "change chord on the next bar boundary", per
  // the spec. The filter release and fill below react immediately instead.
  const rootNote = liveValue(() => ROOTS[(liveState.getChordEvent()?.seed ?? 0) % ROOTS.length]);

  // A block landing is the release: for one bar, layer in an extra
  // off-beat noise fill. isFillActive() is cleared the instant the chord
  // advances, so the fill always covers exactly "until the next bar".
  const fillOn = liveValue(() => (liveState.isFillActive() ? 1 : 0));

  // Steady four-on-the-floor kick, regardless of chain activity: a sine
  // with a fast downward pitch sweep (the classic synthesized-kick idiom).
  const kick = note('c1*4')
    .s('sine')
    .decay(0.001)
    .sustain(0)
    .release(0.05)
    .pdec(0.05)
    .penv(28)
    .pcurve(1)
    .gain(1);

  // Hi-hat density (Euclidean rhythm) driven by txNorm: busier blocks fill
  // in more of the 8 steps/bar. White noise through a high-pass, not a
  // sample.
  const hats = sound('white*8').euclid(hatsN, 8).hpf(8000).decay(0.02).sustain(0).release(0.01).gain(0.5);

  // Bass: seed picks the root once per bar (segment(1) turns the
  // continuous rootNote signal into one discrete onset/cycle). fullness
  // drives drive/distortion; time-since-last-block drives filter opening
  // (tension), which snaps back down the moment a block lands and
  // msSinceLastBlock() resets — that snap is the "release".
  const bass = note(rootNote)
    .segment(1)
    .s('sawtooth')
    .lpf(fullness.range(300, 1100).add(tension.range(0, 2500)).segment(16))
    .lpq(6)
    .distort(fullness.range(0, 4).segment(16))
    .gain(0.8);

  // Sub-bass: same root, an octave down, level driven by adaNorm.
  const sub = note(rootNote)
    .segment(1)
    .s('sine')
    .gain(adaNorm.range(0.25, 0.95).segment(16));

  // The fill: busy 16th-note noise stabs, silent except for the one bar
  // right after a block arrives.
  const fill = sound('white*16')
    .hpf(5000)
    .decay(0.01)
    .sustain(0)
    .release(0.01)
    .gain(fillOn.mul(0.35).segment(16));

  return stack(kick, hats, bass, sub, fill);
}
