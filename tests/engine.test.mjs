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
  for (const k of ['projectile', 'explosion', 'implosion', 'destruction', 'rocket', 'rotor', 'discharge', 'blaster', 'field', 'recording', 'liquid', 'mechanism']) assert.ok(kinds.has(k), k);
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

test('a mono recording is saved as one channel, and says so in bext and iXML', () => {
  const L = Float32Array.from([0, 0.25, -0.5, 1]), dec = new TextDecoder();
  for (const [enc, bps, read] of [[B.encodeWav, 3, (dv, o) => ((dv.getUint8(o) | dv.getUint8(o + 1) << 8 | dv.getInt8(o + 2) << 16) / 8388607)],
    [B.encodeWavFloat, 4, (dv, o) => dv.getFloat32(o, true)]]) {
    const bytes = enc(L, null, { title: 'Knock', date: '2026-11-15T22:40:00+01:00' }), dv = new DataView(bytes.buffer), found = {};
    for (let p = 12; p + 8 <= bytes.length;) { const id = dec.decode(bytes.subarray(p, p + 4)), n = dv.getUint32(p + 4, true); found[id] = { at: p + 8, b: bytes.subarray(p + 8, p + 8 + n) }; p += 8 + n + (n & 1); }
    const fmt = new DataView(found['fmt '].b.buffer, found['fmt '].b.byteOffset);
    assert.equal(fmt.getUint16(2, true), 1, 'channels'); assert.equal(fmt.getUint16(12, true), bps, 'block align'); assert.equal(fmt.getUint32(8, true), FS * bps, 'bytes per second');
    assert.equal(found.data.b.length, L.length * bps);
    L.forEach((v, i) => assert.ok(Math.abs(read(dv, found.data.at + i * bps) - v) < 1e-6, 'sample ' + i));
    assert.ok(dec.decode(found.bext.b.subarray(602)).includes(',M=mono,'));
    assert.match(dec.decode(found.iXML.b), /<TRACK_COUNT>1<\/TRACK_COUNT>/);
  }
  assert.equal(new DataView(B.encodeWav(L, L).buffer).getUint16(22, true), 2, 'two channels when both are given');
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

/* power of one frequency over a stretch of samples (Goertzel) */
function power(x, a, b, f) {
  let s1 = 0, s2 = 0; const k = 2 * Math.cos(2 * Math.PI * f / FS);
  for (let i = a; i < b; i++) { const s = x[i] + k * s1 - s2; s2 = s1; s1 = s; }
  return s1 * s1 + s2 * s2 - k * s1 * s2;
}
function peakHz(x, a, b, lo, hi) {
  let best = 0, bf = 0;
  for (let j = 0; j < 160; j++) { const f = lo * Math.pow(hi / lo, j / 159), p = power(x, a, b, f); if (p > best) { best = p; bf = f; } }
  return bf;
}
const liquid = o => B.merge(B.DEFAULTS, Object.assign({ kind: 'liquid', env: 'none', ground: 0 }, o));
function rmsDb(r) { let e = 0; for (const v of r.L) e += v * v; return 20 * Math.log10(Math.sqrt(e / r.L.length) * r.peakPa / 2e-5); }

test('a drop traps a bubble that rings at its Minnaert pitch and climbs as it nears the surface', () => {
  const p = liquid({ lqMode: 'drop' }), lq = B.analyze(p, 3).lq, x = B.renderStems(p, 3)[0].L;
  assert.ok(lq.bub, 'this drop lands in the entrainment window');
  const want = Math.sqrt(3 * 1.4 * (101325 + 998 * 9.81 * lq.rd + 2 * 0.072 / lq.bub.a) / 998) / (2 * Math.PI * lq.bub.a);
  assert.ok(Math.abs(lq.bub.f / want - 1) < 1e-9);
  const i0 = x.findIndex(v => Math.abs(v) > 0.05), early = zcr(x, i0, i0 + 96), late = zcr(x, i0 + 300, i0 + 396);
  assert.ok(Math.abs(early / lq.bub.f - 1) < 0.1, `starts at ${early}`);
  assert.ok(late > early * 1.1, `climbs to ${late}`);
});

test('a stone plunks: its air cavity closes after about 2.1 sqrt(R/g) and rings low', () => {
  const p = liquid({ lqMode: 'splash', lqMass: 0.25, lqHeight: 1.5, lqDepth: 1 }), lq = B.analyze(p, 3).lq, x = B.renderStems(p, 3)[0].L;
  assert.ok(Math.abs(lq.tp / (2.1 * Math.sqrt(lq.R / 9.81)) - 1) < 1e-3);
  assert.ok(lq.cav.f > 60 && lq.cav.f < 400, `plunk ${lq.cav.f}`);
  assert.ok(Math.abs(peakHz(x, 0, x.length, 30, 2000) / lq.cav.f - 1) < 0.08);
  const shallow = B.analyze(liquid({ lqMode: 'splash', lqMass: 0.25, lqHeight: 1.5, lqDepth: 0.02 }), 3).lq;
  assert.ok(shallow.shallow && !shallow.cav, 'a puddle has no cavity to close');
});

test('a vessel filling raises the pitch of the air column above the liquid', () => {
  /* the column is driven by the bubbles and the stream; its response, out over in, peaks at its pitch */
  const p = liquid({ lqMode: 'pour' }), lq = B.analyze(p, 3).lq, r = B.renderRaw(p, 3), st = B.renderStems(p, 3), out = st[3].L;
  const inp = st[0].L.map((v, i) => v + st[1].L[i]);
  assert.ok(lq.fRes1 > 3 * lq.fRes0, `${lq.fRes0} to ${lq.fRes1}`);
  const at = t => B.C / (4 * (lq.H * (1 - (lq.f0 + (lq.f1 - lq.f0) * clamp01((t - 0.03) / lq.P))) + 0.6 * lq.rv));
  for (const t of [0.4, lq.P / 2, lq.P - 0.25]) {
    const a = Math.round((t - r.tStart - 0.05) * FS), b = a + Math.round(0.1 * FS);
    let best = 0, bf = 0;
    for (let j = 0; j < 160; j++) { const f = 300 * Math.pow(20, j / 159), g = power(out, a, b, f) / (power(inp, a, b, f) + 1e-30); if (g > best) { best = g; bf = f; } }
    assert.ok(Math.abs(bf / at(t) - 1) < 0.08, `at ${t.toFixed(2)} s: ${bf} against ${at(t)}`);
  }
});
function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

test('light rain on water rings near 15 kHz; heavy rain, with its large drops, rings lower', () => {
  const peak = R => { const x = B.renderStems(liquid({ lqMode: 'rain', lqRain: R }), 3)[0].L; return peakHz(x, 0, x.length, 1000, 20000); };
  const light = peak(1), heavy = peak(40);
  assert.ok(light > 12000 && light < 18000, `light ${light}`);
  assert.ok(heavy < 6000, `heavy ${heavy}`);
});

test('a kettle sings loudest just before it boils, then quietens', () => {
  const lvl = h => rmsDb(B.renderRaw(liquid({ lqMode: 'bubble', lqRate: 120, lqHeat: h }), 3));
  const cold = lvl(0.1), sing = lvl(0.65), edge = lvl(0.9), boil = lvl(1);
  assert.ok(sing > cold + 6 && sing > edge + 3 && sing > boil + 2, `${cold} ${sing} ${edge} ${boil}`);
});

test('hot steel boils in a vapour film until the Leidenfrost point, then crackles and falls quiet', () => {
  const p = liquid({ lqMode: 'quench', lqMass: 0.1, lqThick: 0.0015, lqTemp: 600 }), lq = B.analyze(p, 3).lq, x = B.renderStems(p, 3)[0].L;
  const k = Math.round(lq.tL * 1000);
  assert.ok(lq.tL > 0.5 && lq.temp[k - 1] >= B.QUENCH.tl && lq.temp[k] < B.QUENCH.tl);
  assert.ok(lq.flux[k + 200] > lq.flux[k - 200], 'the flux climbs once the film breaks');
  const e = (a, b) => { let s = 0; for (let i = Math.round(a * FS); i < Math.round(b * FS); i++) s += x[i] * x[i]; return s / ((b - a) * FS); };
  const film = e(0.2, lq.tL - 0.2);
  let crackle = 0;
  for (let t = lq.tL; t < lq.tEnd - 0.25; t += 0.1) crackle = Math.max(crackle, e(t, t + 0.25));
  assert.ok(crackle > 2 * film, `crackle ${crackle} against film ${film}`);
  const n = x.length / FS;
  assert.ok(n < lq.tEnd + 0.6 && e(n - 0.15, n) < film / 100, 'fades to silence at the end');
  assert.ok(B.analyze(liquid({ lqMode: 'quench', lqTemp: 300 }), 3).lq.tL < 0, 'no film under the Leidenfrost point');
});

test('viscous liquids swell into a dome that rings on the gas before it bursts', () => {
  for (const med of ['mud', 'lava']) {
    /* a film a tenth of the radius thick on the gas spring; bubble sizes spread by e^(0.7 x 1.5) either way */
    const L = B.LIQUIDS[med], f = Math.sqrt(3 * 1.4 * 101325 / (0.1 * L.rho)) / (2 * Math.PI * L.gas), lo = f / Math.exp(1.05), hi = f * Math.exp(1.05);
    const st = B.renderStems(liquid({ lqMode: 'bubble', lqMedium: med, lqRate: med === 'lava' ? 3 : 8 }), 3), dome = peakHz(st[1].L, 0, st[1].L.length, 20, 2000);
    assert.ok(dome > lo && dome < hi, `${med} dome ${dome}`);
    assert.ok(peakHz(st[2].L, 0, st[2].L.length, 100, 16000) > 2 * dome, `${med} burst above the dome`);
  }
});

const mech = o => B.merge(B.DEFAULTS, Object.assign({ kind: 'mechanism', env: 'none', ground: 0 }, o));
/* the period that best repeats in a stretch, by autocorrelation, as a rate per second */
function repRate(x, a, b, lo, hi) {
  let best = -Infinity, bl = 0;
  for (let lag = Math.floor(FS / hi); lag <= Math.ceil(FS / lo); lag++) {
    let s = 0, e = 0; for (let i = a; i < b - lag; i++) { s += x[i] * x[i + lag]; e += x[i] * x[i]; }
    if (s / e > best) { best = s / e; bl = lag; }
  }
  return FS / bl;
}

test('an electric drive whines at its slot and gear-mesh pitches, which follow the speed', () => {
  const p = mech({ mcType: 'rotate', mcDrive: 'electric', mcMass: 50, mcTime: 3, mcRpm: 3000, mcWear: 0 }), mc = B.analyze(p, 3).mc, r = B.renderRaw(p, 3), x = B.renderStems(p, 3)[0].L;
  const off = -r.tStart, win = (t, k) => { const a = Math.round((t + off) * FS); return peakHz(x, a, a + Math.round(0.08 * FS), 200, 2000); };
  const cruise = win(mc.t0 + mc.T / 2, 0), slots = 12 * mc.fMotor, gears = 13 * mc.fMotor;
  assert.ok(Math.min(Math.abs(cruise / slots - 1), Math.abs(cruise / gears - 1)) < 0.03, `cruise ${cruise} against ${slots} or ${gears}`);
  /* half way up the ramp the motor turns at half speed, so the tones sit an octave lower */
  let tHalf = mc.t0; while (B.analyze(p, 3).mc.vel[Math.round((tHalf - mc.t0) * 1000)] < 0.5 * mc.vmax) tHalf += 0.001;
  const half = win(tHalf - 0.04, 0);
  assert.ok(half < 0.62 * cruise && half > 0.38 * cruise, `ramp ${half} against cruise ${cruise}`);
});

test('a dry hinge creaks once per slip length of the pin, so the creak climbs with the swing', () => {
  const p = mech({ mcType: 'hinge', mcDrive: 'manual', mcAction: 'open', mcMass: 25, mcMat: 'wood', mcTime: 2.2, mcWear: 0.8, mcLatch: 'none' }), mc = B.analyze(p, 3).mc, r = B.renderRaw(p, 3), x = B.renderStems(p, 3)[1].L;
  const at = t => { const a = Math.round((t - r.tStart) * FS); return repRate(x, a, a + Math.round(0.1 * FS), 40, 1500); };
  const top = at(mc.t0 + mc.T / 2 - 0.05), slow = at(mc.t0 + 0.12 * mc.T);
  assert.ok(Math.abs(top / mc.creak - 1) < 0.08, `at top speed ${top} against ${mc.creak}`);
  assert.ok(slow < 0.75 * top, `early ${slow} against ${top}`);
  assert.equal(B.analyze(mech({ mcType: 'hinge', mcWear: 0.1 }), 3).mc.creak, 0, 'an oiled hinge is quiet');
});

test('a slam is louder than a gentle close by the root of the energy it carries into the stop', () => {
  const peakEnd = q => { const st = B.renderStems(q, 3), r = B.renderRaw(q, 3), x = st[3].L; let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v)); return pk * r.peakPa; };
  const base = { mcType: 'hinge', mcDrive: 'manual', mcMass: 30, mcMat: 'wood', mcAngle: 70, mcStop: 'hard', mcLatch: 'none', mcWear: 0 };
  const fast = mech(Object.assign({ mcTime: 0.4 }, base)), slow = mech(Object.assign({ mcTime: 1.6 }, base));
  const Ef = B.analyze(fast, 3).mc.Eend, Es = B.analyze(slow, 3).mc.Eend, ratio = peakEnd(fast) / peakEnd(slow);
  assert.ok(Math.abs(Ef / Es - 16) < 1e-6, 'four times the speed, sixteen times the energy');
  assert.ok(ratio > 2.5 && ratio < 6, `peak ratio ${ratio}`);
});

test('a pneumatic cylinder hisses while it moves and vents after it stops', () => {
  const p = mech({ mcDrive: 'pneumatic', mcAction: 'open', mcMass: 60, mcMat: 'aluminium', mcStroke: 1.2, mcTime: 0.6, mcLatch: 'none' }), mc = B.analyze(p, 3).mc, r = B.renderRaw(p, 3), x = B.renderStems(p, 3)[0].L;
  const e = (a, b) => { let s = 0; for (let i = Math.round((a - r.tStart) * FS); i < Math.round((b - r.tStart) * FS); i++) s += x[i] * x[i]; return s / ((b - a) * FS); };
  assert.ok(e(mc.tEnd + 0.13, mc.tEnd + 0.33) > 10 * e(mc.t0 + 0.1, mc.tEnd - 0.1), 'the vent is far louder than the stroke');
  assert.ok(e(mc.t0 + 0.1, mc.tEnd - 0.1) > 100 * e(0, mc.t0 - 0.03), 'quiet before the valve opens');
});
