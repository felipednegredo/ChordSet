/**
 * Pitch-class helpers shared by chord parsing and transposition.
 * Semitone index 0 = C ... 11 = B.
 */

export type Accidental = 'sharp' | 'flat';

export const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
export const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

const NATURAL_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

/** Wraps any integer into the 0..11 range. */
export function mod12(value: number): number {
  return ((value % 12) + 12) % 12;
}

/**
 * Converts a note name (C, C#, Db, E#, Cb...) to its semitone index.
 * Returns `null` for anything that is not a valid note.
 */
export function noteToSemitone(note: string): number | null {
  const match = /^([A-G])(#|b)?$/.exec(note.trim());
  if (!match) return null;
  const base = NATURAL_SEMITONES[match[1]];
  const accidental = match[2];
  if (accidental === '#') return mod12(base + 1);
  if (accidental === 'b') return mod12(base - 1);
  return base;
}

export function semitoneToNote(semitone: number, accidental: Accidental = 'sharp'): string {
  const index = mod12(semitone);
  return accidental === 'flat' ? FLAT_NOTES[index] : SHARP_NOTES[index];
}
