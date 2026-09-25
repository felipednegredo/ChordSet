/**
 * Maps times measured in microphone samples to the JS clock used to draw the
 * pattern, so a detected strum can be compared with the step on screen.
 *
 * Each buffer carries the native time at which it finished recording. The
 * delay between that moment and the JS callback varies (bridge, busy JS
 * thread), so the smallest delay seen is used as the best estimate.
 */
export class StreamClock {
  private offsetMs = Infinity;
  private bufferEndStreamMs = 0;
  private samplesPushed = 0;
  private sampleRate = 0;

  constructor(
    /** Hardware input latency: sound reaches the buffer this much after it happened. */
    private readonly inputLatencyMs = 0,
  ) {}

  reset(): void {
    this.offsetMs = Infinity;
    this.bufferEndStreamMs = 0;
    this.samplesPushed = 0;
    this.sampleRate = 0;
  }

  /**
   * Call once per buffer.
   * @param streamTimeMs native time at the end of the buffer (ms since the stream started)
   * @param hostNowMs JS clock when the buffer arrived
   */
  addBuffer(sampleCount: number, sampleRate: number, streamTimeMs: number, hostNowMs: number): void {
    this.samplesPushed += sampleCount;
    this.sampleRate = sampleRate;
    this.bufferEndStreamMs = streamTimeMs;
    this.offsetMs = Math.min(this.offsetMs, hostNowMs - streamTimeMs);
  }

  /** Converts a time counted from the first sample (e.g. an onset) to the JS clock. */
  toHostTime(sampleTimeMs: number): number {
    if (!Number.isFinite(this.offsetMs) || this.sampleRate === 0) return NaN;
    const bufferEndSampleMs = (this.samplesPushed / this.sampleRate) * 1000;
    const ageMs = bufferEndSampleMs - sampleTimeMs;
    return this.offsetMs + this.bufferEndStreamMs - ageMs - this.inputLatencyMs;
  }
}
