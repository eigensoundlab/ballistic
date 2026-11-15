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
  for (const id of ['railgun', 'pulselaser', 'mortar']) ids.add(id);
  for (const id of ids) {
    const p = params(preset(id)), raw = B.renderRaw(p, 4821), stems = B.renderStems(p, 4821);
    assert.equal(stems.length, 4, id);
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
