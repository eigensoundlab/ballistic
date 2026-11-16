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
| Recording | Your own sound, placed at a distance or flying past (Doppler, air, ground-bounce flanging), and optionally driving a body: a plate, a rail, a spring, a dispersive line or a recorded object |

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

### Your sounds

Wherever a sound is asked for, there is a menu of your sounds and the built-in examples, with **Load a file** and
**Record** next to it. Files can be WAV, AIFF, FLAC, MP3, M4A or OGG; the first 15 s are used. The examples are
synthetic, so every preset plays before you load anything.

- **Recording source.** Places a sound in the scene, standing at a distance or flying past on a path, with the Doppler
  shift and the comb notch of its ground reflection following the geometry. It can drive a body: plates (steel,
  aluminium, glass, ice, wood), a rail, a spring, the dispersive line, or a recorded object (a knock or tap on it).
  Through a dispersive body every path arrives as its own falling sweep, so rain on a steel sheet or a voice down a
  long spring keeps the timing of the real thing.
- **Recorded room** (Scene panel). A clap, a balloon pop or a measured impulse response becomes the environment for
  every source, loops included.
- **Hits of a recording** (Sequence panel). Every hit in a recording, knocks on a door for example, starts one event.
  A hit's strength sets the event's size where the source has one (charge, mass, energy) and its level elsewhere. The
  recording itself can play in the mix and comes out as its own stem.
- **Measured object** (Destruction). The modes of a recorded knock (frequency, decay and level of each) are measured
  and the object breaks with them: a piece of mass m rings (M/m)^(1/3) higher than the whole object, and shorter.
  *Breaks like* sets how it fractures.
- **Grains of a recording** (Explosion debris, Destruction landings). A recording is cut at its hits into grains; each
  landing piece takes a grain by its size, re-pitched by its size, at the level its landing energy gives. The timing
  stays physical.
- **Reference** panel. Compare the Physics version with a recording of the real thing: octave-band balance,
  brightness, decay, rise and length. *Fit to the reference* tries 24 values of one setting (a coarse sweep, then a
  golden-section search) and keeps the one that comes closest; Undo puts it back.
- **Save body IR** and **Save room IR** write the physical models as 32-bit float impulse responses, for any
  convolution reverb in a DAW or a game engine.

### Keeping, saving and sending your sounds

Every sound you record or load also appears under **Your sounds**, where it stays in this browser (IndexedDB) until you
remove it, across reloads. From there: **Play**, **Save WAV**, **Send** to SFX Workbench, **Edit** (name, project, tags,
notes) and **Remove**; **Save all** writes one zip, **Send all** hands every sound to SFX Workbench. Sounds are decoded
and resampled to 48 kHz by your browser and never leave your computer unless you save or send them. The browser can
still clear its storage when space runs low, so save what matters.

**Project**, **Tags** and **Recordist** at the top go with every new recording and loaded file, and with saved renders.
Tags are separated by commas, with / for levels (*Nature/Birds*). A saved WAV (24-bit, 48 kHz; one channel when the
sound has one, as from most phone microphones) carries:

| Chunk | What is in it |
|---|---|
| `bext` (Broadcast WAV) | description (name and notes), originator, reference, origination date and time, time reference |
| `iXML` | project, scene, take, note, tracks; in USER: input device, phone model (Chrome), browser, the sample rate recorded at, whether the browser's voice processing was off, time zone; for renders the parameters |
| `_PMX` (XMP) | keywords as Lightroom (`lr:hierarchicalSubject`), digiKam (`TagsList`) and Kurator read them, with Kurator's groups as roots: `Nature\|Birds`, `Projects\|Forest walk`, `Source\|Ballistic Foley Lab`; creation date; title, notes, recordist |

*Save all* adds a `.wav.xmp` sidecar per sound. [Kurator](https://github.com/eigensoundlab/kurator) takes the sidecar's
date as the file's date and, with *Import keywords*, turns the keywords into tags in the right groups (subjects, project,
source). It also shows the bext and iXML fields of the WAV itself.

### Recording, on a phone or elsewhere

**Record** at the top right opens a view made for a phone in one hand: a plan's shots to tick off, quick tags to switch
on (*Nature*, *Objects*, *Ambience*, *Foley*, or a plan's own), one big button, the takes of this session, and **Save
session**. **+ Tag** makes a tag of your own on the spot (*Birds*, or levels like *Nature/Water*); your own tags stay in
the row, with every plan, until you forget one with the cross next to it. Takes made with a tag keep it. A take is named after its shot and number (with the shot's UCS category in front when it has one, which
Kurator recognises), and carries the plan, the shot, the project, the tags, the notes typed for it and, if you switch
it on, the place: **Add the location** asks the browser for the position at the start of each take and writes it into
the iXML and XMP of the file only. A shot that has all its takes hands over to the next open one.

**Plans** (in Record): a name, a project, quick tags, and shots, each with tags, how many takes, and an optional UCS
category. A plan goes to a phone as a link or a **QR code**: the plan travels in the part of the address after `#plan=`,
which is never sent to any server. Kurator makes the same links. Plans also save and load as `.plan.json` files.

**Save session** writes one zip: each take as WAV with its metadata, a `.xmp` sidecar each, and `ballistic-session.json`
(the plan, and per file its shot, take, tags, notes and place). **Share session** hands the zip to the phone's share
sheet where the browser allows it (Files, iCloud Drive, Google Drive, Syncthing). Put it in a folder your computer syncs
and that is in Kurator's library: Kurator unpacks it next to itself, tags the sounds in the right groups and counts the
takes against the plan. Kurator runs on your computer, so the synced folder is how a phone reaches it. *Save all* under
Your sounds writes the same kind of zip.

**Send to Kurator** (on a computer where Kurator runs) hands the session straight to Kurator: the first time it opens a
Kurator tab, which takes the zip and puts the takes into the library folder set in Kurator's Settings (by default
*Ballistic Foley Lab* in the first library folder), each session in a folder of its own, tagged and counted against the
plan. Send again after more takes and only the new ones are added, to the same folder; **Send all to Kurator** under Your
sounds skips the takes Kurator already has. Kurator answers only the Ballistic address in its Settings. If Kurator runs
on another port than 8765, open Ballistic once from Kurator (Settings, Recording sessions, *Open Ballistic Foley Lab*,
or *Open in Ballistic* in a plan): the link tells Ballistic where Kurator is.

**Send to SFX Workbench** (on the site) opens SFX Workbench in a new tab with the session's takes, in a library group
named after the project and day (*Forest walk 2026-11-15*), with their date and tags kept in the files. What you make
from them there keeps them too, and goes back to Kurator through Kurator's own SFX Workbench link.

Recording asks the browser to switch its voice processing off (echo cancellation, noise suppression, automatic gain).
It waits for the sound to start, keeping 0.15 s before it, so the tap on the screen is not in the take; in Record,
*Stop by itself after 1.5 s of quiet* ends a take when its ring has died away (knocks, claps and rooms elsewhere always
do). Recording needs the site (https) or a local server, and the browser's permission; the offline file can record in
Chrome, and inside the Claude viewer it cannot, so record with another app there and load the file.

Phone browsers do not always honour the request to switch processing off, iPhone browsers least of all. For the best
takes on an iPhone, record in Voice Memos with Settings, Voice Memos, Audio Quality set to Lossless, save the memo to
Files, and load it. On any phone: hold it still or stand it on something, mic end toward the sound (about 20 to 30 cm
from a small object), switch notifications off, keep peaks short of clipping, and leave a second of quiet after a
knock so its ring is all there.

## Action filters

Punch (transient shaper), Weight (sub drop and low shelf), Drive, Bite (presence), Tail (long dark reverb), Swell (reversed
lead-in), Width, Loudness (compressor and limiter) and Slow motion, with presets from Physics only to Blockbuster. The
Physics and Action switch plays the same take with and without them.

## Saving and sending

- **Save WAV** saves the version you are playing as a 24-bit, 48 kHz stereo WAV. Hover and burn loops save one seamless period.
- **With stems** adds the four layer groups of the Layer levels panel (for a blaster: launcher, bolt, impact, aftermath)
  as separate files, and a fifth for a recording whose hits trigger the events, when it is in the mix. Stems are the Physics version, before the action filters, and add up to it sample for sample.
  Saved, they come in one zip with the mix; stems are 32-bit float so that nothing clips.
- **Send to SFX Workbench** (on the site) opens SFX Workbench in another tab, or uses the one it opened before, and hands
  it the sound as a 32-bit float WAV. It lands in a "Ballistic Foley Lab" group in the library. Sent with stems, they go
  into its layer stack, unless the stack holds something you built; then a Layers button next to the sound loads them.
  Both pages are on eigensoundlab.github.io, so they talk directly in the browser; nothing leaves your computer.

## How far to trust the numbers

The timing, geometry and dispersion follow the physics: arrival times, Mach cones, Doppler, sweep shapes and modal
frequencies. Levels are physical for blasts, shocks and channel cracks. Where no measured level exists (launcher parts,
struck bodies, aftermath, forcefields), the layer is set against the physical one, and the Layer levels panel says so.
A recording has no known level: its body is set to its loudness, and only distance, air and ground bounce are physical.
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

Pushing to `main` runs the tests and deploys the site with GitHub Actions (`.github/workflows/pages.yml`), when the
repository's Pages source is set to "GitHub Actions".

## Licence

Apache License 2.0, see [LICENSE](LICENSE) and [NOTICE](NOTICE). © 2026 Daniel Sandner. The same licence as
SFX Workbench, so generators can move between the two.
