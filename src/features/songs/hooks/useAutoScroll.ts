import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

import { autoScrollPixelsPerSecond } from '../playback';

/** Difference (px) between our position and the reported offset that means a manual drag. */
const MANUAL_SCROLL_TOLERANCE = 24;

export interface AutoScrollControls {
  isScrolling: boolean;
  toggle: () => void;
  stop: () => void;
  /** Wire these to the ScrollView so manual scrolling and sizes are tracked. */
  scrollHandlers: {
    onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
    onLayout: (event: LayoutChangeEvent) => void;
    onContentSizeChange: (width: number, height: number) => void;
    scrollEventThrottle: number;
  };
}

/**
 * Smooth auto-scroll driven by requestAnimationFrame. The speed level can be
 * changed while scrolling; it stops automatically at the end of the sheet.
 */
export function useAutoScroll(
  scrollRef: RefObject<ScrollView | null>,
  speedLevel: number,
): AutoScrollControls {
  const [isScrolling, setIsScrolling] = useState(false);
  const offset = useRef(0);
  const viewportHeight = useRef(0);
  const contentHeight = useRef(0);
  const speed = useRef(autoScrollPixelsPerSecond(speedLevel));
  const frame = useRef<number | null>(null);

  useEffect(() => {
    speed.current = autoScrollPixelsPerSecond(speedLevel);
  }, [speedLevel]);

  const stop = useCallback(() => setIsScrolling(false), []);
  const toggle = useCallback(() => setIsScrolling((value) => !value), []);

  useEffect(() => {
    if (!isScrolling) return undefined;
    let last: number | null = null;
    // Sub-pixel progress is accumulated here because scrollTo works best with whole numbers.
    let position = offset.current;

    const step = (time: number) => {
      if (last !== null) {
        const maxOffset = Math.max(0, contentHeight.current - viewportHeight.current);
        // The user dragged the sheet: continue from where they left it.
        if (Math.abs(offset.current - position) > MANUAL_SCROLL_TOLERANCE) position = offset.current;
        position = Math.min(maxOffset, position + (speed.current * (time - last)) / 1000);
        scrollRef.current?.scrollTo({ y: position, animated: false });
        if (position >= maxOffset) {
          setIsScrolling(false);
          return;
        }
      }
      last = time;
      frame.current = requestAnimationFrame(step);
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      frame.current = null;
    };
  }, [isScrolling, scrollRef]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    viewportHeight.current = event.nativeEvent.layout.height;
  }, []);
  const onContentSizeChange = useCallback((_width: number, height: number) => {
    contentHeight.current = height;
  }, []);

  return {
    isScrolling,
    toggle,
    stop,
    scrollHandlers: { onScroll, onLayout, onContentSizeChange, scrollEventThrottle: 32 },
  };
}
