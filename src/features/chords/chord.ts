/**
 * Chord symbol parsing.
 *
 * A chord is split in three parts so only the pitch information is transposed:
 *   root    -> "F#"   (A-G plus optional # or b)
 *   quality -> "m7"   (kept verbatim: m, 7, maj7, 7M, sus4, dim, °, (9), 7/9 ...)
 *   bass    -> "E"    (optional inverted bass after "/")
 */

export interface ParsedChord {
  root: string;
  quality: string;
  bass: string | null;
}

/*
 * The quality may contain "/" when it is followed by an extension (Brazilian
 * notation such as "A7/9" or "C7/b9"). A "/" followed by an uppercase note is
 * always treated as an inverted bass.
 */
const CHORD_PATTERN = /^([A-G](?:#|b)?)((?:[^/\s]|\/(?=[0-9#b+\-]))*)(?:\/([A-G](?:#|b)?))?$/;

/** Vocabulary accepted in the quality part when deciding if a token is a chord. */
const QUALITY_VOCABULARY = /^(?:maj|min|mi|dim|aug|sus|add|no|omit|alt|m|M|[°ºø+\-#b]|[0-9]|\(|\)|\/|,|\.)*$/;

/** Tokens that may appear on chord-only lines without being chords. */
const NEUTRAL_TOKENS = /^(?:\|+|-+|%|\/|\(?\d+x\)?|\(?x\d+\)?|N\.?C\.?|\.{2,})$/i;

export function parseChord(symbol: string): ParsedChord | null {
  const match = CHORD_PATTERN.exec(symbol.trim());
  if (!match) return null;
  return { root: match[1], quality: match[2] ?? '', bass: match[3] ?? null };
}

export function formatChord(chord: ParsedChord): string {
  return `${chord.root}${chord.quality}${chord.bass ? `/${chord.bass}` : ''}`;
}

/** Strict check used to recognise plain-text chord lines. */
export function isChordToken(token: string): boolean {
  const chord = parseChord(token);
  return chord !== null && QUALITY_VOCABULARY.test(chord.quality);
}

export function isNeutralToken(token: string): boolean {
  return NEUTRAL_TOKENS.test(token);
}
