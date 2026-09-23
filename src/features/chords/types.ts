/**
 * Structured representation of a chord sheet produced by the parser.
 * It is UI-agnostic so it can be rendered, transposed, exported or synced.
 */

export interface ChordSegment {
  /** Chord placed at the beginning of this segment, or null for lyrics before the first chord. */
  chord: string | null;
  lyrics: string;
}

export interface PositionedChord {
  chord: string;
  /** Column in the original text, used to keep spacing on chord-only lines. */
  column: number;
}

export type SheetLine =
  | { kind: 'lyrics'; segments: ChordSegment[] }
  | { kind: 'chords'; chords: PositionedChord[] }
  | { kind: 'label'; text: string }
  | { kind: 'comment'; text: string }
  | { kind: 'tab'; text: string }
  | { kind: 'empty' };

export type SectionKind = 'default' | 'verse' | 'chorus' | 'bridge' | 'tab';

export interface SheetSection {
  kind: SectionKind;
  label: string | null;
  lines: SheetLine[];
}

export interface SheetMetadata {
  title?: string;
  subtitle?: string;
  artist?: string;
  key?: string;
  capo?: number;
  tempo?: number;
  /** Any other `{name: value}` directive, kept for future import/export. */
  extra: Record<string, string>;
}

export interface ChordSheet {
  metadata: SheetMetadata;
  sections: SheetSection[];
}
