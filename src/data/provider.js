/**
 * @typedef {object} RawBlock
 * Minimal raw shape every provider normalizes into before handing events to
 * normalize.js. Providers may carry extra fields (see koiosProvider), but
 * everything below must be present or explicitly null.
 * @property {number} height
 * @property {string} hash
 * @property {number} slot
 * @property {number} timestamp        - unix seconds the block was minted
 * @property {number} txCount
 * @property {number} blockSize        - bytes
 * @property {number} maxBlockSize     - bytes, protocol param at time of block
 * @property {string|number} totalOutput - lovelace, as string (Koios returns strings for big numbers)
 * @property {number} scriptTxCount    - txs in the block with a Plutus script
 * @property {number} mintCount        - total minted/burned asset entries in the block
 * @property {string|null} poolId
 */

/**
 * @typedef {object} BlockDataProvider
 * @property {(onEvent: (raw: RawBlock) => void, onStatus?: (status: ProviderStatus) => void) => void} start
 * @property {() => void} stop
 */

/**
 * @typedef {object} ProviderStatus
 * @property {'connecting'|'live'|'backoff'|'error'} state
 * @property {string} [message]
 */

// No runtime code needed here — this file exists purely to document the
// contract every provider (mock / replay / koios) must implement, so a new
// data source can be dropped in by implementing start()/stop() and producing
// RawBlock-shaped objects.
export {};
