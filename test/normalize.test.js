import { describe, it, expect } from 'vitest';
import { normalizeBlock } from '../src/normalize.js';

const baseRaw = {
  height: 100,
  hash: 'c65a507555cda2c75a82be0669cddbf9db5fd28c4547b74aa65bdc63047f9f1',
  slot: 199262119,
  timestamp: 1790828410,
  txCount: 10,
  blockSize: 45_056,
  maxBlockSize: 90_112,
  totalOutput: '20000000000', // 20,000 ADA
  scriptTxCount: 4,
  mintCount: 2,
  poolId: 'pool1xt7mjrtnsew3v33lu8sf93upf20sxhmcrfnpm82ra46yxk7uy45',
};

describe('normalizeBlock', () => {
  it('passes through identifying fields unchanged', () => {
    const event = normalizeBlock(baseRaw);
    expect(event.height).toBe(100);
    expect(event.hash).toBe(baseRaw.hash);
    expect(event.slot).toBe(baseRaw.slot);
    expect(event.timestamp).toBe(baseRaw.timestamp);
    expect(event.poolId).toBe(baseRaw.poolId);
  });

  it('computes fullness as blockSize/maxBlockSize', () => {
    const event = normalizeBlock(baseRaw);
    expect(event.fullness).toBeCloseTo(45_056 / 90_112, 5);
  });

  it('computes txNorm proportionally and clamps at 1', () => {
    expect(normalizeBlock({ ...baseRaw, txCount: 0 }).txNorm).toBe(0);
    expect(normalizeBlock({ ...baseRaw, txCount: 1000 }).txNorm).toBe(1);
    const mid = normalizeBlock({ ...baseRaw, txCount: 20 }).txNorm;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
  });

  it('computes scriptRatio as scriptTxCount/txCount, 0 when txCount is 0', () => {
    expect(normalizeBlock(baseRaw).scriptRatio).toBeCloseTo(0.4, 5);
    expect(normalizeBlock({ ...baseRaw, txCount: 0, scriptTxCount: 0 }).scriptRatio).toBe(0);
  });

  it('keeps all 0..1 fields within range across extreme inputs', () => {
    const extreme = normalizeBlock({
      ...baseRaw,
      txCount: 1_000_000,
      blockSize: 10_000_000,
      totalOutput: '9000000000000000000',
      scriptTxCount: 1_000_000,
    });
    for (const key of ['txNorm', 'fullness', 'adaNorm', 'scriptRatio']) {
      expect(extreme[key]).toBeGreaterThanOrEqual(0);
      expect(extreme[key]).toBeLessThanOrEqual(1);
    }
  });

  it('log-scales adaNorm: a 100x bigger block is nowhere near 100x "more", but still monotonic', () => {
    const small = normalizeBlock({ ...baseRaw, totalOutput: '1000000000' }).adaNorm; // 1,000 ADA
    const big = normalizeBlock({ ...baseRaw, totalOutput: '10000000000' }).adaNorm; // 10,000 ADA
    const huge = normalizeBlock({ ...baseRaw, totalOutput: '100000000000' }).adaNorm; // 100,000 ADA
    expect(big).toBeGreaterThan(small);
    expect(huge).toBeGreaterThan(big);
    // A linear scale would make `huge` ~100x `small`. Log-scaled, it should
    // be nowhere close to that — well under 2x is the real signature of
    // "log-scaled", which is what distinguishes this from a plain ratio.
    expect(huge / small).toBeLessThan(2);
  });

  it('falls back to a default max block size when a provider omits it', () => {
    const event = normalizeBlock({ ...baseRaw, maxBlockSize: 0, blockSize: 45_056 });
    expect(event.fullness).toBeCloseTo(45_056 / 90_112, 5);
  });

  it('derives a stable seed from the block hash', () => {
    const a = normalizeBlock(baseRaw).seed;
    const b = normalizeBlock({ ...baseRaw }).seed;
    expect(a).toBe(b);
    expect(a).toBe(parseInt(baseRaw.hash.slice(0, 8), 16));
  });

  it('derives a stable voice in [0, 8) from poolId, and 0 when poolId is absent', () => {
    const event = normalizeBlock(baseRaw);
    expect(event.voice).toBeGreaterThanOrEqual(0);
    expect(event.voice).toBeLessThan(8);
    expect(normalizeBlock({ ...baseRaw, poolId: null }).voice).toBe(0);

    // same poolId -> same voice, different poolId -> likely different voice
    const otherPool = normalizeBlock({
      ...baseRaw,
      poolId: 'pool1z5uqdk7vlh9lhwuyk26qa0rpp3suma2hz2sgahgr0g40gyugzxp',
    }).voice;
    expect(normalizeBlock(baseRaw).voice).toBe(event.voice);
    expect(otherPool).not.toBe(event.voice);
  });

  it('passes mintCount through as a raw non-negative integer', () => {
    expect(normalizeBlock(baseRaw).mintCount).toBe(2);
    expect(normalizeBlock({ ...baseRaw, mintCount: -5 }).mintCount).toBe(0);
    expect(normalizeBlock({ ...baseRaw, mintCount: undefined }).mintCount).toBe(0);
  });
});
