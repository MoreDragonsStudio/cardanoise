// Renders the normalized block event + a live "time since last block" clock
// into a container element. Pure DOM, no framework.

function formatElapsed(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${s}s`;
}

export function createNowPlayingPanel(container) {
  container.innerHTML = `
    <dl class="now-playing">
      <div><dt>Status</dt><dd data-field="status">connecting…</dd></div>
      <div><dt>Block height</dt><dd data-field="height">—</dd></div>
      <div><dt>Tx count</dt><dd data-field="txCount">—</dd></div>
      <div><dt>Pool</dt><dd data-field="poolId">—</dd></div>
      <div><dt>Fullness</dt><dd data-field="fullness">—</dd></div>
      <div><dt>Ada moved</dt><dd data-field="adaNorm">—</dd></div>
      <div><dt>Script ratio</dt><dd data-field="scriptRatio">—</dd></div>
      <div><dt>Time since last block</dt><dd data-field="elapsed">—</dd></div>
    </dl>
  `;

  const fields = Object.fromEntries(
    [...container.querySelectorAll('[data-field]')].map((el) => [el.dataset.field, el]),
  );

  let lastBlockAt = null;
  let tickTimer = null;

  function renderElapsed() {
    if (lastBlockAt == null) return;
    fields.elapsed.textContent = formatElapsed(Date.now() - lastBlockAt);
  }

  return {
    setStatus(status) {
      fields.status.textContent = status.message ? `${status.state} (${status.message})` : status.state;
    },
    setEvent(event) {
      fields.height.textContent = event.height;
      fields.txCount.textContent = event.txCount;
      fields.poolId.textContent = event.poolId ? event.poolId.slice(0, 12) + '…' : '—';
      fields.fullness.textContent = event.fullness.toFixed(2);
      fields.adaNorm.textContent = event.adaNorm.toFixed(2);
      fields.scriptRatio.textContent = event.scriptRatio.toFixed(2);

      lastBlockAt = Date.now();
      clearInterval(tickTimer);
      tickTimer = setInterval(renderElapsed, 1000);
      renderElapsed();
    },
    destroy() {
      clearInterval(tickTimer);
    },
  };
}
