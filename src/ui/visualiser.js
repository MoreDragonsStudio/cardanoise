// A simple canvas visualiser: a disc that flashes on every beat (in sync
// with the wall-clock-derived cycle, same as the audio), colored by tension
// (time since last block) and sized by adaNorm. Not trying to be fancy —
// just enough to see the station is alive, and as a bonus, a rough visual
// way to eyeball whether two devices are in sync without needing to trust
// your ears.

import { cycleAtTime } from '../audio/clock.js';
import { STATION } from '../config.js';

const TENSION_WINDOW_MS = 20_000; // keep in sync with station-techno.js

export function createVisualiser(container, liveState) {
  const canvas = document.createElement('canvas');
  canvas.className = 'visualiser';
  canvas.width = 300;
  canvas.height = 300;
  container.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  let rafId = null;

  function frame() {
    const now = Date.now();
    const beatPhase = (cycleAtTime(now) * STATION.beatsPerCycle) % 1;
    const flash = 1 - beatPhase; // 1 right on the beat, decaying until the next

    const event = liveState.getLatestEvent();
    const tension = Math.min(1, liveState.msSinceLastBlock() / TENSION_WINDOW_MS);
    const adaNorm = event?.adaNorm ?? 0;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const hue = 160 - tension * 160; // mint (calm) -> red (tense)
    const radius = (40 + adaNorm * 60) * (0.85 + 0.15 * flash);

    ctx.beginPath();
    ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.5 + 0.5 * flash})`;
    ctx.fill();

    rafId = requestAnimationFrame(frame);
  }

  rafId = requestAnimationFrame(frame);

  return {
    destroy() {
      cancelAnimationFrame(rafId);
    },
  };
}
