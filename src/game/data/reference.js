/* ================================================================
   [THE REFERENCE DESK] — facts the model is not allowed to make up.

   Built 2026-08-03 at the steward's suggestion, after establishing
   that a local model has no database at all: a weights file knows
   what was compressed into it at training time, cannot look anything
   up, and — the part that matters — cannot tell what it half-recalls
   from what it is confabulating. It will give you c = 3.0e8 in a
   context where the third digit decides whether your circuit works,
   and sound exactly as confident either way.

   So this is not "more for the model to read." It is a small set of
   values with a fixed right answer, looked up deterministically, and
   handed over with an instruction to use THESE rather than its own
   memory. Same ladder the rest of the project runs on:

       deterministic code -> a looked-up constant -> the model on the rest

   WHAT EARNS A PLACE, one test: things a model gets subtly wrong and
   you would not notice. Not an encyclopaedia — the weights already
   are one, badly. Nothing contested, nothing that needs a citation to
   mean anything, nothing that changes. Those belong in the Library,
   where the provenance system already governs them.

   IT WORKS WITH NO AI. `ref <term>` at the Computer is the primary
   use and needs nothing installed. That alone earns the file; the
   prompt injection is a bonus on top.

   ACCURACY IS THE WHOLE POINT. A reference table with a wrong number
   in it is worse than no table, because it launders a mistake into
   something that looks authoritative. `npm test` checks the ones that
   are exactly defined by the SI, and every entry carries whether it
   is exact or measured.

   Sources for the constants: SI 2019 redefinition (exact values) and
   CODATA 2018 (measured). Named so a future session can re-check.
   ================================================================ */

/* kind: 'constant' | 'unit' | 'formula' | 'component' | 'math'
   exact: true where the SI DEFINES the value, false where it is measured.
          Worth surfacing: "exact" means the digits do not improve. */
export const REFERENCE = [
  /* ---- physical constants ---- */
  { id: 'c', kind: 'constant', name: 'speed of light in vacuum', symbol: 'c',
    value: '299792458 m/s', exact: true,
    note: 'Exact by definition — the metre is defined from it. 3.00e8 is a rounding, fine for estimates and not for timing.',
    aka: ['light speed', 'lightspeed'] },
  { id: 'e', kind: 'constant', name: 'elementary charge', symbol: 'e',
    value: '1.602176634e-19 C', exact: true, aka: ['electron charge'] },
  { id: 'h', kind: 'constant', name: 'Planck constant', symbol: 'h',
    value: '6.62607015e-34 J·s', exact: true },
  { id: 'k', kind: 'constant', name: 'Boltzmann constant', symbol: 'k_B',
    value: '1.380649e-23 J/K', exact: true },
  { id: 'na', kind: 'constant', name: 'Avogadro constant', symbol: 'N_A',
    value: '6.02214076e23 /mol', exact: true, aka: ['avogadro'] },
  { id: 'g', kind: 'constant', name: 'standard gravity', symbol: 'g₀',
    value: '9.80665 m/s²', exact: true,
    note: 'A defined standard, not a measurement of your local gravity, which varies by ~0.5%.' },
  { id: 'eps0', kind: 'constant', name: 'vacuum permittivity', symbol: 'ε₀',
    value: '8.8541878128e-12 F/m', exact: false, aka: ['permittivity'] },
  { id: 'mu0', kind: 'constant', name: 'vacuum permeability', symbol: 'µ₀',
    value: '1.25663706212e-6 H/m', exact: false, aka: ['permeability'] },
  { id: 'gconst', kind: 'constant', name: 'gravitational constant', symbol: 'G',
    value: '6.67430e-11 m³/(kg·s²)', exact: false,
    note: 'The least precisely known of the common constants — only ~5 significant figures.' },

  /* ---- units and prefixes: the commonest silent error there is ---- */
  { id: 'si-prefixes', kind: 'unit', name: 'SI prefixes', symbol: '',
    value: 'T 1e12 · G 1e9 · M 1e6 · k 1e3 · (unit) · m 1e-3 · µ 1e-6 · n 1e-9 · p 1e-12',
    exact: true,
    note: 'Off by a factor of a thousand is the single commonest mistake in an electronics calculation, and it never looks wrong.',
    aka: ['prefix', 'milli', 'micro', 'nano', 'pico', 'kilo', 'mega', 'giga'] },
  { id: 'ohm', kind: 'unit', name: 'ohm', symbol: 'Ω', value: 'V/A — one volt across it passes one amp', exact: true },
  { id: 'farad', kind: 'unit', name: 'farad', symbol: 'F', value: 'C/V — one coulomb stored per volt', exact: true,
    note: 'A farad is enormous. Real parts are µF, nF and pF.' },
  { id: 'henry', kind: 'unit', name: 'henry', symbol: 'H', value: 'Wb/A — one volt induced by one amp/second', exact: true },
  { id: 'watt', kind: 'unit', name: 'watt', symbol: 'W', value: 'J/s = V·A', exact: true },

  /* ---- formulas cheap to state, expensive to misremember ---- */
  { id: 'ohms-law', kind: 'formula', name: "Ohm's law", symbol: '', value: 'V = I × R    (I = V/R,  R = V/I)', exact: true,
    aka: ['ohms law', 'voltage current resistance'] },
  { id: 'power', kind: 'formula', name: 'electrical power', symbol: '', value: 'P = V × I = I²R = V²/R', exact: true },
  { id: 'divider', kind: 'formula', name: 'voltage divider', symbol: '',
    value: 'Vout = Vin × R2 / (R1 + R2)     — R2 is the one across the output', exact: true,
    note: 'Only holds while whatever you connect to Vout draws negligible current. That caveat is where most divider bugs live.',
    aka: ['voltage divider', 'potential divider'] },
  { id: 'rc', kind: 'formula', name: 'RC time constant', symbol: 'τ',
    value: 'τ = R × C   — 63% of the way in one τ, ~99% in five', exact: true, aka: ['time constant'] },
  { id: 'led-resistor', kind: 'formula', name: 'LED series resistor', symbol: '',
    value: 'R = (Vsupply − Vf) / I     — Vf is the LED forward voltage, I the current you want', exact: true,
    note: 'Vf is roughly 1.8–2.2 V for red/IR and 3.0–3.4 V for blue/white. Check the datasheet; do not trust a model for it.',
    aka: ['led resistor', 'current limiting resistor'] },
  { id: 'resonance', kind: 'formula', name: 'LC resonant frequency', symbol: 'f₀',
    value: 'f₀ = 1 / (2π√(LC))', exact: true, aka: ['resonant frequency'] },
  { id: 'series-parallel', kind: 'formula', name: 'series and parallel', symbol: '',
    value: 'R series: R1+R2 · R parallel: 1/(1/R1+1/R2) · C is the other way round: parallel adds, series is the reciprocal',
    exact: true, note: 'Capacitors behaving oppositely to resistors is a reliable source of quiet errors.' },

  /* ---- components ---- */
  { id: 'colour-code', kind: 'component', name: 'resistor colour code', symbol: '',
    value: 'black 0 · brown 1 · red 2 · orange 3 · yellow 4 · green 5 · blue 6 · violet 7 · grey 8 · white 9 '
         + '| multiplier: gold ×0.1, silver ×0.01 | tolerance: gold ±5%, silver ±10%, brown ±1%',
    exact: true, aka: ['colour code', 'color code', 'resistor bands', 'bands'] },
  { id: 'e12', kind: 'component', name: 'E12 resistor series', symbol: '',
    value: '10 12 15 18 22 27 33 39 47 56 68 82 (×10ⁿ)', exact: true,
    note: 'Why 4k7 and 2k2 turn up everywhere: those are the values that exist. Design to them.',
    aka: ['e12', 'preferred values', '4k7', '2k2'] },
  { id: 'logic-levels', kind: 'component', name: 'logic level thresholds', symbol: '',
    value: '5V TTL: LOW < 0.8 V, HIGH > 2.0 V  |  3.3V CMOS: LOW < 0.8 V, HIGH > 2.0 V', exact: false,
    note: 'A 3.3 V output usually drives a 5 V TTL input, but not the reverse without a level shifter.',
    aka: ['logic level', 'ttl', 'cmos'] },
  { id: 'ir-carrier', kind: 'component', name: 'IR remote carrier frequency', symbol: '',
    value: '38 kHz is the common case (also 36, 40, 56 kHz)', exact: false,
    note: 'The receiver module is tuned to one carrier; the wrong one simply will not decode.',
    aka: ['38khz', 'ir carrier', 'infrared'] },

  /* ---- maths with a fixed answer ---- */
  { id: 'pi', kind: 'math', name: 'π', symbol: 'π', value: '3.14159265358979', exact: true, aka: ['pi'] },
  { id: 'euler', kind: 'math', name: "Euler's number", symbol: 'e', value: '2.71828182845905', exact: true, aka: ['eulers number'] },
  { id: 'derivatives', kind: 'math', name: 'common derivatives', symbol: '',
    value: "d/dx xⁿ = n·xⁿ⁻¹ · d/dx eˣ = eˣ · d/dx ln x = 1/x · d/dx sin = cos · d/dx cos = −sin", exact: true,
    aka: ['derivative'] },
  { id: 'integrals', kind: 'math', name: 'common integrals', symbol: '',
    value: '∫xⁿ dx = xⁿ⁺¹/(n+1) (n≠−1) · ∫1/x dx = ln|x| · ∫eˣ dx = eˣ · ∫sin = −cos · ∫cos = sin', exact: true,
    aka: ['integral'] },
  { id: 'db', kind: 'math', name: 'decibels', symbol: 'dB',
    value: 'power: 10·log₁₀(P/P₀) · amplitude (voltage): 20·log₁₀(V/V₀)', exact: true,
    note: 'The 10-vs-20 confusion is the classic dB error: a factor of two in the exponent.',
    aka: ['decibel'] },
];

const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9µωπτ]+/g, ' ').trim();

/* Exact-ish lookup for `ref <term>`: id, name, symbol or a listed alias.
   Returns every match rather than a best guess — "resistor" legitimately hits
   several entries, and choosing for the visitor would hide the others. */
export function lookup(term) {
  const q = norm(term);
  if (!q) return [];
  const hit = e => {
    const keys = [e.id, e.name, e.symbol, ...(e.aka || [])].map(norm).filter(Boolean);
    return keys.some(k => k === q) || keys.some(k => k.includes(q) && q.length >= 3);
  };
  return REFERENCE.filter(hit);
}

/* One line, for the terminal and for a prompt. */
export function refLine(e) {
  return `${e.name}${e.symbol ? ' (' + e.symbol + ')' : ''} = ${e.value}`
    + (e.exact ? '  [exact]' : '')
    + (e.note ? '\n    ' + e.note : '');
}

/* What goes into a resident's prompt — and the discipline that makes this
   different from pasting a textbook: ONLY entries whose term actually appears
   in what was asked, capped hard. The catalogue bug found the same day is the
   warning here (the whole Library was being recited on every message). A
   400-entry table must cost ~40 tokens, not 4,000. */
export function referenceFor(text, cap = 6) {
  const words = norm(text).split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  /* WORD BOUNDARIES, not substrings. Caught by the guard on its first run:
     the symbol `N_A` normalises to "n a", and a substring test matched
     "what did the monk MEA-N A-bout right intention" — so a question about
     right intention arrived at the model carrying Avogadro's constant. Funny
     once; the same bug on a bigger table is the corpus-pasting habit back
     again, wearing a false-match costume. */
  const hasRun = run => {
    if (!run.length) return false;
    for (let i = 0; i + run.length <= words.length; i++) {
      let ok = true;
      for (let j = 0; j < run.length; j++) if (words[i + j] !== run[j]) { ok = false; break; }
      if (ok) return true;
    }
    return false;
  };
  const seen = new Set(); const out = [];
  for (const e of REFERENCE) {
    const keys = [e.id, e.name, e.symbol, ...(e.aka || [])].map(norm).filter(Boolean);
    const matched = keys.some(k => {
      const run = k.split(' ').filter(Boolean);
      /* A single character is too eager to be a trigger on its own — "c" and
         "e" and "k" appear as ordinary words nowhere, but as stray letters
         everywhere once punctuation is stripped. They stay reachable through
         `ref c` at the terminal, which is an explicit ask. */
      if (run.length === 1 && run[0].length < 2) return false;
      return hasRun(run);
    });
    if (matched && !seen.has(e.id)) { seen.add(e.id); out.push(e); }
    if (out.length >= cap) break;
  }
  return out;
}

export function referenceBlock(text) {
  const hits = referenceFor(text);
  if (!hits.length) return '';
  return '\n\nREFERENCE VALUES, looked up from the Pavilion\'s own table — these are correct. '
    + 'Use them exactly as given and do NOT substitute a figure from your own memory. If your recollection '
    + 'disagrees with one of these, the table is right and say so plainly:\n'
    + hits.map(e => '- ' + refLine(e)).join('\n');
}
