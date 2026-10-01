// Turns a RawBlock (see src/data/provider.js) into the NormalizedBlockEvent
// that drives the music. This is the one place that decides what a given
// piece of chain data "means" musically — tune the constants below, not the
// pattern code in src/audio/patterns/, when something feels off.
//
// A note on the spec's "all musical values 0..1" rule: txNorm, fullness,
// adaNorm and scriptRatio follow it exactly. mintCount and seed don't —
// mintCount is a small integer count (the pattern decides how to use it,
// e.g. via its own clamp/scale), and seed is a 32-bit PRNG seed, not a
// fraction. Forcing those two into 0..1 would just add a pointless rescale
// at the one place that actually needs the raw integer.

// --- tunable constants -------------------------------------------------

// A block with this many txs or more is treated as "maximally busy" for
// hi-hat density purposes. Cardano mainnet blocks commonly carry well under
// this; raise it if mainnet activity grows and hi-hats start pinning at 1.
const TX_NORM_MAX = 40;

// Reference point for the ADA-moved log scale, in whole ADA (not lovelace).
// A block moving this much ADA or more maps to adaNorm = 1. Log-scaled so
// typical blocks still produce a readable sub-bass level instead of
// everything near 0 (ADA amounts are extremely right-skewed).
const ADA_NORM_REFERENCE = 2_000_000;

// Fallback max block size (bytes) used only when a provider can't supply the
// live protocol parameter (e.g. a minimal mock block). This should track
// Cardano mainnet's maxBlockBodySize; providers that *can* fetch the live
// value (koiosProvider, via /epoch_params) should always prefer that over
// this constant.
const DEFAULT_MAX_BLOCK_SIZE = 90_112;

// Number of distinct melodic "voices" a pool id can be mapped onto.
const VOICE_COUNT = 8;

// --- helpers -------------------------------------------------------------

const clamp01 = (x) => Math.max(0, Math.min(1, x));

/** Deterministic 32-bit unsigned hash of a string (FNV-1a). Used to turn a
 * poolId string into a stable small integer without pulling in a hashing
 * library — we don't need cryptographic properties, just stability. */
function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** First 8 hex chars of a block hash as an unsigned 32-bit int. Stable and
 * cheap; good enough as a seed for deterministic melodic choices — we're
 * not relying on any cryptographic property of the hash, just that two
 * listeners computing this from the same block hash get the same number. */
function seedFromHash(hash) {
  const slice = (hash || '').slice(0, 8);
  const n = parseInt(slice, 16);
  return Number.isFinite(n) ? n >>> 0 : 0;
}

function voiceFromPoolId(poolId) {
  if (!poolId) return 0;
  return fnv1a(poolId) % VOICE_COUNT;
}

/**
 * @param {import('./data/provider.js').RawBlock} raw
 * @returns {object} NormalizedBlockEvent
 */
export function normalizeBlock(raw) {
  const txCount = raw.txCount ?? 0;
  const maxBlockSize = raw.maxBlockSize > 0 ? raw.maxBlockSize : DEFAULT_MAX_BLOCK_SIZE;
  const totalOutputAda = Number(raw.totalOutput ?? 0) / 1_000_000;
  const scriptTxCount = raw.scriptTxCount ?? 0;

  return {
    height: raw.height,
    hash: raw.hash,
    slot: raw.slot,
    timestamp: raw.timestamp,

    txCount,
    txNorm: clamp01(txCount / TX_NORM_MAX),

    fullness: clamp01((raw.blockSize ?? 0) / maxBlockSize),

    adaNorm: clamp01(Math.log1p(totalOutputAda) / Math.log1p(ADA_NORM_REFERENCE)),

    scriptRatio: txCount > 0 ? clamp01(scriptTxCount / txCount) : 0,

    mintCount: Math.max(0, raw.mintCount ?? 0),

    poolId: raw.poolId ?? null,
    voice: voiceFromPoolId(raw.poolId),

    seed: seedFromHash(raw.hash),
  };
}
