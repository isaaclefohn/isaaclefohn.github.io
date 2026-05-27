/**
 * Procedural SFX generator for Chroma Drop.
 *
 * Writes 22050 Hz mono PCM16 WAV files into assets/sounds/. These are
 * deliberately tiny (sub-10 KB each) and placeholder-grade but give the
 * game real audio feedback without any third-party dependencies or
 * licensing concerns. Higher-quality CC0 assets can replace them later
 * without touching app code — filenames stay the same.
 *
 * Run with:
 *   node scripts/generate-sounds.js
 */

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 22050;
const OUT_DIR = path.join(__dirname, '..', 'assets', 'sounds');

/** Encode a Float32 sample array (clipped to [-1, 1]) as a PCM16 WAV Buffer. */
function encodeWav(samples) {
  const dataSize = samples.length * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(SAMPLE_RATE, 24);
  buf.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buf.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }
  return buf;
}

/** Build an empty sample array sized for a given duration in seconds. */
function buffer(seconds) {
  return new Float32Array(Math.round(SAMPLE_RATE * seconds));
}

/** Quick ADSR-ish envelope — mostly attack/decay for short SFX. */
function envelope(i, total, attack = 0.02, release = 0.6) {
  const t = i / total;
  if (t < attack) return t / attack;
  if (t > 1 - release) return Math.max(0, (1 - t) / release);
  return 1;
}

function sine(freq, phase) {
  return Math.sin(2 * Math.PI * freq * phase);
}

function triangle(freq, phase) {
  const x = (freq * phase) % 1;
  return 4 * Math.abs(x - 0.5) - 1;
}

/** Add a tone with frequency sweep and envelope into an existing buffer. */
function addTone(out, startSec, durSec, freqStart, freqEnd, amp, wave = sine, release = 0.6) {
  const startSample = Math.round(startSec * SAMPLE_RATE);
  const dur = Math.round(durSec * SAMPLE_RATE);
  let phase = 0;
  const dt = 1 / SAMPLE_RATE;
  for (let i = 0; i < dur; i++) {
    const k = i / dur;
    const freq = freqStart + (freqEnd - freqStart) * k;
    phase += dt;
    const env = envelope(i, dur, 0.02, release);
    const idx = startSample + i;
    if (idx < out.length) out[idx] += amp * env * wave(freq, phase);
  }
}

// --- Sound designs ------------------------------------------------------

function makePlace() {
  // Short low "tock" — 60 ms, 180 → 140 Hz triangle with quick decay.
  const out = buffer(0.08);
  addTone(out, 0, 0.07, 180, 140, 0.55, triangle, 0.7);
  return out;
}

function makeClear() {
  // Bright chime — 660 → 990 Hz sine, 180 ms, long tail.
  const out = buffer(0.22);
  addTone(out, 0, 0.2, 660, 990, 0.5, sine, 0.75);
  addTone(out, 0.02, 0.18, 1320, 1980, 0.2, sine, 0.8);
  return out;
}

function makeCombo() {
  // Rising major arpeggio C-E-G-C' → the classic "combo pop".
  const out = buffer(0.32);
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((f, i) => addTone(out, i * 0.06, 0.1, f, f, 0.45, sine, 0.6));
  return out;
}

function makeGameOver() {
  // Sad descending minor — A4 → F4 → D4, triangle wave, slow decay.
  const out = buffer(0.7);
  const notes = [440, 349.23, 293.66];
  notes.forEach((f, i) => addTone(out, i * 0.2, 0.25, f, f * 0.96, 0.5, triangle, 0.85));
  return out;
}

function makeLevelWin() {
  // Triumphant major triad fanfare — C-E-G stacked plus octave lift.
  const out = buffer(0.9);
  addTone(out, 0, 0.25, 523.25, 523.25, 0.35, sine, 0.5);
  addTone(out, 0.1, 0.35, 659.25, 659.25, 0.35, sine, 0.6);
  addTone(out, 0.2, 0.5, 783.99, 783.99, 0.4, sine, 0.7);
  addTone(out, 0.35, 0.55, 1046.5, 1174.66, 0.35, sine, 0.75);
  return out;
}

function makeButton() {
  // Subtle UI click — 550 Hz triangle, 35 ms, fast decay.
  const out = buffer(0.05);
  addTone(out, 0, 0.04, 550, 500, 0.35, triangle, 0.8);
  return out;
}

function makeSelect() {
  // Light tick for piece selection — 880 Hz sine, 30 ms.
  const out = buffer(0.04);
  addTone(out, 0, 0.03, 880, 880, 0.35, sine, 0.7);
  return out;
}

// --- Per-color pentatonic notes ---------------------------------------
//
// The audio research from the 2026-05 dopamine-amplifier wave called
// out per-color audio as the single biggest sensory channel still
// missing. The plan: each of the 6 brand hues plays a different note
// from the C major pentatonic scale (C, D, E, G, A, C′). Pentatonic
// is the key choice — any combination of pentatonic notes is
// consonant by construction, so when a chromatic clear fires multiple
// notes at once (cascade chains across colors), the resulting chord
// stays musical instead of dissonant.
//
// Hue → note mapping uses the same BrandSplash sequence as everywhere
// else (Red, Yellow, Blue, Teal, Purple, Orange). Notes ascend through
// the brand sequence so the wordmark CHROMA also plays as a melody
// when you read it left to right.
//
//   Hue       Letter  Note      Freq (Hz, A4=440 equal temperament)
//   Red       C       C5        523.25
//   Yellow    H       D5        587.33
//   Blue      R       E5        659.25
//   Teal      O       G5        783.99
//   Purple    M       A5        880.00
//   Orange    A       C6        1046.50

const COLOR_NOTES = [
  { hue: 'red',    freq: 523.25 },
  { hue: 'yellow', freq: 587.33 },
  { hue: 'blue',   freq: 659.25 },
  { hue: 'teal',   freq: 783.99 },
  { hue: 'purple', freq: 880.00 },
  { hue: 'orange', freq: 1046.50 },
];

/**
 * Build a mallet/bell-like tone using additive synthesis: fundamental
 * plus 3rd-harmonic + 5th-harmonic overtones with their own faster
 * decays. Pure sine sounds clinical; layered harmonics give the bell
 * its "ring" character without needing a real sample file.
 */
function makeColorNote(freq, durSec) {
  const out = buffer(durSec);
  // Fundamental — long, soft, the "body" of the note
  addTone(out, 0, durSec, freq, freq, 0.45, sine, 0.85);
  // 3rd harmonic — adds bell-like ring, decays faster
  addTone(out, 0, durSec * 0.55, freq * 3, freq * 3, 0.10, sine, 0.7);
  // 5th harmonic — sparkles the attack, decays fastest
  addTone(out, 0, durSec * 0.3, freq * 5, freq * 5, 0.06, sine, 0.5);
  return out;
}

const colorNotes = {};
for (const { hue, freq } of COLOR_NOTES) {
  // 220 ms is long enough to hear the bell ring, short enough that
  // chromatic-clear chains don't bleed into each other.
  colorNotes[`color-${hue}.wav`] = makeColorNote(freq, 0.22);
}

// --- Main ---------------------------------------------------------------

const sounds = {
  'place.wav': makePlace(),
  'clear.wav': makeClear(),
  'combo.wav': makeCombo(),
  'game-over.wav': makeGameOver(),
  'level-win.wav': makeLevelWin(),
  'button.wav': makeButton(),
  'select.wav': makeSelect(),
  ...colorNotes,
};

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

for (const [name, samples] of Object.entries(sounds)) {
  const buf = encodeWav(samples);
  fs.writeFileSync(path.join(OUT_DIR, name), buf);
  console.log(`  wrote ${name}  (${buf.length} bytes, ${(samples.length / SAMPLE_RATE * 1000).toFixed(0)} ms)`);
}
console.log(`Done. Wrote ${Object.keys(sounds).length} SFX to ${OUT_DIR}`);
