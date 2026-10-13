import { formatChord, parseChord } from './chord';
import { mod12, noteToSemitone } from './notes';

/**
 * Chord quality → pitch content. Understands international and Brazilian
 * notation: "7M" = maj7, "9" alone = add9, "4" = sus4, "°" = diminished (played
 * as dim7 on fretted instruments), "ø" = half-diminished.
 */

export interface ChordTones {
  /** Semitones above the root (0..11), root first, without duplicates. */
  intervals: number[];
  /** Interval that may be left out when there are not enough strings (the perfect fifth). */
  optional: number[];
}

const TOKEN = /maj7?|7M|M7|min|mi(?!n)|m(?!aj)|dim7?|[°º]7?|ø7?|aug|sus[24]?|add|[#b+-]?\d{1,2}|\+|M|./g;

export function chordTones(quality: string): ChordTones {
  let third: number | null = 4;
  let fifth: number | null = 7;
  let seventh: number | null = null;
  const extras: number[] = [];

  if (quality === '5') return { intervals: [0, 7], optional: [] };

  for (const token of quality.match(TOKEN) ?? []) {
    if (/^(?:maj7?|7M|M7|M)$/.test(token)) seventh = 11;
    else if (/^(?:min|mi|m)$/.test(token)) third = 3;
    else if (/^(?:dim7?|[°º]7?)$/.test(token)) {
      third = 3;
      fifth = 6;
      seventh = 9;
    } else if (/^ø7?$/.test(token)) {
      third = 3;
      fifth = 6;
      seventh = 10;
    } else if (token === 'aug' || token === '+') fifth = 8;
    else if (token === 'sus2') {
      third = null;
      extras.push(2);
    } else if (token === 'sus' || token === 'sus4') {
      third = null;
      extras.push(5);
    } else {
      const match = /^([#b+-]?)(\d{1,2})$/.exec(token);
      if (!match) continue;
      const shift = match[1] === '#' || match[1] === '+' ? 1 : match[1] ? -1 : 0;
      switch (Number(match[2])) {
        case 2:
          extras.push(2 + shift);
          break;
        case 4:
          third = null;
          extras.push(5 + shift);
          break;
        case 5:
          if (shift !== 0) fifth = 7 + shift;
          break;
        case 6:
          extras.push(9 + shift);
          break;
        case 7:
          seventh = seventh ?? 10;
          break;
        case 9:
          extras.push(2 + shift);
          break;
        case 11:
          extras.push(5 + shift);
          break;
        case 13:
          extras.push(9 + shift);
          break;
      }
    }
  }

  const intervals: number[] = [];
  for (const value of [0, third, fifth, seventh, ...extras]) {
    if (value === null) continue;
    const interval = mod12(value);
    if (!intervals.includes(interval)) intervals.push(interval);
  }
  return { intervals, optional: fifth === 7 && intervals.length > 3 ? [7] : [] };
}

export interface ChordPitches {
  /** Pitch class of the root (0 = C). */
  root: number;
  /** Pitch class that must be the lowest note (root or slash bass). */
  bass: number;
  /** Every pitch class of the chord, including the slash bass. */
  pitchClasses: number[];
  /** Pitch classes that may be omitted. */
  optional: number[];
}

/** Pitch classes of a chord symbol such as "F#m7(11)" or "D/F#". Null for non-chords. */
export function chordPitches(symbol: string): ChordPitches | null {
  const chord = parseChord(symbol);
  if (!chord) return null;
  const root = noteToSemitone(chord.root);
  if (root === null) return null;
  const bass = chord.bass ? noteToSemitone(chord.bass) : root;
  if (bass === null) return null;
  const tones = chordTones(chord.quality);
  const pitchClasses = tones.intervals.map((interval) => mod12(root + interval));
  if (!pitchClasses.includes(bass)) pitchClasses.push(bass);
  return { root, bass, pitchClasses, optional: tones.optional.map((interval) => mod12(root + interval)) };
}

/**
 * Reduces a chord to its basic triad, like the "simplified chords" option of
 * chord sites: Am7(9) → Am, G7M → G, D/F# → D, Bm7(b5) → B°, E5 stays E5.
 */
export function simplifyChord(symbol: string): string {
  const chord = parseChord(symbol);
  if (!chord) return symbol;
  if (chord.quality === '5') return formatChord({ ...chord, bass: null });
  const { intervals } = chordTones(chord.quality);
  const has = (interval: number) => intervals.includes(interval);
  const quality = has(3) && has(6) ? '°' : has(4) && has(8) ? '+' : has(3) ? 'm' : '';
  return formatChord({ root: chord.root, quality, bass: null });
}
