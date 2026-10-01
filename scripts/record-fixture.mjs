#!/usr/bin/env node
// Dev-only. Records N real blocks from Koios into a fixture JSON file under
// public/fixtures/, for use with ?replay=<file> later. Run locally with
// plain Node (18+, for global fetch) — this never runs in the browser, so
// none of the CORS concerns in koiosClient.js's comments apply here.
//
// Usage:
//   node scripts/record-fixture.mjs [count] [outFile]
//   KOIOS_API_TOKEN=... node scripts/record-fixture.mjs 20 mainnet-20.json
//
// A token is optional: the public tier's 5,000 req/day is plenty for a
// one-off recording of a handful of blocks (3 requests each).

import { writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { fetchTip, fetchFullBlock } from '../src/data/koiosClient.js';

const count = Number(process.argv[2]) || 10;
const outFile = process.argv[3] || `fixture-${Date.now()}.json`;
const token = process.env.KOIOS_API_TOKEN;

const TIP_POLL_INTERVAL_MS = 5_000; // fine for a one-off local recording run

const fixturesDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../public/fixtures',
);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log(`Recording ${count} blocks from Koios into public/fixtures/${outFile}...`);

  const blocks = [];
  let lastHeight = null;

  while (blocks.length < count) {
    const tip = await fetchTip(undefined, token);
    if (tip.block_height !== lastHeight) {
      lastHeight = tip.block_height;
      console.log(`  block ${tip.block_height} (${blocks.length + 1}/${count})...`);
      const raw = await fetchFullBlock(undefined, token, tip.hash);
      blocks.push(raw);
    }
    if (blocks.length < count) await sleep(TIP_POLL_INTERVAL_MS);
  }

  await mkdir(fixturesDir, { recursive: true });
  const outPath = path.join(fixturesDir, outFile);
  await writeFile(
    outPath,
    JSON.stringify({ recordedAt: new Date().toISOString(), blocks }, null, 2),
  );

  console.log(`Wrote ${blocks.length} blocks to ${outPath}`);
  console.log(`Try it with: npm run dev -- then open ?replay=${outFile}`);
}

main().catch((err) => {
  console.error('Recording failed:', err);
  process.exitCode = 1;
});
