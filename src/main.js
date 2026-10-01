import './style.css';
import { createProvider } from './data/createProvider.js';
import { normalizeBlock } from './normalize.js';
import { createNowPlayingPanel } from './ui/nowPlayingPanel.js';
import { createTuneInButton } from './ui/tuneInButton.js';
import { startAudio, stopAudio, liveState } from './audio/strudelEngine.js';

const app = document.querySelector('#app');
app.innerHTML = `
  <main>
    <h1>Cardano FM</h1>
    <div id="tune-in"></div>
    <div id="now-playing"></div>
  </main>
`;

createTuneInButton(document.querySelector('#tune-in'), {
  onTuneIn: startAudio,
  onTuneOut: stopAudio,
});

const panel = createNowPlayingPanel(document.querySelector('#now-playing'));

const provider = createProvider();
provider.start(
  (raw) => {
    const event = normalizeBlock(raw);
    liveState.setLatestEvent(event);
    panel.setEvent(event);
    console.log('block event', event);
  },
  (status) => panel.setStatus(status),
);
