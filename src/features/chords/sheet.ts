import type { Accidental } from './notes';
import { transposeChord } from './transpose';
import type { ChordSegment, ChordSheet, SheetLine } from './types';

/** Returns a new sheet with every chord transposed. The input is not mutated. */
export function transposeSheet(
  sheet: ChordSheet,
  semitones: number,
  accidental: Accidental = 'sharp',
): ChordSheet {
  if (semitones % 12 === 0) return sheet;
  const mapLine = (line: SheetLine): SheetLine => {
    if (line.kind === 'lyrics') {
      return {
        kind: 'lyrics',
        segments: line.segments.map((s) => ({
          chord: s.chord === null ? null : transposeChord(s.chord, semitones, accidental),
          lyrics: s.lyrics,
        })),
      };
    }
    if (line.kind === 'chords') {
      return {
        kind: 'chords',
        chords: line.chords.map((c) => ({ ...c, chord: transposeChord(c.chord, semitones, accidental) })),
      };
    }
    return line;
  };

  return {
    metadata: sheet.metadata,
    sections: sheet.sections.map((section) => ({ ...section, lines: section.lines.map(mapLine) })),
  };
}

export interface DisplayToken {
  chord: string | null;
  text: string;
}

/**
 * Splits segments into word-sized tokens so the renderer can wrap long lines
 * at word boundaries while keeping each chord above the right syllable.
 * Tokens that belong to the same word (e.g. "Gran[D]de") are grouped together
 * so a line break never splits a word.
 */
export function toDisplayWords(segments: ChordSegment[]): DisplayToken[][] {
  const words: DisplayToken[][] = [];
  let currentWord: DisplayToken[] = [];

  const flush = () => {
    if (currentWord.length > 0) words.push(currentWord);
    currentWord = [];
  };

  segments.forEach((segment) => {
    let lyrics = segment.lyrics;
    // A chord placed on the space before a word belongs to that word ("cima [G] da" → G over "da").
    const leading = /^\s+/.exec(lyrics)?.[0] ?? '';
    if (leading && segment.chord !== null && lyrics.length > leading.length) {
      if (currentWord.length > 0) currentWord[currentWord.length - 1].text += leading;
      flush();
      lyrics = lyrics.slice(leading.length);
    }

    const pieces = lyrics.match(/\S+\s*|\s+/g) ?? [''];
    pieces.forEach((piece, index) => {
      const chord = index === 0 ? segment.chord : null;
      if (/^\s/.test(piece)) flush();
      currentWord.push({ chord, text: piece });
      if (/\s$/.test(piece)) flush();
    });
  });

  flush();
  return words;
}

/** Plain lyrics of a line, used when chords are hidden. */
export function lyricsOnly(segments: ChordSegment[]): string {
  return segments.map((s) => s.lyrics).join('');
}

export function hasChords(sheet: ChordSheet): boolean {
  return sheet.sections.some((section) =>
    section.lines.some(
      (line) =>
        line.kind === 'chords' || (line.kind === 'lyrics' && line.segments.some((s) => s.chord !== null)),
    ),
  );
}
