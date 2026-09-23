import {
  type AudioStreamBuffer,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

import { PitchAnalyzer } from './analyzer';
import { decodePcm } from './pcm';
import { logError } from '../../services/errors';

export type TunerStatus = 'idle' | 'starting' | 'listening' | 'denied' | 'error';

export interface TunerState {
  status: TunerStatus;
  /** Smoothed fundamental frequency in Hz, or null while there is no stable pitch. */
  frequency: number | null;
  /** Input level 0..1 (RMS). */
  level: number;
  error: string | null;
}

/** Requested capture format; the device may deliver a different sample rate. */
const SAMPLE_RATE = 48000;
/** Minimum interval between UI updates. */
const UI_INTERVAL_MS = 60;
/** Keep the last note on screen briefly after the string stops ringing. */
const HOLD_MS = 900;

/**
 * Microphone → PCM (expo-audio `useAudioStream`) → {@link PitchAnalyzer} (YIN).
 * The hook only deals with the audio session and React state; all DSP lives in
 * pure TypeScript modules.
 */
export function useTuner() {
  const analyzer = useRef(new PitchAnalyzer());
  const lastEmit = useRef(0);
  const lastPitchAt = useRef(0);
  const [state, setState] = useState<TunerState>({ status: 'idle', frequency: null, level: 0, error: null });

  const onBuffer = useCallback((buffer: AudioStreamBuffer) => {
    const samples = decodePcm(buffer.data, 'float32', buffer.channels);
    const frame = analyzer.current.push(samples, buffer.sampleRate);
    if (!frame) return;

    const now = Date.now();
    if (frame.frequency !== null) lastPitchAt.current = now;
    if (now - lastEmit.current < UI_INTERVAL_MS) return;
    lastEmit.current = now;

    setState((previous) => {
      const holding = frame.frequency === null && now - lastPitchAt.current < HOLD_MS;
      return {
        ...previous,
        frequency: frame.frequency ?? (holding ? previous.frequency : null),
        level: frame.level,
      };
    });
  }, []);

  const { stream } = useAudioStream({ sampleRate: SAMPLE_RATE, channels: 1, encoding: 'float32', onBuffer });

  const start = useCallback(async () => {
    setState((previous) => ({ ...previous, status: 'starting', error: null }));
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setState((previous) => ({ ...previous, status: 'denied' }));
        return;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      analyzer.current.reset();
      await stream.start();
      setState({ status: 'listening', frequency: null, level: 0, error: null });
    } catch (error) {
      logError('tuner.start', error);
      setState((previous) => ({
        ...previous,
        status: 'error',
        error: 'Não foi possível acessar o microfone.',
      }));
    }
  }, [stream]);

  const stop = useCallback(() => {
    try {
      stream.stop();
    } catch (error) {
      logError('tuner.stop', error);
    }
    setAudioModeAsync({ allowsRecording: false }).catch(() => undefined);
    setState((previous) => ({ ...previous, status: 'idle', frequency: null, level: 0 }));
  }, [stream]);

  // Always release the microphone when the component unmounts.
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

  return { ...state, isListening: state.status === 'listening', start, stop };
}
