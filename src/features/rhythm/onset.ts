import { rms } from '../tuner/pcm';

export interface OnsetOptions {
  /** Analysis hop in milliseconds. */
  hopMs?: number;
  /** Absolute level (RMS of the high-passed signal) a strum must exceed. */
  minLevel?: number;
  /** A strum must be this many times louder than the recent average. */
  ratio?: number;
  /** Minimum gap between two strums, in milliseconds. */
  refractoryMs?: number;
  /** Time constant of the background level average, in milliseconds. */
  averageMs?: number;
}

const DEFAULTS: Required<OnsetOptions> = {
  hopMs: 5,
  minLevel: 0.01,
  ratio: 2.2,
  refractoryMs: 90,
  averageMs: 120,
};

/**
 * Detects strum attacks in a mono PCM stream.
 *
 * The signal is first-differenced (a cheap high-pass that emphasises the
 * scratch of the pick on the strings), cut into short hops and compared with
 * a slow moving average of its own level: a sudden jump is an onset. Pure
 * TypeScript so it can be unit tested with synthetic audio.
 */
export class OnsetDetector {
  private readonly options: Required<OnsetOptions>;
  private sampleRate = 0;
  private hopSize = 0;
  private hop: Float32Array = new Float32Array(0);
  private hopFilled = 0;
  private previousSample = 0;
  private average = 0;
  private samplesSeen = 0;
  private lastOnsetMs = -Infinity;

  constructor(options: OnsetOptions = {}) {
    this.options = { ...DEFAULTS, ...options };
  }

  reset(): void {
    this.sampleRate = 0;
    this.hopFilled = 0;
    this.previousSample = 0;
    this.average = 0;
    this.samplesSeen = 0;
    this.lastOnsetMs = -Infinity;
  }

  /**
   * Feeds consecutive mono samples. Returns onset times in milliseconds,
   * measured from the first sample ever pushed (the stream's own clock).
   */
  push(samples: Float32Array, sampleRate: number): number[] {
    if (sampleRate !== this.sampleRate) this.configure(sampleRate);
    const onsets: number[] = [];

    for (let i = 0; i < samples.length; i += 1) {
      const sample = samples[i];
      this.hop[this.hopFilled] = sample - this.previousSample;
      this.previousSample = sample;
      this.hopFilled += 1;
      this.samplesSeen += 1;
      if (this.hopFilled === this.hopSize) {
        const onset = this.analyzeHop();
        if (onset !== null) onsets.push(onset);
        this.hopFilled = 0;
      }
    }
    return onsets;
  }

  private configure(sampleRate: number): void {
    this.sampleRate = sampleRate;
    this.hopSize = Math.max(16, Math.round((sampleRate * this.options.hopMs) / 1000));
    this.hop = new Float32Array(this.hopSize);
    this.hopFilled = 0;
  }

  private analyzeHop(): number | null {
    const { minLevel, ratio, refractoryMs, averageMs, hopMs } = this.options;
    const level = rms(this.hop);
    // Time of the start of this hop: the attack happened somewhere inside it.
    const timeMs = ((this.samplesSeen - this.hopSize) / this.sampleRate) * 1000;

    const isOnset =
      level >= minLevel && level > this.average * ratio && timeMs - this.lastOnsetMs >= refractoryMs;

    const alpha = Math.min(1, hopMs / averageMs);
    this.average += (level - this.average) * alpha;

    if (!isOnset) return null;
    this.lastOnsetMs = timeMs;
    return timeMs;
  }
}
