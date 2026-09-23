import { formatChord, parseChord } from './chord';
import { type Accidental, mod12, noteToSemitone, semitoneToNote } from './notes';

/** Keys conventionally written with flats. */
const FLAT_KEYS = new Set([
  'F',
  'Bb',
  'Eb',
  'Ab',
  'Db',
  'Gb',
  'Cb',
  'Dm',
  'Gm',
  'Cm',
  'Fm',
  'Bbm',
  'Ebm',
  'Abm',
]);

export interface ParsedKey {
  root: string;
  minor: boolean;
}

export function parseKey(key: string): ParsedKey | null {
  const match = /^([A-G](?:#|b)?)(m)?$/.exec(key.trim());
  if (!match) return null;
  return { root: match[1], minor: match[2] === 'm' };
}

/** Accidental that reads best in the given key. Defaults to sharps. */
export function preferredAccidental(key: string | null | undefined): Accidental {
  if (!key) return 'sharp';
  const trimmed = key.trim();
  if (FLAT_KEYS.has(trimmed)) return 'flat';
  const parsed = parseKey(trimmed);
  return parsed?.root.endsWith('b') ? 'flat' : 'sharp';
}

export function transposeNote(note: string, semitones: number, accidental: Accidental = 'sharp'): string {
  const value = noteToSemitone(note);
  if (value === null) return note;
  return semitoneToNote(value + semitones, accidental);
}

/**
 * Transposes a chord symbol (e.g. "F#m7", "C/E", "Bb7(9)").
 * Anything that is not a recognisable chord is returned untouched.
 */
export function transposeChord(symbol: string, semitones: number, accidental: Accidental = 'sharp'): string {
  if (mod12(semitones) === 0) return symbol;
  const chord = parseChord(symbol);
  if (!chord) return symbol;
  return formatChord({
    root: transposeNote(chord.root, semitones, accidental),
    quality: chord.quality,
    bass: chord.bass ? transposeNote(chord.bass, semitones, accidental) : null,
  });
}

/**
 * Transposes a key such as "G" or "F#m". When no accidental is given the
 * spelling of the source key is kept (flat keys stay flat).
 */
export function transposeKey(key: string, semitones: number, accidental?: Accidental): string {
  const parsed = parseKey(key);
  if (!parsed) return key;
  if (mod12(semitones) === 0) return key;
  const spelling = accidental ?? preferredAccidental(key);
  return `${transposeNote(parsed.root, semitones, spelling)}${parsed.minor ? 'm' : ''}`;
}

/**
 * Shortest signed distance in semitones between two keys (-5..6).
 * Returns 0 when either key is invalid.
 */
export function semitonesBetweenKeys(fromKey: string, toKey: string): number {
  const from = parseKey(fromKey);
  const to = parseKey(toKey);
  if (!from || !to) return 0;
  const a = noteToSemitone(from.root);
  const b = noteToSemitone(to.root);
  if (a === null || b === null) return 0;
  const diff = mod12(b - a);
  return diff > 6 ? diff - 12 : diff;
}

export function isValidKey(key: string): boolean {
  return parseKey(key) !== null;
}
