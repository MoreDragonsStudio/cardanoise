import { createMockProvider } from './mockProvider.js';

// Picks a BlockDataProvider based on URL query params:
//   ?mock=1          -> synthetic blocks (src/data/mockProvider.js)
//   ?replay=<file>   -> recorded fixture playback (lands in milestone 4)
//   (none)           -> live Koios polling (lands in milestone 4)
//
// Real/replay aren't built yet (milestone 4), so both currently fall back to
// mock with a loud console warning rather than crashing the page.
export function createProvider(locationSearch = window.location.search) {
  const params = new URLSearchParams(locationSearch);

  if (params.has('mock')) {
    return createMockProvider();
  }

  if (params.has('replay')) {
    console.warn(
      `?replay=${params.get('replay')} requested, but replay mode isn't implemented yet ` +
        '(milestone 4). Falling back to mock data.',
    );
    return createMockProvider();
  }

  console.warn(
    'Live Koios mode isn\'t implemented yet (milestone 4). Falling back to mock data. ' +
      'Pass ?mock=1 to silence this warning.',
  );
  return createMockProvider();
}
