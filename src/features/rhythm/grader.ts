import { type StrumPattern, stepDurationMs, type Stroke } from './pattern';

/**
 * - `hit`: stroke on time
 * - `early` / `late`: stroke within the tolerance but off the beat
 * - `miss`: expected stroke not heard
 * - `extra`: something was played where the pattern has a rest
 * - `rest`: rest respected
 */
export type StepResult = 'hit' | 'early' | 'late' | 'miss' | 'extra' | 'rest';

export interface StepJudgement {
  /** Absolute step number since the start of the practice (0-based). */
  step: number;
  /** Position inside the pattern. */
  index: number;
  stroke: Stroke;
  result: StepResult;
  /** Played time minus expected time, when something was played. */
  offsetMs: number | null;
}

export interface GraderOptions {
  /** |offset| up to this is "on time". */
  onTimeMs?: number;
  /** |offset| up to this counts as early/late; beyond it the stroke is a miss. */
  toleranceMs?: number;
}

export interface PracticeStats {
  strokes: number;
  hits: number;
  offBeat: number;
  misses: number;
  extras: number;
  /** 0..1, early/late count as half. Null before the first stroke is judged. */
  accuracy: number | null;
  /** Average offset of the played strokes (negative = rushing, positive = dragging). */
  meanOffsetMs: number | null;
}

const DEFAULTS: Required<GraderOptions> = { onTimeMs: 70, toleranceMs: 150 };

/**
 * Compares detected strums with the pattern played in a loop from time 0.
 * Onsets are matched to the nearest step; steps are finalised once their
 * window has passed so feedback appears right after each stroke.
 */
export class RhythmGrader {
  private readonly options: Required<GraderOptions>;
  private readonly stepMs: number;
  /** Onset offset per step, for steps not yet finalised. */
  private readonly pending = new Map<number, number>();
  private nextStep = 0;
  private stats = { strokes: 0, hits: 0, offBeat: 0, misses: 0, extras: 0, offsetSum: 0, played: 0 };

  constructor(
    private readonly pattern: StrumPattern,
    bpm: number,
    options: GraderOptions = {},
  ) {
    this.stepMs = stepDurationMs(pattern, bpm);
    const merged = { ...DEFAULTS, ...options };
    // Fast subdivisions leave less room around each step.
    this.options = {
      onTimeMs: Math.min(merged.onTimeMs, this.stepMs * 0.3),
      toleranceMs: Math.min(merged.toleranceMs, this.stepMs * 0.5),
    };
  }

  get stepDurationMs(): number {
    return this.stepMs;
  }

  strokeAt(step: number): Stroke {
    const { steps } = this.pattern;
    return steps[((step % steps.length) + steps.length) % steps.length];
  }

  /** Registers a detected strum at `timeMs` (same clock as the pattern, 0 = first step). */
  addOnset(timeMs: number): void {
    const step = Math.round(timeMs / this.stepMs);
    if (step < this.nextStep) return;
    const offset = timeMs - step * this.stepMs;
    const previous = this.pending.get(step);
    // Keep the onset closest to the grid when two land on the same step.
    if (previous === undefined || Math.abs(offset) < Math.abs(previous)) this.pending.set(step, offset);
  }

  /** Finalises every step whose matching window closed before `nowMs`. */
  flush(nowMs: number): StepJudgement[] {
    const judgements: StepJudgement[] = [];
    while ((this.nextStep + 0.5) * this.stepMs <= nowMs) {
      judgements.push(this.judge(this.nextStep));
      this.pending.delete(this.nextStep);
      this.nextStep += 1;
    }
    return judgements;
  }

  getStats(): PracticeStats {
    const { strokes, hits, offBeat, misses, extras, offsetSum, played } = this.stats;
    return {
      strokes,
      hits,
      offBeat,
      misses,
      extras,
      accuracy: strokes > 0 ? (hits + offBeat * 0.5) / strokes : null,
      meanOffsetMs: played > 0 ? offsetSum / played : null,
    };
  }

  private judge(step: number): StepJudgement {
    const stroke = this.strokeAt(step);
    const index = step % this.pattern.steps.length;
    const raw = this.pending.get(step);
    const offset = raw !== undefined && Math.abs(raw) <= this.options.toleranceMs ? raw : null;

    if (stroke === 'rest') {
      if (offset === null) return { step, index, stroke, result: 'rest', offsetMs: null };
      this.stats.extras += 1;
      return { step, index, stroke, result: 'extra', offsetMs: offset };
    }

    this.stats.strokes += 1;
    if (offset === null) {
      this.stats.misses += 1;
      return { step, index, stroke, result: 'miss', offsetMs: null };
    }

    this.stats.played += 1;
    this.stats.offsetSum += offset;
    if (Math.abs(offset) <= this.options.onTimeMs) {
      this.stats.hits += 1;
      return { step, index, stroke, result: 'hit', offsetMs: offset };
    }
    this.stats.offBeat += 1;
    return { step, index, stroke, result: offset < 0 ? 'early' : 'late', offsetMs: offset };
  }
}
