# Cardano FM

A single static website that turns the live Cardano blockchain into
continuously generated techno, synthesised in your browser with
[Strudel](https://strudel.cc). There's no backend: every listener's browser
fetches chain data directly from [Koios](https://koios.rest) and generates
the music locally. Because it's deterministic (driven by block data + wall-
clock time), everyone listening at the same moment hears the same thing,
like a real radio station, without any server coordinating them.

## Local development

```
npm install
npm run dev
```

Open the printed localhost URL. Click **Tune in** — browsers only allow
audio to start from inside a click, so nothing plays automatically.

### Data modes

The page picks a data source from the URL:

| URL | Source |
| --- | --- |
| `?mock=1` | Synthetic blocks, random 3-60s gaps. No network, no API token needed. |
| `?replay=<file>&speed=<n>` | Replays a fixture recorded by `scripts/record-fixture.mjs` from `public/fixtures/`. `speed` (default 1) scales playback — `&speed=20` zips through a recording fast for testing. A real fixture, `sample-mainnet.json`, is already committed. |
| *(no params)* | Live Koios polling. **Needs a Koios API token to work in a browser** — see below. |

### Live Koios mode needs a free API token

Koios's no-signup public tier does not set `Access-Control-Allow-Origin` on
its real API responses (confirmed by testing directly — only the OPTIONS
preflight claims to allow it), so browsers refuse to let JS read the
response. Koios's **free registered tier** fixes this: sign up at
[koios.rest](https://koios.rest) (connect a Cardano wallet, sign a message —
no payment) to get a Bearer token, then:

```
cp .env.example .env.local
# paste your token into VITE_KOIOS_API_TOKEN in .env.local
```

That token gets baked into the built JS as plain text — visible to anyone
who inspects the deployed site, same as any client-embedded API key. Don't
put a token in there you're not comfortable exposing.

**Quota ceiling, read before relying on this for many listeners:** every
visitor's browser polls independently, and one always-open tab polling
`/tip` every 10s alone uses ~8,640 requests/day against the registered
tier's 50,000/day cap — before the 2 extra requests Koios needs per new
block to compute `scriptRatio`/`mintCount` (see `normalize.js`). This setup
comfortably supports a handful of simultaneous listeners on one token, not
a crowd. If you outgrow it: get a paid Koios tier (same architecture, bigger
number), or shard listeners across multiple tokens — out of scope here.

### Recording a fixture

```
node scripts/record-fixture.mjs [count] [outFile]
# e.g.
node scripts/record-fixture.mjs 20 mainnet-20.json
```

Runs in plain Node (18+), polling Koios's public tier directly — no CORS
concern server-side, no token needed for a short one-off recording. Writes
to `public/fixtures/<outFile>`; try it with `?replay=<outFile>`.

### Tests

```
npm test
```

Unit tests cover `normalize.js` (chain data -> 0..1 musical values) and
`src/audio/clock.js` (wall-clock <-> Strudel cycle math).

## Where to tune things

- **`src/normalize.js`** — the one place that decides what a given piece of
  chain data *means* musically (how "busy" counts as 1.0, how ADA amounts
  log-scale, etc). Heavily commented; tune the constants at the top.
- **`src/audio/patterns/station-techno.js`** — the actual track. Edit it like
  you'd edit a track in a DAW. Structured so another station (reading the
  same normalized events differently) can be added as a sibling file later.
- **`src/config.js`** — tempo, wall-clock sync anchor, poll interval.

## Build & deploy

```
npm run build
```

Produces a self-contained `dist/`. Upload its contents to any static host —
there's nothing to configure server-side. Asset paths are relative (Vite's
`base: './'`), so it also works unmodified from a subdirectory
(`https://example.com/radio/`, not just the domain root) — verified by
serving `dist/` two directories deep with a plain static file server
(`npx serve`), not just Vite's own tooling.

## Known limitations / things that still need a human check

- **Audible mix and two-device sync** haven't been confirmed by ear from
  this environment — only that the engine initializes, the scheduler
  starts, and no exceptions are thrown (headless browser + unit tests).
  Listen for yourself, and for the sync claim specifically, put two devices
  side by side.
- **Android Chrome** hasn't been tested on a real device/network — the spec
  calls for that explicitly; do it before considering this done.
- Headless Chromium logs a recurring `[getTrigger] AudioWorkletNode` console
  warning on every run. A Strudel maintainer thread about a similar report
  says `@strudel/web`'s `initStrudel()` (unlike a different package,
  `@strudel/repl`) initializes audio correctly, so this looks like a
  headless-environment quirk rather than a bug in this code — but worth
  knowing it's there if you go looking at the console.

## License

[AGPL-3.0](./LICENSE). Required, not just chosen: this app bundles Strudel
(itself AGPL-3.0) and serves it to every visitor over a network, which is
exactly the condition the AGPL's network-use clause (§13) is about — so the
whole combined work needs to be AGPL-3.0, with source available to every
user who interacts with it. All sound is synthesis (oscillators, noise,
filters, envelopes) — no sample packs — so there's no sample-licensing
question on top of that.
