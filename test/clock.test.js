import { describe, it, expect, vi, afterEach } from 'vitest';
import { cycleAtTime, msUntilNextBar, scheduleAtNextBar } from '../src/audio/clock.js';
import { CPS, CYCLE_ANCHOR_MS } from '../src/config.js';

describe('cycleAtTime', () => {
  it('is 0 exactly at the anchor', () => {
    expect(cycleAtTime(CYCLE_ANCHOR_MS)).toBe(0);
  });

  it('advances by cps cycles per wall-clock second', () => {
    const oneSecondLater = CYCLE_ANCHOR_MS + 1000;
    expect(cycleAtTime(oneSecondLater)).toBeCloseTo(CPS, 10);
  });

  it('is linear in time (doubling elapsed time doubles the cycle)', () => {
    const t1 = cycleAtTime(CYCLE_ANCHOR_MS + 10_000);
    const t2 = cycleAtTime(CYCLE_ANCHOR_MS + 20_000);
    expect(t2).toBeCloseTo(t1 * 2, 10);
  });

  it('two independent "listeners" computing it at the same instant agree exactly', () => {
    const now = Date.now();
    expect(cycleAtTime(now)).toBe(cycleAtTime(now));
  });
});

describe('msUntilNextBar', () => {
  it('is 0 (mod a full bar) exactly on a bar boundary', () => {
    // CYCLE_ANCHOR_MS is itself cycle 0, i.e. a bar boundary.
    const ms = msUntilNextBar(CYCLE_ANCHOR_MS);
    const msPerBar = (1 / CPS) * 1000;
    // Either "no wait" or "a full bar away" both correctly describe a point
    // exactly on a boundary, depending on floating point direction.
    expect(ms % msPerBar).toBeCloseTo(0, 6);
  });

  it('counts down linearly towards a boundary', () => {
    const msPerBar = (1 / CPS) * 1000;
    const justBeforeBoundary = CYCLE_ANCHOR_MS + msPerBar - 100;
    expect(msUntilNextBar(justBeforeBoundary)).toBeCloseTo(100, 3);
  });

  it('is never negative and never exceeds one bar', () => {
    const msPerBar = (1 / CPS) * 1000;
    for (let i = 0; i < 20; i++) {
      const t = CYCLE_ANCHOR_MS + i * 137.7; // arbitrary offsets, not aligned to bars
      const ms = msUntilNextBar(t);
      expect(ms).toBeGreaterThanOrEqual(0);
      expect(ms).toBeLessThanOrEqual(msPerBar + 1e-6);
    }
  });
});

describe('scheduleAtNextBar', () => {
  afterEach(() => vi.useRealTimers());

  it('fires the callback once, after waiting roughly msUntilNextBar', () => {
    vi.useFakeTimers();
    vi.setSystemTime(CYCLE_ANCHOR_MS + 100);

    const cb = vi.fn();
    scheduleAtNextBar(cb);

    const expectedWait = msUntilNextBar(CYCLE_ANCHOR_MS + 100);
    vi.advanceTimersByTime(Math.max(0, expectedWait - 1));
    expect(cb).not.toHaveBeenCalled();

    vi.advanceTimersByTime(2);
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('returns a function that cancels the pending call', () => {
    vi.useFakeTimers();
    vi.setSystemTime(CYCLE_ANCHOR_MS + 100);

    const cb = vi.fn();
    const cancel = scheduleAtNextBar(cb);
    cancel();

    vi.advanceTimersByTime(60_000);
    expect(cb).not.toHaveBeenCalled();
  });
});
