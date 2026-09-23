import { transposeKey } from './transpose';

/** Roots offered in key pickers, spelled the way most musicians write them. */
export const KEY_ROOTS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;

export const MAJOR_KEYS: string[] = [...KEY_ROOTS];
export const MINOR_KEYS: string[] = KEY_ROOTS.map((root) => `${root}m`);

export const MAX_CAPO = 11;

export function clampCapo(capo: number): number {
  if (!Number.isFinite(capo)) return 0;
  return Math.min(MAX_CAPO, Math.max(0, Math.round(capo)));
}

/**
 * Key of the chord shapes played when a capo is used.
 * Example: sounding key B with capo 2 → shapes in A.
 */
export function shapesKey(soundingKey: string, capo: number): string {
  return capo > 0 ? transposeKey(soundingKey, -capo) : soundingKey;
}
