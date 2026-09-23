import { useKeepAwake } from 'expo-keep-awake';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AppText,
  EmptyState,
  ErrorState,
  Icon,
  IconButton,
  LoadingView,
  MAX_CONTENT_WIDTH,
} from '../../../components';
import { toUserMessage } from '../../../services/errors';
import { radius, spacing, useTheme } from '../../../theme';
import type { RepertoireEntry } from '../../../types';
import { parseChordSheet, transposeSheet } from '../../chords';
import { useSettings } from '../../settings/SettingsProvider';
import { ChordSheetView } from '../components/ChordSheetView';
import { type ToolbarPanel, ViewerToolbar } from '../components/ViewerToolbar';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { useSongViewer } from '../hooks/useSongViewer';
import { computePlaybackDisplay } from '../playback';

export function SongViewerScreen() {
  useKeepAwake();
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id: string; entryId?: string }>();
  const viewer = useSongViewer(params.id, params.entryId || undefined);
  const { settings, updateSettings } = useSettings();

  const scrollRef = useRef<ScrollView>(null);
  const autoScroll = useAutoScroll(scrollRef, settings.autoScrollSpeed);
  const [panel, setPanel] = useState<ToolbarPanel>(null);
  const [showChords, setShowChords] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);

  const { song } = viewer;
  const sheet = useMemo(() => (song ? parseChordSheet(song.content) : null), [song]);
  const display = useMemo(
    () =>
      song
        ? computePlaybackDisplay({
            originalKey: song.originalKey,
            soundingKey: viewer.soundingKey,
            capo: viewer.capo,
          })
        : null,
    [song, viewer.soundingKey, viewer.capo],
  );
  const transposed = useMemo(
    () => (sheet && display ? transposeSheet(sheet, display.semitones, display.accidental) : null),
    [sheet, display],
  );

  const goToEntry = useCallback(
    (entry: RepertoireEntry) => {
      autoScroll.stop();
      router.replace({ pathname: '/song/[id]', params: { id: entry.songId, entryId: entry.id } });
    },
    [autoScroll, router],
  );

  const headerRight = useCallback(
    () =>
      song ? (
        <View style={styles.headerActions}>
          <IconButton
            icon={song.favorite ? 'star' : 'star-outline'}
            color={song.favorite ? colors.accent : colors.text}
            onPress={viewer.toggleFavorite}
            accessibilityLabel={song.favorite ? 'Remover dos favoritos' : 'Favoritar'}
          />
          <IconButton
            icon="add-circle-outline"
            onPress={() => router.push({ pathname: '/song/add-to-repertoire', params: { songId: song.id } })}
            accessibilityLabel="Adicionar ao repertório"
          />
          <IconButton
            icon="create-outline"
            onPress={() => router.push({ pathname: '/song/edit', params: { id: song.id } })}
            accessibilityLabel="Editar cifra"
          />
        </View>
      ) : null,
    [colors, router, song, viewer.toggleFavorite],
  );

  if (viewer.loading) return <LoadingView />;
  if (viewer.error && !song)
    return <ErrorState message={toUserMessage(viewer.error)} onRetry={viewer.reload} />;
  if (viewer.notFound || !song || !transposed || !display) {
    return (
      <EmptyState
        icon="document-outline"
        title="Cifra não encontrada"
        message="Ela pode ter sido excluída."
        actionLabel="Voltar"
        onAction={() => router.back()}
      />
    );
  }

  const { navigation, entry } = viewer;
  const keyInfo = [
    `Tom ${viewer.soundingKey}`,
    viewer.capo > 0 ? `Capo ${viewer.capo} · formas em ${display.shapesKey}` : null,
    viewer.soundingKey !== song.originalKey ? `original ${song.originalKey}` : null,
  ]
    .filter(Boolean)
    .join('  ·  ');

  return (
    <SafeAreaView edges={['bottom']} style={[styles.flex, { backgroundColor: colors.background }]}>
      <Stack.Screen
        options={{
          title: entry ? `${navigation.index + 1} de ${navigation.entries.length}` : '',
          headerRight,
        }}
      />

      <ScrollView
        ref={scrollRef}
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        {...autoScroll.scrollHandlers}
      >
        <Pressable
          onPress={() => setControlsVisible((visible) => !visible)}
          accessibilityHint="Toque para mostrar ou esconder os controles"
          style={styles.page}
        >
          <View style={styles.titleBlock}>
            <AppText variant="title">{song.title}</AppText>
            {song.artist ? <AppText color="textMuted">{song.artist}</AppText> : null}
            <AppText variant="caption" color="accent" style={styles.keyInfo}>
              {keyInfo}
              {entry && entry.key !== null ? '  ·  tom do repertório' : ''}
            </AppText>
          </View>
          <ChordSheetView sheet={transposed} fontSize={settings.sheetFontSize} showChords={showChords} />
        </Pressable>
      </ScrollView>

      {!controlsVisible && autoScroll.isScrolling ? (
        <Pressable
          onPress={autoScroll.toggle}
          accessibilityRole="button"
          accessibilityLabel="Pausar rolagem"
          style={[styles.floatingPause, { backgroundColor: colors.accent }]}
        >
          <Icon name="pause" size={28} color={colors.onAccent} />
        </Pressable>
      ) : null}

      {controlsVisible ? (
        <View style={styles.bottom}>
          {entry ? (
            <View
              style={[styles.setlistBar, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              <SetlistButton
                direction="previous"
                entry={navigation.previous}
                onPress={() => navigation.previous && goToEntry(navigation.previous)}
              />
              <SetlistButton
                direction="next"
                entry={navigation.next}
                onPress={() => navigation.next && goToEntry(navigation.next)}
              />
            </View>
          ) : null}
          <ViewerToolbar
            panel={panel}
            onPanelChange={setPanel}
            soundingKey={viewer.soundingKey}
            shapesKey={display.shapesKey}
            canResetKey={viewer.isKeyOverridden}
            resetKeyLabel={entry ? 'Usar tom da biblioteca' : `Voltar para ${song.originalKey}`}
            onTranspose={viewer.transpose}
            onResetKey={viewer.resetKey}
            capo={viewer.capo}
            onCapoChange={viewer.changeCapo}
            fontSize={settings.sheetFontSize}
            onFontSizeChange={(sheetFontSize) => updateSettings({ sheetFontSize })}
            showChords={showChords}
            onToggleChords={() => setShowChords((value) => !value)}
            isScrolling={autoScroll.isScrolling}
            onToggleScroll={autoScroll.toggle}
            scrollSpeed={settings.autoScrollSpeed}
            onScrollSpeedChange={(autoScrollSpeed) => updateSettings({ autoScrollSpeed })}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function SetlistButton({
  direction,
  entry,
  onPress,
}: {
  direction: 'previous' | 'next';
  entry: RepertoireEntry | null;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const isNext = direction === 'next';
  return (
    <Pressable
      onPress={onPress}
      disabled={!entry}
      accessibilityRole="button"
      accessibilityLabel={entry ? `${isNext ? 'Próxima' : 'Anterior'}: ${entry.song.title}` : undefined}
      style={({ pressed }) => [
        styles.setlistButton,
        isNext && styles.setlistButtonNext,
        { opacity: !entry ? 0.3 : pressed ? 0.6 : 1 },
      ]}
    >
      {!isNext ? <Icon name="chevron-back" size={26} color={colors.accent} /> : null}
      <View style={[styles.flex, isNext && styles.alignEnd]}>
        <AppText variant="caption" color="textMuted">
          {isNext ? 'Próxima' : 'Anterior'}
        </AppText>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {entry?.song.title ?? '—'}
        </AppText>
      </View>
      {isNext ? <Icon name="chevron-forward" size={26} color={colors.accent} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  alignEnd: { alignItems: 'flex-end' },
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  scrollContent: { paddingBottom: 240 },
  page: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
  },
  titleBlock: { gap: spacing.xs, marginBottom: spacing.xl },
  keyInfo: { marginTop: spacing.xs },
  bottom: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  setlistBar: {
    flexDirection: 'row',
    marginHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.lg,
  },
  setlistButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 56,
    paddingHorizontal: spacing.sm,
  },
  setlistButtonNext: { justifyContent: 'flex-end' },
  floatingPause: {
    position: 'absolute',
    right: spacing.xl,
    bottom: spacing.xl,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
