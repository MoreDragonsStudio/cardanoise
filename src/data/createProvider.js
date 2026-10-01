import { createMockProvider } from './mockProvider.js';
import { createReplayProvider } from './replayProvider.js';
import { createKoiosProvider } from './koiosProvider.js';

// Picks a BlockDataProvider based on URL query params:
//   ?mock=1                    -> synthetic blocks (mockProvider.js)
//   ?replay=<file>[&speed=<n>] -> recorded fixture playback (replayProvider.js)
//   (none)                     -> live Koios polling (koiosProvider.js)
export function createProvider(locationSearch = window.location.search) {
  const params = new URLSearchParams(locationSearch);

  if (params.has('mock')) {
    return createMockProvider();
  }

  if (params.has('replay')) {
    const speed = Number(params.get('speed')) || 1;
    return createReplayProvider(params.get('replay'), { speed });
  }

  return createKoiosProvider();
}
