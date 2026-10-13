import { chordPitches, type ChordPitches } from './harmony';
import { mod12 } from './notes';

/**
 * Chord diagrams generated from music theory instead of a fixed dictionary, so
 * any chord in a sheet (including transposed and slash chords) gets a shape on
 * any supported instrument. Pure TypeScript, unit tested.
 */

export type ChordInstrumentId = 'guitar' | 'ukulele' | 'cavaquinho';

export interface ChordInstrument {
  id: ChordInstrumentId;
  name: string;
  /** Open-string MIDI numbers, from the thickest string (left of the diagram) to the thinnest. */
  strings: readonly number[];
  /** Minimum number of strings that must sound. */
  minSounding: number;
  /** Whether the lowest-pitched note must be the chord's bass (false for re-entrant tunings). */
  bassFirst: boolean;
}

export const CHORD_INSTRUMENTS: readonly ChordInstrument[] = [
  { id: 'guitar', name: 'Violão', strings: [40, 45, 50, 55, 59, 64], minSounding: 4, bassFirst: true },
  { id: 'ukulele', name: 'Ukulele', strings: [67, 60, 64, 69], minSounding: 4, bassFirst: false },
  { id: 'cavaquinho', name: 'Cavaquinho', strings: [62, 67, 71, 74], minSounding: 4, bassFirst: false },
];

export const DEFAULT_CHORD_INSTRUMENT: ChordInstrumentId = 'guitar';

export function isChordInstrumentId(value: unknown): value is ChordInstrumentId {
  return CHORD_INSTRUMENTS.some((instrument) => instrument.id === value);
}

export function getChordInstrument(id: ChordInstrumentId): ChordInstrument {
  return CHORD_INSTRUMENTS.find((instrument) => instrument.id === id) ?? CHORD_INSTRUMENTS[0];
}

export interface Barre {
  fret: number;
  /** First and last string index covered (0 = thickest). */
  from: number;
  to: number;
}

export interface Fingering {
  /** One entry per string (0 = thickest): -1 muted, 0 open, n = fret. */
  frets: number[];
  barre: Barre | null;
}

/** Highest fret a shape may start on. */
const MAX_START_FRET = 12;
/** Frets a hand can cover without stretching. */
const HAND_SPAN = 4;
const MAX_FINGERS = 4;
const MAX_VOICINGS = 6;

/**
 * Shapes guitarists learn first (open chords and the E/A barre forms). They
 * win over equally valid but unusual voicings found by the search.
 */
const COMMON_GUITAR_SHAPES = new Set(
  [
    'x32010',
    '320003',
    '320033',
    'xx0232',
    '022100',
    'x02220',
    '133211',
    'x24442',
    'x13331',
    'x02210',
    'x24432',
    'x13321',
    'xx0231',
    '022000',
    '133111',
    '355333',
    '244222',
    'x35543',
    'x32310',
    'xx0212',
    '020100',
    '320001',
    'x02020',
    'x21202',
    '131211',
    'x02010',
    'xx0211',
    '020000',
    'x20202',
    '242222',
    'x32000',
    'xx0222',
    '021100',
    '320002',
    'x02120',
    'xx3210',
    'xx0233',
    'x02230',
    '022200',
    'xx0230',
    'x02200',
    '2x0232',
    'x20003',
    '332010',
    'x3x010',
  ].map((shape) =>
    shape
      .split('')
      .map((c) => (c === 'x' ? -1 : Number(c)))
      .join(','),
  ),
);
const COMMON_SHAPE_BONUS = 3;

/** Movable E-form and A-form barre shapes, as offsets from the barre fret (-1 = muted). */
const BARRE_FORMS: readonly (readonly number[])[] = [
  [0, 2, 2, 1, 0, 0],
  [0, 2, 2, 0, 0, 0],
  [0, 2, 0, 1, 0, 0],
  [0, 2, 0, 0, 0, 0],
  [-1, 0, 2, 2, 2, 0],
  [-1, 0, 2, 2, 1, 0],
  [-1, 0, 2, 0, 2, 0],
  [-1, 0, 2, 0, 1, 0],
  [-1, 0, 2, 1, 2, 0],
];
const BARRE_FORM_BONUS = 2;

function isBarreForm(frets: readonly number[]): boolean {
  return BARRE_FORMS.some((form) => {
    const base = frets[form.indexOf(0)];
    return (
      base >= 1 &&
      form.every((offset, index) => (offset < 0 ? frets[index] < 0 : frets[index] === base + offset))
    );
  });
}

function shapeBonus(instrument: ChordInstrument, frets: readonly number[]): number {
  if (instrument.id !== 'guitar') return 0;
  if (COMMON_GUITAR_SHAPES.has(frets.join(','))) return COMMON_SHAPE_BONUS;
  return isBarreForm(frets) ? BARRE_FORM_BONUS : 0;
}

interface Candidate extends Fingering {
  score: number;
}

function analyse(frets: number[], instrument: ChordInstrument, pitches: ChordPitches): Candidate | null {
  const sounding: number[] = [];
  frets.forEach((fret, index) => {
    if (fret >= 0) sounding.push(index);
  });
  // Power chords (root + fifth) are usually played on three strings.
  const minSounding = pitches.pitchClasses.length <= 2 ? 3 : instrument.minSounding;
  if (sounding.length < Math.min(minSounding, instrument.strings.length)) return null;

  // Every chord tone must be present, except the optional ones (usually the fifth).
  const present = new Set(sounding.map((index) => mod12(instrument.strings[index] + frets[index])));
  if (pitches.pitchClasses.some((pc) => !present.has(pc) && !pitches.optional.includes(pc))) return null;

  if (instrument.bassFirst) {
    let lowest = sounding[0];
    for (const index of sounding) {
      if (instrument.strings[index] + frets[index] < instrument.strings[lowest] + frets[lowest])
        lowest = index;
    }
    if (mod12(instrument.strings[lowest] + frets[lowest]) !== pitches.bass) return null;
  }

  const fretted = sounding.filter((index) => frets[index] > 0);
  const minFret = fretted.length ? Math.min(...fretted.map((index) => frets[index])) : 0;
  const maxFret = fretted.length ? Math.max(...fretted.map((index) => frets[index])) : 0;

  // A barre is possible when every string under it is pressed at or above its fret.
  let barre: Barre | null = null;
  const atMin = fretted.filter((index) => frets[index] === minFret);
  if (atMin.length >= 2) {
    const from = atMin[0];
    const to = atMin[atMin.length - 1];
    let valid = true;
    for (let index = from; index <= to; index++) if (frets[index] < minFret) valid = false;
    if (valid) barre = { fret: minFret, from, to };
  }
  const fingers = barre ? 1 + fretted.filter((index) => frets[index] > minFret).length : fretted.length;
  if (fingers > MAX_FINGERS) return null;
  // Only use a barre when the shape needs it.
  if (barre && fretted.length <= MAX_FINGERS) barre = null;

  const first = sounding[0];
  const last = sounding[sounding.length - 1];
  const interiorMutes = last - first + 1 - sounding.length;
  if (interiorMutes > 1) return null;
  const muted = frets.length - sounding.length;
  const open = sounding.length - fretted.length;
  const missing = pitches.pitchClasses.filter((pc) => !present.has(pc)).length;

  const score =
    minFret * 1.2 +
    (maxFret - minFret) * 0.4 +
    muted * 1.1 +
    interiorMutes * 3 +
    fingers * 0.6 +
    (barre ? 0.8 : 0) +
    missing * 1.5 +
    // Open strings help near the nut but force awkward stretches higher up on the guitar neck.
    (maxFret <= 3 ? -open * 0.3 : open * (instrument.bassFirst ? 1.2 : 0.3)) -
    shapeBonus(instrument, frets);

  return { frets: [...frets], barre, score };
}

/** Enumerates playable shapes for a chord, best first. Empty when the symbol is not a chord. */
export function findFingerings(symbol: string, instrumentId: ChordInstrumentId): Fingering[] {
  const instrument = getChordInstrument(instrumentId);
  const pitches = chordPitches(symbol);
  if (!pitches) return [];
  const chordSet = new Set(pitches.pitchClasses);
  const found = new Map<string, Candidate>();

  for (let start = 1; start <= MAX_START_FRET; start++) {
    const options = instrument.strings.map((open) => {
      const frets = [-1];
      for (const fret of [0, ...Array.from({ length: HAND_SPAN }, (_, i) => start + i)]) {
        if (chordSet.has(mod12(open + fret))) frets.push(fret);
      }
      return frets;
    });

    const current: number[] = [];
    const visit = (index: number) => {
      if (index === options.length) {
        const candidate = analyse(current, instrument, pitches);
        if (!candidate) return;
        const key = candidate.frets.join(',');
        const existing = found.get(key);
        if (!existing || existing.score > candidate.score) found.set(key, candidate);
        return;
      }
      for (const fret of options[index]) {
        current.push(fret);
        visit(index + 1);
        current.pop();
      }
    };
    visit(0);
  }

  return [...found.values()]
    .sort((a, b) => a.score - b.score)
    .slice(0, MAX_VOICINGS)
    .map(({ frets, barre }) => ({ frets, barre }));
}

const cache = new Map<string, Fingering[]>();

/** Memoised {@link findFingerings}; chord sheets repeat the same chords many times. */
export function getFingerings(symbol: string, instrumentId: ChordInstrumentId): Fingering[] {
  const key = `${instrumentId}:${symbol}`;
  let value = cache.get(key);
  if (!value) {
    value = findFingerings(symbol, instrumentId);
    cache.set(key, value);
  }
  return value;
}

/** First fret shown in the diagram (1 for shapes near the nut). */
export function diagramBaseFret(fingering: Fingering, visibleFrets: number): number {
  const fretted = fingering.frets.filter((fret) => fret > 0);
  if (fretted.length === 0) return 1;
  const max = Math.max(...fretted);
  return max <= visibleFrets ? 1 : Math.min(...fretted);
}
