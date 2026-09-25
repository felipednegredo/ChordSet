import {
  type AudioStreamBuffer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type PracticeStats, RhythmGrader, type StepJudgement } from './grader';
import { OnsetDetector } from './onset';
import { beatsInPattern, type StrumPattern, stepDurationMs } from './pattern';
import { StreamClock } from './streamClock';
import { logError } from '../../services/errors';
import { decodePcm } from '../tuner/pcm';

export type PracticeMode = 'guide' | 'mic';
export type PracticeStatus = 'idle' | 'starting' | 'running' | 'denied' | 'error';

export interface RhythmPracticeState {
  status: PracticeStatus;
  mode: PracticeMode | null;
  /** Remaining count-in beats (4, 3, 2, 1) before the pattern starts, or 0. */
  countIn: number;
  /** Absolute step being played, or -1 while stopped / counting in. */
  step: number;
  /** Latest judgement per pattern position (mic mode only). */
  results: (StepJudgement | null)[];
  lastJudgement: StepJudgement | null;
  stats: PracticeStats | null;
  error: string | null;
}

const SAMPLE_RATE = 48000;
/** Typical Android microphone path latency; strums are shifted back by this much. */
const INPUT_LATENCY_MS = 40;

function idleState(length: number): RhythmPracticeState {
  return {
    status: 'idle',
    mode: null,
    countIn: 0,
    step: -1,
    results: Array.from({ length }, () => null),
    lastJudgement: null,
    stats: null,
    error: null,
  };
}

/**
 * Plays a strumming pattern as a visual guide (with a one-bar count-in) and,
 * in mic mode, listens to the guitar and grades each stroke against the grid.
 * The hook only handles clocks, the audio session and React state; detection
 * and grading live in pure modules.
 */
export function useRhythmPractice(pattern: StrumPattern | null, bpm: number) {
  const length = pattern?.steps.length ?? 0;
  const [state, setState] = useState<RhythmPracticeState>(() => idleState(length));

  const detector = useRef(new OnsetDetector());
  const clock = useRef(new StreamClock(INPUT_LATENCY_MS));
  const grader = useRef<RhythmGrader | null>(null);
  /** performance.now() of step 0. */
  const origin = useRef(0);
  const frame = useRef<number | null>(null);
  /** Incremented on every start/stop so a slow permission prompt cannot revive a stopped session. */
  const session = useRef(0);

  const onBuffer = useCallback((buffer: AudioStreamBuffer) => {
    if (!grader.current) return;
    const samples = decodePcm(buffer.data, 'float32', buffer.channels);
    const onsets = detector.current.push(samples, buffer.sampleRate);
    clock.current.addBuffer(samples.length, buffer.sampleRate, buffer.timestamp * 1000, performance.now());
    for (const onset of onsets) {
      const time = clock.current.toHostTime(onset);
      if (Number.isFinite(time)) grader.current.addOnset(time - origin.current);
    }
  }, []);

  const { stream } = useAudioStream({ sampleRate: SAMPLE_RATE, channels: 1, encoding: 'float32', onBuffer });

  const stopFrames = () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  };

  const releaseMic = useCallback(() => {
    try {
      stream.stop();
    } catch {
      // Stream not started or already released.
    }
    setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
  }, [stream]);

  const stop = useCallback(() => {
    session.current += 1;
    stopFrames();
    const wasListening = grader.current !== null;
    grader.current = null;
    if (wasListening) releaseMic();
    setState((previous) => ({ ...previous, status: 'idle', countIn: 0, step: -1 }));
  }, [releaseMic]);

  const runClock = useCallback((current: StrumPattern, tempo: number) => {
    const stepMs = stepDurationMs(current, tempo);
    const beatMs = 60000 / tempo;
    let lastStep = Number.NaN;
    let lastCountIn = Number.NaN;

    const tick = () => {
      const elapsed = performance.now() - origin.current;
      const step = elapsed < 0 ? -1 : Math.floor(elapsed / stepMs);
      const countIn = elapsed < 0 ? Math.ceil(-elapsed / beatMs) : 0;
      const judgements = grader.current?.flush(elapsed) ?? [];

      if (step !== lastStep || countIn !== lastCountIn || judgements.length > 0) {
        lastStep = step;
        lastCountIn = countIn;
        setState((previous) => {
          let { results, lastJudgement } = previous;
          if (judgements.length > 0) {
            results = [...results];
            for (const judgement of judgements) results[judgement.index] = judgement;
            // Rests only matter when something was played on them.
            lastJudgement = [...judgements].reverse().find((j) => j.result !== 'rest') ?? lastJudgement;
          }
          // Clear the feedback of a step as the guide reaches it again.
          const index = step % current.steps.length;
          if (step >= 0 && results[index] && results[index].step !== step) {
            results = results === previous.results ? [...results] : results;
            results[index] = null;
          }
          return {
            ...previous,
            step,
            countIn,
            results,
            lastJudgement,
            stats: grader.current ? grader.current.getStats() : previous.stats,
          };
        });
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }, []);

  const start = useCallback(
    async (mode: PracticeMode) => {
      if (!pattern) return;
      stop();
      const id = session.current;
      setState({ ...idleState(pattern.steps.length), status: 'starting', mode });

      if (mode === 'mic') {
        try {
          const permission = await requestRecordingPermissionsAsync();
          if (id !== session.current) return;
          if (!permission.granted) {
            setState((previous) => ({ ...previous, status: 'denied' }));
            return;
          }
          await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
          detector.current.reset();
          clock.current.reset();
          // Strums heard before the count-in is scheduled are ignored.
          origin.current = Infinity;
          grader.current = new RhythmGrader(pattern, bpm);
          await stream.start();
          if (id !== session.current) {
            releaseMic();
            return;
          }
        } catch (error) {
          logError('rhythm.start', error);
          grader.current = null;
          setState((previous) => ({
            ...previous,
            status: 'error',
            error: 'Não foi possível acessar o microfone.',
          }));
          return;
        }
      }

      // One bar of count-in so the player can get ready.
      origin.current = performance.now() + beatsInPattern(pattern) * (60000 / bpm);
      setState((previous) => ({ ...previous, status: 'running' }));
      runClock(pattern, bpm);
    },
    [bpm, pattern, releaseMic, runClock, stop, stream],
  );

  // A new pattern or tempo invalidates the running clock and the grading grid.
  const [inputs, setInputs] = useState({ pattern, bpm });
  if (inputs.pattern !== pattern || inputs.bpm !== bpm) {
    setInputs({ pattern, bpm });
    setState(idleState(length));
  }

  // Stop the frame loop and release the microphone when the inputs change or on unmount.
  useEffect(
    () => () => {
      session.current += 1;
      stopFrames();
      if (grader.current) {
        grader.current = null;
        releaseMic();
      }
    },
    [pattern, bpm, releaseMic],
  );

  // The stream may still be starting when the component goes away.
  useEffect(
    () => () => {
      try {
        stream.stop();
      } catch {
        // Stream already released.
      }
    },
    [stream],
  );

  return { ...state, isRunning: state.status === 'running' || state.status === 'starting', start, stop };
}
