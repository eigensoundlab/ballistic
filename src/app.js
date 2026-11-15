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
  ['discharge', 'Discharge'], ['blaster', 'Blaster'], ['field', 'Forcefield'], ['recording', 'Recording']];
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
  recording: [['Recording', 'direct, with its ground bounce'], ['Body', 'the recording through it'], null, null]
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
  recording: 'A recording has no known level. The body is set to the loudness of the recording; distance, air and ground bounce follow the geometry.'
};
var P = ['projectile'], X = ['explosion'], I = ['implosion'], D = ['destruction'], K = ['rocket'], T = ['rotor'], PK = ['projectile', 'rocket'], PKT = ['projectile', 'rocket', 'rotor'], G = ['discharge'], W = ['blaster'], F = ['field'], PKTW = ['projectile', 'rocket', 'rotor', 'blaster'], RC = ['recording'], PKW = ['projectile', 'rocket', 'blaster'];
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
  { bank: 'source', kinds: RC, id: 'rcAsset', label: 'Recording', options: Object.keys(B.EXAMPLES).map(function (k) { return [k, B.EXAMPLES[k].name]; }) },
  { bank: 'source', kinds: RC, id: 'rcTools', custom: recTools },
  { bank: 'source', kinds: RC, id: 'rcMode', label: 'Movement', options: [['place', 'Placed in the scene'], ['flyby', 'Flies past']] },
  { bank: 'source', kinds: RC, when: isPlaced, id: 'rcDist', label: 'Distance', min: 0.3, max: 2000, scale: 'log', fmt: fDist },
  { bank: 'source', kinds: RC, when: isFlyby, id: 'rcSpeed', label: 'Speed', min: 1, max: 330, scale: 'log', fmt: fSpeed },
  { bank: 'source', kinds: RC, when: isFlyby, id: 'rcPass', label: 'Pass length', hint: 'the recording loops if shorter', min: 2, max: 20, fmt: fTime },
  { bank: 'source', kinds: RC, when: isFlyby, id: 'rcHeight', label: 'Source height', hint: 'sets the ground flanging', min: 0.1, max: 500, scale: 'log', fmt: fDist },
  { bank: 'source', kinds: RC, id: 'rcBody', label: 'Body', hint: 'the recording drives it', options: [['none', 'None'], ['steel', 'Steel plate'], ['aluminium', 'Aluminium plate'], ['glass', 'Glass pane'], ['ice', 'Ice sheet'], ['wood', 'Wood panel'], ['rail', 'Steel rail'], ['line', 'Dispersive line'], ['spring', 'Spring'], ['ir', 'Imported body IR']] },
  { bank: 'source', kinds: RC, when: recPlate, id: 'rcThick', label: 'Thickness', min: 0.3, max: 300, scale: 'log', fmt: function (v) { return v.toFixed(v < 10 ? 1 : 0) + ' mm'; } },
  { bank: 'source', kinds: RC, when: recPlate, id: 'rcSize', label: 'Plate size', min: 0.1, max: 100, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: RC, when: recLong, id: 'rcLength', label: 'Length', min: 0.1, max: 120, scale: 'log', fmt: fLen },
  { bank: 'source', kinds: RC, id: 'rcIrTools', custom: bodyTools },
  { bank: 'source', kinds: X, id: 'exW', label: 'Charge', hint: 'TNT equivalent', min: 0.02, max: 5000, scale: 'log', fmt: fMass },
  { bank: 'source', kinds: X, id: 'exFrags', label: 'Fragments', hint: 'passing the listener', min: 0, max: 16, round: 1, fmt: fCount },
  { bank: 'source', kinds: X, id: 'exDebris', label: 'Debris pieces', min: 0, max: 120, round: 1, fmt: fCount },
  { bank: 'source', kinds: X, id: 'exSurface', label: 'Debris lands on', options: SURF },
  { bank: 'source', kinds: I, id: 'imR0', label: 'Cavity radius', min: 0.03, max: 8, scale: 'log', fmt: function (v) { return v >= 1 ? v.toFixed(2) + ' m' : (v * 100).toFixed(0) + ' cm'; } },
  { bank: 'source', kinds: I, id: 'imDp', label: 'Outside pressure', min: 1, max: 400, scale: 'log', fmt: function (v) { return v.toFixed(v < 10 ? 1 : 0) + ' atm'; } },
  { bank: 'source', kinds: I, id: 'imGas', label: 'Gas left inside', hint: 'cushions the collapse', min: 0.003, max: 0.3, scale: 'log', fmt: function (v) { return (v * 100).toFixed(v < 0.1 ? 1 : 0) + '%'; } },
  { bank: 'source', kinds: I, id: 'imMedium', label: 'Medium', options: [['air', 'Air'], ['water', 'Water']] },
  { bank: 'source', kinds: I, id: 'imShell', label: 'Shell', options: [['none', 'None'], ['glass', 'Glass'], ['steel', 'Steel']] },
  { bank: 'source', kinds: I, id: 'imGroan', label: 'Stress lead-in', min: 0, max: 3, fmt: fTime },
  { bank: 'source', kinds: D, id: 'dsMat', label: 'Material', options: MATS },
  { bank: 'source', kinds: D, id: 'dsMass', label: 'Mass', min: 0.2, max: 20000, scale: 'log', fmt: fMass },
  { bank: 'source', kinds: D, id: 'dsHeight', label: 'Drop height', min: 0.3, max: 40, scale: 'log', fmt: fDist },
  { bank: 'source', kinds: D, id: 'dsPieces', label: 'Pieces', min: 3, max: 150, scale: 'log', round: 1, fmt: fCount },
  { bank: 'source', kinds: D, id: 'dsGroan', label: 'Stress lead-in', min: 0, max: 4, fmt: fTime },

  { bank: 'scene', kinds: K, id: 'rkPath', label: 'Path', options: [['horizontal', 'Horizontal'], ['vertical', 'Vertical']] },
  { bank: 'scene', kinds: PKTW, id: 'D', label: 'Listener downrange', min: 0, max: 2000, scale: 'pow', fmt: fDist },
  { bank: 'scene', kinds: PKTW.concat(RC), when: function (p) { return p.kind !== 'recording' || p.rcMode === 'flyby'; }, id: 'miss', label: 'Distance off the path', min: 0.2, max: 1000, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: P, id: 'launch', label: 'Launch sound', options: [['blast', 'Muzzle blast'], ['string', 'Bowstring'], ['ricSteel', 'Ricochet off steel'], ['ricStone', 'Ricochet off concrete'], ['none', 'None']] },
  { bank: 'scene', kinds: PK, id: 'target', label: 'Target', options: [['none', 'None'], ['steel', 'Steel plate'], ['wood', 'Wood'], ['dirt', 'Dirt'], ['concrete', 'Concrete'], ['glass', 'Glass']] },
  { bank: 'scene', kinds: PKW, when: function (p) { return p.kind !== 'blaster' || p.tgMat !== 'none'; }, id: 'targetDist', label: 'Target distance', min: 0.05, max: 2500, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: G, id: 'dcOrient', label: 'Channel', options: [['horizontal', 'Horizontal arc'], ['vertical', 'Vertical strike']] },
  { bank: 'scene', kinds: G, id: 'dcDist', label: 'Distance', min: 0.3, max: 5000, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: F, id: 'ffDist', label: 'Distance', min: 0.5, max: 200, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: X, id: 'exDist', label: 'Distance', min: 3, max: 3000, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: I, id: 'imDist', label: 'Distance', min: 1, max: 2000, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: D, id: 'dsDist', label: 'Distance', min: 1, max: 200, scale: 'log', fmt: fDist },
  { bank: 'scene', kinds: D, id: 'dsSpread', label: 'Footprint', hint: 'half width', min: 0.2, max: 20, scale: 'log', fmt: fDist },
  { bank: 'scene', id: 'env', label: 'Environment', options: Object.keys(B.ENVS).map(function (k) { return [k, B.ENVS[k].name]; }) },
  { bank: 'scene', when: function (p) { return p.env === 'ir'; }, id: 'irWet', label: 'Room level', min: -30, max: 6, round: 0.5, fmt: fDb },
  { bank: 'scene', id: 'roomTools', custom: roomTools },
  { bank: 'scene', id: 'ground', label: 'Ground bounce', min: 0, max: 0.8, fmt: fPct },

  { bank: 'seq', id: 'seqCount', label: 'Repeats', min: 1, max: 16, round: 1, fmt: function (v) { return Math.round(v) + (v < 1.5 ? ' event' : ' events'); } },
  { bank: 'seq', id: 'seqInterval', label: 'Interval', min: 0.02, max: 3, scale: 'log', fmt: fTime },
  { bank: 'seq', id: 'seqJitter', label: 'Variation', hint: 'timing, distance, side', min: 0, max: 1, fmt: fPct },

  { bank: 'mix', id: 'trimCrack', trim: 0, min: -40, max: 24, round: 1, fmt: fDb },
  { bank: 'mix', id: 'trimLaunch', trim: 1, min: -40, max: 24, round: 1, fmt: fDb },
  { bank: 'mix', id: 'trimWake', trim: 2, min: -40, max: 24, round: 1, fmt: fDb },
  { bank: 'mix', id: 'trimImpact', trim: 3, min: -40, max: 24, round: 1, fmt: fDb }
];
SPEC.forEach(function (s) { if (!s.obj) s.obj = 'p'; });
function isPlasma(p) { return p.ffType === 'plasma'; }
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
var st = { p: null, a: null, sp: 'rifle', ap: 'game', which: 'fx', seed: 4821 };
var an = null, result = null, jobId = 0, worker = null, watchdog = 0, lastMsg = null, rows = {};
var ctx = null, node = null, playing = false, playStart = 0, raf = 0, dl = null;
var col = {}, cache = {};
var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setStatus(t) { $('status').textContent = t; }
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
    if (s.options) {
      var sel = el('select'); sel.id = 'c-' + s.id;
      s.options.forEach(function (o) { var op = el('option', null, o[1]); op.value = o[0]; sel.appendChild(op); });
      sel.addEventListener('change', function () { st[s.obj][s.id] = sel.value; touched(s); rerender(true); });
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
    if (s.options) SPEC.forEach(function (q) { if (q.when) rows[q.id].row.hidden = !!(q.kinds && q.kinds.indexOf(kind()) < 0) || !q.when(st.p); });
    toolStates();
    reanalyze(); capText(); drawScene(restTime()); readouts();
  } else st.ap = '';
  markChips();
}
function press(host, id) { Array.prototype.forEach.call(host.children, function (b) { b.setAttribute('aria-pressed', b.dataset.id === id ? 'true' : 'false'); }); }
function markChips() {
  press($('srcChips'), st.sp); press($('fxChips'), st.ap); press($('kinds'), kind());
  $('ab-raw').setAttribute('aria-pressed', st.which === 'raw' ? 'true' : 'false');
  $('ab-fx').setAttribute('aria-pressed', st.which === 'fx' ? 'true' : 'false');
}
function capText() {
  var k = kind();
  $('sceneCap').textContent = { projectile: 'Top view. The lateral axis is stretched to fit.', explosion: 'Top view: blast front, fragments, debris landing.',
    implosion: 'Cavity radius against time.', destruction: 'Height of each piece against time.',
    rocket: st.p.rkMode === 'static' ? 'Modelled jet noise spectrum.' : 'Path view. The lateral axis is stretched to fit.', rotor: 'Speed of each rotor against time.',
    discharge: 'The channel and the listener. Lit parts have been heard.', blaster: st.p.bvType !== 'none' ? 'Path view. The lateral axis is stretched to fit.' : 'Frequency against arrival time: each curve is one path of a dispersive wave.', recording: st.p.rcMode === 'flyby' ? 'Path view, from above. The lateral axis is stretched to fit.' : st.p.rcBody !== 'none' && st.p.rcBody !== 'ir' ? 'Frequency against arrival time: each curve is one path through the body.' : 'The recording, as loaded.',
    field: st.p.ffType === 'plasma' ? 'Slow, shear and fast waves, plus the half-frequency ripple.' : 'Modes of the field, level against frequency.' }[k];
}
function syncControls() {
  var k = kind(), kn = KINDS.filter(function (x) { return x[0] === k; })[0][1];
  SPEC.forEach(function (s) {
    var c = $('c-' + s.id), v = st[s.obj][s.id], r = rows[s.id];
    r.row.hidden = !!(s.kinds && s.kinds.indexOf(k) < 0) || !!(s.when && !s.when(st.p));
    if (s.custom) return;
    if (s.trim != null) {
      var tl = TRIMS[k][s.trim];
      if (!tl) { r.row.hidden = true; return; }
      r.tx.nodeValue = tl[0]; r.hint.textContent = tl[1];
    }
    if (s.options) c.value = v; else { c.value = Math.round(toPos(s, v) * 1000); $('o-' + s.id).textContent = s.fmt(v); }
  });
  Array.prototype.forEach.call($('srcChips').children, function (b) { b.hidden = b.dataset.kind !== k; });
  $('lg-source').textContent = kn; $('mixNote').textContent = MIX_NOTE[k];
  capText(); toolStates();
  markChips(); reanalyze(); readouts();
}

/* ---------- rendering ---------- */
function startWorker() {
  /* the offline file and the Claude artifact carry the engine inline; the site loads src/worker.js */
  var inline = $('engine');
  try {
    worker = inline ? new Worker(URL.createObjectURL(new Blob([inline.textContent + '\nself.onmessage=function(e){var r=self.BFX.job(e.data);if(r)self.postMessage(r);};'], { type: 'text/javascript' })))
      : new Worker('src/worker.js');
    worker.onmessage = function (e) { if (e.data && e.data.kind === 'stems') gotStems(e.data); else finish(e.data); };
    worker.onerror = function () { dropWorker(); };
  } catch (err) { worker = null; }
}
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
  lastMsg = msg; setStatus('Rendering');
  clearTimeout(watchdog);
  if (worker) { worker.postMessage(msg); watchdog = setTimeout(function () { if (msg.id === jobId && (!result || result.id !== msg.id)) dropWorker(); }, 8000); }
  else runSync(msg);
}
function finish(res) {
  if (res.id !== jobId) return;
  clearTimeout(watchdog);
  result = res; cache = {};
  reanalyze(); readouts();
  var v = view();
  setStatus((v.L.length / FS).toFixed(2) + ' s' + (v.loop ? ' seamless loop' : '') + ', rendered in ' + res.ms + ' ms, take ' + st.seed);
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
  if (!silent && result) { var v = view(); setStatus((v.L.length / FS).toFixed(2) + ' s, take ' + st.seed); if ($('audition').checked) play(); else { stop(); drawAll(null); } }
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
    an.kind === 'rotor' ? sceneRotor : an.kind === 'discharge' ? sceneDischarge : an.kind === 'blaster' ? sceneBlaster : an.kind === 'field' ? sceneField : an.kind === 'recording' ? sceneRecording :
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
    items = [['Pieces', String(ds.n)], ['Largest piece', fMass(ds.big)], ['Energy', fEnergy(ds.E)], ['Break-up', fTime(ds.Tfrac)],
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
/* ---------- recordings and impulse responses ---------- */
var assetSeq = 0;
function fileInput(onFile) {
  var inp = el('input'); inp.type = 'file'; inp.accept = 'audio/*,.wav,.wave,.aif,.aiff,.flac,.mp3,.ogg'; inp.hidden = true;
  inp.addEventListener('change', function () { if (inp.files && inp.files[0]) onFile(inp.files[0]); inp.value = ''; });
  return inp;
}
function toolButton(id, text, title, onClick) { var b = el('button', 'btn small', text); b.type = 'button'; b.id = id; b.title = title; b.addEventListener('click', onClick); return b; }
function recTools() {
  var box = el('div', 'toolrow'), inp = fileInput(loadRecording);
  box.appendChild(toolButton('load-rec', 'Load a recording', 'WAV, AIFF, FLAC, MP3 or OGG; the first 15 s are used', function () { inp.click(); }));
  box.appendChild(inp);
  return box;
}
function bodyTools() {
  var box = el('div', 'toolrow'), inp = fileInput(loadBodyIR);
  box.appendChild(toolButton('load-body-ir', 'Load a body IR', 'A recorded knock or tap on an object: the recording rings it', function () { inp.click(); }));
  box.appendChild(toolButton('save-body-ir', 'Save body IR', 'The body as a 32-bit float impulse response, for any convolution reverb', saveBodyIR));
  box.appendChild(inp);
  return box;
}
function roomTools() {
  var box = el('div', 'toolrow'), inp = fileInput(loadRoomIR);
  box.appendChild(toolButton('load-room-ir', 'Load a room IR', 'A recorded impulse response of a space, used as the environment for every source', function () { inp.click(); }));
  box.appendChild(toolButton('save-room-ir', 'Save room IR', 'The environment\'s reverb as a 32-bit float impulse response', saveRoomIR));
  box.appendChild(inp);
  return box;
}
function toolStates() {
  if (!$('save-room-ir')) return;
  $('save-room-ir').disabled = !(B.ENVS[st.p.env] && B.ENVS[st.p.env].rt60);
  $('save-body-ir').disabled = st.p.rcBody === 'none' || st.p.rcBody === 'ir';
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
function shareAsset(id, name, L, R) {
  B.setAsset(id, { name: name, L: L, R: R });
  if (worker) worker.postMessage({ asset: true, id: id, name: name, L: L, R: R });
}
function readFailed(file) { setStatus('Could not read ' + file.name + ' as audio. Try WAV, AIFF, FLAC, MP3 or OGG.'); }
function enableOption(sel, value, text) { var op = $(sel).querySelector('option[value="' + value + '"]'); if (op) { op.disabled = false; op.textContent = text; } }
function loadRecording(file) {
  setStatus('Reading ' + file.name);
  decodeAudio(file).then(function (a) {
    var id = 'rec:' + (++assetSeq), name = file.name.replace(/\.[^.]+$/, ''), op = el('option', null, name);
    shareAsset(id, name, a.L, a.R);
    op.value = id; $('c-rcAsset').appendChild(op);
    st.p.rcAsset = id; st.sp = ''; syncControls(); rerender(true);
  }).catch(function () { readFailed(file); });
}
function loadBodyIR(file) {
  decodeAudio(file).then(function (a) {
    var ir = B.prepareIR(a.L, a.R), id = 'ir:' + (++assetSeq), name = file.name.replace(/\.[^.]+$/, '');
    shareAsset(id, name, ir.L, ir.R);
    enableOption('c-rcBody', 'ir', 'Imported: ' + name);
    st.p.rcIr = id; st.p.rcBody = 'ir'; st.sp = ''; syncControls(); rerender(true);
  }).catch(function () { readFailed(file); });
}
function loadRoomIR(file) {
  decodeAudio(file).then(function (a) {
    var ir = B.prepareIR(a.L, a.R), id = 'ir:' + (++assetSeq), name = file.name.replace(/\.[^.]+$/, '');
    shareAsset(id, name, ir.L, ir.R);
    enableOption('c-env', 'ir', 'Imported: ' + name);
    st.p.irAsset = id; st.p.env = 'ir'; st.sp = ''; syncControls(); rerender(true);
  }).catch(function () { readFailed(file); });
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
function stemLabel(k) { return TRIMS[kind()][k][0]; }
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
  stems.forEach(function (s, k) { if (s) out.push({ name: stemName(k) + '.wav', data: enc(s.L, s.R), label: stemLabel(k) }); });
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
function saveWav() {
  var v = view(); if (!v) return;
  var wav = B.encodeWav(v.L, v.R);
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
function postPending() { try { WB.win.postMessage(WB.pending, location.origin); } catch (e) { /* answered by "ready" when it loads */ } }
function sendToWorkbench() {
  var v = view(); if (!v || !WB.url) return;
  /* the window has to open inside the click, before any stems are rendered, or the browser blocks it */
  var w = WB.win && !WB.win.closed ? WB.win : null, fresh = false;
  if (!w) {
    w = window.open('', 'sfxworkbench');
    if (!w) { setStatus('The browser blocked the new window. Allow pop-ups for this site, then send again.'); return; }
    try { fresh = w.location.href === 'about:blank'; } catch (e) { fresh = false; }
    if (fresh) w.location.href = WB.url;
    WB.ready = !fresh;
  }
  WB.win = w;
  try { w.focus(); } catch (e) { /* focus is up to the browser */ }
  var base = mixName(), files = [{ name: base + '.wav', bytes: B.encodeWavFloat(v.L, v.R).buffer, role: 'mix' }];
  function go(stems) {
    stemFiles(stems || [], B.encodeWavFloat).forEach(function (f) { files.push({ name: f.name, bytes: f.data.buffer, role: 'stem' }); });
    WB.pending = { type: 'sfxworkbench:import', v: 1, id: base + '-' + Date.now().toString(36), from: 'Ballistic Foley Lab', group: 'Ballistic Foley Lab', files: files };
    if (WB.ready) postPending();
    var n = files.length - 1, msg = WB.pending;
    setStatus('Sending ' + base + '.wav' + (n ? ' and ' + plural(n, 'stem') : '') + ' to SFX Workbench');
    clearTimeout(WB.timer);
    WB.timer = setTimeout(function () {
      if (WB.pending === msg) { WB.pending = null; setStatus('SFX Workbench did not answer. Reload it, then send again.'); }
    }, 20000);
  }
  if (wantStems()) requestStems().then(go); else go(null);
}
window.addEventListener('message', function (e) {
  if (e.origin !== location.origin || !e.data) return;
  if (e.data.type === 'sfxworkbench:ready') {
    if (e.source) WB.win = e.source;
    WB.ready = true;
    if (WB.pending) postPending();
  } else if (e.data.type === 'sfxworkbench:imported' && WB.pending && e.data.id === WB.pending.id) {
    clearTimeout(WB.timer);
    var n = WB.pending.files.length - 1;
    WB.pending = null;
    setStatus('Sent to SFX Workbench: in its library under Ballistic Foley Lab' + (n ? ', with ' + plural(n, 'stem') : '') + '.');
  }
});

function start(saved) {
  var pr = B.PRESETS[0], ap = B.ACTION_PRESETS[1];
  st.p = B.merge(B.DEFAULTS, pr.p); st.a = B.merge(B.ACTION_DEFAULTS, ap.a);
  if (saved && saved.p && saved.a) {
    st.p = B.merge(B.DEFAULTS, saved.p); st.a = B.merge(B.ACTION_DEFAULTS, saved.a);
    st.sp = saved.sp || ''; st.ap = saved.ap || ''; st.which = saved.which === 'raw' ? 'raw' : 'fx'; st.seed = saved.seed || st.seed;
  }
  /* loaded recordings and impulse responses last as long as the page: after a reload, fall back to what is built in */
  if (!B.getAsset(st.p.rcAsset)) st.p.rcAsset = 'ex:engine';
  if (st.p.env === 'ir' && !B.getAsset(st.p.irAsset)) st.p.env = 'field';
  if (st.p.rcBody === 'ir' && !B.getAsset(st.p.rcIr)) st.p.rcBody = 'none';
  refreshColors(); buildControls();
  [['c-env', 'Imported room: load one below'], ['c-rcBody', 'Imported body: load one below']].forEach(function (o) { var op = $(o[0]).querySelector('option[value="ir"]'); op.disabled = true; op.textContent = o[1]; });
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
  if (window.ResizeObserver) new ResizeObserver(function () { cache = {}; if (!playing) drawAll(null); }).observe($('scopes'));
  var themeChange = function () { refreshColors(); if (!playing) drawAll(null); };
  if (window.matchMedia) { var mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', themeChange); }
  if (window.MutationObserver) new MutationObserver(themeChange).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { if (!playing) drawAll(null); });
  var hot = window.claude && window.claude.hot;
  if (hot && hot.snapshot) hot.snapshot(function () { return { p: st.p, a: st.a, sp: st.sp, ap: st.ap, which: st.which, seed: st.seed }; });
}
var hot0 = window.claude && window.claude.hot;
if (hot0 && hot0.ready) hot0.ready(start); else start((hot0 && hot0.data) || {});
})();
