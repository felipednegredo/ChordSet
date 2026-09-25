/**
 * Strumming patterns ("levadas").
 *
 * Text notation, one character per step (spaces are ignored):
 *   D, B, ↓  down stroke (para baixo)
 *   U, C, ↑  up stroke (para cima)
 *   X        muted/chucked stroke (abafado, para baixo)
 *   -, _, .  rest (pausa: a mão passa sem tocar)
 * A trailing "x2" / "2x" repeats the pattern (e.g. per chord).
 *
 * Patterns with up to 8 steps are counted in eighth notes (2 steps per beat);
 * longer patterns with a multiple of 4 steps are counted in sixteenths.
 */

export type Stroke = 'down' | 'up' | 'mute' | 'rest';

export interface StrumPattern {
  steps: Stroke[];
  /** How many times the pattern is played before moving on (≥ 1). */
  repeats: number;
}

export const MAX_PATTERN_STEPS = 16;
export const MAX_REPEATS = 8;
export const DEFAULT_TEMPO = 80;
export const TEMPO_RANGE = { min: 40, max: 200 } as const;

const STROKE_CHARS: Record<string, Stroke> = {
  d: 'down',
  b: 'down',
  '↓': 'down',
  u: 'up',
  c: 'up',
  '↑': 'up',
  x: 'mute',
  '-': 'rest',
  _: 'rest',
  '.': 'rest',
};

const STROKE_TO_CHAR: Record<Stroke, string> = { down: 'D', up: 'U', mute: 'X', rest: '-' };

const REPEAT_PATTERN = /\s*(?:[x×]\s*(\d+)|(\d+)\s*[x×])\s*$/i;

/** Parses the text notation. Returns null when the text is empty or has unknown characters. */
export function parsePattern(text: string): StrumPattern | null {
  let body = text.trim();
  let repeats = 1;
  const repeat = REPEAT_PATTERN.exec(body);
  if (repeat) {
    repeats = Number.parseInt(repeat[1] ?? repeat[2], 10);
    body = body.slice(0, repeat.index);
  }

  const steps: Stroke[] = [];
  for (const char of body.replace(/\s+/g, '')) {
    const stroke = STROKE_CHARS[char.toLowerCase()];
    if (!stroke) return null;
    steps.push(stroke);
  }
  if (steps.length === 0 || steps.length > MAX_PATTERN_STEPS) return null;
  if (!steps.some((step) => step !== 'rest')) return null;
  return { steps, repeats: Math.min(MAX_REPEATS, Math.max(1, repeats)) };
}

/** Canonical text form, grouped by beat: "D-DU-UDU" → "D- DU -U DU". */
export function formatPattern(pattern: StrumPattern): string {
  const perBeat = stepsPerBeat(pattern.steps.length);
  const groups: string[] = [];
  for (let i = 0; i < pattern.steps.length; i += perBeat) {
    groups.push(
      pattern.steps
        .slice(i, i + perBeat)
        .map((step) => STROKE_TO_CHAR[step])
        .join(''),
    );
  }
  const text = groups.join(' ');
  return pattern.repeats > 1 ? `${text} x${pattern.repeats}` : text;
}

/** Normalises user input; invalid text is returned trimmed so the form can flag it. */
export function normalizePatternText(text: string): string {
  const parsed = parsePattern(text);
  return parsed ? formatPattern(parsed) : text.trim();
}

export function stepsPerBeat(length: number): number {
  return length > 8 && length % 4 === 0 ? 4 : 2;
}

export function beatsInPattern(pattern: StrumPattern): number {
  return Math.ceil(pattern.steps.length / stepsPerBeat(pattern.steps.length));
}

/** Duration of one step in milliseconds. */
export function stepDurationMs(pattern: StrumPattern, bpm: number): number {
  return 60000 / clampTempo(bpm) / stepsPerBeat(pattern.steps.length);
}

/** Counting syllables shown under each arrow: "1 e 2 e" or "1 · e · 2 · e ·". */
export function countLabels(length: number): string[] {
  const perBeat = stepsPerBeat(length);
  return Array.from({ length }, (_, index) => {
    const position = index % perBeat;
    if (position === 0) return `${Math.floor(index / perBeat) + 1}`;
    return position === perBeat / 2 ? 'e' : '·';
  });
}

export function countStrokes(pattern: StrumPattern): number {
  return pattern.steps.filter((step) => step !== 'rest').length;
}

export function clampTempo(bpm: number): number {
  if (!Number.isFinite(bpm)) return DEFAULT_TEMPO;
  return Math.round(Math.min(TEMPO_RANGE.max, Math.max(TEMPO_RANGE.min, bpm)));
}

export interface PatternPreset {
  name: string;
  pattern: string;
  tempo: number;
}

/** Common acoustic guitar patterns offered as one-tap presets. */
export const PATTERN_PRESETS: PatternPreset[] = [
  { name: 'Balada', pattern: 'D- DU -U DU', tempo: 80 },
  { name: 'Semínimas', pattern: 'D- D- D- D-', tempo: 90 },
  { name: 'Colcheias', pattern: 'DU DU DU DU', tempo: 80 },
  { name: 'Pop', pattern: 'D- D- DU -U', tempo: 100 },
  { name: 'Abafado', pattern: 'D- XU -U XU', tempo: 90 },
  { name: 'Valsa 3/4', pattern: 'D- DU DU', tempo: 90 },
  { name: 'Reggae', pattern: '-U -U -U -U', tempo: 80 },
];
