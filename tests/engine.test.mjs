// SPDX-License-Identifier: Apache-2.0
// Engine checks: every preset renders clean audio, loops close, takes repeat, and the weapon physics behaves as modelled.
// The engine is a plain script that attaches BFX to the global object, the same way the page and the worker load it.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/engine.js';

const B = globalThis.BFX;
const FS = B.FS;
const params = pr => B.merge(B.DEFAULTS, pr.p);
const finite = x => x.every(Number.isFinite);
const preset = id => B.PRESETS.find(pr => pr.id === id);
/* how far the first sample strays from the straight continuation of the last two, against the largest such
   stray within 10 ms on either side of the seam: a click stands out far above 1, a clean loop sits below it */
function seam(x) {
  const n = x.length, w = 480, dev = i => Math.abs(x[i % n] - (2 * x[(i - 1 + n) % n] - x[(i - 2 + n) % n]));
  let d = 0;
  for (let i = n - w; i < n + w; i++) if (i !== n) d = Math.max(d, dev(i));
  return dev(n) / (d || 1);
}
/* zero crossings per second in a window */
function zcr(x, a, b) {
  let c = 0;
  for (let i = a + 1; i < b; i++) if ((x[i] >= 0) !== (x[i - 1] >= 0)) c++;
  return c / 2 / ((b - a) / FS);
}

test('presets use only known parameters and every source type has presets', () => {
  const kinds = new Set();
  for (const pr of B.PRESETS) {
    for (const k of Object.keys(pr.p)) assert.ok(k in B.DEFAULTS, `${pr.id}: unknown parameter ${k}`);
    kinds.add(pr.p.kind || 'projectile');
  }
  assert.equal(new Set(B.PRESETS.map(pr => pr.id)).size, B.PRESETS.length, 'preset ids are unique');
  for (const k of ['projectile', 'explosion', 'implosion', 'destruction', 'rocket', 'rotor', 'discharge', 'blaster', 'field', 'recording']) assert.ok(kinds.has(k), k);
});

test('every preset renders finite, audible, normalised audio', () => {
  for (const pr of B.PRESETS) {
    const raw = B.renderRaw(params(pr), 4821);
    assert.ok(raw.L.length > FS * 0.1 && raw.L.length <= FS * 24.5, `${pr.id}: length ${raw.L.length}`);
    assert.ok(finite(raw.L) && finite(raw.R), `${pr.id}: finite`);
    const pk = B.peakOf(raw.L, raw.R);
    assert.ok(pk > 0.99 && pk <= 1.0001, `${pr.id}: peak ${pk}`);
  }
});

test('the action filters keep every preset finite and under the limiter ceiling', () => {
  const block = B.merge(B.ACTION_DEFAULTS, B.ACTION_PRESETS.find(a => a.id === 'block').a);
  for (const pr of B.PRESETS) {
    const fx = B.actionize(B.renderRaw(params(pr), 7), block);
    assert.ok(finite(fx.L) && finite(fx.R), `${pr.id}: finite`);
    assert.ok(B.peakOf(fx.L, fx.R) <= 0.9, `${pr.id}: limited`);
  }
});

test('loops close without a click, through the action filters too', () => {
  const loops = B.PRESETS.filter(pr => B.isLoop(params(pr)));
  assert.ok(loops.length >= 5);
  for (const pr of loops) {
    const raw = B.renderRaw(params(pr), 11);
    assert.equal(raw.L.length, B.LOOP_S * FS, pr.id);
    assert.ok(seam(raw.L) < 1 && seam(raw.R) < 1, `${pr.id}: raw seam`);
    for (const ap of B.ACTION_PRESETS) {
      const fx = B.actionize(raw, B.merge(B.ACTION_DEFAULTS, ap.a));
      assert.ok(fx.loop && seam(fx.L) < 1 && seam(fx.R) < 1, `${pr.id} ${ap.id}: seam`);
    }
  }
});

test('a take repeats exactly from its seed and changes with it', () => {
  for (const id of ['rifle', 'charge', 'railgun', 'laser', 'plasma']) {
    const p = params(preset(id)), a = B.renderRaw(p, 99), b = B.renderRaw(p, 99), c = B.renderRaw(p, 100);
    assert.deepEqual(a.L, b.L, `${id}: same seed`);
    assert.notDeepEqual(a.L, c.L, `${id}: new seed`);
  }
});

test('a plate struck alone falls in pitch: bending waves bring the highs first', () => {
  const p = B.merge(params(preset('thundersheet')), { env: 'none', tgHeat: 0 });
  const r = B.renderRaw(p, 3), at = Math.round((r.tStart > 0 ? 0 : -r.tStart) * FS) + Math.round(0.0065 * FS);
  const w = Math.round(0.004 * FS), early = zcr(r.L, at, at + w), late = zcr(r.L, at + 6 * w, at + 7 * w);
  assert.ok(early > 1.5 * late, `zero-crossing rate ${early.toFixed(0)} then ${late.toFixed(0)} per second`);
  const pl = B.analyze(p, 3).wp.tg.plate;
  assert.ok(Math.abs(pl.cb1k - Math.sqrt(pl.kap * 2 * Math.PI * 1000)) < 1e-9);
});

test('coil stages fire closer together as the slug speeds up', () => {
  const st = B.analyze(params(preset('coilslug')), 1).wp.ln.stages;
  for (let i = 2; i < st.length; i++) assert.ok(st[i].t - st[i - 1].t < st[i - 1].t - (i > 1 ? st[i - 2].t : 0) + 1e-12, `gap ${i}`);
  for (let i = 1; i < st.length; i++) assert.ok(st[i].v > st[i - 1].v && st[i].d < st[i - 1].d, `stage ${i}`);
});

test('a supersonic slug cracks only for a listener its shock cone reaches', () => {
  const down = B.analyze(params(preset('raildown')), 1).wp.bo, behind = B.analyze(params(preset('railgun')), 1).wp.bo;
  assert.ok(down.an.crack && down.an.crack.M > 1, 'downrange hears the crack');
  assert.equal(behind.an.crack, null, 'behind the muzzle there is no crack');
});

test('a pulsed beam hits the target once per pulse, at the pulse rate', () => {
  const p = params(preset('pulselaser')), wp = B.analyze(p, 1).wp;
  assert.equal(wp.tg.hits.length, p.bvPulses);
  assert.ok(Math.abs(wp.tg.hits[1].te - wp.tg.hits[0].te - 1 / p.bvRate) < 1e-9);
  assert.ok(Math.abs(wp.bo.ch.Rc - Math.sqrt(p.bvChannel / (Math.PI * 101325))) < 1e-12, 'channel radius from energy per metre');
});

test('WAV encoders write valid 24-bit and 32-bit float stereo files', () => {
  const L = Float32Array.from([0, 0.5, -0.5, 1]), R = Float32Array.from([0.25, -1, 0, -0.125]);
  const pcm = new DataView(B.encodeWav(L, R).buffer), fl = new DataView(B.encodeWavFloat(L, R).buffer);
  const tag = (dv, o) => String.fromCharCode(dv.getUint8(o), dv.getUint8(o + 1), dv.getUint8(o + 2), dv.getUint8(o + 3));
  for (const [dv, fmt, bits] of [[pcm, 1, 24], [fl, 3, 32]]) {
    assert.equal(tag(dv, 0), 'RIFF'); assert.equal(tag(dv, 8), 'WAVE'); assert.equal(tag(dv, 36), 'data');
    assert.equal(dv.getUint16(20, true), fmt); assert.equal(dv.getUint16(22, true), 2);
    assert.equal(dv.getUint32(24, true), FS); assert.equal(dv.getUint16(34, true), bits);
    assert.equal(dv.getUint32(40, true), 4 * 2 * bits / 8);
  }
  assert.equal(fl.getFloat32(44 + 8, true), 0.5);
  assert.equal(fl.getFloat32(44 + 12, true), -1);
});

test('stems add up to the Physics version, one preset of each source type and every loop', () => {
  const ids = new Set();
  const byKind = {};
  for (const pr of B.PRESETS) { const k = pr.p.kind || 'projectile'; if (!byKind[k]) byKind[k] = pr.id; if (B.isLoop(params(pr))) ids.add(pr.id); }
  Object.values(byKind).forEach(id => ids.add(id));
  for (const id of ['railgun', 'pulselaser', 'mortar', 'knockglass', 'knockfire', 'potshatter', 'wallgravel', 'gravelblast']) ids.add(id);
  for (const id of ids) {
    const p = params(preset(id)), raw = B.renderRaw(p, 4821), stems = B.renderStems(p, 4821);
    assert.equal(stems.length, 5, id);
    assert.ok(stems.some(Boolean), `${id}: at least one stem`);
    const L = new Float64Array(raw.L.length), R = new Float64Array(raw.R.length);
    for (const s of stems) {
      if (!s) continue;
      assert.equal(s.L.length, raw.L.length, `${id}: stem length`);
      for (let i = 0; i < L.length; i++) { L[i] += s.L[i]; R[i] += s.R[i]; }
    }
    let err = 0;
    for (let i = 0; i < L.length; i++) err = Math.max(err, Math.abs(L[i] - raw.L[i]), Math.abs(R[i] - raw.R[i]));
    assert.ok(err < 2e-6, `${id}: stems differ from the mix by ${err}`);
  }
});

test('a stem whose layer group is off is left out', () => {
  const p = B.merge(params(preset('laser')), { trimImpact: -40 });
  assert.equal(B.renderStems(p, 3)[3], null);
});

test('the zip writer stores every file with a central directory', () => {
  const a = new Uint8Array([1, 2, 3]), b = new Uint8Array(1000).fill(7);
  const z = B.zipFiles([{ name: 'a.wav', data: a }, { name: 'stem-2.wav', data: b }]), dv = new DataView(z.buffer);
  const end = z.length - 22;
  assert.equal(dv.getUint32(end, true), 0x06054b50);
  assert.equal(dv.getUint16(end + 10, true), 2);
  const cdOff = dv.getUint32(end + 16, true);
  assert.equal(dv.getUint32(cdOff, true), 0x02014b50);
  assert.equal(dv.getUint32(0, true), 0x04034b50);
  const secondLocal = dv.getUint32(cdOff + 46 + 5 + 42, true);
  assert.equal(dv.getUint32(secondLocal, true), 0x04034b50);
  assert.equal(new TextDecoder().decode(z.slice(secondLocal + 30, secondLocal + 30 + 10)), 'stem-2.wav');
});

test('fast convolution matches the direct sum, for a mono and a stereo response', () => {
  const r = (n, s) => { let a = s; return Float32Array.from({ length: n }, () => ((a = (a * 16807) % 2147483647) / 2147483647) - 0.5); };
  const L = r(500, 3), R = r(500, 5), hL = r(90, 7), hR = r(61, 11);
  const direct = (x, h) => Float64Array.from({ length: x.length + h.length - 1 }, (_, n) => { let s = 0; for (let k = 0; k < h.length; k++) if (n - k >= 0 && n - k < x.length) s += x[n - k] * h[k]; return s; });
  const mono = B.fftConvolve(L, R, hL, null), st = B.fftConvolve(L, R, hL, hR), dL = direct(L, hL), dR = direct(R, hL), dR2 = direct(R, hR);
  let e = 0;
  for (let n = 0; n < dL.length; n++) e = Math.max(e, Math.abs(mono.L[n] - dL[n]), Math.abs(mono.R[n] - dR[n]), Math.abs(st.L[n] - dL[n]));
  for (let n = 0; n < dR2.length; n++) e = Math.max(e, Math.abs(st.R[n] - dR2[n]));
  assert.ok(e < 1e-5, `error ${e}`);
});

test('a recording flying past falls in pitch by the Doppler ratio', () => {
  const n = 10 * FS, tone = Float32Array.from({ length: n }, (_, i) => Math.sin(2 * Math.PI * 1000 * i / FS));
  B.setAsset('rec:test-tone', { name: 'tone', L: tone, R: tone });
  const v = 30, p = B.merge(B.DEFAULTS, { kind: 'recording', rcAsset: 'rec:test-tone', rcMode: 'flyby', rcSpeed: v, rcPass: 10, rcHeight: 1.7, miss: 5, ground: 0, env: 'none' });
  const raw = B.renderRaw(p, 1), w = FS, early = zcr(raw.L, Math.round(0.5 * FS), Math.round(0.5 * FS) + w), late = zcr(raw.L, raw.L.length - Math.round(1.6 * FS), raw.L.length - Math.round(1.6 * FS) + w);
  const want = (B.C + v) / (B.C - v), got = early / late;
  assert.ok(Math.abs(got / want - 1) < 0.02, `ratio ${got.toFixed(3)}, Doppler ${want.toFixed(3)}`);
  assert.ok(Math.abs(early / 1000 - B.C / (B.C - v)) < 0.02 * B.C / (B.C - v), `approaching at ${early.toFixed(0)} Hz`);
});

test('loaded impulse responses are trimmed, capped and normalised; built-in bodies and rooms export', () => {
  const L = new Float32Array(10 * FS), R = new Float32Array(10 * FS);
  for (let i = 0; i < FS; i++) { L[i] = 0.5 * Math.exp(-i / 4800) * Math.sin(i); R[i] = 0.25 * Math.exp(-i / 4800) * Math.cos(i); }
  const ir = B.prepareIR(L, R);
  assert.ok(ir.L.length < FS * 1.01 && ir.L.length > FS * 0.3, `trimmed to ${ir.L.length}`);
  assert.ok(Math.abs(B.peakOf(ir.L, ir.R) - 1) < 1e-6);
  const long = B.prepareIR(Float32Array.from({ length: 9 * FS }, () => 0.5));
  assert.ok(long.L.length <= B.IR_MAX_S * FS);
  for (const body of ['steel', 'aluminium', 'glass', 'ice', 'wood', 'rail', 'line', 'spring']) {
    const b = B.bodyIR(B.merge(B.DEFAULTS, { rcBody: body }), 1);
    assert.ok(b && finite(b.L) && Math.abs(B.peakOf(b.L, b.R) - 1) < 1e-6, body);
  }
  for (const env of ['field', 'forest', 'urban', 'valley', 'indoor', 'water']) {
    const r = B.roomIR(B.merge(B.DEFAULTS, { env }));
    assert.ok(r && finite(r.L) && r.L.length > FS * 0.3, env);
  }
  assert.equal(B.roomIR(B.merge(B.DEFAULTS, { env: 'none' })), null);
});

test('an imported room carries every source, loops included, and still closes them cleanly', () => {
  const room = B.prepareIR(Float32Array.from({ length: FS }, (_, i) => Math.exp(-i / 6000) * Math.sin(i * 0.7)), Float32Array.from({ length: FS }, (_, i) => Math.exp(-i / 6000) * Math.cos(i * 0.5)));
  B.setAsset('ir:test-room', { name: 'room', L: room.L, R: room.R });
  const dry = B.renderRaw(B.merge(params(preset('rifle')), { env: 'none' }), 2), wet = B.renderRaw(B.merge(params(preset('rifle')), { env: 'ir', irAsset: 'ir:test-room' }), 2);
  assert.ok(finite(wet.L) && wet.L.length > dry.L.length + 0.3 * FS, 'the room adds its tail');
  const loop = B.renderRaw(B.merge(params(preset('quad')), { env: 'ir', irAsset: 'ir:test-room' }), 2);
  assert.ok(seam(loop.L) < 1 && seam(loop.R) < 1, 'loop seam');
});

test('hits are found where the knocks are, the slam the strongest', () => {
  const a = B.getAsset('ex:door'), hits = B.detectHits(B.monoOf(a), 0.5), want = [0.25, 0.5, 0.75, 1.45, 1.68, 1.9, 2.12, 3.1];
  assert.equal(hits.length, want.length, hits.map(h => h.t.toFixed(3)).join(' '));
  hits.forEach((h, i) => assert.ok(Math.abs(h.t - want[i]) < 0.003, `hit ${i} at ${h.t}`));
  assert.equal(Math.max(...hits.map(h => h.s)), hits[hits.length - 1].s);
});

test('the modes of a knock are measured back: frequency, decay and level', () => {
  const mm = B.getModes('ex:knock'), F = [311, 742, 1297, 1938, 2716, 3528, 4405], T = [1.6, 1.1, 0.8, 0.55, 0.4, 0.3, 0.22], A = [1, 0.7, 0.55, 0.4, 0.3, 0.2, 0.15];
  assert.equal(mm.modes.length, F.length);
  mm.modes.forEach((m, i) => {
    assert.ok(Math.abs(m.f / F[i] - 1) < 0.005, `f ${m.f} for ${F[i]}`);
    assert.ok(Math.abs(m.t60 / T[i] - 1) < 0.15, `t60 ${m.t60} for ${T[i]}`);
    assert.ok(Math.abs(m.a / A[i] - 1) < 0.25, `level ${m.a} for ${A[i]}`);
  });
  /* a short wooden knock in noise */
  const n = 2 * FS, x = new Float32Array(n), r = B.rng(5);
  [[180, 0.12, 1], [415, 0.08, 0.5], [830, 0.05, 0.33]].forEach(([f, t60, a]) => { let e = a; const R = Math.pow(10, -3 / (t60 * FS)); for (let i = 4800; i < n; i++) { x[i] += e * Math.sin(2 * Math.PI * f * (i - 4800) / FS); e *= R; } });
  for (let i = 0; i < n; i++) x[i] += (r() - 0.5) * 0.003;
  const w = B.measureModes(x);
  assert.equal(w.modes.length, 3);
  [180, 415, 830].forEach((f, i) => assert.ok(Math.abs(w.modes[i].f / f - 1) < 0.01, `wood f ${w.modes[i].f}`));
  [0.12, 0.08, 0.05].forEach((t, i) => assert.ok(Math.abs(w.modes[i].t60 / t - 1) < 0.15, `wood t60 ${w.modes[i].t60}`));
});

test('a measured object breaks at its own pitch', () => {
  const p = B.merge(params(preset('potshatter')), { trimLaunch: -40, trimWake: -40, trimImpact: -40, env: 'none', ground: 0 });
  const raw = B.renderRaw(p, 3), N = 1 << 17, re = new Float64Array(N), im = new Float64Array(N);
  for (let i = 0; i < N && i < raw.L.length; i++) re[i] = raw.L[i];
  B.fft(re, im);
  let best = 0, bk = 0;
  for (let k = Math.round(100 * N / FS); k < Math.round(3000 * N / FS); k++) { const m = re[k] * re[k] + im[k] * im[k]; if (m > best) { best = m; bk = k; } }
  assert.ok(Math.abs(bk * FS / N / 311 - 1) < 0.05, `strongest at ${(bk * FS / N).toFixed(1)} Hz`);
});

test('events start at the hits of a recording; the recording is its own stem', () => {
  const base = B.merge(params(preset('knockfire')), { env: 'none', seqJitter: 0 });
  const only = B.renderStems(B.merge(base, { trimCrack: -40, trimLaunch: -40, trimWake: -40, trimImpact: -40, seqGuide: 0 }), 2);
  assert.deepEqual(only.map(Boolean), [false, false, false, false, true]);
  const a = B.getAsset('ex:door'), s = only[4];
  let dot = 0, ea = 0, es = 0, lag = -1;
  for (let i = 0; i < s.L.length && lag < 0; i++) if (Math.abs(s.L[i]) > 0.01) lag = i;
  let a0 = 0; while (Math.abs(a.L[a0]) <= 0.01 * B.peakOf(a.L)) a0++;
  for (let i = 0; i + lag < s.L.length && i + a0 < a.L.length; i++) { dot += s.L[i + lag] * a.L[i + a0]; ea += a.L[i + a0] ** 2; es += s.L[i + lag] ** 2; }
  assert.ok(dot / Math.sqrt(ea * es) > 0.999, 'the stem is the recording');
  /* stronger hits make bigger events when strength sets size */
  const flat = B.renderRaw(B.merge(base, { seqDyn: 0 }), 2), dyn = B.renderRaw(B.merge(base, { seqDyn: 1 }), 2);
  assert.ok(finite(dyn.L) && flat.L.length > FS && Math.abs(dyn.L.length - flat.L.length) < FS, 'both render');
  const hits = B.getHits('ex:door', base.seqSens), ev = dyn.events.filter(e => e.k !== 'pass');
  assert.ok(ev.length >= hits.length, `${ev.length} events for ${hits.length} hits`);
});

test('grains are cut at the hits and land as debris', () => {
  const g = B.getGrains('ex:gravel');
  assert.ok(g.grains.length >= 20, `${g.grains.length} grains`);
  for (let i = 1; i < g.grains.length; i++) assert.ok(g.grains[i].c >= g.grains[i - 1].c, 'ordered dark to bright');
  const raw = B.renderRaw(params(preset('gravelblast')), 4);
  assert.ok(finite(raw.L) && raw.L.length > FS);
});

test('a fit moves a setting toward the reference', () => {
  const p = params(preset('thundersheet')), ref = B.renderRaw(B.merge(p, { tgThick: 2.5 }), 7);
  B.setAsset('rec:test-ref', { name: 'ref', L: ref.L, R: ref.R });
  let n = 0;
  const r = B.job({ fit: true, id: 'f', p, seed: 7, key: 'tgThick', spec: { min: 0.3, max: 300, scale: 'log' }, ref: 'rec:test-ref' }, () => n++);
  assert.equal(n, B.FIT_TRIES);
  assert.ok(r.dist < r.before, `distance ${r.dist} from ${r.before}`);
  assert.ok(r.value > 1.5 && r.value < 4, `thickness ${r.value}`);
  const f = B.features(B.getAsset('ex:knock').L, B.getAsset('ex:knock').R);
  assert.ok(Math.abs(f.decay / 1.6 - 1) < 0.2, `knock decay ${f.decay}`);
});

test('an impulse response starts at its first sound', () => {
  const L = new Float32Array(FS);
  for (let i = 0; i < 9600; i++) L[24000 + i] = Math.exp(-i / 1500) * Math.sin(i * 0.3);
  const ir = B.prepareIR(L, L);
  let k = 0; while (Math.abs(ir.L[k]) < 0.02) k++;
  assert.ok(k <= 0.0011 * FS && k >= 0.0009 * FS, `first sound at ${k} samples`);
});

test('a saved WAV carries its date, project and keywords where sound libraries and Kurator look', () => {
  const meta = { title: 'Kos na úsvitě', note: 'Za stodolou', project: 'Forest walk', take: 3, tags: ['Nature/Birds', ' Dawn '], source: 'Ballistic Foley Lab',
    creator: 'Daniel Sandner', date: '2026-11-15T05:42:10+01:00', reference: 'BFL-20261115-3', user: [['Input', 'iPhone Microphone'], ['Empty', '']] };
  const L = Float32Array.from([0, 0.5, -0.5, 1]), bytes = B.encodeWav(L, L, meta), dv = new DataView(bytes.buffer), dec = new TextDecoder();
  const found = {};
  for (let p = 12; p + 8 <= bytes.length;) { const id = dec.decode(bytes.subarray(p, p + 4)), n = dv.getUint32(p + 4, true); found[id] = bytes.subarray(p + 8, p + 8 + n); p += 8 + n + (n & 1); }
  assert.deepEqual(Object.keys(found), ['fmt ', 'bext', 'iXML', '_PMX', 'data']);
  assert.equal(dv.getUint32(4, true), bytes.length - 8, 'RIFF size');
  assert.equal(found.data.length, 4 * 6);
  const bext = found.bext, txt = (a, b) => dec.decode(bext.subarray(a, b)).split('\0')[0];
  assert.equal(txt(0, 256), 'Kos na usvite. Za stodolou');
  assert.equal(txt(256, 288), 'Ballistic Foley Lab');
  assert.equal(txt(288, 320), 'BFL-20261115-3');
  assert.equal(txt(320, 330), '2026-11-15'); assert.equal(txt(330, 338), '05:42:10');
  assert.equal(new DataView(bext.buffer, bext.byteOffset).getUint32(338, true), (5 * 3600 + 42 * 60 + 10) * FS);
  assert.ok(dec.decode(bext.subarray(602)).endsWith('T=Ballistic Foley Lab\r\n'));
  const ixml = dec.decode(found.iXML), xmp = dec.decode(found._PMX);
  assert.match(ixml, /<PROJECT>Forest walk<\/PROJECT>/); assert.match(ixml, /<SCENE>Kos na úsvitě<\/SCENE>/);
  assert.match(ixml, /<USER>Input: iPhone Microphone<\/USER>/);
  assert.deepEqual(B.keywordPaths(meta), ['Nature/Birds', 'Dawn', 'Projects/Forest walk', 'Source/Ballistic Foley Lab']);
  for (const k of ['Nature|Birds', 'Dawn', 'Projects|Forest walk', 'Source|Ballistic Foley Lab']) assert.ok(xmp.includes('<rdf:li>' + k + '</rdf:li>'), k);
  assert.match(xmp, /xmp:CreateDate="2026-11-15T05:42:10\+01:00"/);
  assert.match(xmp, /<dc:subject>[\s\S]*<rdf:li>Forest walk<\/rdf:li>[\s\S]*<\/dc:subject>/);
  assert.ok(!/<rdf:li>Projects<\/rdf:li>/.test(xmp), 'group roots stay out of the flat keywords');
  assert.equal(B.xmpText(meta), xmp);
});

test('a plan survives its link, and a damaged link is refused', () => {
  const plan = { id: 'plan-forest', name: 'Lesní procházka', project: 'Forest walk', chips: ['Nature', 'Objects'],
    shots: [{ id: 's1', name: 'Blackbird', tags: ['Nature/Birds'], takes: 3, ucs: 'BIRDSong', notes: '' }, { id: 's2', name: 'Wind', tags: [], takes: 1, ucs: '', notes: 'from the ridge' }] };
  const packed = B.packPlan(plan);
  assert.match(packed, /^[A-Za-z0-9_-]+$/, 'safe in an address');
  assert.deepEqual(B.unpackPlan(packed), plan);
  assert.equal(B.unpackPlan('not-a-plan'), null);
  assert.equal(B.unpackPlan(B.packPlan({ id: 'x', name: 'x', shots: [] }).slice(0, 10)), null);
  /* takes are kept between 1 and 99, names are cut to 100 characters */
  const odd = B.unpackPlan(Buffer.from(JSON.stringify({ v: 1, n: 'P', s: [{ n: 'x'.repeat(300), k: 500 }, { n: 'y', k: -3 }] })).toString('base64url'));
  assert.equal(odd.shots[0].name.length, 100); assert.equal(odd.shots[0].takes, 99); assert.equal(odd.shots[1].takes, 1);
});

test('QR codes grow by version and carry the link', () => {
  const short = B.qrCode('HELLO'), link = B.qrCode('https://eigensoundlab.github.io/ballistic/#plan=' + 'x'.repeat(400));
  assert.equal(short.version, 1); assert.equal(short.size, 21); assert.equal(short.ecl, 'M');
  assert.equal(link.size, link.version * 4 + 17);
  /* the three finder patterns and the dark module */
  for (const [x, y] of [[0, 0], [link.size - 7, 0], [0, link.size - 7]]) {
    assert.ok(link.dark(x, y) && link.dark(x + 6, y + 6) && !link.dark(x + 1, y + 1) && link.dark(x + 3, y + 3));
  }
  assert.ok(link.dark(8, link.size - 8));
  assert.equal(B.qrCode('x'.repeat(4000)), null);
  assert.match(B.qrSvg('HELLO'), /^<svg[^>]+viewBox="0 0 29 29"/);
});

test('a take with its place carries it in iXML and XMP', () => {
  const m = { title: 't', date: '2026-11-15T05:42:10+01:00', location: { lat: 50.0852, lon: -14.4279, alt: 235.4, acc: 12 } };
  assert.match(B.ixmlText(m), /<LOCATION>\n  <LOCATION_GPS>50\.085200, -14\.427900<\/LOCATION_GPS>\n  <LOCATION_ALTITUDE>235<\/LOCATION_ALTITUDE>\n <\/LOCATION>/);
  const x = B.xmpText(m);
  assert.match(x, /exif:GPSLatitude="50,5\.1120N"/); assert.match(x, /exif:GPSLongitude="14,25\.6740W"/); assert.match(x, /exif:GPSAltitude="2354\/10"/);
  assert.ok(!/LOCATION|GPS/.test(B.ixmlText({ title: 't' }) + B.xmpText({ title: 't' })), 'no place unless it was asked for');
});
