import { isChordToken, isNeutralToken } from './chord';
import type {
  ChordSegment,
  ChordSheet,
  PositionedChord,
  SectionKind,
  SheetLine,
  SheetMetadata,
  SheetSection,
} from './types';

/**
 * ChordPro-inspired parser.
 *
 * Supported input:
 *  - Inline chords:            [G]Grande é o [C]Senhor
 *  - Directives:               {title: ...} {t: ...} {artist: ...} {key: ...} {capo: ...}
 *                              {comment: ...} {c: ...} {soc}/{eoc} {sov}/{eov} {sob}/{eob} {sot}/{eot}
 *  - Section labels:           [Refrão]   [Intro] G D Em C
 *  - Chords over lyrics:       plain chord line followed by a lyric line (common in pasted cifras)
 *  - Comment lines:            # this line is ignored
 */

const DIRECTIVE_PATTERN = /^\{\s*([a-zA-Z_]+)\s*(?::\s*(.*?))?\s*\}$/;
const INLINE_CHORD_PATTERN = /\[([^\]]*)\]/g;
const LEADING_LABEL_PATTERN = /^\[([^\]]+)\](.*)$/;

const DIRECTIVE_ALIASES: Record<string, string> = {
  t: 'title',
  st: 'subtitle',
  c: 'comment',
  ci: 'comment',
  cb: 'comment',
  comment_italic: 'comment',
  comment_box: 'comment',
  highlight: 'comment',
  soc: 'start_of_chorus',
  eoc: 'end_of_chorus',
  sov: 'start_of_verse',
  eov: 'end_of_verse',
  sob: 'start_of_bridge',
  eob: 'end_of_bridge',
  sot: 'start_of_tab',
  eot: 'end_of_tab',
};

const SECTION_START: Record<string, SectionKind> = {
  start_of_chorus: 'chorus',
  start_of_verse: 'verse',
  start_of_bridge: 'bridge',
  start_of_tab: 'tab',
};

const SECTION_END = new Set(['end_of_chorus', 'end_of_verse', 'end_of_bridge', 'end_of_tab']);

const DEFAULT_SECTION_LABELS: Record<SectionKind, string | null> = {
  default: null,
  verse: null,
  chorus: 'Refrão',
  bridge: 'Ponte',
  tab: 'Tablatura',
};

interface TokenPosition {
  token: string;
  column: number;
}

function tokenize(line: string): TokenPosition[] {
  const tokens: TokenPosition[] = [];
  const pattern = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(line)) !== null) {
    tokens.push({ token: match[0], column: match.index });
  }
  return tokens;
}

/** A plain line (without brackets) made only of chords and neutral tokens like "|" or "(2x)". */
export function isChordLine(line: string): boolean {
  if (line.includes('[') || line.trim() === '') return false;
  const tokens = tokenize(line);
  let chordCount = 0;
  for (const { token } of tokens) {
    if (isChordToken(token)) chordCount += 1;
    else if (!isNeutralToken(token)) return false;
  }
  return chordCount > 0;
}

function parseChordLine(line: string): PositionedChord[] {
  return tokenize(line)
    .filter(({ token }) => isChordToken(token))
    .map(({ token, column }) => ({ chord: token, column }));
}

/** Parses a line with inline `[Chord]` annotations into segments. */
export function parseInlineChords(line: string): ChordSegment[] {
  const segments: ChordSegment[] = [];
  let lastIndex = 0;
  let currentChord: string | null = null;
  let match: RegExpExecArray | null;
  INLINE_CHORD_PATTERN.lastIndex = 0;

  while ((match = INLINE_CHORD_PATTERN.exec(line)) !== null) {
    const lyrics = line.slice(lastIndex, match.index);
    if (currentChord !== null || lyrics.length > 0) {
      segments.push({ chord: currentChord, lyrics });
    }
    currentChord = match[1].trim();
    lastIndex = match.index + match[0].length;
  }

  const tail = line.slice(lastIndex);
  if (currentChord !== null || tail.length > 0) {
    segments.push({ chord: currentChord, lyrics: tail });
  }
  return segments;
}

/** Merges a chord line placed above a lyric line into inline segments. */
export function mergeChordsOverLyrics(chords: PositionedChord[], lyrics: string): ChordSegment[] {
  const sorted = [...chords].sort((a, b) => a.column - b.column);
  const segments: ChordSegment[] = [];
  const firstColumn = sorted[0]?.column ?? 0;

  if (firstColumn > 0 && lyrics.slice(0, firstColumn).length > 0) {
    segments.push({ chord: null, lyrics: lyrics.slice(0, firstColumn) });
  }

  sorted.forEach((item, index) => {
    const next = sorted[index + 1];
    const start = item.column;
    const end = next ? next.column : lyrics.length;
    let text = start < lyrics.length ? lyrics.slice(start, Math.max(start, end)) : '';
    // Chord placed beyond the end of the lyrics or stacked on the same word: keep them apart.
    if (text === '' && next) text = ' ';
    segments.push({ chord: item.chord, lyrics: text });
  });

  return segments;
}

function parseDirective(line: string): { name: string; value: string } | null {
  const match = DIRECTIVE_PATTERN.exec(line.trim());
  if (!match) return null;
  const rawName = match[1].toLowerCase();
  return { name: DIRECTIVE_ALIASES[rawName] ?? rawName, value: (match[2] ?? '').trim() };
}

function applyMetadata(metadata: SheetMetadata, name: string, value: string): void {
  switch (name) {
    case 'title':
    case 'subtitle':
    case 'artist':
    case 'key':
      metadata[name] = value;
      return;
    case 'capo':
    case 'tempo': {
      const parsed = Number.parseInt(value, 10);
      if (Number.isFinite(parsed)) metadata[name] = parsed;
      return;
    }
    default:
      metadata.extra[name] = value;
  }
}

/**
 * Handles "[Refrão]" or "[Intro] G D". Returns null when the bracket is a chord.
 */
function parseLeadingLabel(line: string): { label: string; rest: string } | null {
  const match = LEADING_LABEL_PATTERN.exec(line.trim());
  if (!match) return null;
  const label = match[1].trim();
  const rest = match[2];
  if (isChordToken(label)) return null;
  if (rest.trim() === '' || isChordLine(rest)) return { label, rest };
  return null;
}

export function parseChordSheet(source: string): ChordSheet {
  const metadata: SheetMetadata = { extra: {} };
  const sections: SheetSection[] = [];
  let current: SheetSection = { kind: 'default', label: null, lines: [] };

  const pushLine = (line: SheetLine) => current.lines.push(line);
  const closeSection = () => {
    while (current.lines[current.lines.length - 1]?.kind === 'empty') current.lines.pop();
    if (current.lines.length > 0 || current.kind !== 'default') sections.push(current);
    current = { kind: 'default', label: null, lines: [] };
  };

  const lines = source.replace(/\r\n?/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i += 1) {
    const raw = lines[i].replace(/\t/g, '    ').replace(/\s+$/, '');

    const directive = parseDirective(raw);
    if (directive) {
      const { name, value } = directive;
      if (name in SECTION_START) {
        closeSection();
        const kind = SECTION_START[name];
        current = { kind, label: value || DEFAULT_SECTION_LABELS[kind], lines: [] };
      } else if (SECTION_END.has(name)) {
        closeSection();
      } else if (name === 'comment') {
        pushLine({ kind: 'comment', text: value });
      } else if (name === 'chorus') {
        pushLine({ kind: 'label', text: value || 'Refrão' });
      } else {
        applyMetadata(metadata, name, value);
      }
      continue;
    }

    if (current.kind === 'tab') {
      pushLine({ kind: 'tab', text: raw });
      continue;
    }

    if (raw.trim() === '') {
      // Blank lines only matter between content, not at the start of a section.
      if (current.lines.length > 0) pushLine({ kind: 'empty' });
      continue;
    }

    if (raw.trimStart().startsWith('#')) continue;

    const label = parseLeadingLabel(raw);
    if (label) {
      pushLine({ kind: 'label', text: label.label });
      if (label.rest.trim() !== '') {
        pushLine({ kind: 'chords', chords: parseChordLine(label.rest.trim()) });
      }
      continue;
    }

    if (isChordLine(raw)) {
      const chords = parseChordLine(raw);
      const next = lines[i + 1];
      const canMerge =
        next !== undefined &&
        next.trim() !== '' &&
        !next.includes('[') &&
        !next.includes('{') &&
        !isChordLine(next);
      if (canMerge) {
        pushLine({ kind: 'lyrics', segments: mergeChordsOverLyrics(chords, next.replace(/\s+$/, '')) });
        i += 1;
      } else {
        pushLine({ kind: 'chords', chords });
      }
      continue;
    }

    pushLine({ kind: 'lyrics', segments: parseInlineChords(raw) });
  }

  closeSection();
  return { metadata, sections };
}

/** Extracts only the metadata directives (useful when importing a .cho/.chopro file). */
export function extractMetadata(source: string): SheetMetadata {
  return parseChordSheet(source).metadata;
}

function serializeLine(line: SheetLine): string {
  switch (line.kind) {
    case 'lyrics':
      return line.segments.map((s) => `${s.chord !== null ? `[${s.chord}]` : ''}${s.lyrics}`).join('');
    case 'chords':
      return line.chords.map((c) => `[${c.chord}]`).join(' ');
    case 'label':
      return `[${line.text}]`;
    case 'comment':
      return `{comment: ${line.text}}`;
    case 'tab':
      return line.text;
    case 'empty':
      return '';
  }
}

const SECTION_DIRECTIVES: Record<Exclude<SectionKind, 'default'>, [string, string]> = {
  verse: ['start_of_verse', 'end_of_verse'],
  chorus: ['start_of_chorus', 'end_of_chorus'],
  bridge: ['start_of_bridge', 'end_of_bridge'],
  tab: ['start_of_tab', 'end_of_tab'],
};

/**
 * Serialises a sheet back to ChordPro text. Used to normalise pasted
 * "chords over lyrics" cifras and, in the future, to export .chopro files.
 */
export function toChordPro(sheet: ChordSheet, options: { includeMetadata?: boolean } = {}): string {
  const out: string[] = [];
  if (options.includeMetadata) {
    const { title, subtitle, artist, key, capo, tempo, extra } = sheet.metadata;
    if (title) out.push(`{title: ${title}}`);
    if (subtitle) out.push(`{subtitle: ${subtitle}}`);
    if (artist) out.push(`{artist: ${artist}}`);
    if (key) out.push(`{key: ${key}}`);
    if (capo !== undefined) out.push(`{capo: ${capo}}`);
    if (tempo !== undefined) out.push(`{tempo: ${tempo}}`);
    Object.entries(extra).forEach(([name, value]) => out.push(`{${name}: ${value}}`));
  }

  sheet.sections.forEach((section) => {
    if (section.kind !== 'default') {
      const [start] = SECTION_DIRECTIVES[section.kind];
      const hasCustomLabel = section.label && section.label !== DEFAULT_SECTION_LABELS[section.kind];
      out.push(hasCustomLabel ? `{${start}: ${section.label}}` : `{${start}}`);
    }
    section.lines.forEach((line) => out.push(serializeLine(line)));
    if (section.kind !== 'default') out.push(`{${SECTION_DIRECTIVES[section.kind][1]}}`);
  });

  return out.join('\n');
}

/** Converts any supported input (including chords-over-lyrics) to inline ChordPro. */
export function normalizeToChordPro(source: string): string {
  return toChordPro(parseChordSheet(source), { includeMetadata: true });
}
