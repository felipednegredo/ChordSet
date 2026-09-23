import { downsample, rms } from './pcm';
import { detectPitchYin, YIN_DEFAULTS } from './yin';

export interface AnalyzerOptions {
  /** Analysis window, in samples at the decimated rate. */
  windowSize?: number;
  /** New samples required between two analyses. */
  hopSize?: number;
  /** Samples are decimated to stay close to (but not below) this rate. */
  targetSampleRate?: number;
  /** RMS below this level is treated as silence. */
  minLevel?: number;
  /** Number of recent estimates used by the median filter. */
  smoothing?: number;
  threshold?: number;
  minFrequency?: number;
  maxFrequency?: number;
}

export interface PitchFrame {
  /** Smoothed frequency in Hz, or null when there is no stable pitch. */
  frequency: number | null;
  probability: number;
  /** Input level (RMS 0..1). */
  level: number;
}

const DEFAULTS = {
  windowSize: 2048,
  hopSize: 768,
  targetSampleRate: 22050,
  minLevel: 0.008,
  smoothing: 5,
} as const;

/** One semitone ≈ 5.9 %. Bigger jumps reset the smoothing history. */
const SEMITONE_RATIO = 2 ** (1 / 12);

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * Streaming pipeline: PCM chunks → decimation → sliding window → YIN → median filter.
 * Pure TypeScript, no React/Expo dependency, so it can be unit tested.
 */
export class PitchAnalyzer {
  private readonly options: Required<AnalyzerOptions>;
  private window: Float32Array;
  private filled = 0;
  private sinceLastAnalysis = 0;
  private history: number[] = [];
  private carry: Float32Array = new Float32Array(0);

  constructor(options: AnalyzerOptions = {}) {
    this.options = {
      windowSize: options.windowSize ?? DEFAULTS.windowSize,
      hopSize: options.hopSize ?? DEFAULTS.hopSize,
      targetSampleRate: options.targetSampleRate ?? DEFAULTS.targetSampleRate,
      minLevel: options.minLevel ?? DEFAULTS.minLevel,
      smoothing: options.smoothing ?? DEFAULTS.smoothing,
      threshold: options.threshold ?? YIN_DEFAULTS.threshold,
      minFrequency: options.minFrequency ?? YIN_DEFAULTS.minFrequency,
      maxFrequency: options.maxFrequency ?? YIN_DEFAULTS.maxFrequency,
    };
    this.window = new Float32Array(this.options.windowSize);
  }

  reset(): void {
    this.window.fill(0);
    this.filled = 0;
    this.sinceLastAnalysis = 0;
    this.history = [];
    this.carry = new Float32Array(0);
  }

  decimationFactor(sampleRate: number): number {
    return Math.max(1, Math.floor(sampleRate / this.options.targetSampleRate));
  }

  /** Feeds new mono samples. Returns a frame when a new analysis was performed. */
  push(samples: Float32Array, sampleRate: number): PitchFrame | null {
    const factor = this.decimationFactor(sampleRate);
    const input = this.withCarry(samples, factor);
    const decimated = downsample(input, factor);
    this.append(decimated);

    if (this.filled < this.window.length || this.sinceLastAnalysis < this.options.hopSize) return null;
    this.sinceLastAnalysis = 0;
    return this.analyze(sampleRate / factor);
  }

  private withCarry(samples: Float32Array, factor: number): Float32Array {
    let input = samples;
    if (this.carry.length > 0) {
      input = new Float32Array(this.carry.length + samples.length);
      input.set(this.carry);
      input.set(samples, this.carry.length);
    }
    const usable = input.length - (input.length % factor);
    this.carry = input.slice(usable);
    return input.subarray(0, usable);
  }

  private append(samples: Float32Array): void {
    const size = this.window.length;
    if (samples.length >= size) {
      this.window.set(samples.subarray(samples.length - size));
    } else {
      this.window.copyWithin(0, samples.length);
      this.window.set(samples, size - samples.length);
    }
    this.filled = Math.min(size, this.filled + samples.length);
    this.sinceLastAnalysis += samples.length;
  }

  private analyze(sampleRate: number): PitchFrame {
    const level = rms(this.window);
    if (level < this.options.minLevel) {
      this.history = [];
      return { frequency: null, probability: 0, level };
    }

    const estimate = detectPitchYin(this.window, {
      sampleRate,
      threshold: this.options.threshold,
      minFrequency: this.options.minFrequency,
      maxFrequency: this.options.maxFrequency,
    });

    if (!estimate) return { frequency: null, probability: 0, level };

    const current = this.history.length > 0 ? median(this.history) : null;
    const jump = current ? Math.max(estimate.frequency / current, current / estimate.frequency) : 1;
    if (jump > SEMITONE_RATIO) this.history = [];

    this.history.push(estimate.frequency);
    if (this.history.length > this.options.smoothing) this.history.shift();

    return { frequency: median(this.history), probability: estimate.probability, level };
  }
}
