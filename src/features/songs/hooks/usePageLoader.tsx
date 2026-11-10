import { type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { BLOCKED_MESSAGE, ImportError, PAGE_CAPTURE_SCRIPT, readPageCapture } from '../webImport';

/** Anti-bot checks take a few seconds before the real page is loaded. */
const TIMEOUT_MS = 30_000;

interface Job {
  id: number;
  url: string;
  resolve: (html: string) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface PageLoader {
  /** Loads the page in a hidden WebView and resolves with its HTML once the cifra is there. */
  load: (url: string) => Promise<string>;
  /** Must be rendered by the screen; it is empty unless a page is loading. */
  element: ReactElement | null;
}

/**
 * Downloads a page with the system browser engine. Sites behind anti-bot
 * protection (Cifra Club) refuse `fetch` with 403 whatever headers are sent,
 * but serve a WebView as they would serve Chrome.
 */
export function usePageLoader(): PageLoader {
  const job = useRef<Job | null>(null);
  const nextId = useRef(1);
  const [current, setCurrent] = useState<{ id: number; url: string } | null>(null);

  const finish = useCallback((settle: (active: Job) => void) => {
    const active = job.current;
    if (!active) return;
    job.current = null;
    clearTimeout(active.timer);
    setCurrent(null);
    settle(active);
  }, []);

  const load = useCallback(
    (url: string) =>
      new Promise<string>((resolve, reject) => {
        finish((previous) => previous.reject(new ImportError('Importação cancelada.')));
        const id = nextId.current++;
        const timer = setTimeout(
          () => finish((active) => active.reject(new ImportError(BLOCKED_MESSAGE))),
          TIMEOUT_MS,
        );
        job.current = { id, url, resolve, reject, timer };
        setCurrent({ id, url });
      }),
    [finish],
  );

  useEffect(
    () => () => finish((active) => active.reject(new ImportError('Importação cancelada.'))),
    [finish],
  );

  const element = current ? (
    <View style={styles.hidden} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <WebView
        key={current.id}
        source={{ uri: current.url }}
        style={styles.webView}
        originWhitelist={['http://*', 'https://*']}
        injectedJavaScript={PAGE_CAPTURE_SCRIPT}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        mediaPlaybackRequiresUserAction
        // Links to app stores and "intent://" must not leave the app.
        onShouldStartLoadWithRequest={(request) => /^https?:\/\//i.test(request.url)}
        onMessage={(event) => {
          const capture = readPageCapture(event.nativeEvent.data);
          if (capture.kind === 'page') finish((active) => active.resolve(capture.html));
        }}
        onError={(event) =>
          finish((active) =>
            active.reject(
              new ImportError(
                'Não foi possível baixar a página. Verifique sua conexão com a internet.',
                event.nativeEvent.description,
              ),
            ),
          )
        }
      />
    </View>
  ) : null;

  return { load, element };
}

const styles = StyleSheet.create({
  // Invisible but laid out inside the window with a real size: Android throttles
  // or does not run pages in a WebView that is 0×0 or outside the screen.
  hidden: { position: 'absolute', left: 0, top: 0, width: 320, height: 480, opacity: 0 },
  webView: { flex: 1 },
});
