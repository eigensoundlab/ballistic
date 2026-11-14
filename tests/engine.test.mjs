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
  for (const k of ['projectile', 'explosion', 'implosion', 'destruction', 'rocket', 'rotor', 'discharge', 'blaster', 'field']) assert.ok(kinds.has(k), k);
});

test('every preset renders finite, audible, normalised audio', () => {
  for (const pr of B.PRESETS) {
    const raw = B.renderRaw(params(pr), 4821);
    assert.ok(raw.L.length > FS * 0.1 && raw.L.length <= FS * 16.5, `${pr.id}: length ${raw.L.length}`);
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
