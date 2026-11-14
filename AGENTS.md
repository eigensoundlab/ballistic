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
8. **Commits:** author `Daniel Sandner <134306627+sandner-art@users.noreply.github.com>`. No AI attribution in commit
   messages or pull request descriptions: no `Co-Authored-By` trailers, no session links, no "generated with" lines.

## Sending to SFX Workbench

`sendToWorkbench()` in `src/app.js` opens or reuses a window named `sfxworkbench` on the same origin and posts
`{ type: 'sfxworkbench:import', v: 1, id, from, files: [{ name, bytes }] }` with a 32-bit float WAV. SFX Workbench answers
`{ type: 'sfxworkbench:ready', v: 1 }` to its opener when it starts and `{ type: 'sfxworkbench:imported', v: 1, id, count }`
once the files are in its library. Both sides read messages only from their own origin. Change the message shape only
together with the receiver in SFX Workbench.
