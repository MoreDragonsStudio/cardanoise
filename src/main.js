import './style.css';
import { createProvider } from './data/createProvider.js';
import { normalizeBlock } from './normalize.js';
import { createNowPlayingPanel } from './ui/nowPlayingPanel.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <main>
    <h1>Cardano FM</h1>
    <div id="now-playing"></div>
  </main>
`;

const panel = createNowPlayingPanel(document.querySelector('#now-playing'));

const provider = createProvider();
provider.start(
  (raw) => {
    const event = normalizeBlock(raw);
    panel.setEvent(event);
    console.log('block event', event);
  },
  (status) => panel.setStatus(status),
);
