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

## Your sounds

Loaded and recorded sounds are assets, not parameters: `setAsset(id, { name, L, R })` in `src/engine.js` stores them
(ids `rec:<n>`; `ex:` ids are the built-in synthetic examples), and parameters only name them (`rcAsset`, `rcIr`,
`irAsset`, `seqAsset`, `dsKnock`, `grAsset`). The engine reads an asset as a job needs and caches each reading by id:
`getIR` (trimmed, peak 1), `getHits` (hits and strengths), `getModes` (measured modes), `getGrains`; `setAsset`
clears them. The page hands each sound to the worker once with `job({ asset: true, ... })`, which answers nothing, and
again to any new worker. Sounds last until the page reloads; `start()` in `src/app.js` falls back to the examples
when a saved state names one that is gone. Convolution goes through `fftConvolve`; the tests check it against the
direct sum.

The page keeps your sounds in IndexedDB (`ballistic-foley-lab`, store `sounds`: id, name, meta, L, R) and restores
them before slots fall back. `meta` holds the facts the page knows (origin, date as local ISO time, input device, browser,
model, processing) and what the user set (project, tags, notes). `wavFile(L, R, float, meta)` in the engine writes them
as `bext`, `iXML` and `_PMX` (XMP) chunks ahead of the audio; `xmpText(meta)` is also the sidecar. Keywords follow
Kurator's sidecar format (`kurator/xmp.py`): paths with `|` in `lr:hierarchicalSubject`, `/` in `digiKam:TagsList`,
group roots `Projects`, `Status`, `Source`. Do not add Kurator's own namespace: the sidecar is not Kurator's.

Record (`#recview`, the record view section of `src/app.js`) records into the slot `take`; quick tags are `RV.chips`
(on for the next take) and `RV.mine` (made by the recordist, kept until forgotten), both in `bfx-rv`; plans live in localStorage
(`bfx-plans`) and travel as `#plan=` links: `packPlan` / `unpackPlan` in the engine (base64url JSON with short keys,
the same in Kurator's `kurator/plans.py`). `qrCode` / `qrSvg` draw the QR code. A session zip holds the WAVs, their
sidecars and `ballistic-session.json` (format `ballistic-session`, version 1): change it only together with Kurator's
`kurator/sessions.py`, which unpacks it.

Hits from a recording start events in `mixScene` (at most `MAX_TRIGGERS`); `STRENGTH` lists which parameters a hit's
strength scales per source type. The triggering recording is a fifth layer group (`g5` in `sceneGains`, its own
stem), so the stems still add up. A fit is `job({ fit: true, ... }, post)`: it renders `FIT_TRIES` values of one
parameter and calls `post` with progress, which the worker forwards to the page.

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
