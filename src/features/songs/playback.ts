import {
  type Accidental,
  mod12,
  preferredAccidental,
  semitonesBetweenKeys,
  shapesKey,
  transposeKey,
} from '../chords';

export interface PlaybackInput {
  /** Key the content was written in. */
  originalKey: string;
  /** Key that should sound (library current key or repertoire override). */
  soundingKey: string;
  capo: number;
}

export interface PlaybackDisplay {
  /** Semitones applied to every chord of the content. */
  semitones: number;
  /** Key of the chord shapes shown on screen (differs from soundingKey when a capo is used). */
  shapesKey: string;
  accidental: Accidental;
}

/**
 * Chords are displayed as the shapes to play: with capo N they are moved
 * N semitones down so the result still sounds in `soundingKey`.
 */
export function computePlaybackDisplay({ originalKey, soundingKey, capo }: PlaybackInput): PlaybackDisplay {
  const shapes = shapesKey(soundingKey, capo);
  const raw = semitonesBetweenKeys(originalKey, soundingKey) - capo;
  const semitones = mod12(raw) > 6 ? mod12(raw) - 12 : mod12(raw);
  return { semitones, shapesKey: shapes, accidental: preferredAccidental(shapes) };
}

/** Moves the sounding key one or more semitones, keeping the spelling style of the original key. */
export function stepKey(soundingKey: string, delta: number, originalKey: string): string {
  return transposeKey(soundingKey, delta, preferredAccidental(originalKey));
}

/** Pixels per second for each auto-scroll level (1..10). */
export const AUTO_SCROLL_SPEEDS = [6, 10, 14, 19, 25, 32, 40, 50, 62, 76] as const;

export function autoScrollPixelsPerSecond(level: number): number {
  const index = Math.min(AUTO_SCROLL_SPEEDS.length, Math.max(1, Math.round(level))) - 1;
  return AUTO_SCROLL_SPEEDS[index];
}
