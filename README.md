# Ballistic Foley Lab

A research bench for physical sound generators. Each sound is computed from the physics of the event: speed, size,
mass, energy, materials and the geometry between source and listener. A chain of action filters then pushes the
result toward a film or game mix. Parts that prove themselves here may move into
[SFX Workbench](https://github.com/eigensoundlab/SFXWorkbench).

**Use it:** https://eigensoundlab.github.io/ballistic/
**Offline copy:** download [`ballistic.html`](https://eigensoundlab.github.io/ballistic/download/ballistic.html) and
open it in any modern browser. Everything runs locally; nothing is uploaded.

## Sources

| Source | What is modelled |
|---|---|
| Projectile | Drag-based flight, Mach cone timing, N-wave shock (Whitham), muzzle blast (Friedlander), vortex-shedding wake with Doppler, ricochet tumble, resonant impacts, payloads |
| Explosion | Blast by cube-root scaling (Hopkinson-Cranz), fireball rumble, ground shock arriving ahead of the air blast, fragments flying past, debris landing |
| Implosion | Rayleigh-Plesset cavity collapse with rebounds in air or water, shell stress lead-in, fracture and falling debris |
| Destruction | Fracture into pieces whose size sets their pitch, free fall, bounces by restitution, stick-slip creaks and groans before the break |
| Jet, rocket | Jet mixing noise from thrust, exhaust speed and nozzle size, supersonic crackle, chug, turbine whine; launch, fly-by, landing with a braking burn, static burn as a loop |
| Rotor | Rotor speed from weight and rotor size, blade-pass tones, vortex noise, detuned rotors beating, blade slap, motor whine; hover as a loop, fly-by, take-off, landing |
| Discharge | Thunder from a crooked channel split into stretches (Few), branches, return strokes, sustained arcs, charger whine, coil kick and ring |
| Blaster | A weapon chain: launcher, bolt in flight, target (see below) |
| Forcefield | A driven sheet of modes with beating generators, or a reduced plasma (MHD) model: slow, shear and fast waves, reconnection crashes, chorus, half-frequency ripple, solitons, kink disruption |

Any event can repeat on a timeline (bursts, salvos, swarms), and every Fire is a fresh take from a new seed.

### The weapon chain

- **Launcher.** A struck dispersive line (the classic "pew": waves on a stiff line arrive highs first). A rail gun: capacitor
  dump, armature arc, plasma flash at the muzzle, and two rails ringing as free bars, their bending waves running from the
  breech. A coil gun: stages that fire closer together as the slug gains speed, each pull shorter and so higher. A gas nail
  gun: valve, chamber (Helmholtz) pop, driver strike, barrel ringing as a quarter-wave pipe, return spring twang.
- **Bolt.** A plasma bolt or a beam heats a straight channel of air; each stretch sends an N-wave whose length follows
  from the energy per metre, heard in the order the stretches reach the listener. A pulsed beam repeats it at the pulse
  rate. A slug flies with drag, cracks where its shock cone reaches the listener, and sizzles above about Mach 4.
- **Target.** Ablation: the energy that boils the surface off acts as a small blast, then the vapour jet hisses. Plates
  (steel, aluminium, glass, ice, wood) ring with bending waves whose group speed is 2 sqrt(kappa w): every path from the
  hit, edge reflections included, arrives as a falling sweep, then the plate modes ring on. Water splashes and crackles
  with collapsing steam bubbles. Afterwards the hot spot sizzles and the body ticks as it cools; ice cracks instead, and
  each crack sings along the sheet.

## Action filters

Punch (transient shaper), Weight (sub drop and low shelf), Drive, Bite (presence), Tail (long dark reverb), Swell (reversed
lead-in), Width, Loudness (compressor and limiter) and Slow motion, with presets from Physics only to Blockbuster. The
Physics and Action switch plays the same take with and without them.

## Saving and sending

- **Save WAV** saves the version you are playing as a 24-bit, 48 kHz stereo WAV. Hover and burn loops save one seamless period.
- **Send to SFX Workbench** (on the site) opens SFX Workbench in another tab, or uses the one it opened before, and hands it
  the sound as a 32-bit float WAV, so nothing is lost on the way. Both pages are on eigensoundlab.github.io, so they talk
  directly in the browser; nothing leaves your computer. SFX Workbench needs a version with the receiving side.

## How far to trust the numbers

The timing, geometry and dispersion follow the physics: arrival times, Mach cones, Doppler, sweep shapes and modal
frequencies. Levels are physical for blasts, shocks and channel cracks. Where no measured level exists (launcher parts,
struck bodies, aftermath, forcefields), the layer is set against the physical one, and the Layer levels panel says so.
Real plasma waves are far above hearing, so the forcefield slows them down and shows the factor.

## Working on it

No dependencies. Node 22 or newer for the tests and the build.

| Task | Command |
|---|---|
| Run locally | `npm start`, then open http://localhost:8080 |
| Test | `npm test` |
| Build the offline file | `npm run build` writes `dist/ballistic.html` |
| Both | `npm run check` |

To try Send to SFX Workbench locally, put both checkouts in one folder and serve that folder, so the two pages share an
origin: `node scripts/serve.mjs --root ..`, then open http://localhost:8080/ballistic/?workbench=/SFXWorkbench/.

```
index.html          markup and styles; loads src/engine.js and src/app.js
src/engine.js       all physics and DSP, no DOM; runs on the page, in the render worker and in Node tests
src/app.js          controls, diagrams, playback, saving and sending
src/worker.js       render worker for the site (the offline file builds one from its inline engine)
scripts/build.mjs   inlines everything into dist/ballistic.html
scripts/serve.mjs   static server for local work
tests/              node:test checks: clean renders, seamless loops, repeatable takes, weapon physics, WAV files
```

Pushing to `main` runs the tests and deploys the site with GitHub Actions (`.github/workflows/pages.yml`).
