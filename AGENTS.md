# Instructions for coding agents

This file is for AI coding agents and for humans who want the short version. Read it before changing anything.

## What this is

Ballistic Foley Lab is a static, client-side research bench for physical sound generators. It runs entirely in the
browser, is deployed to GitHub Pages and also ships as one offline HTML file. Generators that prove themselves here may
later move into [SFX Workbench](https://github.com/eigensoundlab/SFXWorkbench), so keep the DSP easy to lift out.

## Commands

| Task | Command |
|---|---|
| Run locally | `npm start` then open http://localhost:8080 |
| Test | `npm test` (Node built-in test runner, no browser) |
| Build offline file | `npm run build` writes `dist/ballistic.html` |
| Everything CI runs | `npm run check` |

## Rules

1. **The engine stays pure.** `src/engine.js` has no DOM, no Web Audio and no imports. It takes plain parameters and
   returns `Float32Array`s, so it runs on the page, in the worker and in Node tests. UI code lives in `src/app.js`.
2. **No runtime dependencies,** and no dev dependencies without a clear reason.
3. **Keep the offline build working.** `index.html` must keep the exact `<script src="src/engine.js">` and
   `<script src="src/app.js">` tags that `scripts/build.mjs` replaces.
4. **Presets are data.** Add them to `PRESETS` in `src/engine.js`, using only keys that exist in `DEFAULTS`; the tests
   render every preset and fail on unknown keys, NaN, clipping or a loop that clicks.
5. **Say where a level comes from.** Physical levels (blasts, shocks, channels) stay physical. A layer without a measured
   level is set against a physical one; say so in a comment and in the Layer levels note (`MIX_NOTE` in `src/app.js`).
6. **Every change has a test** in `tests/` when it adds or changes physics.
7. **UI copy:** plain, specific words from the user's side. No emoji. Check light and dark themes and a 400 px wide view.
8. **Licence:** Apache-2.0. Every source file starts with `// SPDX-License-Identifier: Apache-2.0`.
9. **Commits:** author `Daniel Sandner <134306627+sandner-art@users.noreply.github.com>`. No AI attribution in commit
   messages or pull request descriptions: no `Co-Authored-By` trailers, no session links, no "generated with" lines.

## Recordings and impulse responses

Recordings and impulse responses are assets, not parameters: `setAsset(id, { name, L, R })` in `src/engine.js` stores
them (ids `rec:<n>` for recordings, `ir:<n>` for impulse responses; `ex:` ids are the built-in synthetic examples), and
parameters only name them (`rcAsset`, `rcIr`, `irAsset`). The page hands each one to the worker once with
`job({ asset: true, id, name, L, R })`, which answers nothing. Assets last until the page reloads; `start()` in
`src/app.js` falls back to the examples and built-in rooms when a saved state names one that is gone. Convolution goes
through `fftConvolve`; the tests check it against the direct sum.

## Sending to SFX Workbench

`sendToWorkbench()` in `src/app.js` opens or reuses a window named `sfxworkbench` on the same origin and posts
`{ type: 'sfxworkbench:import', v: 1, id, from, group, files: [{ name, bytes, role }] }`: the mix as a 32-bit float WAV
with role `mix`, and, with stems on, one file per layer group with role `stem`. SFX Workbench puts them in the library
group `group`, links the stems to the mix and may load them into its layer stack. It answers `{ type: 'sfxworkbench:ready',
v: 1 }` to its opener when it starts and `{ type: 'sfxworkbench:imported', v: 1, id, count }` once the files are in its
library. Both sides read messages only from their own origin. Change the message shape only together with the receiver
in SFX Workbench (`src/app/sendlink.js` there).

Stems come from `renderStems()` in `src/engine.js`: the other groups get a vanishing gain instead of zero, so every
branch and random draw matches the full mix and the stems add up to it exactly. Keep every layer gain linear (no
gain inside a square root, a division or a level-dependent switch other than `> 0`), or that stops being true; the
stems test catches it.
