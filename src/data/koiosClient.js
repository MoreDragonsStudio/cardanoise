// Low-level Koios REST calls, shared by the live browser provider
// (koiosProvider.js) and the dev-only fixture recorder (scripts/record-fixture.mjs).
// Works unmodified in both the browser and Node (global fetch, Node 18+) —
// the only difference between the two call sites is whether an API token is
// supplied; Node has no CORS restriction at all, so the recorder script
// doesn't need one.
//
// Endpoints, fields and the CORS situation here were all verified live
// against https://api.koios.rest before writing this (see commit messages /
// README): the free public tier omits Access-Control-Allow-Origin on real
// responses (only the OPTIONS preflight claims it), so browser calls need a
// token from Koios's free *registered* tier, sent as a Bearer token.

const DEFAULT_BASE_URL = 'https://api.koios.rest/api/v1';

async function koiosFetch(baseUrl, token, path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = new Error(`Koios ${path} failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchTip(baseUrl = DEFAULT_BASE_URL, token) {
  const [tip] = await koiosFetch(baseUrl, token, '/tip');
  return tip; // { block_height, hash, abs_slot, epoch_no, block_time, ... }
}

export async function fetchBlockInfo(baseUrl = DEFAULT_BASE_URL, token, hash) {
  const [info] = await koiosFetch(baseUrl, token, '/block_info', {
    method: 'POST',
    body: { _block_hashes: [hash] },
  });
  return info;
}

export async function fetchBlockTxHashes(baseUrl = DEFAULT_BASE_URL, token, hash) {
  const rows = await koiosFetch(baseUrl, token, '/block_txs', {
    method: 'POST',
    body: { _block_hashes: [hash] },
  });
  return rows.map((r) => r.tx_hash);
}

export async function fetchTxInfo(baseUrl = DEFAULT_BASE_URL, token, txHashes) {
  if (txHashes.length === 0) return [];
  return koiosFetch(baseUrl, token, '/tx_info', {
    method: 'POST',
    body: { _tx_hashes: txHashes },
  });
}

/**
 * Fetches everything needed for one block and aggregates it into the
 * RawBlock shape (see src/data/provider.js), the same shape mock/replay
 * providers produce — so normalize.js and everything downstream of it
 * never needs to know a block came from Koios specifically.
 *
 * 3 Koios requests per block: block_info, block_txs, then one batched
 * tx_info call for every tx hash in the block (Koios supports batching an
 * array of hashes in one POST, so this doesn't scale with tx count).
 */
export async function fetchFullBlock(baseUrl, token, hash) {
  const info = await fetchBlockInfo(baseUrl, token, hash);
  const txHashes = await fetchBlockTxHashes(baseUrl, token, hash);
  const txs = await fetchTxInfo(baseUrl, token, txHashes);

  const scriptTxCount = txs.filter((tx) => (tx.plutus_contracts?.length ?? 0) > 0).length;
  const mintCount = txs.reduce((sum, tx) => sum + (tx.assets_minted?.length ?? 0), 0);

  return {
    height: info.block_height,
    hash: info.hash,
    slot: info.abs_slot,
    timestamp: info.block_time,
    txCount: info.tx_count ?? 0,
    blockSize: info.block_size ?? 0,
    maxBlockSize: 0, // not fetched live (see normalize.js) — falls back to its default constant
    totalOutput: info.total_output ?? '0',
    scriptTxCount,
    mintCount,
    poolId: info.pool ?? null,
  };
}

export { DEFAULT_BASE_URL };
