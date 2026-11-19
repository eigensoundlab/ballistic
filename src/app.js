// SPDX-License-Identifier: Apache-2.0
(function () {
'use strict';
var B = window.BFX, FS = B.FS, C = B.C;
function $(id) { return document.getElementById(id); }
function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }

/* ---------- formatting ---------- */
function fDist(v) { return v >= 1000 ? (v / 1000).toFixed(2) + ' km' : v >= 100 ? v.toFixed(0) + ' m' : v.toFixed(1) + ' m'; }
function fHz(v) { return v >= 1000 ? (v / 1000).toFixed(1) + ' kHz' : v.toFixed(0) + ' Hz'; }
function fPct(v) { return Math.round(v * 100) + '%'; }
function fDb(v) { return v <= -40 ? 'off' : (v > 0 ? '+' : '') + v.toFixed(0) + ' dB'; }
function fEnergy(v) { return v >= 1e6 ? (v / 1e6).toFixed(1) + ' MJ' : v >= 1000 ? (v / 1000).toFixed(1) + ' kJ' : v.toFixed(0) + ' J'; }
function fMass(v) { return v >= 1000 ? (v / 1000).toFixed(1) + ' t' : v >= 1 ? v.toFixed(1) + ' kg' : (v * 1000).toFixed(v < 0.01 ? 1 : 0) + ' g'; }
function fTime(v) { return v >= 1 ? v.toFixed(2) + ' s' : v >= 0.01 ? (v * 1000).toFixed(0) + ' ms' : (v * 1000).toFixed(2) + ' ms'; }
function fPress(v) { return v >= 1000 ? (v / 1000).toFixed(v >= 1e5 ? 0 : 1) + ' kPa' : v.toFixed(0) + ' Pa'; }
function fCount(v) { return String(Math.round(v)); }

var KINDS = [['projectile', 'Projectile'], ['explosion', 'Explosion'], ['implosion', 'Implosion'], ['destruction', 'Destruction'], ['rocket', 'Jet, rocket'], ['rotor', 'Rotor'],
  ['discharge', 'Discharge'], ['blaster', 'Blaster'], ['field', 'Forcefield'], ['liquid', 'Liquid'], ['mechanism', 'Mechanism'], ['recording', 'Recording']];
/* two families of sources; Recording places any sound, so it sits in both */
var SECTIONS = [['action', 'Weapons and energy', ['projectile', 'explosion', 'implosion', 'destruction', 'rocket', 'rotor', 'discharge', 'blaster', 'field', 'recording']],
  ['game', 'Game sounds', ['liquid', 'mechanism', 'recording']]];
function inSection(sec, k) { return SECTIONS.filter(function (x) { return x[0] === sec; })[0][2].indexOf(k) >= 0; }
function sectionFor(k) { return inSection(st.section, k) ? st.section : SECTIONS.filter(function (x) { return x[2].indexOf(k) >= 0; })[0][0]; }
var MATS = [['glass', 'Glass'], ['wood', 'Wood'], ['concrete', 'Concrete'], ['steel', 'Steel']];
var SURF = [['dirt', 'Dirt'], ['concrete', 'Concrete'], ['steel', 'Steel'], ['wood', 'Wood'], ['glass', 'Glass']];
var TRIMS = {
  projectile: [['Shock wave', 'crack'], ['Launch', 'thump'], ['Wake', 'whizz'], ['Impact', 'and payload']],
  explosion: [['Blast', ''], ['Rumble', 'fireball, ground'], ['Fragments', 'fly-by'], ['Debris', 'landing']],
  implosion: [['Collapse pulse', ''], ['Shell stress', 'lead-in'], ['Shell fracture', ''], ['Debris', 'falling']],
  destruction: [['Fracture', 'the break'], ['Stress', 'lead-in'], ['Fine debris', ''], ['Fragments', 'landing']],
  rocket: [['Engine roar', 'jet noise, crackle'], ['Ignition', 'and cutoff'], ['Whine, boom', ''], ['Touchdown', 'impact, payload']],
  rotor: [['Blade tones', ''], ['Vortex noise', 'broadband'], ['Motor whine', ''], ['Blade slap', '']],
  discharge: [['Shock', 'crack, thunder'], ['Arc buzz', 're-strikes, hiss'], ['Charge whine', ''], ['Coil kick', 'and ring']],
  blaster: [['Launcher', 'line, rails, coils, air'], ['Bolt', 'channel, sizzle, shock'], ['Impact', 'ablation, ring, splash'], ['Aftermath', 'sizzle, steam, ticks']],
  field: [['Hum', 'modes, ripple, solitons'], ['Emissions', 'corona, chorus'], ['Impact ring', ''], ['Crackle', 'sparks, whistlers']],
  recording: [['Recording', 'direct, with its ground bounce'], ['Body', 'the recording through it'], null, null],
  liquid: [['Bubbles', 'ringing, collapsing'], ['Impact', 'slap, stream, swell, roar'], ['Surface', 'bursts, droplets'], ['Air', 'vessel, steam, crust']],
  mechanism: [['Drive', 'motor, gears, pump, air'], ['Path', 'rails, ring gear, creak'], ['Body', 'panel modes, rattle'], ['Ends', 'latch, stop, seal, bolt']]
};
var MIX_NOTE = {
  projectile: '0 dB keeps the physical balance between layers.',
  explosion: '0 dB is physical for blast, rumble and fragments. Debris is raised ' + B.DEBRIS_BOOST_DB + ' dB so it can be heard beside the blast.',
  implosion: 'Shell and debris levels are set against the collapse pulse, not measured.',
  destruction: '0 dB keeps the physical balance. The stress lead-in is set against the break.',
  rocket: '0 dB keeps the physical balance between layers.',
  rotor: '0 dB keeps the modelled balance between tones, vortex noise, whine and slap.',
  discharge: 'Shock and buzz keep their modelled balance. Whine, kick and ring are set against the shock.',
  blaster: 'The bolt follows the model. Launcher, impact and aftermath levels are set against it, not measured.',
  field: 'A forcefield has no physical scale. Every level here is relative to the hum.',
  recording: 'A recording has no known level. The body is set to the loudness of the recording; distance, air and ground bounce follow the geometry.',
  liquid: 'Bubbles, impacts, bursts and droplets follow their size and speed. Stream noise, collapses, steam, roar, crust and the vessel resonance are set against them, not measured.',
  mechanism: 'Stops, latches and bolts are struck with the energy the panel carries, a hundredth of it reaching its modes. Drive, path and rattle levels are set against them, not measured.'
};
var MC = ['mechanism'], LQ = ['liquid'], P = ['projectile'], X = ['explosion'], I = ['implosion'], D = ['destruction'], K = ['rocket'], T = ['rotor'], PK = ['projectile', 'rocket'], PKT = ['projectile', 'rocket', 'rotor'], G = ['discharge'], W = ['blaster'], F = ['field'], PKTW = ['projectile', 'rocket', 'rotor', 'blaster'], RC = ['recording'], PKW = ['projectile', 'rocket', 'blaster'];
function fLen(v) { return v >= 1000 ? (v / 1000).toFixed(2) + ' km' : v >= 1 ? v.toFixed(1) + ' m' : v >= 0.01 ? (v * 100).toFixed(1) + ' cm' : (v * 1000).toFixed(1) + ' mm'; }
function fForce(v) { return v >= 1e6 ? (v / 1e6).toFixed(2) + ' MN' : v >= 1000 ? (v / 1000).toFixed(1) + ' kN' : v.toFixed(0) + ' N'; }
function fSpeed(v) { return v.toFixed(0) + ' m/s'; }
function fSize(v) { return v >= 1 ? v.toFixed(2) + ' m' : (v * 100).toFixed(v < 0.1 ? 1 : 0) + ' cm'; }
function fPower(v) { return v >= 1e6 ? (v / 1e6).toFixed(1) + ' MW' : v >= 1000 ? (v / 1000).toFixed(1) + ' kW' : v >= 1 ? v.toFixed(0) + ' W' : (v * 1000).toFixed(1) + ' mW'; }
var SPEC = [
  { bank: 'action', obj: 'a', id: 'punch', label: 'Punch', hint: 'transient shaper', min: 0, max: 1, fmt: fPct },
  { bank: 'action', obj: 'a', id: 'weight', label: 'Weight', hint: 'sub drop, low shelf', min: 0, max: 1, fmt: fPct },
  { bank: 'action', obj: 'a', id: 'drive', label: 'Drive', hint: 'saturation', min: 0, max: 1, fmt: fPct },
  { bank: 'action', obj: 'a', id: 'bite', label: 'Bite', hint: '3 kHz presence', min: 0, max: 1, fmt: fPct },
  { bank: 'action', obj: 'a', id: 'tail', label: 'Tail', hint: 'long dark reverb', min: 0, max: 1, fmt: fPct },
  { bank: 'action', obj: 'a', id: 'swell', label: 'Swell', hint: 'reversed lead-in', min: 0, max: 1, fmt: fPct },
  { bank: 'action', obj: 'a', id: 'width', label: 'Width', hint: 'stereo spread', min: 0, max: 1, fmt: fPct },
  { bank: 'action', obj: 'a', id: 'loud', label: 'Loudness', hint: 'compressor, limiter', min: 0, max: 1, fmt: fPct },
  { bank: 'action', obj: 'a', id: 'slowmo', label: 'Slow motion', hint: 'varispeed', min: 1, max: 4, fmt: function (v) { return Math.round(100 / v) + '% speed'; } },

  { bank: 'source', kinds: P, id: 'v0', label: 'Launch speed', min: 15, max: 1800, scale: 'log', fmt: function (v) { return v.toFixed(0) + ' m/s'; } },
  { bank: 'source', kinds: P, id: 'cal', label: 'Diameter', min: 4, max: 3000, scale: 'log', fmt: function (v) { return v >= 1000 ? (v / 1000).toFixed(2) + ' m' : v >= 100 ? v.toFixed(0) + ' mm' : v.toFixed(1) + ' mm'; } },
  { bank: 'source', kinds: P, id: 'mass', label: 'Mass', min: 0.002, max: 20000, scale: 'log', fmt: fMass },
  { bank: 'source', kinds: P, id: 'tumble', label: 'Tumble', hint: 'yaw, flutter', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: P, id: 'tumbleHz', label: 'Tumble rate', min: 10, max: 900, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: K, id: 'rkMode', label: 'Mode', options: [['launch', 'Launch'], ['flyby', 'Fly-by'], ['landing', 'Landing'], ['static', 'Static burn, loop']] },
  { bank: 'source', kinds: K, id: 'rkThrust', label: 'Thrust', min: 20, max: 1e7, scale: 'log', fmt: fForce },
  { bank: 'source', kinds: K, id: 'rkUe', label: 'Exhaust speed', min: 200, max: 4500, fmt: fSpeed },
  { bank: 'source', kinds: K, id: 'rkNozzle', label: 'Nozzle diameter', min: 0.01, max: 5, scale: 'log', fmt: fSize },
  { bank: 'source', kinds: K, id: 'rkMass', label: 'Mass', min: 0.05, max: 800000, scale: 'log', fmt: fMass },
  { bank: 'source', kinds: K, id: 'rkBurn', label: 'Burn time', hint: 'launch', min: 0.1, max: 12, scale: 'log', fmt: fTime },
  { bank: 'source', kinds: K, id: 'rkV0', label: 'Speed', hint: 'fly-by, landing approach', min: 20, max: 900, scale: 'log', fmt: fSpeed },
  { bank: 'source', kinds: K, id: 'rkCrackle', label: 'Crackle', hint: 'supersonic exhaust', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: K, id: 'rkChug', label: 'Chug', hint: 'combustion instability', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: K, id: 'rkWhine', label: 'Turbine whine', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: K, id: 'rkWhineHz', label: 'Whine pitch', min: 300, max: 9000, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: PK, id: 'payload', label: 'Payload', hint: 'explodes at the target', min: 0, max: 200, scale: 'pow', fmt: function (v) { return v < 0.01 ? 'none' : fMass(v) + ' TNT'; } },
  { bank: 'source', kinds: T, id: 'rtMode', label: 'Mode', options: [['hover', 'Hover, loop'], ['flyby', 'Fly-by'], ['takeoff', 'Take-off'], ['landing', 'Landing']] },
  { bank: 'source', kinds: T, id: 'rtMass', label: 'Mass', min: 0.05, max: 12000, scale: 'log', fmt: fMass },
  { bank: 'source', kinds: T, id: 'rtCount', label: 'Rotors', min: 1, max: 8, round: 1, fmt: fCount },
  { bank: 'source', kinds: T, id: 'rtDia', label: 'Rotor diameter', min: 0.05, max: 16, scale: 'log', fmt: fSize },
  { bank: 'source', kinds: T, id: 'rtBlades', label: 'Blades per rotor', min: 2, max: 7, round: 1, fmt: fCount },
  { bank: 'source', kinds: T, id: 'rtSpeed', label: 'Flight speed', min: 2, max: 90, scale: 'log', fmt: fSpeed },
  { bank: 'source', kinds: T, id: 'rtWander', label: 'Speed drift', hint: 'detune, beating', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: T, id: 'rtSlap', label: 'Blade slap', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: T, id: 'rtWhine', label: 'Motor whine', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: G, id: 'dcEnergy', label: 'Energy', min: 0.01, max: 1e9, scale: 'log', fmt: function (v) { return v < 1 ? (v * 1000).toFixed(0) + ' mJ' : v >= 1e9 ? '1.0 GJ' : fEnergy(v); } },
  { bank: 'source', kinds: G, id: 'dcLength', label: 'Channel length', min: 0.005, max: 5000, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: G, id: 'dcTort', label: 'Tortuosity', hint: 'how crooked', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: G, id: 'dcBranches', label: 'Branches', min: 0, max: 8, round: 1, fmt: fCount },
  { bank: 'source', kinds: G, id: 'dcStrokes', label: 'Return strokes', min: 1, max: 5, round: 1, fmt: fCount },
  { bank: 'source', kinds: G, id: 'dcSustain', label: 'Arc sustain', min: 0, max: 4, fmt: fTime },
  { bank: 'source', kinds: G, id: 'dcRate', label: 'Re-strike rate', min: 10, max: 800, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: G, id: 'dcCharge', label: 'Charge-up', hint: 'lead-in', min: 0, max: 3, fmt: fTime },
  { bank: 'source', kinds: G, id: 'dcChargeHz', label: 'Charger pitch', min: 2000, max: 14000, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: G, id: 'dcKick', label: 'Coil kick', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: G, id: 'dcRingHz', label: 'Ring pitch', min: 100, max: 4000, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: W, id: 'lnType', label: 'Launcher', options: [['line', 'Dispersive line'], ['rail', 'Rail gun'], ['coil', 'Coil gun'], ['gas', 'Gas, nail gun'], ['none', 'None']] },
  { bank: 'source', kinds: W, when: isBarrel, id: 'lnLength', label: 'Rail or barrel length', min: 0.05, max: 20, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: W, when: isCoil, id: 'lnStages', label: 'Coil stages', min: 2, max: 24, round: 1, fmt: fCount },
  { bank: 'source', kinds: W, when: isElectric, id: 'lnCharge', label: 'Charge-up', hint: 'lead-in', min: 0, max: 3, fmt: fTime },
  { bank: 'source', kinds: W, when: isElectric, id: 'lnChargeHz', label: 'Charger pitch', min: 2000, max: 14000, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: W, when: isElectric, id: 'lnRingHz', label: 'Circuit ring', min: 40, max: 2000, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: W, when: isBarrel, id: 'lnEnergy', label: 'Stored energy', hint: 'sets the level', min: 10, max: 1e7, scale: 'log', fmt: fEnergy },
  { bank: 'source', kinds: W, when: isGas, id: 'lnChamber', label: 'Air chamber', min: 5, max: 500, scale: 'log', fmt: function (v) { return v.toFixed(0) + ' cm\u00b3'; } },
  { bank: 'source', kinds: W, when: isGas, id: 'lnSpring', label: 'Return spring', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: W, when: isLine, id: 'bpLength', label: 'Line length', min: 1, max: 300, scale: 'log', fmt: fDist },
  { bank: 'source', kinds: W, when: isLine, id: 'bpStiff', label: 'Stiffness', hint: 'sets the sweep', min: 0.005, max: 3, scale: 'log', fmt: function (v) { return v.toFixed(v < 0.1 ? 3 : 2) + ' m\u00b2/s'; } },
  { bank: 'source', kinds: W, when: isLine, id: 'bpTension', label: 'Tension', hint: 'wave speed', min: 0, max: 600, scale: 'pow', fmt: function (v) { return v < 2 ? 'slack' : fSpeed(v); } },
  { bank: 'source', kinds: W, when: isLine, id: 'bpHard', label: 'Strike hardness', min: 500, max: 20000, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: W, when: isLine, id: 'bpDamp', label: 'Damping', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: W, when: isLine, id: 'bpEchoes', label: 'End echoes', min: 0, max: 6, round: 1, fmt: fCount },
  { bank: 'source', kinds: W, when: isLine, id: 'bpRefl', label: 'End reflection', min: 0.2, max: 0.95, fmt: fPct },
  { bank: 'source', kinds: W, when: isLine, id: 'bpBody', label: 'Body', options: [['none', 'None'], ['can', 'Metal can'], ['tube', 'Tube'], ['plate', 'Steel plate']] },
  { bank: 'source', kinds: W, id: 'bvType', label: 'Bolt', options: [['none', 'None'], ['bolt', 'Plasma bolt'], ['beam', 'Beam'], ['slug', 'Slug']] },
  { bank: 'source', kinds: W, when: movesBolt, id: 'bvSpeed', label: 'Bolt speed', min: 5, max: 8000, scale: 'log', fmt: fSpeed },
  { bank: 'source', kinds: W, when: heatsAir, id: 'bvChannel', label: 'Air heating', hint: 'per metre of path', min: 1, max: 2000, scale: 'log', fmt: function (v) { return fEnergy(v) + '/m'; } },
  { bank: 'source', kinds: W, when: isBeam, id: 'bvPulses', label: 'Pulses', min: 1, max: 60, round: 1, fmt: fCount },
  { bank: 'source', kinds: W, when: isBeam, id: 'bvRate', label: 'Pulse rate', min: 2, max: 400, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: W, when: movesBolt, id: 'bvSizzle', label: 'Sizzle', hint: 'plasma voice, sheath', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: W, when: isPlasmaBolt, id: 'bvTone', label: 'Bolt tone', min: 80, max: 4000, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: W, when: isSlug, id: 'bvCal', label: 'Slug diameter', min: 1, max: 120, scale: 'log', fmt: function (v) { return v.toFixed(v < 10 ? 1 : 0) + ' mm'; } },
  { bank: 'source', kinds: W, id: 'tgMat', label: 'Target', options: [['none', 'None'], ['steel', 'Steel plate'], ['aluminium', 'Aluminium plate'], ['glass', 'Glass pane'], ['ice', 'Ice sheet'], ['wood', 'Wood panel'], ['concrete', 'Concrete'], ['water', 'Water']] },
  { bank: 'source', kinds: W, when: givesEnergy, id: 'tgEnergy', label: 'Energy delivered', min: 1, max: 1e6, scale: 'log', fmt: fEnergy },
  { bank: 'source', kinds: W, when: isPlate, id: 'tgThick', label: 'Thickness', min: 0.3, max: 300, scale: 'log', fmt: function (v) { return v.toFixed(v < 10 ? 1 : 0) + ' mm'; } },
  { bank: 'source', kinds: W, when: isPlate, id: 'tgSize', label: 'Plate size', min: 0.1, max: 100, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: W, when: hasTarget, id: 'tgHeat', label: 'Heat left behind', hint: 'sizzle, ticks, cracks', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: W, when: isLine, id: 'bpEnergy', label: 'Strike energy', min: 0.01, max: 1000, scale: 'log', fmt: function (v) { return v < 1 ? (v * 1000).toFixed(0) + ' mJ' : fEnergy(v); } },
  { bank: 'source', kinds: F, id: 'ffMode', label: 'Mode', options: [['hum', 'Hum, loop'], ['impact', 'Impact'], ['powerup', 'Power-up'], ['powerdown', 'Collapse']] },
  { bank: 'source', kinds: F, id: 'ffBase', label: 'Fundamental', min: 20, max: 400, scale: 'log', fmt: fHz },
  { bank: 'source', kinds: F, id: 'ffType', label: 'Mode pattern', options: [['membrane', 'Membrane'], ['plate', 'Plate'], ['harmonic', 'Harmonic'], ['plasma', 'Plasma, MHD']] },
  { bank: 'source', kinds: F, when: isPlasma, id: 'ffB', label: 'Field strength', hint: 'raises the pitch', min: 0.05, max: 10, scale: 'log', fmt: function (v) { return v.toFixed(v < 1 ? 2 : 1) + ' T'; } },
  { bank: 'source', kinds: F, when: isPlasma, id: 'ffDens', label: 'Plasma density', hint: 'lowers it', min: 1e17, max: 1e21, scale: 'log', fmt: function (v) { var e = Math.floor(Math.log10(v)); return (v / Math.pow(10, e)).toFixed(1) + 'e' + e + ' /m\u00b3'; } },
  { bank: 'source', kinds: F, when: isPlasma, id: 'ffBeta', label: 'Beta', hint: 'heat against field', min: 0.01, max: 2, scale: 'log', fmt: function (v) { return v.toFixed(2); } },
  { bank: 'source', kinds: F, when: isPlasma, id: 'ffAngle', label: 'Wave angle', hint: 'to the field', min: 0, max: 85, fmt: function (v) { return v.toFixed(0) + '\u00b0'; } },
  { bank: 'source', kinds: F, when: isPlasma, id: 'ffSaw', label: 'Reconnection', hint: 'ramp and crash', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: F, when: isPlasma, id: 'ffSawT', label: 'Crash period', min: 0.3, max: 4, scale: 'log', fmt: fTime },
  { bank: 'source', kinds: F, when: isPlasma, id: 'ffChorus', label: 'Chorus', hint: 'rising chirps', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: F, when: isPlasma, id: 'ffSurface', label: 'Surface ripple', hint: 'half frequency', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: F, when: isPlasma, id: 'ffSoliton', label: 'Solitons', hint: 'circling pulses', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: F, id: 'ffBeat', label: 'Beat', hint: 'second generator', min: 0, max: 10, scale: 'pow', fmt: function (v) { return v < 0.02 ? 'none' : v.toFixed(2) + ' Hz'; } },
  { bank: 'source', kinds: F, id: 'ffShimmer', label: 'Shimmer', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: F, id: 'ffCorona', label: 'Corona', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: F, id: 'ffHitE', label: 'Impact energy', min: 1, max: 1e6, scale: 'log', fmt: fEnergy },
  { bank: 'source', kinds: F, id: 'ffGlide', label: 'Pitch glide', hint: 'on impact', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: LQ, id: 'lqMode', label: 'Event', options: [['drop', 'Drop'], ['splash', 'Splash'], ['pour', 'Pour'], ['quench', 'Quench hot steel'], ['stream', 'Stream, loop'], ['rain', 'Rain, loop'], ['bubble', 'Bubbling, loop']] },
  { bank: 'source', kinds: LQ, when: lqIs('drop', 'splash', 'bubble'), id: 'lqMedium', label: 'Liquid', options: [['water', 'Water'], ['oil', 'Oil'], ['mud', 'Mud'], ['lava', 'Lava'], ['acid', 'Acid']] },
  { bank: 'source', kinds: LQ, when: lqIs('drop'), id: 'lqDrop', label: 'Drop radius', min: 0.0005, max: 0.004, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: LQ, when: lqIs('splash', 'quench'), id: 'lqMass', label: 'Mass', hint: 'stone, or steel', min: 0.005, max: 200, scale: 'log', fmt: fMass },
  { bank: 'source', kinds: LQ, when: lqIs('quench'), id: 'lqThick', label: 'Thickness', hint: 'blade to block', min: 0.0005, max: 0.05, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: LQ, when: lqIs('quench'), id: 'lqTemp', label: 'Temperature', hint: 'Leidenfrost at ' + B.QUENCH.tl + ' \u00b0C', min: 150, max: 1200, fmt: function (v) { return v.toFixed(0) + ' \u00b0C'; } },
  { bank: 'source', kinds: LQ, when: lqIs('drop', 'splash', 'pour'), id: 'lqHeight', label: 'Fall height', min: 0.005, max: 10, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: LQ, when: lqIs('drop', 'splash'), id: 'lqDepth', label: 'Liquid depth', min: 0.0005, max: 5, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: LQ, when: lqIs('pour'), id: 'lqFlow', label: 'Flow', min: 0.01, max: 2, scale: 'log', fmt: function (v) { return v.toFixed(v < 0.1 ? 3 : 2) + ' L/s'; } },
  { bank: 'source', kinds: LQ, when: lqIs('pour'), id: 'lqVessel', label: 'Vessel height', min: 0.05, max: 1, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: LQ, when: lqIs('pour'), id: 'lqFill', label: 'Fill to', min: 0.1, max: 0.95, fmt: fPct },
  { bank: 'source', kinds: LQ, when: lqIs('rain'), id: 'lqRain', label: 'Rain rate', min: 0.2, max: 100, scale: 'log', fmt: function (v) { return v.toFixed(v < 2 ? 1 : 0) + ' mm/h'; } },
  { bank: 'source', kinds: LQ, when: lqIs('stream', 'bubble'), id: 'lqRate', label: 'Bubbles', hint: 'per second', min: 0.5, max: 5000, scale: 'log', fmt: function (v) { return v.toFixed(v < 10 ? 1 : 0) + ' /s'; } },
  { bank: 'source', kinds: LQ, when: lqIs('stream', 'bubble'), id: 'lqSize', label: 'Bubble size', hint: 'against the usual', min: 0.25, max: 4, scale: 'log', fmt: function (v) { return v.toFixed(2) + '\u00d7'; } },
  { bank: 'source', kinds: LQ, when: function (p) { return p.lqMode === 'bubble' && (p.lqMedium === 'water' || p.lqMedium === 'oil'); }, id: 'lqHeat', label: 'Heat', hint: 'sings, then boils', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: MC, id: 'mcType', label: 'Mechanism', options: [['slide', 'Sliding door, gate'], ['hinge', 'Hinged door, lid'], ['rotate', 'Turret, servo'], ['switch', 'Switch, lever']] },
  { bank: 'source', kinds: MC, when: mcIs('slide', 'hinge', 'rotate'), id: 'mcDrive', label: 'Drive', options: [['electric', 'Electric motor'], ['hydraulic', 'Hydraulic'], ['pneumatic', 'Pneumatic'], ['manual', 'By hand']] },
  { bank: 'source', kinds: MC, when: mcIs('slide', 'hinge'), id: 'mcAction', label: 'Moves', options: [['open', 'Opens'], ['close', 'Closes']] },
  { bank: 'source', kinds: MC, id: 'mcMass', label: 'Moving mass', min: 0.005, max: 3000, scale: 'log', fmt: fMass },
  { bank: 'source', kinds: MC, id: 'mcMat', label: 'Made of', options: [['steel', 'Steel'], ['aluminium', 'Aluminium'], ['wood', 'Wood'], ['plastic', 'Plastic']] },
  { bank: 'source', kinds: MC, when: mcIs('slide'), id: 'mcStroke', label: 'Travel', min: 0.05, max: 6, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: MC, when: mcIs('hinge', 'rotate'), id: 'mcAngle', label: 'Angle', min: 5, max: 360, scale: 'log', fmt: function (v) { return v.toFixed(0) + '\u00b0'; } },
  { bank: 'source', kinds: MC, id: 'mcTime', label: 'Travel time', min: 0.005, max: 12, scale: 'log', fmt: fTime },
  { bank: 'source', kinds: MC, when: function (p) { return p.mcType !== 'switch' && p.mcDrive === 'electric'; }, id: 'mcRpm', label: 'Motor speed', hint: 'at full travel speed', min: 300, max: 20000, scale: 'log', fmt: function (v) { return v.toFixed(0) + ' rev/min'; } },
  { bank: 'source', kinds: MC, when: mcIs('slide', 'hinge', 'rotate'), id: 'mcStop', label: 'End stop', options: [['hard', 'Hard'], ['rubber', 'Rubber seal'], ['damped', 'Damper']] },
  { bank: 'source', kinds: MC, when: mcIs('slide', 'hinge'), id: 'mcLatch', label: 'Latch', options: [['none', 'None'], ['latch', 'Spring latch'], ['bolt', 'Motor bolt']] },
  { bank: 'source', kinds: MC, id: 'mcWear', label: 'Wear', hint: 'creaks, knocks, rattle', min: 0, max: 1, fmt: fPct },
  { bank: 'source', kinds: RC, id: 'rcAsset', label: 'Recording', sound: true },
  { bank: 'source', kinds: RC, id: 'rcAssetTools', custom: soundTools('rcAsset') },
  { bank: 'source', kinds: RC, id: 'rcMode', label: 'Movement', options: [['place', 'Placed in the scene'], ['flyby', 'Flies past']] },
  { bank: 'source', kinds: RC, when: isPlaced, id: 'rcDist', label: 'Distance', min: 0.3, max: 2000, scale: 'log', fmt: fDist },
  { bank: 'source', kinds: RC, when: isFlyby, id: 'rcSpeed', label: 'Speed', min: 1, max: 330, scale: 'log', fmt: fSpeed },
  { bank: 'source', kinds: RC, when: isFlyby, id: 'rcPass', label: 'Pass length', hint: 'the recording loops if shorter', min: 2, max: 20, fmt: fTime },
  { bank: 'source', kinds: RC, when: isFlyby, id: 'rcHeight', label: 'Source height', hint: 'sets the ground flanging', min: 0.1, max: 500, scale: 'log', fmt: fDist },
  { bank: 'source', kinds: RC, id: 'rcBody', label: 'Body', hint: 'the recording drives it', options: [['none', 'None'], ['steel', 'Steel plate'], ['aluminium', 'Aluminium plate'], ['glass', 'Glass pane'], ['ice', 'Ice sheet'], ['wood', 'Wood panel'], ['rail', 'Steel rail'], ['line', 'Dispersive line'], ['spring', 'Spring'], ['ir', 'Recorded object']] },
  { bank: 'source', kinds: RC, when: recIr, id: 'rcIr', label: 'Knock', hint: 'a tap on the object', sound: true },
  { bank: 'source', kinds: RC, when: recIr, id: 'rcIrTools', custom: soundTools('rcIr') },
  { bank: 'source', kinds: RC, when: recPlate, id: 'rcThick', label: 'Thickness', min: 0.3, max: 300, scale: 'log', fmt: function (v) { return v.toFixed(v < 10 ? 1 : 0) + ' mm'; } },
  { bank: 'source', kinds: RC, when: recPlate, id: 'rcSize', label: 'Plate size', min: 0.1, max: 100, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: RC, when: recLong, id: 'rcLength', label: 'Length', min: 0.1, max: 120, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: RC, when: function (p) { return p.rcBody !== 'none' && p.rcBody !== 'ir'; }, id: 'saveBody', custom: saveBodyRow },
  { bank: 'source', kinds: X, id: 'exW', label: 'Charge', hint: 'TNT equivalent', min: 0.02, max: 5000, scale: 'log', fmt: fMass },
  { bank: 'source', kinds: X, id: 'exFrags', label: 'Fragments', hint: 'passing the listener', min: 0, max: 16, round: 1, fmt: fCount },
  { bank: 'source', kinds: X, id: 'exDebris', label: 'Debris pieces', min: 0, max: 120, round: 1, fmt: fCount },
  { bank: 'source', kinds: X, id: 'exSurface', label: 'Debris lands on', options: SURF.concat([['rec', 'Grains of a recording']]) },
  { bank: 'source', kinds: I, id: 'imR0', label: 'Cavity radius', min: 0.03, max: 8, scale: 'log', fmt: function (v) { return v >= 1 ? v.toFixed(2) + ' m' : (v * 100).toFixed(0) + ' cm'; } },
  { bank: 'source', kinds: I, id: 'imDp', label: 'Outside pressure', min: 1, max: 400, scale: 'log', fmt: function (v) { return v.toFixed(v < 10 ? 1 : 0) + ' atm'; } },
  { bank: 'source', kinds: I, id: 'imGas', label: 'Gas left inside', hint: 'cushions the collapse', min: 0.003, max: 0.3, scale: 'log', fmt: function (v) { return (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%'; } },
  { bank: 'source', kinds: I, id: 'imMedium', label: 'Medium', options: [['air', 'Air'], ['water', 'Water']] },
  { bank: 'source', kinds: I, id: 'imShell', label: 'Shell', options: [['none', 'None'], ['glass', 'Glass'], ['steel', 'Steel']] },
  { bank: 'source', kinds: I, id: 'imGroan', label: 'Stress lead-in', min: 0, max: 3, fmt: fTime },
  { bank: 'source', kinds: D, id: 'dsMat', label: 'Material', options: MATS.concat([['measured', 'Measured object']]) },
  { bank: 'source', kinds: D, when: isMeasured, id: 'dsKnock', label: 'Knock', hint: 'its modes are measured', sound: true },
  { bank: 'source', kinds: D, when: isMeasured, id: 'dsKnockTools', custom: soundTools('dsKnock') },
  { bank: 'source', kinds: D, when: isMeasured, id: 'dsLike', label: 'Breaks like', options: MATS },
  { bank: 'source', kinds: D, id: 'dsMass', label: 'Mass', min: 0.2, max: 20000, scale: 'log', fmt: fMass },
  { bank: 'source', kinds: D, id: 'dsHeight', label: 'Drop height', min: 0.3, max: 40, scale: 'log', fmt: fDist },
  { bank: 'source', kinds: D, id: 'dsPieces', label: 'Pieces', min: 3, max: 150, scale: 'log', round: 1, fmt: fCount },
  { bank: 'source', kinds: D, id: 'dsGroan', label: 'Stress lead-in', min: 0, max: 4, fmt: fTime },
  { bank: 'source', kinds: D, id: 'dsDebris', label: 'Landing sound', options: [['model', 'From the material'], ['rec', 'Grains of a recording']] },
  { bank: 'source', kinds: X.concat(D), when: grainsOn, id: 'grAsset', label: 'Grains from', hint: 'cut at its hits', sound: true },
  { bank: 'source', kinds: X.concat(D), when: grainsOn, id: 'grAssetTools', custom: soundTools('grAsset') },

  { bank: 'scene', kinds: K, id: 'rkPath', label: 'Path', options: [['horizontal', 'Horizontal'], ['vertical', 'Vertical']] },
  { bank: 'scene', kinds: PKTW, id: 'D', label: 'Listener downrange', min: 0, max: 2000, scale: 'pow', fmt: fDist },
  { bank: 'scene', kinds: PKTW.concat(RC), when: function (p) { return p.kind !== 'recording' || p.rcMode === 'flyby'; }, id: 'miss', label: 'Distance off the path', min: 0.2, max: 1000, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: P, id: 'launch', label: 'Launch sound', options: [['blast', 'Muzzle blast'], ['string', 'Bowstring'], ['ricSteel', 'Ricochet off steel'], ['ricStone', 'Ricochet off concrete'], ['none', 'None']] },
  { bank: 'scene', kinds: PK, id: 'target', label: 'Target', options: [['none', 'None'], ['steel', 'Steel plate'], ['wood', 'Wood'], ['dirt', 'Dirt'], ['concrete', 'Concrete'], ['glass', 'Glass']] },
  { bank: 'scene', kinds: PKW, when: function (p) { return p.kind !== 'blaster' || p.tgMat !== 'none'; }, id: 'targetDist', label: 'Target distance', min: 0.05, max: 2500, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: G, id: 'dcOrient', label: 'Channel', options: [['horizontal', 'Horizontal arc'], ['vertical', 'Vertical strike']] },
  { bank: 'scene', kinds: G, id: 'dcDist', label: 'Distance', min: 0.3, max: 5000, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: F, id: 'ffDist', label: 'Distance', min: 0.5, max: 200, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: LQ, id: 'lqDist', label: 'Distance', min: 0.2, max: 50, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: MC, id: 'mcDist', label: 'Distance', min: 0.2, max: 50, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: X, id: 'exDist', label: 'Distance', min: 3, max: 3000, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: I, id: 'imDist', label: 'Distance', min: 1, max: 2000, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: D, id: 'dsDist', label: 'Distance', min: 1, max: 200, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: D, id: 'dsSpread', label: 'Footprint', hint: 'half width', min: 0.2, max: 20, scale: 'log', fmt: fDist },
  { bank: 'scene', id: 'env', label: 'Environment', options: Object.keys(B.ENVS).map(function (k) { return [k, B.ENVS[k].name]; }) },
  { bank: 'scene', when: isRoomRec, id: 'irAsset', label: 'Room', hint: 'a clap, a pop or an IR', sound: true },
  { bank: 'scene', when: isRoomRec, id: 'irAssetTools', custom: soundTools('irAsset') },
  { bank: 'scene', when: isRoomRec, id: 'irWet', label: 'Room level', min: -30, max: 6, round: 0.5, fmt: fDb },
  { bank: 'scene', when: function (p) { return !!(B.ENVS[p.env] && B.ENVS[p.env].rt60); }, id: 'saveRoom', custom: saveRoomRow },
  { bank: 'scene', id: 'ground', label: 'Ground bounce', min: 0, max: 0.8, fmt: fPct },

  { bank: 'seq', id: 'seqFrom', label: 'Timing', options: [['interval', 'Regular repeats'], ['rec', 'The hits of a recording']] },
  { bank: 'seq', when: isRegular, id: 'seqCount', label: 'Repeats', min: 1, max: 16, round: 1, fmt: function (v) { return Math.round(v) + (v < 1.5 ? ' event' : ' events'); } },
  { bank: 'seq', when: isRegular, id: 'seqInterval', label: 'Interval', min: 0.02, max: 3, scale: 'log', fmt: fTime },
  { bank: 'seq', when: isTriggered, id: 'seqAsset', label: 'Hits from', sound: true },
  { bank: 'seq', when: isTriggered, id: 'seqAssetTools', custom: soundTools('seqAsset') },
  { bank: 'seq', when: isTriggered, id: 'seqHits', custom: hitRow },
  { bank: 'seq', when: isTriggered, id: 'seqSens', label: 'Sensitivity', hint: 'finds softer hits', min: 0, max: 1, fmt: fPct },
  { bank: 'seq', when: isTriggered, id: 'seqDyn', label: 'Hit strength sets size', hint: 'energy, or level', min: 0, max: 1, fmt: fPct },
  { bank: 'seq', when: isTriggered, id: 'seqGuide', label: 'The recording itself', hint: 'in the mix, own stem', min: -40, max: 6, round: 0.5, fmt: fDb },
  { bank: 'seq', id: 'seqJitter', label: 'Variation', hint: 'timing, distance, side', min: 0, max: 1, fmt: fPct },

  { bank: 'lib', id: 'libTools', custom: libTools },
  { bank: 'lib', id: 'libSession', custom: sessionRows },
  { bank: 'lib', id: 'libList', custom: libListRow },
  { bank: 'lib', id: 'libAll', custom: libAllRow },

  { bank: 'ref', obj: 'r', id: 'ref', label: 'Reference', hint: 'the real thing', sound: true },
  { bank: 'ref', id: 'refTools', custom: soundTools('ref') },
  { bank: 'ref', id: 'refPlot', custom: refPlot },
  { bank: 'ref', id: 'refSum', custom: refSummary },
  { bank: 'ref', id: 'fitRow', custom: fitRow },
  { bank: 'ref', id: 'fitNote', custom: fitNoteRow },

  { bank: 'mix', id: 'trimCrack', trim: 0, min: -40, max: 24, round: 1, fmt: fDb },
  { bank: 'mix', id: 'trimLaunch', trim: 1, min: -40, max: 24, round: 1, fmt: fDb },
  { bank: 'mix', id: 'trimWake', trim: 2, min: -40, max: 24, round: 1, fmt: fDb },
  { bank: 'mix', id: 'trimImpact', trim: 3, min: -40, max: 24, round: 1, fmt: fDb }
];
SPEC.forEach(function (s) { if (!s.obj) s.obj = 'p'; });
var SOUND_KEYS = SPEC.filter(function (s) { return s.sound && s.obj === 'p'; }).map(function (s) { return s.id; });
function isPlasma(p) { return p.ffType === 'plasma'; }
function mcIs() { var m = Array.prototype.slice.call(arguments); return function (p) { return m.indexOf(p.mcType) >= 0; }; }
function lqIs() { var m = Array.prototype.slice.call(arguments); return function (p) { return m.indexOf(p.lqMode) >= 0; }; }
function isLine(p) { return p.lnType === 'line'; }
function isBarrel(p) { return p.lnType === 'rail' || p.lnType === 'coil' || p.lnType === 'gas'; }
function isElectric(p) { return p.lnType === 'rail' || p.lnType === 'coil'; }
function isCoil(p) { return p.lnType === 'coil'; }
function isGas(p) { return p.lnType === 'gas'; }
function movesBolt(p) { return p.bvType === 'bolt' || p.bvType === 'slug'; }
function heatsAir(p) { return p.bvType === 'bolt' || p.bvType === 'beam'; }
function isBeam(p) { return p.bvType === 'beam'; }
function isPlasmaBolt(p) { return p.bvType === 'bolt'; }
function isSlug(p) { return p.bvType === 'slug'; }
function hasTarget(p) { return p.tgMat !== 'none'; }
function givesEnergy(p) { return p.tgMat !== 'none' && p.bvType !== 'slug'; }
function isPlate(p) { return !!B.PLATES[p.tgMat]; }
function isPlaced(p) { return p.rcMode !== 'flyby'; }
function recIr(p) { return p.rcBody === 'ir'; }
function isMeasured(p) { return p.dsMat === 'measured'; }
function grainsOn(p) { return (p.kind === 'explosion' && p.exSurface === 'rec') || (p.kind === 'destruction' && p.dsDebris === 'rec'); }
function isRoomRec(p) { return p.env === 'ir'; }
function isRegular(p) { return p.seqFrom !== 'rec'; }
function isTriggered(p) { return p.seqFrom === 'rec'; }
function isFlyby(p) { return p.rcMode === 'flyby'; }
function recPlate(p) { return !!B.PLATES[p.rcBody]; }
function recLong(p) { return p.rcBody === 'rail' || p.rcBody === 'line' || p.rcBody === 'spring'; }
function toVal(s, u) {
  var v = s.scale === 'log' ? s.min * Math.pow(s.max / s.min, u) : s.scale === 'pow' ? s.max * u * u * u : s.min + u * (s.max - s.min);
  return s.round ? Math.round(v / s.round) * s.round : v;
}
function toPos(s, v) {
  v = Math.min(s.max, Math.max(s.min, v));
  return s.scale === 'log' ? Math.log(v / s.min) / Math.log(s.max / s.min) : s.scale === 'pow' ? Math.cbrt(v / s.max) : (v - s.min) / (s.max - s.min);
}

/* ---------- state ---------- */
var st = { p: null, a: null, r: { ref: '' }, sp: 'rifle', ap: 'game', which: 'fx', seed: 4821, section: 'action' };
var an = null, result = null, jobId = 0, worker = null, watchdog = 0, lastMsg = null, rows = {};
var ctx = null, node = null, playing = false, playStart = 0, raf = 0, dl = null;
var col = {}, cache = {};
var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setStatus(t) { $('status').textContent = t; if (typeof rvStatus === 'function') rvStatus(t); }
/* render reports stay on the page: the record view keeps its own last message */
function renderStatus(t) { $('status').textContent = t; }
function view() { return result ? (st.which === 'fx' ? result.fx : result.raw) : null; }
function kind() { return st.p.kind || 'projectile'; }
function presetKind(pr) { return pr.p.kind || 'projectile'; }
function reanalyze() { an = B.analyze(st.p, st.seed); }

/* ---------- controls ---------- */
function buildControls() {
  SPEC.forEach(function (s) {
    if (s.custom) { var tr = el('div', 'row tools'); tr.appendChild(s.custom()); rows[s.id] = { row: tr }; $('bank-' + s.bank).appendChild(tr); return; }
    var row = el('div', 'row'), lab = el('label'), nm = el('span', 'nm'), tx = document.createTextNode(s.label || ''), hint = el('span', 'hint', s.hint || '');
    lab.setAttribute('for', 'c-' + s.id); nm.appendChild(tx); nm.appendChild(hint); lab.appendChild(nm);
    rows[s.id] = { row: row, tx: tx, hint: hint };
    if (s.options || s.sound) {
      var sel = el('select'); sel.id = 'c-' + s.id;
      if (s.sound) fillSounds(sel, s.obj === 'r');
      else s.options.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; sel.appendChild(op); });
      sel.addEventListener('change', function () {
        if (s.obj === 'r') { st.r[s.id] = sel.value; refChanged(); return; }
        st[s.obj][s.id] = sel.value; touched(s); rerender(true);
      });
      row.className = 'row sel'; row.appendChild(lab); row.appendChild(sel);
    } else {
      var out = el('output'); out.id = 'o-' + s.id; out.setAttribute('for', 'c-' + s.id); lab.appendChild(out);
      var inp = el('input'); inp.type = 'range'; inp.id = 'c-' + s.id; inp.min = 0; inp.max = 1000; inp.step = 1;
      inp.addEventListener('input', function () { st[s.obj][s.id] = toVal(s, inp.value / 1000); out.textContent = s.fmt(st[s.obj][s.id]); touched(s); });
      inp.addEventListener('change', function () { rerender(true); });
      row.appendChild(lab); row.appendChild(inp);
    }
    $('bank-' + s.bank).appendChild(row);
  });
  SECTIONS.forEach(function (sc) {
    var b = el('button', null, sc[1]); b.type = 'button'; b.dataset.id = sc[0];
    b.addEventListener('click', function () {
      if (st.section === sc[0]) return;
      st.section = sc[0];
      if (inSection(sc[0], kind())) { syncControls(); return; }
      var k0 = sc[2][0], pr = B.PRESETS.filter(function (x) { return presetKind(x) === k0; })[0];
      st.sp = pr.id; st.p = B.merge(B.DEFAULTS, pr.p); syncControls(); rerender(true);
    });
    $('sections').appendChild(b);
  });
  KINDS.forEach(function (k) {
    var b = el('button', null, k[1]); b.type = 'button'; b.dataset.id = k[0];
    b.addEventListener('click', function () {
      if (kind() === k[0]) return;
      var pr = B.PRESETS.filter(function (x) { return presetKind(x) === k[0]; })[0];
      st.sp = pr.id; st.p = B.merge(B.DEFAULTS, pr.p); syncControls(); rerender(true);
    });
    $('kinds').appendChild(b);
  });
  function chips(host, list, key, apply) {
    list.forEach(function (pr) {
      var b = el('button', 'chip', pr.name); b.type = 'button'; b.dataset.id = pr.id; if (pr.p) b.dataset.kind = presetKind(pr);
      b.addEventListener('click', function () { st[key] = pr.id; apply(pr); syncControls(); rerender(true); });
      host.appendChild(b);
    });
  }
  chips($('srcChips'), B.PRESETS, 'sp', function (pr) { st.p = B.merge(B.DEFAULTS, pr.p); });
  chips($('fxChips'), B.ACTION_PRESETS, 'ap', function (pr) { st.a = B.merge(B.ACTION_DEFAULTS, pr.a); if (st.which !== 'fx') setWhich('fx', true); });
}
function touched(s) {
  if (s.obj === 'p') {
    st.sp = '';
    if (s.options || s.sound) SPEC.forEach(function (q) { if (q.when) rows[q.id].row.hidden = !!(q.kinds && q.kinds.indexOf(kind()) < 0) || !q.when(st.p); });
    toolStates(); fitChoices();
    reanalyze(); capText(); drawScene(restTime()); readouts();
  } else st.ap = '';
  markChips();
}
function press(host, id) { Array.prototype.forEach.call(host.children, function (b) { b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false'); }); }
function markChips() {
  press($('srcChips'), st.sp); press($('fxChips'), st.ap); press($('kinds'), kind()); press($('sections'), st.section);
  $('ab-raw').setAttribute('aria-pressed', st.which === 'raw' ? 'true' : 'false');
  $('ab-fx').setAttribute('aria-pressed', st.which === 'fx' ? 'true' : 'false');
}
function capText() {
  var k = kind();
  $('sceneCap').textContent = { projectile: 'Top view. The lateral axis is stretched to fit.', explosion: 'Top view: blast front, fragments, debris landing.',
    implosion: 'Cavity radius against time.', destruction: 'Height of each piece against time.',
    rocket: st.p.rkMode === 'static' ? 'Modelled jet noise spectrum.' : 'Path view. The lateral axis is stretched to fit.', rotor: 'Speed of each rotor against time.',
    discharge: 'The channel and the listener. Lit parts have been heard.', blaster: st.p.bvType !== 'none' ? 'Path view. The lateral axis is stretched to fit.' : 'Frequency against arrival time: each curve is one path of a dispersive wave.', recording: st.p.rcMode === 'flyby' ? 'Path view, from above. The lateral axis is stretched to fit.' : st.p.rcBody !== 'none' && st.p.rcBody !== 'ir' ? 'Frequency against arrival time: each curve is one path through the body.' : 'The recording, as loaded.',
    liquid: { drop: 'Cross-section: the drop, the bubble it traps, droplets thrown back.', splash: 'Cross-section: the object, its air cavity, the droplets.',
      pour: 'The vessel filling; the air column above the liquid sets the pitch.', quench: 'Temperature of the steel against time, and how it boils.' }[st.p.lqMode] || 'Bubble pitches heard, ringing and bursting.',
    mechanism: 'Speed of the moving edge against time, and what sounds when.',
    field: st.p.ffType === 'plasma' ? 'Slow, shear and fast waves, plus the half-frequency ripple.' : 'Modes of the field, level against frequency.' }[k];
}
function syncControls() {
  var k = kind(), kn = KINDS.filter(function (x) { return x[0] === k; })[0][1];
  st.section = sectionFor(k);
  Array.prototype.forEach.call($('kinds').children, function (b) { b.hidden = !inSection(st.section, b.dataset.id); });
  SPEC.forEach(function (s) {
    var c = $('c-' + s.id), v = st[s.obj][s.id], r = rows[s.id];
    r.row.hidden = !!(s.kinds && s.kinds.indexOf(k) < 0) || !!(s.when && !s.when(st.p));
    if (s.custom) return;
    if (s.trim != null) {
      var tl = TRIMS[k][s.trim];
      if (!tl) { r.row.hidden = true; return; }
      r.tx.nodeValue = tl[0]; r.hint.textContent = tl[1];
    }
    if (s.options || s.sound) c.value = v; else { c.value = Math.round(toPos(s, v) * 1000); $('o-' + s.id).textContent = s.fmt(v); }
  });
  Array.prototype.forEach.call($('srcChips').children, function (b) { b.hidden = b.dataset.kind !== k; });
  $('lg-source').textContent = kn; $('mixNote').textContent = MIX_NOTE[k];
  capText(); toolStates(); fitChoices(); recButtons();
  markChips(); reanalyze(); readouts();
}

/* ---------- rendering ---------- */
function startWorker() {
  /* the offline file and the Claude artifact carry the engine inline; the site loads src/worker.js */
  var inline = $('engine');
  try {
    worker = inline ? new Worker(URL.createObjectURL(new Blob([inline.textContent + '\nself.onmessage=function(e){var r=self.BFX.job(e.data,function(m){self.postMessage(m);});if(r)self.postMessage(r);};'], { type: 'text/javascript' })))
      : new Worker('src/worker.js');
    worker.onmessage = function (e) {
      var m = e.data;
      if (m && m.kind === 'stems') gotStems(m); else if (m && m.kind === 'fitProgress') fitProgress(m); else if (m && m.kind === 'fit') gotFit(m); else finish(m);
    };
    /* a new worker starts empty: hand it every sound */
    LIB.forEach(function (s) { var a = B.getAsset(s.id); if (a) worker.postMessage({ asset: true, id: s.id, name: s.name, L: a.L, R: a.R }); });
    worker.onerror = function () { dropWorker(); };
  } catch (err) { worker = null; }
}
function restartWorker() { if (worker) { try { worker.terminate(); } catch (e) {} } worker = null; startWorker(); }
function dropWorker() {
  if (worker) { try { worker.terminate(); } catch (e) {} }
  worker = null;
  if (stemWait) runStemsSync(stemWait.msg);
  if (lastMsg && lastMsg.id === jobId) runSync(lastMsg);
}
function runSync(msg) { setTimeout(function () { finish(B.job(msg)); }, 20); }
function unlock() {
  /* must run inside the tap so the later, asynchronous play is allowed */
  try { if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) {}
}
function rerender(mayPlay, always) {
  var msg = { id: ++jobId, p: st.p, a: st.a, seed: st.seed, play: !!(mayPlay && (always || $('audition').checked)) };
  if (msg.play) unlock();
  lastMsg = msg; renderStatus('Rendering');
  clearTimeout(watchdog);
  if (worker) { worker.postMessage(msg); watchdog = setTimeout(function () { if (!fitWait && msg.id === jobId && (!result || result.id !== msg.id)) dropWorker(); }, 8000); }
  else runSync(msg);
}
function finish(res) {
  if (res.id !== jobId) return;
  clearTimeout(watchdog);
  result = res; cache = {}; setTimeout(drawRef, 0);
  reanalyze(); readouts();
  var v = view();
  renderStatus((v.L.length / FS).toFixed(2) + ' s' + (v.loop ? ' seamless loop' : '') + ', rendered in ' + res.ms + ' ms, take ' + st.seed);
  if (res.play) play(); else { stop(); drawAll(null); }
}

/* ---------- playback ---------- */
function setPlaying(on) { playing = on; $('again').textContent = on ? 'Stop' : 'Replay'; }
function stop() {
  setPlaying(false); cancelAnimationFrame(raf);
  if (node) { try { node.onended = null; node.stop(); } catch (e) {} node = null; }
}
function play() {
  var v = view(); if (!v) return;
  try {
    unlock(); stop();
    var ab = ctx.createBuffer(2, v.L.length, FS);
    ab.getChannelData(0).set(v.L); ab.getChannelData(1).set(v.R);
    node = ctx.createBufferSource(); node.buffer = ab; node.loop = !!v.loop; node.connect(ctx.destination); node.start();
    playStart = ctx.currentTime; setPlaying(true); tick();
  } catch (err) { setStatus('Audio could not start here. Tap Fire to try again.'); drawAll(null); }
}
function tick() {
  if (!playing) return;
  var v = view(), t = ctx.currentTime - playStart;
  if (v && v.loop) t = t % (v.L.length / FS);
  else if (!v || t >= v.L.length / FS) { setPlaying(false); drawAll(null); return; }
  drawAll(t); raf = requestAnimationFrame(tick);
}
function setWhich(w, silent) {
  st.which = w; markChips();
  if (!silent && result) { var v = view(); renderStatus((v.L.length / FS).toFixed(2) + ' s, take ' + st.seed); if ($('audition').checked) play(); else { stop(); drawAll(null); } }
}

/* ---------- drawing ---------- */
function refreshColors() {
  var cs = getComputedStyle(document.documentElement);
  ['bg', 'panel', 'ink', 'muted', 'line', 'tracer', 'shock', 'well'].forEach(function (k) { col[k] = cs.getPropertyValue('--' + k).trim(); });
  col.mono = '"Spline Sans Mono", ui-monospace, Menlo, monospace';
  cache.specImg = null;
}
function rgb(hex) { var n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function fit(cv) {
  var dpr = Math.min(window.devicePixelRatio || 1, 2), w = cv.clientWidth, h = cv.clientHeight;
  if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
  var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { g: g, W: w, H: h };
}
function niceStep(span, n) {
  var raw = span / n, p10 = Math.pow(10, Math.floor(Math.log10(raw))), m = raw / p10;
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p10;
}
function srcDelay() {
  if (an.kind === 'implosion') return an.im.r / an.im.c;
  if (an.kind === 'destruction') return Math.max(1, st.p.dsDist) / C;
  if (an.kind === 'field') return an.ff.r / C;
  if (an.kind === 'liquid') return an.lq.r / C;
  if (an.kind === 'mechanism') return an.mc.r / C;
  return 0;
}
function restTime() {
  if (!an) return 0;
  if (an.kind === 'explosion') return an.ex.t;
  if (an.kind === 'implosion') return an.im.tMin + srcDelay();
  if (an.kind === 'destruction') return an.ds.tMed + srcDelay();
  if (an.kind === 'rotor') return an.rt.tr && an.rt.passed ? an.rt.passT : an.rt.dur * 0.5;
  if (an.kind === 'discharge') return an.dc.tC + an.dc.tFirst + 0.35 * (an.dc.tLast - an.dc.tFirst);
  if (an.kind === 'blaster') {
    var wp = an.wp, bo = wp.bo;
    if (bo.type === 'bolt') return wp.exitT + bo.flight * 0.6;
    if (bo.type === 'beam') { var t1 = Infinity; bo.ch.segs.forEach(function (s) { if (s.ta < t1) t1 = s.ta; }); return wp.exitT + t1 + 0.02; }
    if (bo.type === 'slug') return wp.exitT + (bo.an.crack ? bo.an.crack.t : bo.flight * 0.6);
    return 0;
  }
  if (an.kind === 'field') return 0;
  if (an.kind === 'liquid') return an.lq.loop ? 0 : an.lq.tMain + srcDelay();
  if (an.kind === 'mechanism') return an.mc.tEnd + srcDelay();
  if (an.kind === 'recording') return an.rc.fly ? an.rc.dur / 2 + an.rc.missD / C : 0;
  if (!an.tr) return 0;
  if (an.kind === 'rocket' && !an.crack) return an.flight * 0.6;
  return an.crack ? an.crack.t : Math.max(an.passed ? an.passT : 0, an.launchT) + 0.15 * an.flight;
}
function worldTime(tb) {
  if (!result) return 0;
  return st.which === 'fx' ? (tb - result.fx.pad) / result.fx.slow + result.raw.tStart : tb + result.raw.tStart;
}
function rangeTicks(g, X, xmax, W, H, mL, mR, unit) {
  var stp = niceStep(xmax, 5), k;
  g.strokeStyle = col.line; g.fillStyle = col.muted; g.lineWidth = 1; g.textAlign = 'center';
  for (k = 0; k * stp <= xmax; k++) {
    var gx = Math.round(X(k * stp)) + 0.5, val = k * stp;
    g.beginPath(); g.moveTo(gx, H - 16); g.lineTo(gx, H - 11); g.stroke();
    g.fillText((val >= 1 || k === 0 ? +val.toFixed(2) : val.toFixed(stp < 0.1 ? 2 : 1)) + (k === 0 ? ' ' + unit : ''), gx, H - 2);
  }
  g.beginPath(); g.moveTo(mL, H - 16.5); g.lineTo(W - mR, H - 16.5); g.stroke();
}
function caption(g, W, text, right) {
  g.font = '10px ' + col.mono; g.textAlign = 'left'; g.fillStyle = col.muted; g.fillText(text, 8, 14);
  if (right) { g.fillStyle = col.shock; g.textAlign = 'right'; g.fillText(right, W - 8, 14); }
}
function listenerDot(g, x, y) {
  g.fillStyle = col.well; g.strokeStyle = col.ink; g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, 5, 0, Math.PI * 2); g.fill(); g.stroke();
}
function sceneProjectile(g, W, H, tw) {
  var p = st.p, tr = an.tr, rk = an.kind === 'rocket', x0 = tr.x[0];
  var xEnd = tr.x[tr.n - 1], xmax = Math.max(p.D, xEnd, 0.5) * 1.04, mL = 30, mR = 16;
  var sx = (W - mL - mR) / xmax, yP = Math.round(H * 0.3), yL = Math.round(H * 0.74), sy = (yL - yP) / p.miss;
  function X(x) { return mL + x * sx; }
  g.font = '10px ' + col.mono; g.textBaseline = 'alphabetic';
  rangeTicks(g, X, xmax, W, H, mL, mR, 'm');
  var cur = B.posAt(tr, Math.max(0, tw)), flying = tw <= an.flight;
  g.save(); g.beginPath(); g.rect(0, 0, W, H - 18); g.clip();
  function front(cx, t0, color) {
    var r = C * (tw - t0); if (r <= 0) return;
    g.strokeStyle = color; g.globalAlpha = 0.55; g.lineWidth = 1.25;
    g.beginPath(); g.ellipse(X(cx), yP, Math.max(0.5, r * sx), Math.max(0.5, r * sy), 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  }
  if (rk ? an.mode !== 'flyby' : p.launch !== 'none') front(rk ? tr.x[tr.iBurn] : 0, rk ? tr.iBurn / B.TRAJ_HZ : 0, col.tracer);
  if (an.hit) front(an.hit.x, an.hit.tau, an.pay ? col.tracer : col.ink);
  g.strokeStyle = col.muted; g.setLineDash([3, 4]); g.lineWidth = 1;
  g.beginPath(); g.moveTo(X(x0), yP + 0.5); g.lineTo(X(xEnd), yP + 0.5); g.stroke(); g.setLineDash([]);
  g.strokeStyle = col.tracer; g.lineWidth = 2;
  g.beginPath(); g.moveTo(X(x0), yP + 0.5); g.lineTo(X(cur.x), yP + 0.5); g.stroke();
  if (rk) {
    /* exhaust plume, pointing aft, or forward during a braking burn */
    var thr = tr.th[Math.min(tr.n - 1, Math.max(0, Math.round(tw * B.TRAJ_HZ)))];
    if (thr > 0.01) { var dirX = an.mode === 'landing' ? 1 : -1; g.strokeStyle = col.tracer; g.globalAlpha = 0.6; g.lineWidth = 5; g.lineCap = 'round';
      g.beginPath(); g.moveTo(X(cur.x) + dirX * 4, yP); g.lineTo(X(cur.x) + dirX * (8 + 16 * thr), yP); g.stroke(); g.globalAlpha = 1; g.lineCap = 'butt'; }
  }
  if (flying && cur.v > C * 1.01) {
    var tanMu = 1 / Math.sqrt(Math.pow(cur.v / C, 2) - 1), s = cur.x;
    g.strokeStyle = col.shock; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(X(0), yP - s * tanMu * sy); g.lineTo(X(cur.x), yP); g.lineTo(X(0), yP + s * tanMu * sy); g.stroke();
  }
  g.restore();
  var lx = X(p.D);
  g.strokeStyle = col.line; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(lx) + 0.5, yP); g.lineTo(Math.round(lx) + 0.5, yL); g.stroke();
  g.fillStyle = col.ink; g.fillRect(X(x0) - 4, yP - 4, 8, 8);
  if (rk ? (an.mode === 'landing' || p.target !== 'none') : (p.target !== 'none' && !(p.pathLen > 0))) g.fillRect(X(Math.min(rk && an.mode === 'landing' ? p.D : p.targetDist, xmax)) - 1.5, yP - 11, 3, 22);
  g.fillStyle = col.tracer; g.beginPath(); g.arc(X(cur.x), yP, 3.5, 0, Math.PI * 2); g.fill();
  listenerDot(g, lx, yL);
  g.fillStyle = col.ink; g.textAlign = lx > W * 0.6 ? 'right' : 'left';
  g.fillText('listener, ' + fDist(p.miss) + ' off the path', lx + (lx > W * 0.6 ? -10 : 10), yL + 4);
  caption(g, W, 't = ' + (tw * 1000).toFixed(0) + ' ms' + (playing ? '' : an.crack ? ', shock reaching the listener' : ''),
    flying && cur.v > C * 1.01 ? 'Mach ' + (cur.v / C).toFixed(2) : '');
}
function sceneExplosion(g, W, H, tw) {
  var ex = an.ex, r = st.p.exDist, mL = Math.round(W * 0.2), mR = 26, sx = (W - mL - mR) / r, yC = Math.round((H - 18) / 2) + 4;
  function X(x) { return mL + x * sx; }
  g.font = '10px ' + col.mono;
  rangeTicks(g, X, r, W, H, mL, mR, 'm');
  g.save(); g.beginPath(); g.rect(0, 0, W, H - 18); g.clip();
  /* ground shock runs ahead of the air blast */
  if (tw > 0) {
    g.strokeStyle = col.muted; g.setLineDash([2, 5]); g.lineWidth = 1;
    g.beginPath(); g.arc(X(0), yC, Math.max(0.5, 1500 * tw * sx), 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    g.strokeStyle = col.tracer; g.lineWidth = 1.75;
    g.beginPath(); g.arc(X(0), yC, Math.max(0.5, C * tw * sx), 0, Math.PI * 2); g.stroke();
  }
  ex.frags.forEach(function (f) {
    var th = Math.asin(Math.min(1, f.p.miss / r)) * (f.flip ? -1 : 1), tr = f.an.tr, end = tr.x[tr.n - 1], s = B.posAt(tr, Math.max(0, tw)).x;
    g.strokeStyle = col.line; g.lineWidth = 1; g.beginPath(); g.moveTo(X(0), yC); g.lineTo(X(end * Math.cos(th)), yC + end * Math.sin(th) * sx); g.stroke();
    g.fillStyle = col.shock; g.beginPath(); g.arc(X(s * Math.cos(th)), yC + s * Math.sin(th) * sx, 2.2, 0, Math.PI * 2); g.fill();
  });
  g.fillStyle = col.ink;
  ex.debris.forEach(function (d) { if (tw >= d.t) g.fillRect(X(d.dx) - 1, yC + d.dy * sx - 1, 2.5, 2.5); });
  g.restore();
  g.fillStyle = col.ink; g.fillRect(X(0) - 4, yC - 4, 8, 8);
  listenerDot(g, X(r), yC);
  g.fillStyle = col.ink; g.textAlign = 'right'; g.fillText('listener', X(r) - 9, yC + 16);
  caption(g, W, 't = ' + (tw * 1000).toFixed(0) + ' ms' + (playing ? '' : ', blast reaching the listener'), fPress(ex.blast.peak));
}
function curveAt(im, t) {
  var ct = im.ct, cr = im.cr, lo = 0, hi = ct.length - 1;
  if (t <= 0) return 1; if (t >= ct[hi]) return cr[hi];
  while (hi - lo > 1) { var m = (lo + hi) >> 1; if (ct[m] <= t) lo = m; else hi = m; }
  return cr[lo] + (cr[hi] - cr[lo]) * (t - ct[lo]) / (ct[hi] - ct[lo] || 1);
}
function sceneImplosion(g, W, H, tw) {
  var im = an.im, ts = tw - srcDelay(), Tv = Math.min(im.Tsim, im.tc * 7), mL = 30, mR = 84, mT = 24, mB = 22, pw = W - mL - mR, ph = H - mT - mB, i;
  function X(t) { return mL + t / Tv * pw; }
  function Y(r) { return mT + (1 - r) * ph; }
  g.font = '10px ' + col.mono;
  g.strokeStyle = col.line; g.lineWidth = 1; g.fillStyle = col.muted; g.textAlign = 'right';
  [[1, 'R0'], [0.5, '0.5'], [0, '0']].forEach(function (a) { var y = Math.round(Y(a[0])) + 0.5; g.beginPath(); g.moveTo(mL, y); g.lineTo(mL + pw, y); g.stroke(); g.fillText(a[1], mL - 5, y + 3); });
  var stp = niceStep(Tv * 1000, 4); g.textAlign = 'center';
  for (i = 0; i * stp <= Tv * 1000; i++) g.fillText(+(i * stp).toFixed(3) + (i === 0 ? ' ms' : ''), X(i * stp / 1000), H - 6);
  g.strokeStyle = col.shock; g.lineWidth = 1.75; g.beginPath();
  for (i = 0; i < im.ct.length && im.ct[i] <= Tv; i++) { if (i) g.lineTo(X(im.ct[i]), Y(im.cr[i])); else g.moveTo(X(0), Y(1)); }
  g.stroke();
  var tc = Math.min(Math.max(ts, 0), Tv), rr = curveAt(im, tc);
  g.fillStyle = col.tracer; g.beginPath(); g.arc(X(tc), Y(rr), 3.5, 0, Math.PI * 2); g.fill();
  /* the cavity itself, to scale with its starting size */
  var cx = W - mR / 2, cy = mT + ph / 2, R = Math.min(mR / 2 - 10, ph / 2 - 2);
  g.strokeStyle = col.muted; g.setLineDash([3, 3]); g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  g.fillStyle = col.shock; g.globalAlpha = 0.3; g.beginPath(); g.arc(cx, cy, Math.max(1, R * rr), 0, Math.PI * 2); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = col.shock; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, Math.max(1, R * rr), 0, Math.PI * 2); g.stroke();
  caption(g, W, (playing ? 't = ' + fTime(Math.max(0, ts)) : 'smallest at ' + fTime(im.tMin)) + ', radius ' + Math.round(rr * 100) + '%', '');
}
function sceneDestruction(g, W, H, tw) {
  var ds = an.ds, p = st.p, ts = tw - srcDelay(), T = ds.tEnd * 1.04 + 0.05, mL = 30, mR = 12, mT = 24, mB = 22, pw = W - mL - mR, ph = H - mT - mB, i;
  function X(t) { return mL + t / T * pw; }
  function Y(h) { return mT + (1 - h / p.dsHeight) * ph; }
  g.font = '10px ' + col.mono; g.fillStyle = col.muted; g.strokeStyle = col.line; g.lineWidth = 1;
  g.beginPath(); g.moveTo(mL, Math.round(Y(0)) + 0.5); g.lineTo(mL + pw, Math.round(Y(0)) + 0.5); g.stroke();
  g.textAlign = 'right'; g.fillText(fDist(p.dsHeight).replace(' m', ''), mL - 5, Y(p.dsHeight) + 8); g.fillText('0 m', mL - 5, Y(0) + 3);
  var stp = niceStep(T, 5); g.textAlign = 'center';
  for (i = 0; i * stp <= T; i++) g.fillText(+(i * stp).toFixed(2) + (i === 0 ? ' s' : ''), X(i * stp), H - 6);
  g.strokeStyle = col.ink; g.globalAlpha = 0.4; g.lineWidth = 1;
  ds.frs.forEach(function (f) {
    var tf = f.hits[0].t - f.t0, k, b;
    g.beginPath(); g.moveTo(X(f.t0), Y(f.h));
    for (k = 1; k <= 8; k++) { var s = tf * k / 8; g.lineTo(X(f.t0 + s), Y(Math.max(0, f.h - 4.905 * s * s))); }
    for (b = 1; b < f.hits.length; b++) {
      var t0 = f.hits[b - 1].t, dt = f.hits[b].t - t0, v = f.hits[b].v;
      for (k = 1; k <= 6; k++) { var s2 = dt * k / 6; g.lineTo(X(t0 + s2), Y(Math.max(0, v * s2 - 4.905 * s2 * s2))); }
    }
    g.stroke();
  });
  g.globalAlpha = 1; g.fillStyle = col.tracer;
  ds.frs.forEach(function (f) { f.hits.forEach(function (h) { g.fillRect(X(h.t) - 0.5, Y(0) + 1, 1.5, 4); }); });
  if (playing && ts >= 0 && ts <= T) { g.fillRect(X(ts), mT - 4, 1.5, ph + 8); }
  caption(g, W, ds.n + ' pieces, break-up over ' + fTime(ds.Tfrac), '');
}
function sceneSpectrum(g, W, H) {
  /* static burn: the modelled spectrum, a broad hump around the Strouhal peak */
  var fpk = an.fpk, f1 = 0.5 * fpk, f2 = Math.min(1.5 * fpk, 16000), mL = 46, mR = 12, mT = 24, mB = 22, pw = W - mL - mR, ph = H - mT - mB, i, pts = [], mx = -1e9;
  function X(f) { return mL + Math.log(f / 20) / Math.log(1000) * pw; }
  for (i = 0; i <= 120; i++) { var f = 20 * Math.pow(1000, i / 120), a = f / f1, b = f / f2, d = 10 * Math.log10(a * a / (1 + a * a) / (1 + b * b)); pts.push([f, d]); if (d > mx) mx = d; }
  function Y(d) { return mT + Math.min(1, (mx - d) / 40) * ph; }
  g.font = '10px ' + col.mono; g.fillStyle = col.muted; g.strokeStyle = col.line; g.lineWidth = 1;
  g.textAlign = 'right'; [0, -20, -40].forEach(function (d) { var y = Math.round(mT - d / 40 * ph) + 0.5; g.beginPath(); g.moveTo(mL, y); g.lineTo(mL + pw, y); g.stroke(); g.fillText(d + ' dB', mL - 4, y + 3); });
  g.textAlign = 'center'; [20, 100, 1000, 10000].forEach(function (f) { g.fillText(f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz', X(f), H - 6); });
  g.strokeStyle = col.shock; g.lineWidth = 1.75; g.beginPath(); pts.forEach(function (q, k) { if (k) g.lineTo(X(q[0]), Y(q[1])); else g.moveTo(X(q[0]), Y(q[1])); }); g.stroke();
  g.fillStyle = col.tracer; g.fillRect(Math.round(X(Math.max(20, fpk))), mT, 1.5, ph);
  caption(g, W, 'peak near ' + fHz(fpk) + ', static burn at ' + fDist(an.r), '');
}
function sceneRotor(g, W, H, tw) {
  var rt = an.rt, mL = 44, mR = 12, mT = 24, mB = 22, pw = W - mL - mR, ph = H - mT - mB, lo = Infinity, hi = 0, j, i, n = rt.nr - 1;
  for (j = 0; j < rt.N; j++) for (i = 0; i < n; i++) { var v = rt.nj[j][i] * 60; if (v < lo) lo = v; if (v > hi) hi = v; }
  var pad = Math.max((hi - lo) * 0.15, hi * 0.004); lo = Math.max(0, lo - pad); hi += pad;
  function X(t) { return mL + t / rt.dur * pw; }
  function Y(r) { return mT + (1 - (r - lo) / (hi - lo)) * ph; }
  g.font = '10px ' + col.mono; g.fillStyle = col.muted; g.strokeStyle = col.line; g.lineWidth = 1; g.textAlign = 'right';
  [lo, (lo + hi) / 2, hi].forEach(function (r) { var y = Math.round(Y(r)) + 0.5; g.beginPath(); g.moveTo(mL, y); g.lineTo(mL + pw, y); g.stroke(); g.fillText(r.toFixed(0), mL - 4, y + 3); });
  var stp = niceStep(rt.dur, 5); g.textAlign = 'center';
  for (i = 0; i * stp <= rt.dur; i++) g.fillText(+(i * stp).toFixed(2) + (i === 0 ? ' s' : ''), X(i * stp), H - 6);
  g.strokeStyle = col.shock; g.lineWidth = 1.25; g.globalAlpha = 0.85;
  for (j = 0; j < rt.N; j++) { g.beginPath(); for (i = 0; i < n; i += 2) { var x = X(i / rt.RS), y = Y(rt.nj[j][i] * 60); if (i) g.lineTo(x, y); else g.moveTo(x, y); } g.stroke(); }
  g.globalAlpha = 1;
  if (playing) { var ts = rt.tr ? tw - rt.r / C : tw; if (ts >= 0 && ts <= rt.dur) { g.fillStyle = col.tracer; g.fillRect(X(ts), mT - 4, 1.5, ph + 8); } }
  caption(g, W, rt.N + (rt.N > 1 ? ' rotors' : ' rotor') + ', rev/min' + (rt.over ? ', tip speed capped' : ''), 'blade pass ' + fHz(rt.bpf));
}
function sceneDischarge(g, W, H, tw) {
  var dc = an.dc, all = dc.pts2.concat([dc.ear2]), x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, i;
  dc.bpts2.forEach(function (b) { all = all.concat(b); });
  all.forEach(function (q) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; });
  var mL = 20, mR = 20, mT = 26, mB = 24, sc = Math.min((W - mL - mR) / Math.max(x1 - x0, 1e-6), (H - mT - mB) / Math.max(y1 - y0, 1e-6));
  var ox = mL + ((W - mL - mR) - (x1 - x0) * sc) / 2, oy = mT + ((H - mT - mB) - (y1 - y0) * sc) / 2;
  function X(x) { return ox + (x - x0) * sc; }
  function Y(y) { return dc.vert ? H - mB - (y - y0) * sc - (oy - mT) : oy + (y - y0) * sc; }
  g.font = '10px ' + col.mono; g.lineCap = 'round'; g.lineJoin = 'round';
  g.strokeStyle = col.shock; g.globalAlpha = 0.55; g.lineWidth = 1;
  dc.bpts2.forEach(function (b) { g.beginPath(); b.forEach(function (q, k) { if (k) g.lineTo(X(q[0]), Y(q[1])); else g.moveTo(X(q[0]), Y(q[1])); }); g.stroke(); });
  g.globalAlpha = 1; g.lineWidth = 2;
  for (i = 0; i < dc.segs.length; i++) {
    g.strokeStyle = tw >= dc.tC + dc.segs[i].t ? col.tracer : col.shock;
    g.beginPath(); g.moveTo(X(dc.pts2[i][0]), Y(dc.pts2[i][1])); g.lineTo(X(dc.pts2[i + 1][0]), Y(dc.pts2[i + 1][1])); g.stroke();
  }
  g.lineCap = 'butt';
  listenerDot(g, X(dc.ear2[0]), Y(dc.ear2[1]));
  g.fillStyle = col.ink; g.textAlign = 'left'; g.fillText('listener', X(dc.ear2[0]) + 9, Y(dc.ear2[1]) + 4);
  g.fillStyle = col.muted; g.textAlign = 'right'; g.fillText((dc.vert ? 'side view, ' : 'top view, ') + fLen(x1 - x0) + ' across', W - 8, H - 6);
  caption(g, W, 't = ' + fTime(Math.max(0, tw)) + ', ' + dc.segs.length + ' stretches of channel', '');
}
function sceneWeapon(g, W, H, tw) {
  var wp = an.wp, p = st.p, bo = wp.bo, tg = wp.tg, xEnd = bo.xEnd, xmax = Math.max(p.D, xEnd, tg ? tg.x : 0, 0.5) * 1.04, mL = 30, mR = 16;
  var sx = (W - mL - mR) / xmax, yP = Math.round(H * 0.3), yL = Math.round(H * 0.74), sy = (yL - yP) / Math.max(p.miss, 0.01), te = tw - wp.exitT, xb = 0, cur = null;
  function X(x) { return mL + x * sx; }
  function front(cx, t0, color) {
    var r = C * (tw - t0); if (r <= 0) return;
    g.strokeStyle = color; g.globalAlpha = 0.55; g.lineWidth = 1.25;
    g.beginPath(); g.ellipse(X(cx), yP, Math.max(0.5, r * sx), Math.max(0.5, r * sy), 0, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
  }
  g.font = '10px ' + col.mono;
  rangeTicks(g, X, xmax, W, H, mL, mR, 'm');
  g.save(); g.beginPath(); g.rect(0, 0, W, H - 18); g.clip();
  if (wp.ln.type !== 'none') front(0, wp.ln.tC, col.tracer);
  if (tg) front(tg.x, tg.hits[0].te, col.ink);
  g.strokeStyle = col.muted; g.setLineDash([3, 4]); g.lineWidth = 1;
  g.beginPath(); g.moveTo(X(0), yP + 0.5); g.lineTo(X(xEnd), yP + 0.5); g.stroke(); g.setLineDash([]);
  if (bo.type === 'beam') { xb = te >= 0 && te <= (bo.pulses - 1) * bo.period + 0.03 ? xEnd : 0; }
  else if (bo.type === 'bolt') xb = clamp01(te / Math.max(bo.flight, 1e-6)) * xEnd;
  else if (bo.type === 'slug') { cur = B.posAt(bo.tr, Math.max(0, te)); xb = te > 0 ? cur.x : 0; }
  if (xb > 0) {
    g.strokeStyle = col.tracer; g.lineWidth = bo.type === 'beam' ? 3 : 2;
    g.beginPath(); g.moveTo(X(0), yP + 0.5); g.lineTo(X(xb), yP + 0.5); g.stroke();
  }
  if (bo.ch) {
    /* stretches of the heated channel whose crack has reached the listener */
    g.fillStyle = col.shock;
    bo.ch.segs.forEach(function (s) { if (te >= s.ta) g.fillRect(X(s.x - bo.ch.ds / 2), yP + 4, Math.max(1, bo.ch.ds * sx), 3); });
  }
  if (bo.type === 'slug' && cur && te > 0 && te <= bo.flight && cur.v > C * 1.01) {
    var tanMu = 1 / Math.sqrt(Math.pow(cur.v / C, 2) - 1);
    g.strokeStyle = col.shock; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(X(0), yP - cur.x * tanMu * sy); g.lineTo(X(cur.x), yP); g.lineTo(X(0), yP + cur.x * tanMu * sy); g.stroke();
  }
  g.restore();
  var lx = X(p.D);
  g.strokeStyle = col.line; g.lineWidth = 1; g.beginPath(); g.moveTo(Math.round(lx) + 0.5, yP); g.lineTo(Math.round(lx) + 0.5, yL); g.stroke();
  g.fillStyle = col.ink;
  if (wp.ln.type !== 'none') g.fillRect(X(0) - 4, yP - 4, 8, 8);
  if (tg) g.fillRect(X(tg.x) - 1.5, yP - 11, 3, 22);
  if (xb > 0 && bo.type !== 'beam' && te <= bo.flight) { g.fillStyle = col.tracer; g.beginPath(); g.arc(X(xb), yP, 3.5, 0, Math.PI * 2); g.fill(); }
  listenerDot(g, lx, yL);
  g.fillStyle = col.ink; g.textAlign = lx > W * 0.6 ? 'right' : 'left';
  g.fillText('listener, ' + fDist(p.miss) + ' off the path', lx + (lx > W * 0.6 ? -10 : 10), yL + 4);
  var right = bo.type === 'beam' ? 'beam' : bo.v > C * 1.01 ? 'Mach ' + (bo.v / C).toFixed(1) : bo.v ? fSpeed(bo.v) : '';
  caption(g, W, 't = ' + fTime(Math.max(0, tw)) + (tg ? ', ' + (B.PLATES[tg.mat] ? tg.mat + ' plate' : tg.mat) + ' at ' + fDist(tg.x) : ''), right);
}
function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
function sceneSweeps(g, W, H, tw) {
  var wp = an.wp, ln = wp.ln, tg = wp.tg, cap = ln.line ? 'line: highs lead by ' + fTime(ln.line.tSweep) : ln.rail ? 'rails: bending waves from the breech' : ln.stages ? ln.stages.length + ' coil stages' : ln.pipe ? 'valve, chamber, driver, pipe, spring' : '';
  if (tg && tg.plate) cap += (cap ? '; ' : '') + tg.mat + ' plate, ' + fLen(tg.plate.a) + ' across';
  drawCurves(g, W, H, tw, wp.curves, cap || 'nothing dispersive in this chain', wp.marks);
}
/* frequency against arrival time for dispersive paths, with optional event marks [t, label] */
function drawCurves(g, W, H, tw, cv, cap, mk) {
  var t0 = Infinity, t1 = 0, mL = 44, mR = 12, mT = 24, mB = 22, pw = W - mL - mR, ph = H - mT - mB, i;
  mk = mk || [];
  cv.forEach(function (c) { c.pts.forEach(function (q) { if (q[1] >= 40) { if (q[0] < t0) t0 = q[0]; if (q[0] > t1) t1 = q[0]; } }); });
  mk.forEach(function (m) { if (m[0] < t0) t0 = m[0]; if (m[0] > t1) t1 = m[0]; });
  if (!isFinite(t0)) { t0 = 0; t1 = 1; }
  t0 = Math.max(0, t0 - 0.02 * (t1 - t0 + 0.02)); t1 = t1 + 0.05 * (t1 - t0 + 0.02);
  function X(t) { return mL + (t - t0) / (t1 - t0) * pw; }
  function Y(f) { return mT + (1 - Math.log(f / 40) / Math.log(450)) * ph; }
  g.font = '10px ' + col.mono; g.fillStyle = col.muted; g.strokeStyle = col.line; g.lineWidth = 1; g.textAlign = 'right';
  [100, 1000, 10000].forEach(function (f) { var y = Math.round(Y(f)) + 0.5; g.beginPath(); g.moveTo(mL, y); g.lineTo(mL + pw, y); g.stroke(); g.fillText(f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz', mL - 4, y + 3); });
  var stp = niceStep(t1 - t0, 5); g.textAlign = 'center';
  for (i = Math.ceil(t0 / stp); i * stp <= t1; i++) g.fillText(+(i * stp).toFixed(3) + (i === Math.ceil(t0 / stp) ? ' s' : ''), X(i * stp), H - 6);
  g.save(); g.beginPath(); g.rect(mL, mT - 6, pw, ph + 12); g.clip();
  cv.forEach(function (c) {
    g.strokeStyle = col[c.c]; g.globalAlpha = c.w; g.lineWidth = c.w > 0.9 ? 2 : 1.25; g.beginPath();
    var on = false;
    c.pts.forEach(function (q) { if (q[1] < 40) return; var x = X(q[0]), y = Y(Math.min(18000, q[1])); if (on) g.lineTo(x, y); else { g.moveTo(x, y); on = true; } });
    g.stroke();
  });
  g.globalAlpha = 1; g.textAlign = 'left';
  mk.forEach(function (m) { var x = Math.round(X(m[0])) + 0.5; g.strokeStyle = col.ink; g.globalAlpha = m[1] ? 0.8 : 0.4; g.beginPath(); g.moveTo(x, mT + ph - (m[1] ? 18 : 8)); g.lineTo(x, mT + ph); g.stroke(); g.globalAlpha = 1; if (m[1]) { g.fillStyle = col.ink; g.fillText(m[1], x + 3, mT + ph - 10); } });
  g.restore();
  if (playing && tw >= t0 && tw <= t1) { g.fillStyle = col.tracer; g.fillRect(X(tw), mT - 4, 1.5, ph + 8); }
  caption(g, W, cap, '');
}
var envCache = { key: '', cols: null }, BODY_NAMES = { none: 'none', steel: 'steel plate', aluminium: 'aluminium plate', glass: 'glass pane', ice: 'ice sheet', wood: 'wood panel', rail: 'steel rail', line: 'dispersive line', spring: 'spring', ir: 'imported' };
function sceneRecording(g, W, H, tw) {
  var rc = an.rc, p = st.p, i;
  if (!rc.src) { caption(g, W, 'Load a recording to hear it here.', ''); return; }
  if (rc.fly) {
    /* from above: the path, the listener off it, the source moving at its speed */
    var half = rc.v * rc.dur / 2, mL = 30, mR = 16, sx = (W - mL - mR) / (2 * half), yP = Math.round(H * 0.3), yL = Math.round(H * 0.74);
    function X(x) { return mL + (x + half) * sx; }
    g.font = '10px ' + col.mono;
    rangeTicks(g, function (x) { return X(x - half); }, 2 * half, W, H, mL, mR, 'm');
    g.strokeStyle = col.muted; g.setLineDash([3, 4]); g.lineWidth = 1;
    g.beginPath(); g.moveTo(X(-half), yP + 0.5); g.lineTo(X(half), yP + 0.5); g.stroke(); g.setLineDash([]);
    var te = Math.max(0, Math.min(rc.dur, tw - rc.missD / C)), xs = -half + rc.v * te;
    g.strokeStyle = col.tracer; g.lineWidth = 2; g.beginPath(); g.moveTo(X(-half), yP + 0.5); g.lineTo(X(xs), yP + 0.5); g.stroke();
    g.fillStyle = col.tracer; g.beginPath(); g.arc(X(xs), yP, 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = col.line; g.beginPath(); g.moveTo(X(0) + 0.5, yP); g.lineTo(X(0) + 0.5, yL); g.stroke();
    listenerDot(g, X(0), yL);
    g.fillStyle = col.ink; g.textAlign = 'left'; g.fillText('listener, ' + fDist(p.miss) + ' off the path, source ' + fDist(p.rcHeight) + ' up', X(0) + 10, yL + 4);
    caption(g, W, 't = ' + fTime(Math.max(0, tw)) + ', Doppler ' + rc.semis.toFixed(1) + ' semitones', rc.notch ? 'ground notch ' + fHz(rc.notch) : '');
    return;
  }
  if (rc.curves.length) { drawCurves(g, W, H, tw, rc.curves, 'through the ' + BODY_NAMES[rc.body]); return; }
  /* the recording itself: its level over time */
  var a = rc.src, mT = 24, mB = 20, ph = H - mT - mB, cols = Math.max(1, Math.floor(W - 32)), key = p.rcAsset + '|' + cols;
  if (envCache.key !== key) {
    var per = a.L.length / cols, c = new Float32Array(cols), pk = 0;
    for (i = 0; i < cols; i++) { var m = 0, j0 = Math.floor(i * per), j1 = Math.min(a.L.length, Math.floor((i + 1) * per)); for (var j = j0; j < j1; j++) { var v = Math.max(Math.abs(a.L[j]), Math.abs(a.R[j])); if (v > m) m = v; } c[i] = m; if (m > pk) pk = m; }
    for (i = 0; i < cols; i++) c[i] /= pk || 1;
    envCache = { key: key, cols: c };
  }
  g.fillStyle = col.muted; g.globalAlpha = 0.8;
  for (i = 0; i < cols; i++) { var hgt = Math.max(1, envCache.cols[i] * ph / 2); g.fillRect(16 + i, mT + ph / 2 - hgt, 1, 2 * hgt); }
  g.globalAlpha = 1;
  if (playing) { var tt = tw - rc.r / C; if (tt >= 0 && tt <= rc.len) { g.fillStyle = col.tracer; g.fillRect(16 + tt / rc.len * cols, mT - 4, 1.5, ph + 8); } }
  caption(g, W, fTime(rc.len) + ', at ' + fDist(rc.r), '');
}
var LQ_NAMES = { water: 'water', oil: 'oil', mud: 'mud', lava: 'lava', acid: 'acid' };
function fSpd(v) { return v.toFixed(v < 10 ? 2 : 1) + ' m/s'; }
function liquidReadouts(lq, p, peak) {
  var b, m = lq.mode, L = B.LIQUIDS[lq.med];
  if (m === 'drop') {
    b = lq.bub;
    return [['Impact speed', fSpd(lq.U)], ['Chance of a bubble', lq.shallow ? 'none, too shallow' : fPct(lq.chance)],
      ['Bubble', b ? (b.a * 2000).toFixed(2) + ' mm across, ' + fHz(b.f) : 'none this take'], ['Rings for', b ? fTime(6.9 / Math.min(b.d, 2 * b.f)) : 'n/a'],
      ['Liquid', LQ_NAMES[lq.med]], ['Peak at the ear', peak]];
  }
  if (m === 'splash') {
    b = lq.cav;
    return [['Entry speed', fSpd(lq.U)], ['Object', fLen(2 * lq.R) + ' across, ' + LQ_NAMES[lq.med]], ['Cavity closes', lq.shallow ? 'hits the bottom first' : fTime(lq.tp) + ', ' + fLen(lq.Lc) + ' down'],
      ['Plunk', b ? fHz(b.f) + ', bubble ' + fLen(2 * b.a) : 'none'], ['Droplets', String(lq.drops.length)], ['Peak at the ear', peak]];
  }
  if (m === 'pour') {
    return [['Stream', fSpd(lq.U) + ', ' + fLen(2 * lq.rj) + ' thick'], ['Pour time', fTime(lq.P)], ['Air column', fHz(lq.fRes0) + ' rising to ' + fHz(lq.fRes1)],
      ['Fills', fPct(lq.f0) + ' to ' + fPct(lq.f1)], ['Bubbles', Math.round(lq.rate) + ' per second'], ['Peak at the ear', peak]];
  }
  if (m === 'quench') {
    return [['Wetted surface', (lq.A * 1e4).toFixed(0) + ' cm²'], ['Film boiling', lq.tL > 0 ? 'until ' + fTime(lq.tL) : 'none, under ' + B.QUENCH.tl + ' °C'],
      ['Peak heat flow', fPower(lq.qMax)], ['Quiet after', fTime(lq.tEnd)], ['Cooling', lq.T0.toFixed(0) + ' to 100 °C'], ['Peak at the ear', peak]];
  }
  var lo = Infinity, hi = 0, visc = m === 'bubble' && L.mu > 0.5;
  lq.hist.forEach(function (h) { var f = visc ? h.fd : h.f; if (f < lo) lo = f; if (f > hi) hi = f; });
  if (m === 'rain') {
    return [['Rain', p.lqRain.toFixed(p.lqRain < 2 ? 1 : 0) + ' mm/h'], ['Drops heard', Math.round(lq.flux) + ' per second'], ['Small drops ring', fHz(lo) + ' to ' + fHz(hi)],
      ['Large drops', 'lower, irregular'], ['Length', 'loop'], ['Peak at the ear', peak]];
  }
  var a = m === 'stream' ? 'up to ' + fLen(2 * 0.006 * p.lqSize) : fLen(2 * L.gas * p.lqSize) + ' typical';
  return [['Bubbles', a + ' across'], [visc ? 'Domes ring' : 'They ring', fHz(lo) + ' to ' + fHz(hi)],
    m === 'bubble' && lq.fc != null && lq.fc > 0 ? ['Collapsing', fPct(lq.fc) + ', the liquid is still cool'] : ['Liquid', LQ_NAMES[lq.med]],
    ['Bursts ring', m === 'stream' ? 'n/a' : fHz(Math.min(42.9 / (L.gas * p.lqSize), 16000))], ['Length', 'loop'], ['Peak at the ear', peak]];
}
/* liquid: a cross-section for drops and splashes, the vessel for a pour, the cooling curve for a quench,
   and the spread of bubble pitches for the loops */
function sceneLiquid(g, W, H, tw) {
  var lq = an.lq, p = st.p, ts = tw - srcDelay(), i;
  g.font = '10px ' + col.mono; g.lineWidth = 1;
  if (lq.mode === 'quench') {
    var mL = 34, mR = 14, mT = 24, mB = 22, pw = W - mL - mR, ph = H - mT - mB, n = lq.temp.length, tmax = Math.max(lq.dur, 0.5), Tm = Math.max(lq.T0, 450);
    function Xq(t) { return mL + t / tmax * pw; } function Yq(T) { return mT + (1 - (T - 20) / (Tm - 20)) * ph; }
    g.strokeStyle = col.line; g.beginPath(); g.moveTo(mL, H - mB + 0.5); g.lineTo(W - mR, H - mB + 0.5); g.stroke();
    rangeTicks(g, Xq, tmax, W, H, mL, mR, 's');
    [100, B.QUENCH.tl].forEach(function (T) {
      g.strokeStyle = col.muted; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(mL, Math.round(Yq(T)) + 0.5); g.lineTo(W - mR, Math.round(Yq(T)) + 0.5); g.stroke(); g.setLineDash([]);
      g.fillStyle = col.muted; g.textAlign = 'right'; g.fillText(T + '°', mL - 4, Yq(T) + 3);
    });
    g.textAlign = 'left'; g.fillText('Leidenfrost', mL + 4, Yq(B.QUENCH.tl) - 4);
    g.strokeStyle = col.tracer; g.lineWidth = 2; g.beginPath();
    for (i = 0; i < n; i += 5) { var xq = Xq(i / 1000), yq = Yq(lq.temp[i]); if (i) g.lineTo(xq, yq); else g.moveTo(xq, yq); }
    g.stroke(); g.lineWidth = 1;
    if (playing && ts >= 0 && ts <= tmax) { g.fillStyle = col.shock; g.fillRect(Xq(ts), mT, 1.5, ph); }
    caption(g, W, lq.tL > 0 ? 'film boils until ' + fTime(lq.tL) + ', then the crackle' : 'too cool for a vapour film', 'peak ' + fPower(lq.qMax));
    return;
  }
  if (lq.loop) {
    var mL2 = 16, mR2 = 16, mT2 = 26, mB2 = 22, pw2 = W - mL2 - mR2, ph2 = H - mT2 - mB2, bins = 48, hr = new Float32Array(bins), hb = new Float32Array(bins), mx = 0;
    function X2(f) { return mL2 + Math.log(f / 50) / Math.log(400) * pw2; }
    var visc = lq.mode === 'bubble' && B.LIQUIDS[lq.med].mu > 0.5;
    lq.hist.forEach(function (h) {
      var k = Math.floor(Math.log((visc ? h.fd : h.f) / 50) / Math.log(400) * bins), kb = Math.floor(Math.log(h.fb / 50) / Math.log(400) * bins);
      if (k >= 0 && k < bins) hr[k]++;
      if (lq.mode !== 'stream' && lq.mode !== 'rain' && kb >= 0 && kb < bins) hb[kb]++;
    });
    for (i = 0; i < bins; i++) mx = Math.max(mx, hr[i], hb[i]);
    g.strokeStyle = col.line; g.beginPath(); g.moveTo(mL2, H - mB2 + 0.5); g.lineTo(W - mR2, H - mB2 + 0.5); g.stroke();
    g.fillStyle = col.muted; g.textAlign = 'center';
    [100, 1000, 10000].forEach(function (f) { g.fillText(f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz', X2(f), H - 6); });
    var bw = pw2 / bins, top = [-1, -1];
    for (i = 0; i < bins; i++) {
      if (hr[i]) { g.fillStyle = col.tracer; var h1 = hr[i] / mx * ph2 * 0.8; g.fillRect(mL2 + i * bw + 1, H - mB2 - h1, Math.max(1, bw / 2 - 1), h1); if (top[0] < 0 || hr[i] > hr[top[0]]) top[0] = i; }
      if (hb[i]) { g.fillStyle = col.shock; var h2 = hb[i] / mx * ph2 * 0.8; g.fillRect(mL2 + i * bw + bw / 2, H - mB2 - h2, Math.max(1, bw / 2 - 1), h2); if (top[1] < 0 || hb[i] > hb[top[1]]) top[1] = i; }
    }
    /* each family named over its tallest bar */
    [[visc ? 'dome' : 'ring', hr, col.tracer], ['burst', hb, col.shock]].forEach(function (f, k) {
      if (top[k] < 0) return;
      g.fillStyle = f[2]; g.textAlign = 'center';
      g.fillText(f[0], Math.min(W - 24, Math.max(24, mL2 + (top[k] + 0.5) * bw)), Math.max(mT2 + 10, H - mB2 - f[1][top[k]] / mx * ph2 * 0.8 - 5));
    });
    var cap = lq.mode === 'rain' ? 'small drops trap bubbles that ring high' : lq.mode === 'stream' ? 'bubbles the flow traps, by pitch' : 'bubble pitches heard';
    caption(g, W, cap, lq.mode === 'bubble' && lq.fc > 0 ? fPct(lq.fc) + ' collapse' : '');
    return;
  }
  /* a slice through the liquid; sizes are drawn larger than life where they would vanish */
  var y0 = Math.round(H * 0.42), xc = W / 2, depth = lq.mode === 'pour' ? 0 : p.lqDepth, dpx = Math.min(H - y0 - 12, Math.max(6, depth / (lq.mode === 'splash' ? 1.5 : 0.25) * (H - y0)));
  if (lq.mode === 'pour') {
    var Hv = H - 36, wv = Math.min(W * 0.28, Hv * 0.45), xv = xc - wv / 2, yv = 22, fill = lq.f0 + (lq.f1 - lq.f0) * Math.max(0, Math.min(1, (playing ? ts : lq.P) / lq.P));
    g.fillStyle = col.line; g.globalAlpha = 0.55; g.fillRect(xv, yv + Hv * (1 - fill), wv, Hv * fill); g.globalAlpha = 1;
    g.strokeStyle = col.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(xv, yv); g.lineTo(xv, yv + Hv); g.lineTo(xv + wv, yv + Hv); g.lineTo(xv + wv, yv); g.stroke();
    g.strokeStyle = col.tracer; g.lineWidth = Math.max(1.5, lq.rj * 2 * 300); g.beginPath(); g.moveTo(xc, 4); g.lineTo(xc, yv + Hv * (1 - fill)); g.stroke(); g.lineWidth = 1;
    var fNow = B.C / (4 * (lq.H * (1 - fill) + 0.6 * lq.rv));
    g.strokeStyle = col.shock; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(xv + wv + 8, yv); g.lineTo(xv + wv + 8, yv + Hv * (1 - fill)); g.stroke(); g.setLineDash([]);
    g.fillStyle = col.shock; g.textAlign = 'left'; g.fillText('air column ' + fHz(fNow), xv + wv + 14, yv + Hv * (1 - fill) / 2 + 3);
    caption(g, W, fPct(fill) + ' full', 'pour ' + fTime(lq.P));
    return;
  }
  g.fillStyle = col.line; g.globalAlpha = 0.5; g.fillRect(0, y0, W, dpx); g.globalAlpha = 1;
  g.strokeStyle = col.ink; g.beginPath(); g.moveTo(0, y0 + 0.5); g.lineTo(W, y0 + 0.5); g.stroke();
  g.strokeStyle = col.muted; g.beginPath(); g.moveTo(0, y0 + dpx + 0.5); g.lineTo(W, y0 + dpx + 0.5); g.stroke();
  g.fillStyle = col.muted; g.textAlign = 'right'; g.fillText(fLen(depth) + ' deep', W - 8, y0 + dpx - 4);
  var rObj = lq.mode === 'drop' ? Math.max(3, lq.rd * 1500) : Math.max(5, Math.min(26, lq.R * 300)), h = p.lqHeight, yObj = Math.max(rObj + 18, y0 - 10 - Math.min(y0 - 30, Math.log(1 + h * 10) * 18));
  g.fillStyle = lq.mode === 'drop' ? col.tracer : col.ink; g.beginPath(); g.arc(xc, yObj, rObj, 0, Math.PI * 2); g.fill();
  g.strokeStyle = col.muted; g.beginPath(); g.moveTo(xc + rObj + 8, yObj); g.lineTo(xc + rObj + 8, y0 - 2); g.stroke();
  g.fillStyle = col.muted; g.textAlign = 'left'; g.fillText(fLen(h) + ', ' + fSpd(lq.U), xc + rObj + 12, (yObj + y0) / 2 + 3);
  /* droplets thrown out, at where they come down */
  (lq.drops || []).forEach(function (d) { var lit = playing && ts >= d.t; g.fillStyle = lit ? col.tracer : col.muted; g.fillRect(xc + d.pan * W * 0.4 - 1, y0 - 3, 2, 2); });
  var bub = lq.mode === 'drop' ? lq.bub : lq.cav;
  if (lq.mode === 'splash' && !lq.shallow) {
    var cav = Math.min(dpx - 4, lq.Lc / 1.5 * (H - y0));
    g.strokeStyle = col.muted; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(xc - rObj, y0); g.lineTo(xc - rObj * 0.3, y0 + cav); g.lineTo(xc + rObj * 0.3, y0 + cav); g.lineTo(xc + rObj, y0); g.stroke(); g.setLineDash([]);
  }
  if (bub) {
    var by = lq.mode === 'drop' ? y0 + Math.min(dpx - 6, 8) : y0 + Math.min(dpx - 6, lq.Lc / 1.5 * (H - y0)), br = Math.max(3, Math.min(20, bub.a * (lq.mode === 'drop' ? 3000 : 300)));
    var ring = playing && ts >= bub.t && ts < bub.t + 0.2;
    g.strokeStyle = col.shock; g.lineWidth = ring ? 2.5 : 1.5; g.beginPath(); g.arc(xc, by, br, 0, Math.PI * 2); g.stroke(); g.lineWidth = 1;
    g.fillStyle = col.shock; g.textAlign = 'left'; g.fillText(fHz(bub.f), xc + br + 6, by + 3);
  }
  caption(g, W, lq.mode === 'drop' ? (bub ? 'traps a bubble, ' + fHz(bub.f) : lq.shallow ? 'too shallow to trap a bubble' : 'no bubble this take, chance ' + fPct(lq.chance)) :
    lq.shallow ? 'hits the bottom' : 'cavity closes at ' + fTime(lq.tp), lq.drops && lq.drops.length ? lq.drops.length + ' droplets' : '');
}
function fJ(v) { return v < 1 ? (v * 1000).toFixed(v < 0.01 ? 1 : 0) + ' mJ' : fEnergy(v); }
var STOP_NAMES = { hard: 'hard stop', rubber: 'rubber seal', damped: 'damper' };
function mechReadouts(mc, p, peak) {
  var deg = mc.type === 'hinge' || mc.type === 'rotate', drive = mc.type === 'switch' ? 'snaps over centre' : mc.drive === 'electric' ? 'gears ' + fHz(mc.tone) + ', slots ' + fHz(12 * mc.fMotor) :
    mc.drive === 'hydraulic' ? 'pump ' + fHz(mc.tone) + ', relief at the end' : mc.drive === 'pneumatic' ? 'hiss, vents after the stop' : 'by hand';
  return [['Travel', (mc.type === 'slide' ? fLen(mc.S) : mc.type === 'switch' ? fLen(mc.S) : p.mcAngle.toFixed(0) + '°') + ' in ' + fTime(mc.T)],
    ['Top speed', fSpd(mc.vmax) + (deg ? ', ' + (mc.vmax / (mc.type === 'rotate' ? mc.Rr : mc.L) * 180 / Math.PI).toFixed(0) + '°/s' : '')],
    ['Drive', drive], ['Peak power', fPower(mc.Pk)],
    ['Into the stop', mc.type === 'switch' ? 'two clicks' : fJ(mc.Eend) + ', ' + STOP_NAMES[p.mcStop] + (mc.creak ? '; creaks ' + fHz(mc.creak) : '')], ['Peak at the ear', peak]];
}
function sceneMech(g, W, H, tw) {
  var mc = an.mc, mL = 16, mR = 16, mT = 24, mB = 22, pw = W - mL - mR, ph = H - mT - mB, tmax = mc.type === 'switch' ? mc.tEnd + 0.05 : mc.dur, i, ts = tw - srcDelay();
  function X(t) { return mL + t / tmax * pw; } function Y(v) { return mT + (1 - v / mc.vmax * 0.85) * ph; }
  g.font = '10px ' + col.mono; g.lineWidth = 1;
  rangeTicks(g, X, tmax, W, H, mL, mR, 's');
  g.fillStyle = col.line; g.globalAlpha = 0.5; g.beginPath(); g.moveTo(X(mc.t0), Y(0));
  for (i = 0; i < mc.n; i++) g.lineTo(X(mc.t0 + i / (mc.n - 1) * mc.T), Y(mc.vel[i]));
  g.lineTo(X(mc.tEnd), Y(0)); g.closePath(); g.fill(); g.globalAlpha = 1;
  g.strokeStyle = col.tracer; g.lineWidth = 2; g.beginPath();
  for (i = 0; i < mc.n; i++) { var x = X(mc.t0 + i / (mc.n - 1) * mc.T), y = Y(mc.vel[i]); if (i) g.lineTo(x, y); else g.moveTo(x, y); }
  g.stroke(); g.lineWidth = 1;
  /* what sounds when */
  var marks = [[mc.t0, mc.type === 'switch' ? 'detent' : mc.drive === 'manual' ? 'moves' : 'drive on']];
  if (mc.type !== 'switch') marks.push([mc.tEnd, mc.close ? 'stop' : 'end stop']); else marks.push([mc.tEnd, 'snap']);
  if (mc.close && mc.latch === 'latch') marks.push([mc.tEnd + 0.015, 'latch']);
  if (mc.latch === 'bolt') marks.push([mc.close ? mc.tEnd + 0.49 : mc.t0 - 0.26, 'bolt']);
  if (mc.drive === 'pneumatic') marks.push([mc.tEnd + 0.12, 'vent']);
  if (mc.drive === 'hydraulic') marks.push([mc.t0 - 0.3, 'pump']);
  marks.forEach(function (m, k) {
    var x = Math.round(X(m[0])) + 0.5;
    g.strokeStyle = col.shock; g.setLineDash([2, 3]); g.beginPath(); g.moveTo(x, mT + 12 * (k % 2)); g.lineTo(x, H - mB); g.stroke(); g.setLineDash([]);
    g.fillStyle = col.shock; g.textAlign = x > W - 60 ? 'right' : 'left'; g.fillText(m[1], x + (x > W - 60 ? -3 : 3), mT + 8 + 12 * (k % 2));
  });
  if (playing && ts >= 0 && ts <= tmax) { g.fillStyle = col.ink; g.fillRect(X(ts), mT, 1.5, ph); }
  caption(g, W, 'top speed ' + fSpd(mc.vmax), mc.type === 'switch' ? '' : 'into the stop ' + fJ(mc.Eend));
}
function sceneBlaster(g, W, H, tw) { (an.wp.bo.type !== 'none' ? sceneWeapon : sceneSweeps)(g, W, H, tw); }
function sceneField(g, W, H, tw) {
  var ff = an.ff, mL = 16, mR = 16, mT = 26, mB = 22, pw = W - mL - mR, ph = H - mT - mB, mx = 0;
  function X(f) { return mL + Math.log(f / 20) / Math.log(500) * pw; }
  ff.modes.forEach(function (m) { if (m.a > mx) mx = m.a; });
  g.font = '10px ' + col.mono; g.fillStyle = col.muted; g.strokeStyle = col.line; g.lineWidth = 1; g.textAlign = 'center';
  g.beginPath(); g.moveTo(mL, H - mB + 0.5); g.lineTo(W - mR, H - mB + 0.5); g.stroke();
  [20, 100, 1000, 10000].forEach(function (f) { g.fillText(f >= 1000 ? f / 1000 + ' kHz' : f + ' Hz', Math.min(W - 22, Math.max(22, X(f))), H - 6); });
  var ts = tw - srcDelay(), flare = ff.mode === 'impact' && playing && ts > ff.tHit ? 1 + 0.6 * Math.exp(-(ts - ff.tHit) / 0.4) : 1;
  ff.modes.forEach(function (m, k) {
    var hgt = Math.max(3, Math.min(ph, (1 + Math.log10(m.a / mx) / 1.5) * ph * 0.85 * flare)), x = Math.round(X(m.f));
    g.fillStyle = [col.muted, col.tracer, col.shock, col.ink][m.fam]; g.globalAlpha = m.fam === 3 ? 0.55 : 1; g.fillRect(x - 1, H - mB - hgt, 2.5, hgt); g.globalAlpha = 1;
    /* the second generator sits just above each mode */
    if (ff.beat > 0.02) { g.globalAlpha = 0.45; g.fillRect(Math.round(X(m.f + Math.max(ff.beat * m.r, m.f * 0.012))) + 1.5, H - mB - hgt * 0.92, 1.5, hgt * 0.92); g.globalAlpha = 1; }
  });
  caption(g, W, ff.plasma ? 'slow ' + fHz(ff.f0 * ff.rs[0]) + ', shear ' + fHz(ff.f0 * ff.rs[1]) + ', fast ' + fHz(ff.f0 * ff.rs[2]) : ff.modes.length + ' modes from ' + fHz(ff.f0) + ' to ' + fHz(ff.top), ff.beat > 0.02 ? 'beat ' + fTime(1 / ff.beat) : '');
}
function drawScene(tw) {
  var f = fit($('scene')), g = f.g;
  g.fillStyle = col.well; g.fillRect(0, 0, f.W, f.H); g.textBaseline = 'alphabetic';
  (an.kind === 'explosion' ? sceneExplosion : an.kind === 'implosion' ? sceneImplosion : an.kind === 'destruction' ? sceneDestruction :
    an.kind === 'rotor' ? sceneRotor : an.kind === 'discharge' ? sceneDischarge : an.kind === 'blaster' ? sceneBlaster : an.kind === 'field' ? sceneField : an.kind === 'liquid' ? sceneLiquid : an.kind === 'mechanism' ? sceneMech : an.kind === 'recording' ? sceneRecording :
    !an.tr ? sceneSpectrum : sceneProjectile)(g, f.W, f.H, tw);
}
function columns(v, W) {
  var key = 'col' + st.which + W; if (cache[key]) return cache[key];
  var N = v.L.length, mn = new Float32Array(W), mx = new Float32Array(W), per = N / W;
  for (var x = 0; x < W; x++) {
    var a = Math.floor(x * per), b = Math.min(N, Math.max(a + 1, Math.floor((x + 1) * per))), lo = 0, hi = 0;
    for (var i = a; i < b; i++) { var s = (v.L[i] + v.R[i]) * 0.5; if (s < lo) lo = s; if (s > hi) hi = s; }
    mn[x] = lo; mx[x] = hi;
  }
  return (cache[key] = { mn: mn, mx: mx });
}
var EV_COL = { crack: 'shock', launch: 'tracer', impact: 'ink', pass: 'muted' };
function drawScope(tp) {
  var f = fit($('scope')), g = f.g, W = f.W, H = f.H, v = view();
  g.fillStyle = col.well; g.fillRect(0, 0, W, H);
  if (!v) return;
  var dur = v.L.length / FS, c = columns(v, Math.max(1, Math.floor(W))), mid = H / 2 + 5, amp = (H / 2 - 12) / 0.92, x;
  g.font = '10px ' + col.mono;
  var stp = niceStep(dur, W < 520 ? 3 : 6); g.fillStyle = col.muted; g.strokeStyle = col.line; g.lineWidth = 1; g.textAlign = 'left';
  for (var k = 1; k * stp < dur; k++) { x = Math.round(k * stp / dur * W) + 0.5; g.beginPath(); g.moveTo(x, H - 4); g.lineTo(x, H); g.stroke(); if (x < W - 30) g.fillText((k * stp).toFixed(stp < 1 ? 1 : 0) + ' s', x + 3, H - 2); }
  g.fillStyle = col.ink;
  for (x = 0; x < c.mn.length; x++) { var y0 = mid - c.mx[x] * amp, y1 = mid - c.mn[x] * amp; g.fillRect(x, y0, 1, Math.max(1, y1 - y0)); }
  /* physical events; repeats of a sequence get a short tick only */
  var lastX = -99, row = 0;
  v.events.forEach(function (e) {
    var ex = Math.round(e.t / dur * W) + 0.5; g.strokeStyle = col[EV_COL[e.k]]; g.fillStyle = col[EV_COL[e.k]];
    g.globalAlpha = e.label ? 0.9 : 0.5; g.beginPath(); g.moveTo(ex, e.label ? 12 : H - 14); g.lineTo(ex, H - 6); g.stroke(); g.globalAlpha = 1;
    if (!e.label) return;
    row = ex - lastX < 44 ? (row + 1) % 3 : 0; lastX = ex;
    g.textAlign = ex > W - 50 ? 'right' : 'left'; g.fillText(e.label, ex + (ex > W - 50 ? -3 : 3), 10 + row * 11);
  });
  if (tp != null) { x = tp / dur * W; g.fillStyle = col.tracer; g.fillRect(x, 0, 1.5, H); }
}
function specImage(v, W, H) {
  var cols = Math.min(480, Math.max(32, Math.floor(W))), rws = Math.max(16, Math.floor(H)), NF = 1024, N = v.L.length;
  var img = document.createElement('canvas'); img.width = cols; img.height = rws;
  var ig = img.getContext('2d'), id = ig.createImageData(cols, rws), mag = new Float32Array(cols * rws), mxv = 1e-12;
  var re = new Float64Array(NF), im = new Float64Array(NF), win = new Float64Array(NF), i, cx, r;
  for (i = 0; i < NF; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / NF);
  var bins = new Int32Array(rws + 1);
  for (r = 0; r <= rws; r++) bins[r] = Math.min(NF / 2 - 1, Math.max(1, Math.round(40 * Math.pow(20000 / 40, r / rws) / FS * NF)));
  for (cx = 0; cx < cols; cx++) {
    var s0 = Math.floor(cx / cols * N) - NF / 2;
    for (i = 0; i < NF; i++) { var j = s0 + i; re[i] = j >= 0 && j < N ? (v.L[j] + v.R[j]) * 0.5 * win[i] : 0; im[i] = 0; }
    B.fft(re, im);
    for (r = 0; r < rws; r++) {
      var m = 0; for (var b = bins[r]; b <= Math.max(bins[r], bins[r + 1] - 1); b++) { var pw = re[b] * re[b] + im[b] * im[b]; if (pw > m) m = pw; }
      mag[cx + (rws - 1 - r) * cols] = m; if (m > mxv) mxv = m;
    }
  }
  var stops = [rgb(col.well), rgb(col.shock), rgb(col.tracer), rgb(col.ink)];
  for (i = 0; i < mag.length; i++) {
    var u = Math.min(1, Math.max(0, (10 * Math.log10(mag[i] / mxv + 1e-12) + 78) / 78)) * 2.999, si = Math.floor(u), fr = u - si, A = stops[si], Z = stops[si + 1];
    id.data[i * 4] = A[0] + (Z[0] - A[0]) * fr; id.data[i * 4 + 1] = A[1] + (Z[1] - A[1]) * fr; id.data[i * 4 + 2] = A[2] + (Z[2] - A[2]) * fr; id.data[i * 4 + 3] = 255;
  }
  ig.putImageData(id, 0, 0);
  return img;
}
function drawSpec(tp) {
  var f = fit($('spec')), g = f.g, W = f.W, H = f.H, v = view();
  g.fillStyle = col.well; g.fillRect(0, 0, W, H);
  if (!v) return;
  if (!cache.specImg || cache.specKey !== st.which + W) { cache.specImg = specImage(v, W, H); cache.specKey = st.which + W; }
  g.imageSmoothingEnabled = true; g.drawImage(cache.specImg, 0, 0, W, H);
  g.font = '10px ' + col.mono; g.fillStyle = col.muted; g.textAlign = 'left';
  [100, 1000, 10000].forEach(function (fq) { var y = H - Math.log(fq / 40) / Math.log(500) * H; g.fillText(fq >= 1000 ? fq / 1000 + ' kHz' : fq + ' Hz', 4, y + 3); });
  if (tp != null) { g.fillStyle = col.tracer; g.fillRect(tp / (v.L.length / FS) * W, 0, 1.5, H); }
}
function drawAll(tp) {
  if (!an) return;
  drawScene(tp == null || reduceMotion ? restTime() : worldTime(tp));
  drawScope(tp); drawSpec(tp);
}
function readouts() {
  var p = st.p, items, fresh = result && result.id === jobId;
  var peak = !fresh ? 'pending' : (p.kind === 'implosion' && p.imMedium === 'water') ? fPress(result.raw.peakPa) : result.raw.spl.toFixed(0) + ' dB SPL';
  if (an.kind === 'explosion') {
    var ex = an.ex, b = ex.blast, pass = ex.frags.filter(function (f) { return f.an.passed; }), lead = 0;
    pass.forEach(function (f) { var t = f.an.crack ? f.an.crack.t : f.an.passT; if (ex.t - t > lead) lead = ex.t - t; });
    items = [['Scaled distance', b.Z.toFixed(1) + ' m/kg⅓'], ['Peak overpressure', fPress(b.peak)], ['Positive phase', fTime(b.td)],
      ['Blast arrives', fTime(ex.t)], ['Fragments', pass.length ? pass.length + ' pass, first ' + fTime(lead) + ' early' : 'none reach'],
      ['Peak at the ear', peak]];
  } else if (an.kind === 'implosion') {
    var im = an.im;
    items = [['Collapse time', fTime(im.tMin)], ['Smallest radius', (im.Rmin / im.R0 * 100).toFixed(0) + '% of start'], ['Energy', fEnergy(im.E)],
      ['Rebound period', im.period ? fTime(im.period) : 'no rebound'], ['Sound arrives', fTime(im.r / im.c)], ['Peak at the ear', peak]];
  } else if (an.kind === 'destruction') {
    var ds = an.ds;
    var mm = p.dsMat === 'measured' ? B.getModes(p.dsKnock) : null;
    items = [['Pieces', String(ds.n)], ['Largest piece', fMass(ds.big)], mm ? ['Measured', plural(mm.modes.length, 'mode') + ' from ' + fHz(mm.f1) + ', rings ' + fTime(mm.ring)] : ['Energy', fEnergy(ds.E)], ['Break-up', fTime(ds.Tfrac)],
      ['Last landing', fTime(ds.tEnd)], ['Peak at the ear', peak]];
  } else if (an.kind === 'rocket') {
    items = [['Exhaust', 'Mach ' + an.Mj.toFixed(1) + ' against still air'], ['Spectrum peak', fHz(an.fpk)],
      ['Acoustic power', fPower(an.Wa) + ', ' + (an.eta * 100).toFixed(2) + '% of jet power'],
      ['Push at ignition', (an.accel / 9.81).toFixed(an.accel < 98 ? 1 : 0) + ' g'],
      ['Top speed', an.tr ? fSpeed(an.tr.vmax) + (an.tr.vmax > C ? ', Mach ' + (an.tr.vmax / C).toFixed(2) : '') : 'held static'],
      ['Peak at the ear', peak]];
  } else if (an.kind === 'discharge') {
    var dc = an.dc;
    items = [['Energy per metre', fEnergy(dc.El) + '/m'], ['Shock radius', fLen(dc.Rc)], ['N-wave length', fTime(dc.Tn)], ['First arrival', fTime(dc.tC + dc.tFirst)],
      ['Spread of arrivals', fTime(dc.tLast - dc.tFirst)], ['Peak at the ear', peak]];
  } else if (an.kind === 'blaster') {
    var wp = an.wp, ln = wp.ln, bo = wp.bo, tg = wp.tg;
    items = [['Launcher', ln.type === 'line' ? 'sweep down to ' + fHz(ln.line.fLo) : ln.type === 'rail' ? 'rails ring from ' + fHz(ln.rail.f1) :
        ln.type === 'coil' ? ln.stages.length + ' stages in ' + fTime(ln.transit) : ln.type === 'gas' ? 'pipe ' + fHz(ln.pipe) + ', chamber ' + fHz(ln.helm) : 'none'],
      ['Bolt', bo.type === 'none' ? 'none' : bo.type === 'beam' ? (bo.pulses > 1 ? bo.pulses + ' pulses at ' + fHz(1 / bo.period) : 'single pulse') :
        bo.v > C * 1.01 ? 'Mach ' + (bo.v / C).toFixed(1) : fSpeed(bo.v) + ', subsonic'],
      ['Shock', bo.ch ? fLen(bo.ch.Rc) + ' core, ' + fTime(bo.ch.Tn) + ' N-wave' : bo.an && bo.an.crack ? fTime(bo.an.crack.dur) + ' N-wave' : 'none reaches you'],
      ['Impact', tg ? fEnergy(tg.E) + ' at ' + fTime(tg.hits[0].te + tg.rT / C) : p.tgMat !== 'none' && bo.type === 'slug' ? 'stops short' : 'no target'],
      ['Bending waves', tg && tg.plate ? fSpeed(tg.plate.cb1k) + ' at 1 kHz' : tg ? (tg.mat === 'water' ? 'splash, bubbles' : 'no dispersion') : 'n/a'],
      ['Peak at the ear', peak]];
  } else if (an.kind === 'field') {
    var ff = an.ff;
    items = ff.plasma ? [['Alfv\u00e9n speed', (ff.vA / 1000).toFixed(0) + ' km/s'], ['Shear tone', fHz(ff.f0 * ff.rs[1])],
      ['Fast, slow tones', fHz(ff.f0 * ff.rs[2]) + ', ' + fHz(ff.f0 * ff.rs[0])], ['Slowed down', Math.round(ff.fReal / ff.f0).toLocaleString('en-US') + ' times'],
      ['Crash period', ff.sawT ? fTime(ff.sawT) : 'steady'], ['Level', 'relative only']] :
      [['Fundamental', fHz(ff.f0)], ['Modes', ff.modes.length + ', top ' + fHz(ff.top)], ['Beat period', ff.beat > 0.02 ? fTime(1 / ff.beat) : 'no beat'],
      ['Corona pulse', fHz(2 * ff.f0)], ['Length', ff.mode === 'hum' ? 'loop' : fTime(ff.dur)], ['Level', 'relative only']];
  } else if (an.kind === 'liquid') {
    items = liquidReadouts(an.lq, p, peak);
  } else if (an.kind === 'mechanism') {
    items = mechReadouts(an.mc, p, peak);
  } else if (an.kind === 'recording') {
    var rc = an.rc, bodyName = BODY_NAMES[rc.body];
    items = [['Recording', rc.src ? rc.name + ', ' + fTime(rc.len) + (rc.len >= B.REC_MAX_S - 0.01 ? ', the first 15 s' : '') : 'none loaded'],
      ['Placement', rc.fly ? fSpeed(rc.v) + ', ' + fDist(p.miss) + ' off, ' + fDist(p.rcHeight) + ' up' : 'at ' + fDist(rc.r)],
      ['Doppler', rc.fly ? 'falls ' + rc.semis.toFixed(1) + ' semitones' : 'none, it stands still'],
      ['Ground notch', rc.notch ? fHz(rc.notch) + (rc.fly ? ' when closest' : '') : 'none'],
      ['Body', rc.body === 'ir' ? (rc.irName ? rc.irName + ', ' + fTime(rc.irLen) : 'load an IR') : bodyName + (rc.cb1k ? ', ' + fSpeed(rc.cb1k) + ' at 1 kHz' : rc.f1 ? ', lowest mode ' + fHz(rc.f1) : rc.tSweep ? ', highs lead by ' + fTime(rc.tSweep) : '')],
      ['Level', 'relative only']];
  } else if (an.kind === 'rotor') {
    var rt = an.rt;
    items = [['Hover speed', (rt.n0 * 60).toFixed(0) + ' rev/min'], ['Blade-pass tone', fHz(rt.bpf)], ['Tip speed', fSpeed(rt.vtip) + ', Mach ' + rt.Mt.toFixed(2)],
      ['Disk loading', (rt.load / 9.81).toFixed(1) + ' kg/m\u00b2'], ['Shaft power', fPower(rt.Pm)], ['Peak at the ear', peak]];
  } else {
    var c = an.crack, hasLaunch = p.launch !== 'none';
    items = [
      ['Speed at listener', an.passed ? 'Mach ' + an.mach.toFixed(2) : 'stops short'],
      ['Shock wave', c ? (c.dur < 1e-3 ? (c.dur * 1e6).toFixed(0) + ' µs' : (c.dur * 1e3).toFixed(1) + ' ms') + ' N-wave' : an.mach > 1.01 ? 'misses the listener' : 'none, subsonic'],
      ['Crack to thump', c && hasLaunch ? ((an.launchT - c.t) * 1000).toFixed(0) + ' ms' : 'n/a'],
      ['Wake tone', fHz(an.strouhal)],
      ['Impact', an.hit ? fEnergy(an.hit.E) + ' at ' + an.hit.tau.toFixed(2) + ' s' + (an.pay ? ', ' + fPress(an.pay.blast.peak) + ' blast' : '') : 'no target'],
      ['Peak at the ear', peak]];
  }
  var host = $('readouts'); host.textContent = '';
  items.forEach(function (it) { var d = el('div'); d.appendChild(el('dt', null, it[0])); d.appendChild(el('dd', null, it[1])); host.appendChild(d); });
}

/* ---------- boot ---------- */
/* ---------- your sounds: loaded or recorded, used wherever a sound is asked for ---------- */
/* Every sound goes into one list. A slot (the recording, a body, a room, the hits, a knock, grains, a reference) is a
   menu of these plus the built-in examples, with Load and Record next to it. Sounds last until the page reloads. */
var LIB = [], assetSeq = 0, SLOT_LABEL = { take: 'sound', lib: 'sound', rcAsset: 'recording', rcIr: 'knock', irAsset: 'room', seqAsset: 'hits', dsKnock: 'knock', grAsset: 'grains', ref: 'reference' };
var SOUND_DEFAULT = { rcAsset: 'ex:engine', rcIr: 'ex:knock', irAsset: 'ex:stair', seqAsset: 'ex:door', dsKnock: 'ex:knock', grAsset: 'ex:gravel' };
function fillSounds(sel, withNone) {
  var v = sel.value, g1 = el('optgroup'), g2 = el('optgroup');
  sel.textContent = '';
  if (withNone) { var o0 = el('option', null, 'None'); o0.value = ''; sel.appendChild(o0); }
  g1.label = 'Your sounds'; g2.label = 'Examples';
  LIB.forEach(function (s) { var o = el('option', null, s.name + ', ' + fTime(s.dur)); o.value = s.id; g1.appendChild(o); });
  Object.keys(B.EXAMPLES).forEach(function (k) { var o = el('option', null, B.EXAMPLES[k].name.replace(/^Example: /, '')); o.value = k; g2.appendChild(o); });
  if (LIB.length) sel.appendChild(g1);
  sel.appendChild(g2);
  sel.value = v;
}
function refreshSoundSelects() { SPEC.forEach(function (s) { if (s.sound) fillSounds($('c-' + s.id), s.obj === 'r'); }); }
function uniqueName(name, self) {
  var n = name, k = 2;
  while (LIB.some(function (s) { return s.name === n && s.id !== self; })) n = name + ' ' + (k++);
  return n;
}
function addSound(name, L, R, slot, meta) {
  var id = 'rec:' + (++assetSeq), nm = uniqueName(name);
  B.setAsset(id, { name: nm, L: L, R: R });
  var a = B.getAsset(id), s = { id: id, seq: Date.now() * 1000 + assetSeq % 1000, name: nm, dur: a.L.length / FS, meta: meta || baseMeta({ origin: 'made', date: isoLocal(new Date()) }) };
  LIB.push(s);
  if (worker) worker.postMessage({ asset: true, id: id, name: nm, L: a.L, R: a.R });
  keepSound(s);
  refreshSoundSelects(); renderLibrary(); renderRV();
  useSound(slot, id);
  return { id: id, name: nm, dur: s.dur, cut: L.length > a.L.length };
}
/* choosing a sound for a slot also switches on what uses it */
function useSound(slot, id) {
  if (slot === 'lib' || slot === 'take') return;
  if (slot === 'ref') { st.r.ref = id; syncControls(); refChanged(); return; }
  var p = st.p;
  p[slot] = id;
  if (slot === 'rcIr') p.rcBody = 'ir';
  else if (slot === 'irAsset') p.env = 'ir';
  else if (slot === 'dsKnock') p.dsMat = 'measured';
  else if (slot === 'seqAsset') p.seqFrom = 'rec';
  else if (slot === 'grAsset') { if (p.kind === 'explosion') p.exSurface = 'rec'; else p.dsDebris = 'rec'; }
  st.sp = ''; syncControls(); rerender(true);
}
function fileInput(onFile, many) {
  var inp = el('input'); inp.type = 'file'; inp.hidden = true; inp.multiple = !!many;
  inp.accept = 'audio/*,.wav,.wave,.aif,.aiff,.flac,.mp3,.ogg,.m4a,.aac,.caf,.webm,.opus';
  inp.addEventListener('change', function () { Array.prototype.forEach.call(inp.files || [], function (f) { onFile(f); }); inp.value = ''; });
  return inp;
}
function toolButton(id, text, title, onClick) { var b = el('button', 'btn small', text); b.type = 'button'; b.id = id; b.title = title; b.addEventListener('click', onClick); return b; }
function soundTools(slot) {
  return function () {
    var box = el('div', 'toolrow'), inp = fileInput(function (f) { loadSound(f, slot); });
    box.appendChild(toolButton('load-' + slot, 'Load a file', 'WAV, AIFF, FLAC, MP3, M4A or OGG; the first 15 s are used', function () { inp.click(); }));
    box.appendChild(toolButton('rec-' + slot, 'Record', 'Record with the microphone, processing off. It starts when the sound starts.', function () { toggleRecord(slot); }));
    box.appendChild(inp);
    return box;
  };
}
function saveBodyRow() { var box = el('div', 'toolrow'); box.appendChild(toolButton('save-body-ir', 'Save body IR', 'The body as a 32-bit float impulse response, for any convolution reverb', saveBodyIR)); return box; }
function saveRoomRow() { var box = el('div', 'toolrow'); box.appendChild(toolButton('save-room-ir', 'Save room IR', 'The environment\'s reverb as a 32-bit float impulse response', saveRoomIR)); return box; }
function toolStates() {
  if (!$('save-room-ir')) return;
  $('save-room-ir').disabled = !(B.ENVS[st.p.env] && B.ENVS[st.p.env].rt60);
  $('save-body-ir').disabled = st.p.rcBody === 'none' || st.p.rcBody === 'ir';
  hitNote();
}
/* the browser decodes the file and resamples it to the engine's 48 kHz */
function decodeAudio(file) {
  return file.arrayBuffer().then(function (buf) {
    var Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    return new Ctx(2, 1, FS).decodeAudioData(buf);
  }).then(function (ab) {
    var L = new Float32Array(ab.getChannelData(0));
    return { L: L, R: ab.numberOfChannels > 1 ? new Float32Array(ab.getChannelData(1)) : L.slice(), dur: ab.duration };
  });
}
function loadSound(file, slot) {
  setStatus('Reading ' + file.name);
  decodeAudio(file).then(function (a) {
    var s = addSound(file.name.replace(/\.[^.]+$/, ''), a.L, a.R, slot,
      baseMeta({ origin: 'file', file: file.name, date: isoLocal(new Date(file.lastModified || Date.now())), loaded: isoLocal(new Date()) }));
    if (s.cut) setStatus('Loaded ' + s.name + ': the first ' + B.REC_MAX_S + ' s are used.');
    else if (slot === 'ref') setStatus('Loaded ' + s.name + ' as the reference.');
    else if (slot === 'lib') setStatus('Loaded ' + s.name + '.');
  }).catch(function () { setStatus('Could not read ' + file.name + ' as audio. Try WAV, AIFF, FLAC, MP3, M4A or OGG.'); });
}
function hitNote() {
  var n = $('hitNote');
  if (!n || rows.seqHits.row.hidden) return;
  var h = B.getHits(st.p.seqAsset, st.p.seqSens) || [];
  n.textContent = !h.length ? 'No hits found. Raise the sensitivity, or record sharper sounds.' :
    plural(h.length, 'hit') + ' found' + (h.length > B.MAX_TRIGGERS ? '; the first ' + B.MAX_TRIGGERS + ' are used' : '') + '. Each starts one event.';
}
function hitRow() { var p = el('p', 'note'); p.id = 'hitNote'; return p; }

/* ---------- your sounds: kept on this device, saved and sent with what is known about them ----------
   Each sound keeps its metadata: when it was made, how (recorded, with which input and browser, or loaded from which
   file), and the project, tags and notes. The project, tags and recordist set under Your sounds go with every new
   sound and every saved render. Sounds are kept in this browser (IndexedDB) until removed; saving writes them as WAV
   with bext, iXML and XMP, and a zip adds .xmp sidecars, which Kurator, Lightroom and digiKam read as keywords. */
var SESSION = { project: '', tags: '', recordist: '' }, ENV = { browser: '', model: '' };
function loadSession() {
  try { var s = JSON.parse(localStorage.getItem('bfx-session') || '{}'); ['project', 'tags', 'recordist'].forEach(function (k) { if (typeof s[k] === 'string') SESSION[k] = s[k]; }); } catch (e) { /* storage may be off */ }
}
function saveSession() { try { localStorage.setItem('bfx-session', JSON.stringify(SESSION)); } catch (e) { /* storage may be off */ } }
function tagList(s) { return String(s || '').split(/[,;]+/).map(function (t) { return t.trim(); }).filter(Boolean); }
function browserInfo() {
  var ua = navigator.userAgent, m, b = 'Browser', os = '';
  if ((m = /Edg\/(\d+)/.exec(ua))) b = 'Edge ' + m[1];
  else if ((m = /(?:Firefox|FxiOS)\/(\d+)/.exec(ua))) b = 'Firefox ' + m[1];
  else if ((m = /(?:Chrome|CriOS)\/(\d+)/.exec(ua))) b = 'Chrome ' + m[1];
  else if ((m = /Version\/(\d+)[\d.]* .*Safari/.exec(ua))) b = 'Safari ' + m[1];
  if (/iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) os = 'iPadOS';
  else if ((m = /(?:iPhone|iPod).*? OS (\d+)/.exec(ua))) os = 'iOS ' + m[1];
  else if ((m = /Android (\d+)/.exec(ua))) os = 'Android ' + m[1];
  else if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Linux/.test(ua)) os = 'Linux';
  return b + (os ? ' on ' + os : '');
}
function deviceInfo() {
  ENV.browser = browserInfo();
  /* Chrome tells the phone's model when asked; other browsers keep it to themselves */
  try { if (navigator.userAgentData && navigator.userAgentData.getHighEntropyValues) navigator.userAgentData.getHighEntropyValues(['model']).then(function (v) { ENV.model = (v && v.model) || ''; }).catch(function () {}); } catch (e) { /* not offered */ }
}
function pad2(n) { return (n < 10 ? '0' : '') + n; }
/* local time with its offset, e.g. 2026-11-15T17:59:03+01:00 */
function isoLocal(d) {
  var o = -d.getTimezoneOffset(), s = o >= 0 ? '+' : '-', a = Math.abs(o);
  return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()) + 'T' + pad2(d.getHours()) + ':' + pad2(d.getMinutes()) + ':' + pad2(d.getSeconds()) + s + pad2(Math.floor(a / 60)) + ':' + pad2(a % 60);
}
function timeZone() { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { return ''; } }
function niceDate(iso) {
  var m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso || '');
  return m ? +m[3] + ' ' + ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][+m[2] - 1] + ' ' + m[1] + ', ' + m[4] + ':' + m[5] : '';
}
function baseMeta(extra) {
  var m = { project: SESSION.project.trim(), tags: tagList(SESSION.tags), recordist: SESSION.recordist.trim(), notes: '', tz: timeZone(), browser: ENV.browser, model: ENV.model };
  for (var k in extra) m[k] = extra[k];
  return m;
}
/* what goes into the file: see wavFile in the engine */
function fileMeta(s) {
  var m = s.meta || {}, rec = m.origin === 'recorded';
  return { title: s.name, note: m.notes, project: m.project, scene: s.name, take: m.take, tags: m.tags, source: 'Ballistic Foley Lab',
    creator: m.recordist, date: m.date, reference: m.reference, location: m.location || null,
    origin: rec ? 'Recorded with Ballistic Foley Lab' + (m.device ? ', ' + m.device : '') : m.origin === 'file' ? 'Loaded into Ballistic Foley Lab from ' + m.file : 'Ballistic Foley Lab',
    user: [['Made', rec ? 'recorded' : m.origin === 'file' ? 'loaded from ' + m.file : m.origin], ['Input', m.device], ['Phone or computer', m.model], ['Browser', m.browser],
      ['Recorded at', m.rate ? m.rate + ' Hz, ' + plural(m.channels || 1, 'channel') + (m.rate !== FS ? ', resampled to ' + FS + ' Hz' : '') : ''],
      ['Voice processing', m.processing], ['Time zone', m.tz], ['Location accuracy', m.location ? Math.round(m.location.acc || 0) + ' m' : ''],
      ['Plan', m.plan ? m.plan.name + (m.shot ? ', shot ' + m.shot.name : '') : ''], ['Parameters', m.params]] };
}
function safeName(s) { return String(s || 'sound').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 100) || 'sound'; }

/* ---------- keeping sounds in the browser (IndexedDB) ---------- */
var IDB = null;
function idb() {
  if (IDB) return IDB;
  IDB = new Promise(function (res) {
    try {
      var rq = indexedDB.open('ballistic-foley-lab', 1);
      rq.onupgradeneeded = function () { rq.result.createObjectStore('sounds', { keyPath: 'id' }); };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = rq.onblocked = function () { res(null); };
    } catch (e) { res(null); }
  });
  return IDB;
}
function idbDo(mode, fn) {
  return idb().then(function (d) {
    if (!d) return null;
    return new Promise(function (res) {
      try {
        var tx = d.transaction('sounds', mode), out = fn(tx.objectStore('sounds'));
        tx.oncomplete = function () { res(out && 'result' in out ? out.result : true); };
        tx.onerror = tx.onabort = function () { res(null); };
      } catch (e) { res(null); }
    });
  });
}
function keepSound(s) {
  var a = B.getAsset(s.id);
  return idbDo('readwrite', function (os) { return os.put({ id: s.id, seq: s.seq, name: s.name, meta: s.meta, L: a.L, R: a.R }); })
    .then(function (ok) { if (!ok) setStatus('Could not keep ' + s.name + ' in this browser (storage full or off). Save it to a file to keep it.'); });
}
function forgetSound(id) { return idbDo('readwrite', function (os) { return os.delete(id); }); }
function restoreSounds() {
  return idbDo('readonly', function (os) { return os.getAll(); }).then(function (list) {
    (list || []).sort(function (a, b) { return a.seq - b.seq; }).forEach(function (r) {
      if (!r || !r.L || B.getAsset(r.id)) return;
      B.setAsset(r.id, { name: r.name, L: r.L, R: r.R });
      LIB.push({ id: r.id, seq: r.seq, name: r.name, dur: r.L.length / FS, meta: r.meta || {} });
      var n = +String(r.id).split(':')[1];
      if (n > assetSeq) assetSeq = n;
      if (worker) worker.postMessage({ asset: true, id: r.id, name: r.name, L: r.L, R: r.R });
    });
  });
}

/* ---------- the list ---------- */
function libTools() {
  var box = el('div', 'toolrow'), inp = fileInput(function (f) { loadSound(f, 'lib'); }, true);
  box.appendChild(toolButton('load-lib', 'Load files', 'WAV, AIFF, FLAC, MP3, M4A or OGG; the first 15 s of each are used', function () { inp.click(); }));
  box.appendChild(toolButton('rec-lib', 'Record', 'Record with the microphone, processing off. It starts when the sound starts; press Stop when done.', function () { toggleRecord('lib'); }));
  box.appendChild(inp);
  return box;
}
function textRow(id, label, hint, place) {
  var row = el('div', 'row'), lab = el('label'), nm = el('span', 'nm', label), inp = el('input');
  inp.type = 'text'; inp.id = id; inp.placeholder = place || ''; inp.autocomplete = 'off';
  lab.setAttribute('for', id); if (hint) nm.appendChild(el('span', 'hint', hint)); lab.appendChild(nm);
  row.appendChild(lab); row.appendChild(inp);
  return row;
}
function sessionRows() {
  var box = el('div', 'sessrows');
  box.appendChild(textRow('sess-project', 'Project', 'goes with new sounds', 'Forest walk'));
  box.appendChild(textRow('sess-tags', 'Tags', 'commas; / for levels', 'Nature/Birds, Dawn'));
  box.appendChild(textRow('sess-recordist', 'Recordist', 'the author', 'Your name'));
  [['sess-project', 'project'], ['sess-tags', 'tags'], ['sess-recordist', 'recordist']].forEach(function (f) {
    var inp = box.querySelector('#' + f[0]);
    inp.value = SESSION[f[1]];
    inp.addEventListener('input', function () { SESSION[f[1]] = inp.value; saveSession(); });
  });
  return box;
}
function libListRow() { var d = el('div', 'liblist'); d.id = 'libList'; return d; }
function libAllRow() {
  var box = el('div', 'toolrow');
  box.appendChild(toolButton('lib-save-all', 'Save all', 'Every sound as WAV in one zip, with .xmp sidecars for Kurator, Lightroom and digiKam', saveAllSounds));
  box.appendChild(toolButton('lib-send-all', 'Send all to SFX Workbench', 'Every sound as 32-bit float WAV, into the workbench library', function () { sendSounds(LIB.slice()); }));
  box.appendChild(toolButton('lib-kur-all', 'Send all to Kurator', 'Kurator on this computer: every sound into its library with its tags; sounds sent before are not added twice', sendAllToKurator));
  return box;
}
function soundLine(s) {
  var m = s.meta || {}, how = m.origin === 'recorded' ? 'Recorded' : m.origin === 'file' ? 'Loaded from ' + m.file + ', dated' : 'Made';
  return [how + ' ' + niceDate(m.date), m.origin === 'recorded' ? [m.device, m.model, m.browser].filter(Boolean).join(', ') : ''].filter(Boolean).join(' · ');
}
function tagLine(s) { var m = s.meta || {}; return [m.project ? 'Project: ' + m.project : '', (m.tags || []).join(', '), m.notes].filter(Boolean).join(' · '); }
function renderLibrary() {
  var list = $('libList'); if (!list) return;
  list.textContent = '';
  if (!LIB.length) list.appendChild(el('p', 'note', 'No sounds yet. Record or load one here or wherever a sound is asked for.'));
  LIB.forEach(function (s) {
    var card = el('div', 'snd'), head = el('div', 'snd-head'), info = el('p', 'snd-info', soundLine(s)), tl = tagLine(s), tools = el('div', 'toolrow');
    head.appendChild(el('span', 'snd-name', s.name)); head.appendChild(el('span', 'snd-dur', fTime(s.dur)));
    card.appendChild(head); card.appendChild(info);
    if (tl) card.appendChild(el('p', 'snd-tags', tl));
    tools.appendChild(toolButton('', 'Play', 'Play this sound as it is', function () { audition(s.id); }));
    tools.appendChild(toolButton('', 'Save WAV', '24-bit, 48 kHz, with its date, project, tags and notes inside', function () { saveSound(s); }));
    if (WB.url) tools.appendChild(toolButton('', 'Send', 'To SFX Workbench, as 32-bit float WAV', function () { sendSounds([s]); }));
    var ed = toolButton('', 'Edit', 'Name, project, tags and notes', function () { form.hidden = !form.hidden; ed.setAttribute('aria-expanded', String(!form.hidden)); });
    ed.setAttribute('aria-expanded', 'false');
    tools.appendChild(ed);
    var rm = toolButton('', 'Remove', 'Take it out of this browser. Save it first to keep it.', function () {
      if (rm.dataset.sure) { removeSound(s.id); return; }
      rm.dataset.sure = '1'; rm.textContent = 'Remove for good'; rm.classList.add('live');
      setTimeout(function () { if (rm.isConnected) { delete rm.dataset.sure; rm.textContent = 'Remove'; rm.classList.remove('live'); } }, 4000);
    });
    tools.appendChild(rm);
    card.appendChild(tools);
    var form = el('div', 'snd-edit'), k = s.id.replace(/\W/g, '');
    form.hidden = true;
    [['name', 'Name', s.name], ['project', 'Project', (s.meta || {}).project || ''], ['tags', 'Tags', ((s.meta || {}).tags || []).join(', ')], ['notes', 'Notes', (s.meta || {}).notes || '']].forEach(function (f) {
      var r = textRow('e-' + k + '-' + f[0], f[1], f[0] === 'tags' ? 'commas; / for levels' : '', '');
      r.querySelector('input').value = f[2];
      form.appendChild(r);
    });
    var done = toolButton('', 'Done', 'Keep the changes', function () {
      var g = function (f) { return $('e-' + k + '-' + f).value.trim(); };
      s.name = uniqueName(g('name') || s.name, s.id); s.meta.project = g('project'); s.meta.tags = tagList(g('tags')); s.meta.notes = g('notes');
      var a = B.getAsset(s.id); if (a) a.name = s.name;
      keepSound(s); refreshSoundSelects(); renderLibrary(); readouts();
    });
    var row = el('div', 'toolrow'); row.appendChild(done); form.appendChild(row);
    card.appendChild(form);
    list.appendChild(card);
  });
  $('lib-save-all').disabled = !LIB.length; $('lib-send-all').disabled = !LIB.length;
  $('lib-send-all').hidden = !WB.url;
  $('lib-kur-all').disabled = !LIB.length; $('lib-kur-all').hidden = !kuratorHere();
}
function removeSound(id) {
  var i = LIB.findIndex(function (s) { return s.id === id; });
  if (i < 0) return;
  var s = LIB.splice(i, 1)[0];
  B.removeAsset(id); forgetSound(id);
  if (worker) worker.postMessage({ asset: true, remove: true, id: id });
  /* a slot that used it goes back to its example */
  var used = false;
  SOUND_KEYS.forEach(function (k) { if (st.p[k] === id) { st.p[k] = SOUND_DEFAULT[k]; used = true; } });
  if (st.r.ref === id) { st.r.ref = ''; refChanged(); }
  refreshSoundSelects(); renderLibrary(); syncControls();
  if (used) rerender(false);
  else setStatus('Removed ' + s.name + '.');
}
function audition(id) {
  var a = B.getAsset(id); if (!a) return;
  try {
    unlock(); stop();
    var ab = ctx.createBuffer(2, a.L.length, FS);
    ab.getChannelData(0).set(a.L); ab.getChannelData(1).set(a.R);
    node = ctx.createBufferSource(); node.buffer = ab; node.connect(ctx.destination); node.start();
  } catch (e) { setStatus('Audio could not start here.'); }
}
/* one channel when the sound has one: a mono microphone, or a file whose two channels are the same */
function sameChannels(a) { if (a.R === a.L) return true; for (var i = 0; i < a.L.length; i++) if (a.L[i] !== a.R[i]) return false; return true; }
function wavOf(s, float) {
  var a = B.getAsset(s.id), R = (s.meta && s.meta.channels === 1) || sameChannels(a) ? null : a.R;
  return float ? B.encodeWavFloat(a.L, R, fileMeta(s)) : B.encodeWav(a.L, R, fileMeta(s));
}
function saveSound(s) {
  var name = safeName(s.name);
  if (inViewer) { deliver(name + '.zip', B.zipFiles([{ name: name + '.wav', data: wavOf(s) }, { name: name + '.wav.xmp', data: utf8Bytes(B.xmpText(fileMeta(s))) }]), 'application/zip', 'WAV and .xmp sidecar'); return; }
  deliver(name + '.wav', wavOf(s), 'audio/wav', '24-bit, 48 kHz, with its metadata');
}
function saveAllSounds() {
  if (!LIB.length) return;
  deliver(sessionZipName(SESSION.project.trim()), sessionZip(LIB, null, libSession()), 'application/zip', plural(LIB.length, 'sound') + ' with .xmp sidecars and a list for Kurator');
}
/* Your sounds as one session of this browser, so Kurator adds only the new ones to its folder each time */
function libSession() {
  var id = '';
  try { id = localStorage.getItem('bfx-libid') || ''; } catch (e) { /* storage off */ }
  if (!/^sounds-[\w-]{4,40}$/.test(id)) {
    id = 'sounds-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    try { localStorage.setItem('bfx-libid', id); } catch (e) { /* one id for this visit */ }
  }
  return id;
}
function sendAllToKurator() {
  if (!LIB.length) return;
  sendToKurator(LIB.slice(), null, libSession(), sessionZipName(SESSION.project.trim()), 'sound');
}
function utf8Bytes(s) { return new TextEncoder().encode(s); }
function sendSounds(list, group) {
  if (!list.length || !WB.url) return;
  var files = list.map(function (s) { return { name: safeName(s.name) + '.wav', bytes: wavOf(s, true).buffer, role: 'mix' }; });
  postToWorkbench(files, list.length === 1 ? list[0].name : plural(list.length, 'sound'), 'sounds-', group);
}

/* ---------- recording with the microphone ----------
   Browser voice processing (echo cancellation, noise suppression, automatic gain) is asked off. Recording arms on
   Record and starts when the sound starts, with a short pre-roll, so the tap on the screen is not in it. Knocks,
   claps and rooms stop by themselves after 1.5 s of quiet; anything else stops on Stop or after 15 s. */
var REC_WORKLET = 'class BfxCapture extends AudioWorkletProcessor { constructor() { super(); this.buf = null; this.n = 0; }' +
  ' process(inputs) { var inp = inputs[0]; if (!inp || !inp.length) return true; var nc = inp.length, L = inp[0].length, c;' +
  ' if (!this.buf || this.buf.length !== nc) { this.buf = []; for (c = 0; c < nc; c++) this.buf.push(new Float32Array(2048)); this.n = 0; }' +
  ' if (this.n + L > 2048) { this.port.postMessage(this.buf.map(function (b) { return b.slice(0, this.n); }, this)); this.n = 0; }' +
  ' for (c = 0; c < nc; c++) this.buf[c].set(inp[c], this.n); this.n += L; return true; } }' +
  ' registerProcessor("bfx-capture", BfxCapture);';
var REC = { info: null, t0: null, state: 'off', slot: '', ctx: null, stream: null, node: null, sink: null, src: null, chunks: [], frames: 0, pre: [], preFrames: 0,
  noise: 0, level: 0, hold: 0, quiet: 0, raf: 0, count: 0, clipped: false, armUntil: 0 };
var AUTO_STOP = { rcIr: true, irAsset: true, dsKnock: true }, PREROLL = 0.15, QUIET_STOP = 1.5;
/* what the browser says it did to the input: processing it was asked to switch off */
function processingText(se) {
  var on = [['echoCancellation', 'echo cancellation'], ['noiseSuppression', 'noise suppression'], ['autoGainControl', 'automatic gain']].filter(function (k) { return se[k[0]] === true; }).map(function (k) { return k[1]; });
  var known = ['echoCancellation', 'noiseSuppression', 'autoGainControl'].some(function (k) { return typeof se[k] === 'boolean'; });
  return !known ? 'not reported by the browser' : on.length ? on.join(', ') + ' still on' : 'off';
}
function recBusy() { return REC.state !== 'off'; }
function recButtons() {
  Array.prototype.forEach.call(document.querySelectorAll('button[id^="rec-"]'), function (b) {
    var mine = recBusy() && REC.slot === b.id.slice(4);
    b.textContent = mine ? 'Stop' : 'Record';
    b.disabled = recBusy() && !mine;
    b.classList.toggle('live', mine);
  });
}
function recFail(text) { closeRec(); setStatus(text); }
function toggleRecord(slot) {
  if (recBusy()) { if (REC.slot === slot) endRecording(false); return; }
  if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setStatus('Recording needs the site (https) or a local server. Here, record with another app and load the file.'); return;
  }
  stop(); drawAll(null);
  var Ctx = window.AudioContext || window.webkitAudioContext, c;
  /* the capture context is made inside the tap, so that mobile browsers let it run */
  try { c = new Ctx(); if (c.resume) c.resume(); } catch (e) { setStatus('Audio input could not start in this browser.'); return; }
  REC.state = 'opening'; REC.slot = slot; REC.ctx = c; recButtons();
  AUTO_STOP.take = RV.auto;
  REC.locP = wantLocation();
  setStatus('Asking for the microphone');
  navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false, channelCount: { ideal: 2 } } })
    .then(function (stream) {
      REC.stream = stream;
      var tr = stream.getAudioTracks()[0], se = tr && tr.getSettings ? tr.getSettings() : {};
      REC.info = { label: tr ? tr.label : '', settings: se };
      return openCapture();
    })
    .then(function () {
      REC.state = 'armed'; REC.chunks = []; REC.frames = 0; REC.pre = []; REC.preFrames = 0; REC.noise = 0; REC.quiet = 0; REC.clipped = false;
      REC.armUntil = REC.ctx.currentTime + 0.35; recButtons(); recMeter();
    })
    .catch(function (e) {
      var n = e && e.name;
      recFail(n === 'NotAllowedError' || n === 'SecurityError' ? 'The microphone is blocked here. Allow it for this site in the browser settings, or record with another app and load the file.'
        : n === 'NotFoundError' ? 'No microphone was found.' : 'The microphone could not start: ' + ((e && e.message) || n || 'unknown error') + '.');
    });
}
function openCapture() {
  var c = REC.ctx;
  REC.src = c.createMediaStreamSource(REC.stream);
  REC.sink = c.createGain(); REC.sink.gain.value = 0; REC.sink.connect(c.destination);
  function processor() {
    REC.node = c.createScriptProcessor(4096, 2, 1);
    REC.node.onaudioprocess = function (e) { var b = e.inputBuffer, chs = []; for (var k = 0; k < b.numberOfChannels; k++) chs.push(b.getChannelData(k).slice()); onChunk(chs); };
    REC.src.connect(REC.node); REC.node.connect(REC.sink);
  }
  if (!c.audioWorklet || !window.AudioWorkletNode) { processor(); return Promise.resolve(); }
  var url = URL.createObjectURL(new Blob([REC_WORKLET], { type: 'text/javascript' }));
  /* a worklet from a blob fails on file:// pages and in some frames: then the older processor node does the same job */
  return c.audioWorklet.addModule(url).then(function () {
    REC.node = new AudioWorkletNode(c, 'bfx-capture', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    REC.node.port.onmessage = function (e) { onChunk(e.data); };
    REC.src.connect(REC.node); REC.node.connect(REC.sink);
  }).catch(processor).then(function () { URL.revokeObjectURL(url); });
}
function onChunk(chs) {
  if (!REC.ctx || !chs.length || !chs[0].length) return;
  var pk = 0, i, k, L = chs[0].length, sr = REC.ctx.sampleRate;
  for (k = 0; k < chs.length; k++) for (i = 0; i < L; i++) { var v = Math.abs(chs[k][i]); if (v > pk) pk = v; }
  REC.level = Math.max(REC.level, pk);
  var thr = Math.max(Math.pow(10, -42 / 20), REC.noise * 4);
  if (REC.state === 'armed') {
    if (REC.ctx.currentTime < REC.armUntil) { REC.noise = Math.max(REC.noise, pk); return; }
    REC.pre.push(chs); REC.preFrames += L;
    while (REC.pre.length > 1 && REC.preFrames - REC.pre[0][0].length > PREROLL * sr) REC.preFrames -= REC.pre.shift()[0].length;
    if (pk >= thr) { REC.state = 'recording'; REC.t0 = new Date(Date.now() - REC.preFrames / sr * 1000); REC.chunks = REC.pre; REC.frames = REC.preFrames; REC.pre = []; REC.preFrames = 0; }
    return;
  }
  if (REC.state !== 'recording') return;
  REC.chunks.push(chs); REC.frames += L;
  if (pk >= 0.999) REC.clipped = true;
  if (AUTO_STOP[REC.slot]) {
    REC.quiet = pk < thr * 0.5 ? REC.quiet + L : 0;
    if (REC.quiet > QUIET_STOP * sr) { endRecording(true); return; }
  }
  if (REC.frames >= B.REC_MAX_S * sr) endRecording(false);
}
function recMeter() {
  cancelAnimationFrame(REC.raf);
  (function tick() {
    if (!REC.ctx || REC.state === 'off') return;
    REC.hold = Math.max(REC.level, REC.hold * 0.85); REC.level = 0;
    rvMeter(REC.hold);
    var db = 20 * Math.log10(Math.max(REC.hold, 1e-5)), lv = 'input ' + (db < -90 ? 'silent' : db.toFixed(0) + ' dB');
    if (REC.state === 'armed') setStatus(REC.ctx.currentTime < REC.armUntil ? 'Hold still, measuring the quiet' : 'Listening: make the ' + SLOT_LABEL[REC.slot] + ' sound now. ' + lv);
    else if (REC.state === 'recording') setStatus('Recording ' + (REC.frames / REC.ctx.sampleRate).toFixed(1) + ' s, ' + lv + (REC.clipped ? ', too loud: it clipped' : '') + (AUTO_STOP[REC.slot] ? '. Stops after the ring dies away.' : '. Press Stop when done.'));
    REC.raf = requestAnimationFrame(tick);
  })();
}
function closeRec() {
  cancelAnimationFrame(REC.raf); rvMeter(0);
  if (REC.stream) REC.stream.getTracks().forEach(function (t) { t.stop(); });
  if (REC.ctx && REC.ctx.close) REC.ctx.close().catch(function () {});
  REC.state = 'off'; REC.ctx = null; REC.stream = null; REC.node = null; REC.src = null; REC.sink = null; REC.chunks = []; REC.pre = [];
  recButtons();
}
/* a captured take at the device's rate, resampled to the engine's 48 kHz by the browser */
function toEngineRate(chs, sr) {
  if (sr === FS) return Promise.resolve(chs);
  var Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext, n = Math.ceil(chs[0].length * FS / sr);
  var off = new Ctx(chs.length, n, FS), buf = off.createBuffer(chs.length, chs[0].length, sr), s = off.createBufferSource(), k;
  for (k = 0; k < chs.length; k++) buf.getChannelData(k).set(chs[k]);
  s.buffer = buf; s.connect(off.destination); s.start(0);
  return off.startRendering().then(function (r) { var out = []; for (k = 0; k < chs.length; k++) out.push(new Float32Array(r.getChannelData(k))); return out; });
}
function endRecording(fromQuiet) {
  var was = REC.state, sr = REC.ctx ? REC.ctx.sampleRate : FS, chunks = REC.chunks, frames = REC.frames, slot = REC.slot, clipped = REC.clipped, info = REC.info || { settings: {} }, t0 = REC.t0 || new Date();
  var locP = REC.locP; REC.locP = null;
  closeRec();
  if (was !== 'recording' || !frames) { setStatus('Nothing was recorded: no sound rose above the quiet.'); return; }
  var n = fromQuiet ? Math.max(1, frames - Math.round((QUIET_STOP - 0.3) * sr)) : frames, nc = Math.min(2, chunks[0].length), chs = [], p = 0, k, i;
  for (k = 0; k < nc; k++) chs.push(new Float32Array(n));
  chunks.forEach(function (c) {
    var take = Math.min(c[0].length, n - p);
    if (take <= 0) return;
    for (k = 0; k < nc; k++) chs[k].set((c[k] || c[0]).subarray(0, take), p);
    p += take;
  });
  var fo = Math.min(n >> 2, Math.round(0.005 * sr));
  chs.forEach(function (c) { for (i = 0; i < fo; i++) c[n - 1 - i] *= i / fo; });
  /* the place, if it was asked for: waited for at most 4 s more */
  var place = locP ? Promise.race([locP, new Promise(function (res) { setTimeout(function () { res(null); }, 4000); })]) : Promise.resolve(null);
  Promise.all([toEngineRate(chs, sr), place]).then(function (both) {
    var out = both[0], loc = both[1], nt = slot === 'take' ? nextTake() : null;
    var name = SLOT_LABEL[slot] === 'reference' ? 'Reference' : SLOT_LABEL[slot] === 'knock' ? 'Knock' : SLOT_LABEL[slot] === 'room' ? 'Room' : (SESSION.project.trim() || 'Recording');
    var take = ++REC.count, extra = {
      origin: 'recorded', date: isoLocal(t0), take: take, device: info.label || 'Microphone', rate: sr, channels: nc, processing: processingText(info.settings),
      reference: 'BFL-' + isoLocal(t0).slice(0, 10).replace(/-/g, '') + '-' + take, session: RV.session.id };
    if (loc) extra.location = loc;
    if (nt) {
      extra.take = nt.take; extra.project = nt.project; extra.tags = uniq(nt.tags); extra.notes = $('rv-notes').value.trim();
      if (nt.plan) extra.plan = { id: nt.plan.id, name: nt.plan.name };
      if (nt.shot) extra.shot = { id: nt.shot.id, name: nt.shot.name };
    }
    var meta = baseMeta(extra);
    if (nt) { meta.project = extra.project; meta.tags = extra.tags; meta.notes = extra.notes; }
    var s = addSound(nt ? nt.name : name + ' ' + take, out[0], out[1] || out[0].slice(), slot, meta);
    if (nt) {
      $('rv-notes').value = '';
      /* a shot with all its takes hands over to the next one still open */
      var p = nt.plan;
      if (p && nt.shot && takesOf(p.id, nt.shot.id) >= nt.shot.takes) {
        var open = p.shots.filter(function (x) { return takesOf(p.id, x.id) < x.takes; })[0];
        if (open) { RV.shot = open.id; saveRV(); }
      }
      renderRV();
    }
    setStatus('Recorded ' + s.name + ', ' + fTime(s.dur) + (loc ? ', with the location' : '') + (clipped ? '. It clipped: move the phone back or make the sound softer, then record again.' : '.'));
  }).catch(function () { setStatus('The recording could not be converted to 48 kHz in this browser.'); });
}

/* ---------- Record: a phone-first view for takes, with plans ----------
   The Record button (top right) opens a view made for one hand: a plan's shots to tick off, quick tags to switch on,
   one big button, the takes of this session, and Save session. A plan comes from the Plans panel here, from a plan
   file, or from Kurator or another browser as a link or QR code (#plan=..., read here and never sent to a server).
   Takes are ordinary sounds (Your sounds) with the plan, shot, session and, when asked for, the place in their meta. */
/* RV.chips are the tags switched on for the next take; RV.mine are the quick tags the recordist made (kept until they
   forget them with the cross next to the tag), shown with every plan */
var PLANS = [], RV = { plan: '', shot: '', chips: [], mine: [], session: null, auto: false, loc: false }, DEFAULT_CHIPS = ['Nature', 'Objects', 'Ambience', 'Foley'];
function loadRV() {
  try {
    var p = JSON.parse(localStorage.getItem('bfx-plans') || '[]');
    if (Array.isArray(p)) PLANS = p.map(function (x) { return B.unpackPlan(B.packPlan(x)); }).filter(Boolean);
    var r = JSON.parse(localStorage.getItem('bfx-rv') || '{}');
    ['plan', 'shot'].forEach(function (k) { if (typeof r[k] === 'string') RV[k] = r[k]; });
    if (Array.isArray(r.chips)) RV.chips = r.chips.filter(function (c) { return typeof c === 'string'; });
    if (Array.isArray(r.mine)) RV.mine = r.mine.filter(function (c) { return typeof c === 'string'; });
    /* tags made before they were kept: the ones still switched on that no plan offers */
    RV.chips.forEach(function (c) { if (RV.mine.indexOf(c) < 0 && !planChip(c)) RV.mine.push(c); });
    if (r.session && typeof r.session.id === 'string') RV.session = r.session;
    RV.auto = !!r.auto; RV.loc = !!r.loc;
  } catch (e) { /* storage may be off: plans last for this visit */ }
  if (!RV.session) newSession();
}
function saveRV() {
  try {
    localStorage.setItem('bfx-plans', JSON.stringify(PLANS));
    localStorage.setItem('bfx-rv', JSON.stringify({ plan: RV.plan, shot: RV.shot, chips: RV.chips, mine: RV.mine, session: RV.session, auto: RV.auto, loc: RV.loc }));
  } catch (e) { /* storage may be off */ }
}
function newSession() { var d = new Date(); RV.session = { id: 'ses-' + d.getTime().toString(36), started: isoLocal(d) }; }
function curPlan() { return PLANS.filter(function (p) { return p.id === RV.plan; })[0] || null; }
function curShot() { var p = curPlan(); return p ? p.shots.filter(function (s) { return s.id === RV.shot; })[0] || null : null; }
function takesOf(planId, shotId) { return LIB.filter(function (s) { var m = s.meta || {}; return m.plan && m.plan.id === planId && m.shot && m.shot.id === shotId; }).length; }
function sessionTakes() { return LIB.filter(function (s) { return (s.meta || {}).session === RV.session.id; }); }
function rvOpen() { return !$('recview').hidden; }
function baseChips() { var p = curPlan(); return p && p.chips.length ? p.chips : DEFAULT_CHIPS; }
function planChip(c) { return DEFAULT_CHIPS.indexOf(c) >= 0 || PLANS.some(function (p) { return p.chips.indexOf(c) >= 0; }); }
/* the plan's tags (or the usual ones), then your own, then any still on from another plan */
function chipSet() {
  var list = baseChips().slice();
  RV.mine.concat(RV.chips).forEach(function (c) { if (list.indexOf(c) < 0) list.push(c); });
  return list;
}
function toggleChip(c) {
  var i = RV.chips.indexOf(c);
  if (i >= 0) {
    RV.chips.splice(i, 1);
    /* a tag from another plan stays, as one of your own, instead of vanishing on the tap */
    if (baseChips().indexOf(c) < 0 && RV.mine.indexOf(c) < 0) RV.mine.push(c);
  } else RV.chips.push(c);
  saveRV(); renderRV();
}
function forgetChip(c) {
  RV.mine = RV.mine.filter(function (x) { return x !== c; }); RV.chips = RV.chips.filter(function (x) { return x !== c; });
  saveRV(); renderRV(); setStatus('Forgot the tag ' + c + '. Takes made with it keep it.');
}
function addChips(text) {
  var added = tagList(text).map(function (t) { return t.replace(/\s*\/\s*/g, '/').replace(/^\/+|\/+$/g, ''); }).filter(Boolean);
  added.forEach(function (t) {
    if (baseChips().indexOf(t) < 0 && RV.mine.indexOf(t) < 0) RV.mine.push(t);
    if (RV.chips.indexOf(t) < 0) RV.chips.push(t);
  });
  if (added.length) { saveRV(); renderRV(); }
  return added.length;
}
function showAddTag(on) {
  $('rv-addtag').hidden = !on;
  var b = $('rv-chips').querySelector('.chip-add'); if (b) b.setAttribute('aria-expanded', String(on));
  if (on) { $('rv-newtag').value = ''; $('rv-newtag').focus(); }
}
/* what the next take will be called and carry */
function nextTake() {
  var p = curPlan(), sh = curShot(), n;
  if (sh) {
    n = takesOf(p.id, sh.id) + 1;
    return { name: (sh.ucs ? sh.ucs + '_' : '') + sh.name + ' ' + n, take: n, project: p.project || p.name, tags: tagList(SESSION.tags).concat(sh.tags, RV.chips), plan: p, shot: sh };
  }
  n = sessionTakes().length + 1;
  var proj = p ? p.project || p.name : SESSION.project.trim();
  return { name: (proj || 'Take') + ' ' + n, take: n, project: proj, tags: tagList(SESSION.tags).concat(RV.chips), plan: p, shot: null };
}
function uniq(list) { return list.filter(function (v, i) { return v && list.indexOf(v) === i; }); }
function renderRV() {
  if (!rvOpen()) return;
  var sel = $('rv-plan-sel'), p = curPlan(), list = $('rv-shots');
  sel.textContent = '';
  var o0 = el('option', null, 'No plan: free takes'); o0.value = ''; sel.appendChild(o0);
  PLANS.forEach(function (x) { var o = el('option', null, x.name + ' (' + plural(x.shots.length, 'shot') + ')'); o.value = x.id; sel.appendChild(o); });
  sel.value = p ? p.id : '';
  list.textContent = ''; list.hidden = !p;
  if (p) p.shots.forEach(function (s) {
    var n = takesOf(p.id, s.id), li = el('li'), b = el('button', 'rv-shot' + (n >= s.takes ? ' done' : ''));
    b.type = 'button'; b.setAttribute('aria-pressed', String(s.id === RV.shot));
    b.appendChild(el('span', null, s.name + (s.tags.length ? ' · ' + s.tags.join(', ') : '')));
    b.appendChild(el('span', 'rv-prog', n + ' of ' + s.takes));
    b.addEventListener('click', function () { RV.shot = RV.shot === s.id ? '' : s.id; saveRV(); renderRV(); });
    li.appendChild(b); list.appendChild(li);
  });
  var nt = nextTake();
  $('rv-take').textContent = 'Next: ' + nt.name;
  $('rv-tags').textContent = [nt.project ? 'Project: ' + nt.project : '', uniq(nt.tags).join(', '), RV.loc ? 'with the location' : ''].filter(Boolean).join(' · ') || 'No project or tags yet: choose a plan, or set them under Your sounds.';
  var chips = $('rv-chips');
  chips.textContent = '';
  var base = baseChips();
  chipSet().forEach(function (c) {
    var b = el('button', 'chip', c); b.type = 'button'; b.setAttribute('aria-pressed', String(RV.chips.indexOf(c) >= 0));
    b.addEventListener('click', function () { toggleChip(c); });
    if (base.indexOf(c) >= 0) { chips.appendChild(b); return; }
    var w = el('span', 'chipx'), x = el('button', 'chip-rm', '\u00d7');
    x.type = 'button'; x.title = 'Forget the tag ' + c; x.setAttribute('aria-label', 'Forget the tag ' + c);
    x.addEventListener('click', function () { forgetChip(c); });
    w.appendChild(b); w.appendChild(x); chips.appendChild(w);
  });
  var add = el('button', 'chip chip-add', '+ Tag'); add.type = 'button'; add.title = 'Make a quick tag of your own';
  add.setAttribute('aria-controls', 'rv-addtag'); add.setAttribute('aria-expanded', String(!$('rv-addtag').hidden));
  add.addEventListener('click', function () { showAddTag($('rv-addtag').hidden); });
  chips.appendChild(add);
  $('rv-auto').checked = RV.auto; $('rv-loc').checked = RV.loc;
  var takes = sessionTakes().slice().reverse(), tl = $('rv-takes');
  tl.textContent = '';
  if (!takes.length) tl.appendChild(el('li', 'note', 'No takes in this session yet.'));
  takes.forEach(function (s) {
    var li = el('li', 'snd'), head = el('div', 'snd-head'), tools = el('div', 'toolrow');
    head.appendChild(el('span', 'snd-name', s.name)); head.appendChild(el('span', 'snd-dur', fTime(s.dur)));
    li.appendChild(head);
    var tl2 = tagLine(s); if (tl2) li.appendChild(el('p', 'snd-tags', tl2));
    if (s.meta && s.meta.location) li.appendChild(el('p', 'snd-info', 'At ' + s.meta.location.lat.toFixed(5) + ', ' + s.meta.location.lon.toFixed(5) + ' (within ' + Math.round(s.meta.location.acc || 0) + ' m)'));
    tools.appendChild(toolButton('', 'Play', 'Play this take', function () { audition(s.id); }));
    var rm = toolButton('', 'Remove', 'Take it out of this browser', function () {
      if (rm.dataset.sure) { removeSound(s.id); renderRV(); return; }
      rm.dataset.sure = '1'; rm.textContent = 'Remove for good'; rm.classList.add('live');
      setTimeout(function () { if (rm.isConnected) { delete rm.dataset.sure; rm.textContent = 'Remove'; rm.classList.remove('live'); } }, 4000);
    });
    tools.appendChild(rm);
    li.appendChild(tools); tl.appendChild(li);
  });
  $('rv-save').disabled = !takes.length;
  $('rv-share').hidden = !(takes.length && canShareFiles());
  $('rv-wb').hidden = !(takes.length && WB.url);
  $('rv-kur').hidden = !(takes.length && kuratorHere());
  $('rv-note-kur').hidden = !kuratorHere(); $('rv-note-wb').hidden = !WB.url;
  recButtons();
}
function canShareFiles() {
  try { return !!(navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(4)], 'x.zip', { type: 'application/zip' })] })); } catch (e) { return false; }
}
var rvLastFocus = null;
function openRV(focusPlans) {
  rvLastFocus = document.activeElement;
  $('recview').hidden = false; document.body.style.overflow = 'hidden';
  stop(); drawAll(null);
  showPE(!!focusPlans);
  renderRV();
  if (!recBusy()) rvStatus('Tap Record, then make the sound: the take starts with it.');
}
function closeRV() {
  if (recBusy()) endRecording(false);
  $('recview').hidden = true; document.body.style.overflow = '';
  if (rvLastFocus && rvLastFocus.focus) rvLastFocus.focus();
}
/* the status line of the page, mirrored in the record view while it is open */
function rvStatus(t) { var s = $('rv-status'); if (s && rvOpen()) s.textContent = t; }
function rvMeter(lin) {
  var m = $('rv-meter'); if (!m || !rvOpen()) return;
  var db = 20 * Math.log10(Math.max(lin, 1e-5)), u = Math.max(0, Math.min(1, (db + 60) / 60));
  m.style.transform = 'scaleX(' + u + ')'; m.classList.toggle('hot', lin > 0.89);
}
/* where the take was made: asked for at the start of each recording when the recordist turned it on */
function wantLocation() {
  if (!RV.loc || !navigator.geolocation) return null;
  return new Promise(function (res) {
    navigator.geolocation.getCurrentPosition(function (pos) {
      var c = pos.coords;
      res({ lat: c.latitude, lon: c.longitude, acc: c.accuracy, alt: c.altitude == null ? null : c.altitude });
    }, function () { res(null); }, { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 });
  });
}

/* ---------- session zips: what Kurator unpacks ---------- */
/* WAVs, a .xmp sidecar each, and ballistic-session.json: the plan and, per file, the facts Kurator files it by */
/* sid: the session these files belong to. Kurator puts later zips of a session into the folder of its first one */
function sessionZip(list, plan, sid) {
  var used = {}, files = [], entries = [];
  list.forEach(function (s) {
    var n = safeName(s.name), k = 2;
    while (used[n.toLowerCase()]) n = safeName(s.name) + ' ' + (k++);
    used[n.toLowerCase()] = 1;
    var m = s.meta || {}, fm = fileMeta(s);
    files.push({ name: n + '.wav', data: wavOf(s) }, { name: n + '.wav.xmp', data: utf8Bytes(B.xmpText(fm)) });
    entries.push({ file: n + '.wav', sidecar: n + '.wav.xmp', title: s.name, date: m.date || '', project: m.project || '', tags: m.tags || [], notes: m.notes || '',
      origin: m.origin || '', device: m.device || '', take: m.take || null, plan: m.plan ? m.plan.id : '', shot: m.shot ? m.shot.id : '', session: m.session || '',
      location: m.location || null, keywords: B.keywordPaths(fm) });
  });
  var manifest = { format: 'ballistic-session', version: 1, app: 'Ballistic Foley Lab', saved: isoLocal(new Date()), session: sid || '',
    plan: plan ? { id: plan.id, name: plan.name, project: plan.project, chips: plan.chips, shots: plan.shots.map(function (s) { return { id: s.id, name: s.name, tags: s.tags, takes: s.takes, ucs: s.ucs, notes: s.notes }; }) } : null,
    files: entries };
  files.push({ name: 'ballistic-session.json', data: utf8Bytes(JSON.stringify(manifest, null, 1)) });
  return B.zipFiles(files);
}
/* the library group in SFX Workbench for this session's takes: its project and day */
function sessionGroup() {
  var p = curPlan(), proj = p ? p.project || p.name : SESSION.project.trim();
  return (proj ? proj + ' ' : 'Takes ') + (RV.session && RV.session.started ? RV.session.started.slice(0, 10) : isoLocal(new Date()).slice(0, 10));
}
function sessionZipName(project) {
  var d = isoLocal(new Date());
  return safeName((project || 'Ballistic') + ' ' + d.slice(0, 10) + ' ' + d.slice(11, 16).replace(':', '')) + '.zip';
}
function saveSession(share) {
  var takes = sessionTakes(); if (!takes.length) return;
  var p = curPlan(), name = sessionZipName(p ? p.project || p.name : SESSION.project.trim()), zip = sessionZip(takes, p, RV.session.id);
  if (share) {
    var f = new File([zip], name, { type: 'application/zip' });
    navigator.share({ files: [f], title: name }).then(function () { setStatus('Shared ' + name + '.'); }).catch(function (e) { if (!e || e.name !== 'AbortError') setStatus('Sharing did not work here. Use Save session.'); });
    return;
  }
  deliver(name, zip, 'application/zip', plural(takes.length, 'take') + ' with .xmp sidecars and a list for Kurator');
}

/* ---------- plans: make, share by link or QR, keep ---------- */
var PE = { id: '' };
function showPE(on) {
  $('rv-main').hidden = on; $('pe').hidden = !on;
  if (on) { if (!PE.id && curPlan()) PE.id = RV.plan; renderPE(); $('pe-title').focus(); } else $('rv-title').focus();
}
function pePlan() { return PLANS.filter(function (p) { return p.id === PE.id; })[0] || null; }
function planBase() {
  return /^https?:$/.test(location.protocol) && !inViewer ? location.origin + location.pathname : 'https://eigensoundlab.github.io/ballistic/';
}
function planLink(p) { return planBase() + '#plan=' + B.packPlan(p); }
function renderPE() {
  var sel = $('pe-sel'), p = pePlan();
  sel.textContent = '';
  if (!PLANS.length) { var o0 = el('option', null, 'No plans yet'); o0.value = ''; sel.appendChild(o0); }
  PLANS.forEach(function (x) { var o = el('option', null, x.name); o.value = x.id; sel.appendChild(o); });
  sel.value = p ? p.id : '';
  $('pe-form').hidden = !p;
  if (!p) return;
  $('pe-name').value = p.name; $('pe-project').value = p.project; $('pe-chips').value = p.chips.join(', ');
  var ol = $('pe-shots');
  ol.textContent = '';
  p.shots.forEach(function (s, i) {
    var li = el('li', 'pe-shot'), k = 'pe-s' + i;
    [['name', 'Shot', s.name, ''], ['tags', 'Tags', s.tags.join(', '), 'commas; / for levels'], ['takes', 'Takes', String(s.takes), ''], ['ucs', 'UCS', s.ucs, 'optional, e.g. DOORWood']].forEach(function (f) {
      var r = textRow(k + '-' + f[0], f[1], f[3], ''), inp = r.querySelector('input');
      inp.value = f[2];
      if (f[0] === 'takes') { inp.inputMode = 'numeric'; }
      inp.addEventListener('change', function () {
        if (f[0] === 'name') s.name = inp.value.trim() || s.name;
        else if (f[0] === 'tags') s.tags = tagList(inp.value);
        else if (f[0] === 'takes') s.takes = Math.max(1, Math.min(99, Math.round(+inp.value) || 1));
        else s.ucs = inp.value.trim().replace(/[^A-Za-z]/g, '').slice(0, 20);
        planChanged();
      });
      li.appendChild(r);
    });
    var tools = el('div', 'toolrow');
    tools.appendChild(toolButton('', 'Remove shot', 'Take this shot out of the plan', function () { p.shots.splice(i, 1); planChanged(true); }));
    li.appendChild(tools);
    ol.appendChild(li);
  });
  drawPlanQR();
}
function drawPlanQR() {
  var p = pePlan(), box = $('pe-qr');
  if (!p) { box.textContent = ''; return; }
  var link = planLink(p), svg = B.qrSvg(link, '#000');
  box.innerHTML = svg || '';
  if (!svg) box.textContent = 'This plan is too long for a QR code. Copy the link or save the plan file.';
  $('pe-copy').dataset.link = link;
}
function planChanged(rerenderAll) { saveRV(); if (rerenderAll) renderPE(); else drawPlanQR(); }
function addPlan(p, select) {
  var i = PLANS.findIndex(function (x) { return x.id === p.id; });
  if (i >= 0) PLANS[i] = p; else PLANS.push(p);
  if (select) { RV.plan = p.id; RV.shot = p.shots.length ? p.shots[0].id : ''; }
  PE.id = p.id; saveRV();
}
function wirePlans() {
  $('pe-back').addEventListener('click', function () { showPE(false); renderRV(); });
  $('pe-sel').addEventListener('change', function () { PE.id = $('pe-sel').value; renderPE(); });
  $('pe-new').addEventListener('click', function () {
    var n = PLANS.length + 1, proj = SESSION.project.trim();
    addPlan({ id: 'plan-' + Date.now().toString(36), name: proj || 'Plan ' + n, project: proj, chips: DEFAULT_CHIPS.slice(), shots: [{ id: 's1', name: 'First shot', tags: [], takes: 3, ucs: '', notes: '' }] }, false);
    renderPE(); $('pe-name').focus();
  });
  [['pe-name', 'name'], ['pe-project', 'project'], ['pe-chips', 'chips']].forEach(function (f) {
    $(f[0]).addEventListener('change', function () {
      var p = pePlan(); if (!p) return;
      var v = $(f[0]).value.trim();
      if (f[1] === 'chips') p.chips = tagList(v); else if (f[1] === 'name') p.name = v || p.name; else p.project = v;
      planChanged(f[1] === 'name');
    });
  });
  $('pe-add').addEventListener('click', function () {
    var p = pePlan(); if (!p) return;
    var k = 1; while (p.shots.some(function (s) { return s.id === 's' + k; })) k++;
    p.shots.push({ id: 's' + k, name: 'Shot ' + (p.shots.length + 1), tags: [], takes: 3, ucs: '', notes: '' });
    planChanged(true);
    var last = $('pe-s' + (p.shots.length - 1) + '-name'); if (last) { last.focus(); last.select(); }
  });
  $('pe-copy').addEventListener('click', function () {
    var link = $('pe-copy').dataset.link; if (!link) return;
    var done = function () { setStatus('Copied the plan link.'); }, fail = function () { window.prompt('Copy the plan link:', link); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, fail); else fail();
  });
  $('pe-savefile').addEventListener('click', function () {
    var p = pePlan(); if (!p) return;
    var o = JSON.parse(JSON.stringify(p)); o.format = 'ballistic-plan'; o.version = 1;
    deliver(safeName(p.name) + '.plan.json', utf8Bytes(JSON.stringify(o, null, 1)), 'application/json', 'plan file');
  });
  $('pe-loadfile').addEventListener('click', function () { $('pe-file').click(); });
  $('pe-file').addEventListener('change', function () {
    var f = $('pe-file').files && $('pe-file').files[0]; $('pe-file').value = '';
    if (!f) return;
    f.text().then(function (t) {
      var o = JSON.parse(t), p = o && B.unpackPlan(B.packPlan({ id: o.id, name: o.name, project: o.project || '', chips: o.chips || [], shots: (o.shots || []).map(function (s) { return { id: s.id, name: s.name, tags: s.tags || [], takes: s.takes || 1, ucs: s.ucs || '', notes: s.notes || '' }; }) }));
      if (!p) throw new Error('not a plan');
      addPlan(p, false); renderPE(); setStatus('Loaded the plan ' + p.name + '.');
    }).catch(function () { setStatus('That file is not a plan. Plans are .plan.json files saved here or in Kurator.'); });
  });
  $('pe-del').addEventListener('click', function () {
    var b = $('pe-del'), p = pePlan(); if (!p) return;
    if (!b.dataset.sure) { b.dataset.sure = '1'; b.textContent = 'Delete for good'; b.classList.add('live'); setTimeout(function () { delete b.dataset.sure; b.textContent = 'Delete plan'; b.classList.remove('live'); }, 4000); return; }
    PLANS = PLANS.filter(function (x) { return x.id !== p.id; });
    if (RV.plan === p.id) { RV.plan = ''; RV.shot = ''; }
    PE.id = PLANS.length ? PLANS[0].id : ''; saveRV(); renderPE();
    delete b.dataset.sure; b.textContent = 'Delete plan'; b.classList.remove('live');
  });
}
function wireRV() {
  $('rv-open').addEventListener('click', function () { openRV(false); });
  $('rv-close').addEventListener('click', closeRV);
  $('recview').addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (!$('pe').hidden) showPE(false); else closeRV(); } });
  $('rv-plans').addEventListener('click', function () { PE.id = RV.plan || (PLANS[0] && PLANS[0].id) || ''; showPE(true); });
  $('rv-plan-sel').addEventListener('change', function () {
    RV.plan = $('rv-plan-sel').value; var p = curPlan();
    RV.shot = p && p.shots.length ? p.shots[0].id : ''; saveRV(); renderRV();
  });
  $('rec-take').addEventListener('click', function () { toggleRecord('take'); });
  $('rv-auto').addEventListener('change', function () { RV.auto = $('rv-auto').checked; saveRV(); });
  $('rv-loc').addEventListener('change', function () {
    RV.loc = $('rv-loc').checked; saveRV();
    if (RV.loc) {
      if (!navigator.geolocation) { RV.loc = false; $('rv-loc').checked = false; saveRV(); setStatus('This browser cannot tell the location.'); return; }
      /* ask now, so that the permission prompt does not come in the middle of a take */
      wantLocation().then(function (l) { setStatus(l ? 'The location goes with new recordings (within ' + Math.round(l.acc) + ' m). It is only stored in the files.' : 'The location could not be read. Allow it for this site, then switch it on again.'); if (!l) { RV.loc = false; $('rv-loc').checked = false; saveRV(); } renderRV(); });
    }
    renderRV();
  });
  $('rv-save').addEventListener('click', function () { saveSession(false); });
  $('rv-share').addEventListener('click', function () { saveSession(true); });
  $('rv-wb').addEventListener('click', function () { var t = sessionTakes(); if (t.length) sendSounds(t, sessionGroup()); });
  $('rv-kur').addEventListener('click', function () {
    var t = sessionTakes(), p = curPlan();
    if (t.length) sendToKurator(t, p, RV.session.id, sessionZipName(p ? p.project || p.name : SESSION.project.trim()), 'take');
  });
  $('rv-addtag').addEventListener('submit', function (e) {
    e.preventDefault();
    var n = addChips($('rv-newtag').value);
    showAddTag(false);
    var b = $('rv-chips').querySelector('.chip-add'); if (b) b.focus();
    if (n) setStatus(plural(n, 'tag') + ' on for the next takes, and kept for later.');
  });
  $('rv-newtag-x').addEventListener('click', function () { showAddTag(false); var b = $('rv-chips').querySelector('.chip-add'); if (b) b.focus(); });
  $('rv-newtag').addEventListener('keydown', function (e) { if (e.key === 'Escape') { e.stopPropagation(); $('rv-newtag-x').click(); } });
  $('rv-new').addEventListener('click', function () { newSession(); saveRV(); renderRV(); setStatus('A new session: Save session now gathers only the takes from here on.'); });
  wirePlans();
}
/* a plan link (#plan=...) opens Record with the plan; the address bar keeps no trace of it */
function planFromLink() {
  var m = /[#&]plan=([A-Za-z0-9_-]+)/.exec(location.hash);
  if (!m) return;
  history.replaceState(null, '', location.pathname + location.search);
  var p = B.unpackPlan(m[1]);
  if (!p) { setStatus('The plan link is damaged. Ask for it again, or load the plan file.'); return; }
  addPlan(p, true);
  openRV(false);
  setStatus('Plan ' + p.name + ' is here: ' + plural(p.shots.length, 'shot') + '. Tap a shot, then Record.');
}

/* ---------- the reference: compare, then fit one setting ---------- */
var featCache = { ref: '', rf: null, id: -1, cf: null }, fitWait = null, fitSeq = 0, fitUndo = null;
function refFeatures() {
  var id = st.r.ref;
  if (!id) return null;
  if (featCache.ref !== id) { var a = B.getAsset(id); featCache.ref = id; featCache.rf = a ? B.features(a.L, a.R) : null; }
  return featCache.rf;
}
function curFeatures() {
  if (!result) return null;
  if (featCache.id !== result.id) { featCache.id = result.id; featCache.cf = B.features(result.raw.L, result.raw.R); }
  return featCache.cf;
}
function refPlot() { var c = el('canvas'); c.id = 'refPlot'; c.setAttribute('role', 'img'); c.setAttribute('aria-label', 'Octave band balance of this sound against the reference'); return c; }
function refSummary() { var d = el('dl', 'readouts'); d.id = 'refSum'; return d; }
function fitRow() {
  var box = el('div', 'toolrow fitrow'), lab = el('label', null, 'Fit'), sel = el('select');
  sel.id = 'fitKey'; lab.setAttribute('for', 'fitKey');
  box.appendChild(lab); box.appendChild(sel);
  box.appendChild(toolButton('fit-go', 'Fit to the reference', 'Tries ' + B.FIT_TRIES + ' values of this setting and keeps the one closest to the reference', toggleFit));
  return box;
}
function fitNoteRow() { var p = el('p', 'note'); p.id = 'fitNote'; return p; }
function fitChoices() {
  var sel = $('fitKey'); if (!sel) return;
  var k = kind(), v = sel.value, list = SPEC.filter(function (s) {
    return (s.bank === 'source' || s.bank === 'scene') && s.obj === 'p' && !s.options && !s.custom && !s.sound && !(s.kinds && s.kinds.indexOf(k) < 0) && !(s.when && !s.when(st.p));
  });
  sel.textContent = '';
  list.forEach(function (s) { var o = el('option', null, s.label); o.value = s.id; sel.appendChild(o); });
  if (list.some(function (s) { return s.id === v; })) sel.value = v;
}
function refChanged() { featCache.ref = ''; fitUndo = null; $('fitNote').textContent = ''; drawRef(); }
function drawRef() {
  var cv = $('refPlot'); if (!cv || cv.offsetParent === null) return;
  var f = fit(cv), g = f.g, W = f.W, H = f.H, rf = refFeatures(), cf = curFeatures(), mL = 34, mR = 10, mT = 22, mB = 18, pw = W - mL - mR, ph = H - mT - mB, k;
  g.clearRect(0, 0, W, H);
  g.font = '10px ' + col.mono; g.fillStyle = col.muted; g.strokeStyle = col.line; g.lineWidth = 1;
  function X(i) { return mL + (i + 0.5) / B.BAND_HZ.length * pw; }
  function Y(d) { return mT + Math.min(1, Math.max(0, -d / 50)) * ph; }
  g.textAlign = 'right';
  [0, -20, -40].forEach(function (d) { var y = Math.round(Y(d)) + 0.5; g.beginPath(); g.moveTo(mL, y); g.lineTo(mL + pw, y); g.stroke(); g.fillText(d + ' dB', mL - 4, y + 3); });
  g.textAlign = 'center';
  B.BAND_HZ.forEach(function (hz, i) { g.fillText(hz >= 1000 ? hz / 1000 + 'k' : String(Math.round(hz)), X(i), H - 5); });
  function line(fe, c, w, dash) {
    if (!fe) return;
    g.strokeStyle = c; g.fillStyle = c; g.lineWidth = w; g.setLineDash(dash || []); g.beginPath();
    fe.bands.forEach(function (d, i) { if (i) g.lineTo(X(i), Y(d)); else g.moveTo(X(i), Y(d)); });
    g.stroke(); g.setLineDash([]);
    fe.bands.forEach(function (d, i) { g.fillRect(X(i) - 2, Y(d) - 2, 4, 4); });
  }
  line(rf, col.ink, 1.5, [4, 3]); line(cf, col.tracer, 2);
  if (!rf) { caption(g, W, 'Choose, load or record a reference to compare.', ''); }
  else caption(g, W, 'dashed: reference; solid: this sound', cf ? 'match ' + B.matchScore(B.distance(cf, rf)) + '%' : '');
  var sum = $('refSum'); sum.textContent = '';
  if (rf && cf) [['Decay', fTime(cf.decay) + ' vs ' + fTime(rf.decay)], ['Brightness', fHz(cf.cent) + ' vs ' + fHz(rf.cent)], ['Rise', fTime(cf.attack) + ' vs ' + fTime(rf.attack)], ['Length', fTime(cf.len) + ' vs ' + fTime(rf.len)]].forEach(function (it) {
    var d = el('div'); d.appendChild(el('dt', null, it[0])); d.appendChild(el('dd', null, it[1])); sum.appendChild(d);
  });
  sum.hidden = !(rf && cf);
  $('fit-go').disabled = !rf || recBusy();
}
function specOf(key) { return SPEC.filter(function (s) { return s.id === key; })[0]; }
function toggleFit() {
  if (fitWait) { /* stop: the worker is replaced, so the fit is dropped */ fitWait = null; restartWorker(); $('fit-go').textContent = 'Fit to the reference'; setStatus('Fit stopped.'); rerender(false); return; }
  var key = $('fitKey').value, s = specOf(key);
  if (!s || !st.r.ref) return;
  var msg = { fit: true, id: 'fit-' + (++fitSeq), p: st.p, seed: st.seed, key: key, spec: { min: s.min, max: s.max, scale: s.scale, round: s.round }, ref: st.r.ref };
  fitWait = { msg: msg, label: s.label, old: st.p[key] };
  $('fit-go').textContent = 'Stop fitting';
  setStatus('Fitting ' + s.label.toLowerCase() + ': 0 of ' + B.FIT_TRIES + ' tries');
  if (worker) worker.postMessage(msg);
  else setTimeout(function () { gotFit(B.job(msg)); }, 20);
}
function fitProgress(m) { if (fitWait && m.id === fitWait.msg.id) setStatus('Fitting ' + fitWait.label.toLowerCase() + ': ' + m.n + ' of ' + m.of + ' tries'); }
function gotFit(r) {
  if (!fitWait || r.id !== fitWait.msg.id) return;
  var w = fitWait, s = specOf(r.key); fitWait = null;
  $('fit-go').textContent = 'Fit to the reference';
  if (r.error) { setStatus('The reference is gone. Choose it again.'); return; }
  fitUndo = { key: r.key, value: w.old };
  st.p[r.key] = r.value; st.sp = ''; syncControls(); rerender(true);
  var changed = r.value !== w.old;
  $('fitNote').textContent = changed ? w.label + ': ' + s.fmt(w.old) + ' to ' + s.fmt(r.value) + '. Match ' + B.matchScore(r.before) + '% to ' + B.matchScore(r.dist) + '%.'
    : w.label + ' stays at ' + s.fmt(w.old) + ': no other value came closer.';
  if (changed) {
    var u = toolButton('fit-undo', 'Undo', 'Put the setting back', function () { st.p[fitUndo.key] = fitUndo.value; fitUndo = null; $('fitNote').textContent = ''; syncControls(); rerender(true); });
    $('fitNote').appendChild(document.createTextNode(' ')); $('fitNote').appendChild(u);
  }
  setStatus('Fit done.');
}

function irSlug(v) { return String(v).replace(/[^a-z0-9.]+/gi, '-'); }
function saveBodyIR() {
  var p = st.p, ir = B.bodyIR(p, st.seed); if (!ir) return;
  var size = B.PLATES[p.rcBody] ? irSlug(p.rcThick.toFixed(1)) + 'mm-' + irSlug(p.rcSize.toFixed(1)) + 'm' : irSlug(p.rcLength.toFixed(1)) + 'm';
  deliver('ballistic-ir-' + p.rcBody + '-' + size + '.wav', B.encodeWavFloat(ir.L, ir.R), 'audio/wav', '32-bit float impulse response, ' + fTime(ir.L.length / FS));
}
function saveRoomIR() {
  var ir = B.roomIR(st.p); if (!ir) return;
  deliver('ballistic-ir-room-' + st.p.env + '.wav', B.encodeWavFloat(ir.L, ir.R), 'audio/wav', '32-bit float impulse response, ' + fTime(ir.L.length / FS));
}

/* ---------- saving and sending ---------- */
var inViewer = !!(window.claude && typeof window.claude.use === 'function');
var stemWait = null, stemSeq = 0;
function fileBase() { return 'ballistic-' + (st.sp || kind()) + '-' + st.seed; }
function mixName() { return fileBase() + (st.which === 'fx' ? '-action' : '-physics'); }
function stemLabel(k) { return k === 4 ? 'Trigger recording' : TRIMS[kind()][k][0]; }
function stemName(k) { return fileBase() + '-stem-' + (k + 1) + '-' + stemLabel(k).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
function wantStems() { return $('with-stems').checked; }
function plural(n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); }
/* stems are rendered on request, in the worker: four more renders of the Physics version */
function requestStems() {
  return new Promise(function (res) {
    var msg = { stems: true, id: 'stems-' + (++stemSeq), p: st.p, seed: st.seed };
    stemWait = { msg: msg, res: res };
    setStatus('Rendering stems');
    if (worker) worker.postMessage(msg); else runStemsSync(msg);
  });
}
function runStemsSync(msg) { setTimeout(function () { gotStems(B.job(msg)); }, 20); }
function gotStems(r) {
  if (!stemWait || r.id !== stemWait.msg.id) return;
  var res = stemWait.res; stemWait = null; res(r.stems);
}
function stemFiles(stems, enc) {
  var out = [];
  stems.forEach(function (s, k) { if (s) out.push({ name: stemName(k) + '.wav', data: enc(s.L, s.R, renderMeta('stem ' + (k + 1) + ', ' + stemLabel(k).toLowerCase())), label: stemLabel(k) }); });
  return out;
}
function deliver(name, bytes, mime, note) {
  if (inViewer) {
    if (!dl) return;
    var zip = /\.zip$/.test(name) ? bytes : B.zipStore(name, bytes), zname = name.replace(/\.wav$/, '.zip');
    dl.save({ filename: zname, data: new Blob([zip]) }).then(function () { setStatus('Saved ' + zname + ' (' + note + ')'); })
      .catch(function (e) { if (!e || e.code !== 'declined') setStatus('Saving is not available in this view.'); });
    return;
  }
  var url = URL.createObjectURL(new Blob([bytes], { type: mime })), link = el('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  setStatus('Saved ' + name + ' (' + note + ')');
}
/* a saved render: what it is, the session's project and tags, and the parameters that made it */
function renderMeta(label) {
  var pr = B.PRESETS.filter(function (x) { return x.id === st.sp; })[0], kn = KINDS.filter(function (x) { return x[0] === kind(); })[0][1];
  var diff = {}, k;
  for (k in st.p) if (st.p[k] !== B.DEFAULTS[k]) diff[k] = st.p[k];
  var s = { name: (pr ? pr.name : kn) + ', take ' + st.seed + (label ? ', ' + label : ''),
    meta: baseMeta({ origin: 'made', date: isoLocal(new Date()), notes: (st.which === 'fx' && !label ? 'Action version' : 'Physics version') + ' of a ' + kn.toLowerCase() + ' sound', params: JSON.stringify(diff) }) };
  return fileMeta(s);
}
function saveWav() {
  var v = view(); if (!v) return;
  var wav = B.encodeWav(v.L, v.R, renderMeta(''));
  if (!wantStems()) { deliver(mixName() + '.wav', wav, 'audio/wav', '24-bit, 48 kHz'); return; }
  requestStems().then(function (stems) {
    var list = [{ name: mixName() + '.wav', data: wav }].concat(stemFiles(stems, B.encodeWavFloat));
    deliver(fileBase() + '-stems.zip', B.zipFiles(list), 'application/zip', plural(list.length - 1, 'stem') + ' as 32-bit float WAV, the mix as 24-bit');
  });
}
/* SFX Workbench lives on the same site, so the two pages can talk directly. This page opens or reuses a window named
   "sfxworkbench" and posts the sound as a 32-bit float WAV, with its stems when asked; they land in the workbench library
   in a "Ballistic Foley Lab" group, and the stems can go into its layer stack. The workbench answers "ready" when it
   starts and "imported" once the sounds are in. Messages go only to this site and are read only from it. */
var WB = { url: null, win: null, ready: false, pending: null, timer: 0 };
function workbenchUrl() {
  try {
    var q = new URLSearchParams(location.search).get('workbench');
    if (q) { var u = new URL(q, location.href); return u.origin === location.origin ? u.href : null; }
  } catch (e) { return null; }
  return /\.github\.io$/.test(location.hostname) ? location.origin + '/SFXWorkbench/' : null;
}
function postPending() { try { var m = {}, k; for (k in WB.pending) if (k !== 'what') m[k] = WB.pending[k]; WB.win.postMessage(m, location.origin); } catch (e) { /* answered by "ready" when it loads */ } }
function sendToWorkbench() {
  var v = view(); if (!v || !WB.url) return;
  /* the window has to open inside the click, before any stems are rendered, or the browser blocks it */
  if (!openWorkbench()) return;
  var base = mixName(), files = [{ name: base + '.wav', bytes: B.encodeWavFloat(v.L, v.R, renderMeta('')).buffer, role: 'mix' }];
  function go(stems) {
    stemFiles(stems || [], B.encodeWavFloat).forEach(function (f) { files.push({ name: f.name, bytes: f.data.buffer, role: 'stem' }); });
    var n = files.length - 1;
    queueForWorkbench(files, base + '.wav' + (n ? ' and ' + plural(n, 'stem') : ''), base + '-');
  }
  if (wantStems()) requestStems().then(go); else go(null);
}
/* the window must open inside the click; the files follow when the workbench is ready */
function openWorkbench() {
  var w = WB.win && !WB.win.closed ? WB.win : null, fresh = false;
  if (!w) {
    w = window.open('', 'sfxworkbench');
    if (!w) { setStatus('The browser blocked the new window. Allow pop-ups for this site, then send again.'); return false; }
    try { fresh = w.location.href === 'about:blank'; } catch (e) { fresh = false; }
    if (fresh) w.location.href = WB.url;
    WB.ready = !fresh;
  }
  WB.win = w;
  try { w.focus(); } catch (e) { /* focus is up to the browser */ }
  return true;
}
function postToWorkbench(files, what, idBase, group) { if (openWorkbench()) queueForWorkbench(files, what, idBase, group); }
function queueForWorkbench(files, what, idBase, group) {
  WB.pending = { type: 'sfxworkbench:import', v: 1, id: (idBase + Date.now().toString(36)).replace(/[^\w.-]+/g, '-').slice(-60), from: 'Ballistic Foley Lab', group: (group || 'Ballistic Foley Lab').slice(0, 60), files: files, what: what };
  if (WB.ready) postPending();
  var msg = WB.pending;
  setStatus('Sending ' + what + ' to SFX Workbench');
  clearTimeout(WB.timer);
  WB.timer = setTimeout(function () {
    if (WB.pending === msg) { WB.pending = null; setStatus('SFX Workbench did not answer. Reload it, then send again.'); }
  }, 20000);
}
window.addEventListener('message', function (e) {
  if (e.origin !== location.origin || !e.data) return;
  if (e.data.type === 'sfxworkbench:ready') {
    if (e.source) WB.win = e.source;
    WB.ready = true;
    if (WB.pending) postPending();
  } else if (e.data.type === 'sfxworkbench:imported' && WB.pending && e.data.id === WB.pending.id) {
    clearTimeout(WB.timer);
    var what = WB.pending.what, group = WB.pending.group;
    WB.pending = null;
    setStatus('Sent ' + what + ' to SFX Workbench: in its library under ' + group + '.');
  }
});

/* ---------- Send to Kurator: Kurator on this computer ----------
   A page on the web cannot simply call Kurator at 127.0.0.1 (Safari refuses, Chrome and Firefox ask), but it can
   open it: Ballistic opens Kurator's /receive page in a window named "kurator" and posts the session zip to it, as
   with SFX Workbench. That page, on Kurator's own address, hands it to Kurator, which unpacks and tags it
   (kurator/sessions.py there). It answers only pages from the Ballistic address in its Settings.
     here -> Kurator: { type: 'kurator:import', v: 1, id, name, what, bytes }
     Kurator -> here: { type: 'kurator:ready', v: 1 }, then { type: 'kurator:imported' | 'kurator:failed', v: 1, id, ... } */
var KUR = { url: 'http://127.0.0.1:8765', win: null, ready: false, stale: false, pending: null, timer: 0 };
function loopbackOrigin(s) {
  try { var u = new URL(s); return /^https?:$/.test(u.protocol) && /^(127\.0\.0\.1|localhost|\[::1\])$/.test(u.hostname) ? u.origin : null; } catch (e) { return null; }
}
function loadKurator() { try { var o = loopbackOrigin(localStorage.getItem('bfx-kurator') || ''); if (o) KUR.url = o; } catch (e) { /* the default port */ } }
/* Kurator opens Ballistic with #kurator=<its address>: remembered, and only ever a loopback address */
function kuratorFromLink() {
  var m = /([#&])kurator=([^&]*)/.exec(location.hash);
  if (!m) return;
  var rest = location.hash.replace(/[#&]kurator=[^&]*/, '').replace(/^#?&?/, '');
  history.replaceState(null, '', location.pathname + location.search + (rest ? '#' + rest : ''));
  var o = null; try { o = loopbackOrigin(decodeURIComponent(m[2])); } catch (e) { o = null; }
  if (!o) return;
  KUR.url = o; KUR.win = null;
  try { localStorage.setItem('bfx-kurator', o); } catch (e) { /* for this visit */ }
}
/* only on a computer, from the site or a local server: the offline file and the Claude viewer have no address Kurator could trust */
function kuratorHere() {
  if (inViewer || !/^https?:$/.test(location.protocol)) return false;
  var mobile = navigator.userAgentData ? navigator.userAgentData.mobile : /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
  return !mobile;
}
function openKurator() {
  var w = KUR.win && !KUR.win.closed ? KUR.win : null;
  if (w && KUR.stale) { try { w.location.href = KUR.url + '/receive'; } catch (e) { w = null; } KUR.ready = false; }
  if (!w) {
    w = window.open('', 'kurator');
    if (!w) { setStatus('The browser blocked the new window. Allow pop-ups for this site, then send again.'); return false; }
    var fresh; try { fresh = w.location.href === 'about:blank'; } catch (e) { fresh = false; }
    if (fresh || KUR.stale) { try { w.location.href = KUR.url + '/receive'; } catch (e) { /* answered by the timeout */ } }
    KUR.ready = !(fresh || KUR.stale);
  }
  KUR.stale = false; KUR.win = w;
  return true;
}
function postKurator() {
  var m = {}, k; for (k in KUR.pending) if (k !== 'noun') m[k] = KUR.pending[k];
  try { KUR.win.postMessage(m, KUR.url); } catch (e) { /* answered by "ready" when it loads */ }
}
function kuratorWait(ms, text) {
  clearTimeout(KUR.timer);
  var msg = KUR.pending;
  KUR.timer = setTimeout(function () {
    if (KUR.pending !== msg) return;
    KUR.pending = null; KUR.stale = true;
    setStatus(text);
  }, ms);
}
var KUR_GONE = 'Kurator did not answer. Start Kurator on this computer (a version newer than 0.19.1 takes sessions), then send again. If it runs on another port, open Ballistic from Kurator (Settings, Recording sessions, Open Ballistic Foley Lab) once.';
function sendToKurator(list, plan, sid, name, noun) {
  var what = plural(list.length, noun);
  if (!list.length || !kuratorHere()) return;
  /* the window has to open inside the click, before the zip is made */
  if (!openKurator()) return;
  var zip = sessionZip(list, plan, sid);
  KUR.pending = { type: 'kurator:import', v: 1, id: 'bfl-' + Date.now().toString(36), name: name, what: what, noun: noun,
    bytes: zip.byteOffset || zip.byteLength !== zip.buffer.byteLength ? zip.slice().buffer : zip.buffer };
  setStatus('Sending ' + what + ' to Kurator');
  if (KUR.ready) { postKurator(); kuratorWait(120000, 'Kurator did not say whether it took the ' + what + '. Look in Kurator, or send again: it does not add a take twice.'); }
  else kuratorWait(15000, KUR_GONE);
}
window.addEventListener('message', function (e) {
  if (e.origin !== KUR.url || !e.data || e.data.v !== 1) return;
  var d = e.data;
  if (d.type === 'kurator:ready') {
    if (e.source) KUR.win = e.source;
    KUR.ready = true;
    if (KUR.pending) { postKurator(); kuratorWait(120000, 'Kurator did not say whether it took the ' + KUR.pending.what + '. Look in Kurator, or send again: it does not add a take twice.'); }
    return;
  }
  if (!KUR.pending || d.id !== KUR.pending.id || (d.type !== 'kurator:imported' && d.type !== 'kurator:failed')) return;
  clearTimeout(KUR.timer);
  var what = KUR.pending.what, noun = KUR.pending.noun; KUR.pending = null;
  if (d.type === 'kurator:failed') { setStatus('Kurator could not take the ' + what + ': ' + String(d.error || 'no reason given').slice(0, 200)); return; }
  var folder = String(d.folder || '').split(/[\\/]/).filter(Boolean).pop() || '';
  if (d.already) setStatus('Kurator has these ' + what + ' already: nothing new.');
  else if (!d.files) setStatus('All ' + what + ' were in Kurator already' + (folder ? ', in ' + folder : '') + '.');
  else setStatus('Sent to Kurator: ' + plural(d.files, 'new ' + noun) + ' in ' + folder + (d.skipped ? ' (' + d.skipped + ' there already)' : '') +
    (d.plan ? ', counted against the plan ' + String(d.plan).slice(0, 80) : '') + '.');
});

function start(saved) {
  var pr = B.PRESETS[0], ap = B.ACTION_PRESETS[1];
  st.p = B.merge(B.DEFAULTS, pr.p); st.a = B.merge(B.ACTION_DEFAULTS, ap.a);
  if (saved && saved.p && saved.a) {
    st.p = B.merge(B.DEFAULTS, saved.p); st.a = B.merge(B.ACTION_DEFAULTS, saved.a);
    st.sp = saved.sp || ''; st.ap = saved.ap || ''; st.which = saved.which === 'raw' ? 'raw' : 'fx'; st.seed = saved.seed || st.seed;
  }
  loadSession(); deviceInfo(); loadRV(); loadKurator(); kuratorFromLink();
  var restore = restoreSounds();
  refreshColors(); buildControls();
  syncControls(); startWorker();
  drawScene(restTime()); drawScope(null); drawSpec(null);
  rerender(false);

  $('fire').addEventListener('click', function () { st.seed = 1000 + Math.floor(Math.random() * 9000); rerender(true, true); });
  $('again').addEventListener('click', function () { if (playing) { stop(); drawAll(null); } else play(); });
  $('ab-raw').addEventListener('click', function () { setWhich('raw'); });
  $('ab-fx').addEventListener('click', function () { setWhich('fx'); });
  $('save').addEventListener('click', saveWav);
  $('send').addEventListener('click', sendToWorkbench);
  if (inViewer) {
    /* inside Claude a save goes through the downloads capability, which takes zips */
    window.claude.use('downloads').then(function (d) { if (d) { dl = d; $('save').hidden = false; } }).catch(function () {});
  } else {
    $('save').hidden = false;
    WB.url = workbenchUrl();
    $('send').hidden = !WB.url;
  }
  if (window.ResizeObserver) { new ResizeObserver(function () { cache = {}; if (!playing) drawAll(null); }).observe($('scopes')); new ResizeObserver(function () { drawRef(); }).observe($('bank-ref')); }
  var themeChange = function () { refreshColors(); if (!playing) drawAll(null); drawRef(); };
  if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', themeChange); }
  if (window.MutationObserver) new MutationObserver(themeChange).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!playing) drawAll(null); });
  /* the sounds kept in this browser come back; a slot whose sound is gone falls back to its example */
  wireRV();
  restore.then(function () {
    SOUND_KEYS.forEach(function (k) { if (!B.getAsset(st.p[k])) st.p[k] = SOUND_DEFAULT[k]; });
    refreshSoundSelects(); renderLibrary(); syncControls(); renderRV();
    if (LIB.length) rerender(false);
    planFromLink();
  });
  window.addEventListener('hashchange', function () { kuratorFromLink(); planFromLink(); });
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(function () { return { p: st.p, a: st.a, sp: st.sp, ap: st.ap, which: st.which, seed: st.seed }; });
}
var hot0 = window.claude && window.claude.hot;
if (hot0 && hot0.ready) hot0.ready(start); else start((hot0 && hot0.data) || {});
})();
