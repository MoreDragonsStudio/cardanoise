// Central tunable constants. Keep this small — most musical tuning lives in
// normalize.js and src/audio/patterns/station-techno.js, not here.

export const STATION = {
  bpm: 124,
  beatsPerCycle: 4, // one Strudel "cycle" = one bar = 4 beats
};

// cycles per second, derived from bpm/beatsPerCycle (don't edit directly)
export const CPS = STATION.bpm / 60 / STATION.beatsPerCycle;

// Fixed moment that cycle 0 began, in ms since Unix epoch. Every listener's
// browser computes "what cycle should be playing right now" relative to this
// same anchor, so independent tabs land on the same bar without any
// coordination. Changing this resyncs everyone (next page load) to a
// different bar alignment — don't change it casually once the station is live.
export const CYCLE_ANCHOR_MS = 0; // 1970-01-01T00:00:00Z

// How often to poll the chain tip for a new block height, in ms.
// Kept at 10s (not the 5s first floated) because every visitor's browser
// polls independently against a shared Koios API quota (see README) — 5s
// from a single always-open tab alone would burn ~1/3 of the free daily
// request budget. Block-detection latency becomes <=10s instead of <=5s;
// the musical tension mapping is driven continuously by wall-clock time
// since the last known block, not by poll frequency, so this doesn't make
// the music feel less responsive between polls.
export const TIP_POLL_INTERVAL_MS = 10_000;

// Backoff when the data provider errors or gets rate-limited.
export const BACKOFF = {
  initialMs: 2_000,
  maxMs: 60_000,
  factor: 2,
};
