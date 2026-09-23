import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { KeyBadge } from './KeyBadge';
import { AppText, IconButton } from '../../../components';
import { spacing, useTheme } from '../../../theme';
import type { SongSummary } from '../../../types';

export interface SongListItemProps {
  song: SongSummary;
  onPress: (song: SongSummary) => void;
  onToggleFavorite: (song: SongSummary) => void;
}

export const SongListItem = memo(function SongListItem({
  song,
  onPress,
  onToggleFavorite,
}: SongListItemProps) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => onPress(song)}
        accessibilityRole="button"
        accessibilityLabel={`${song.title}${song.artist ? `, ${song.artist}` : ''}, tom ${song.currentKey}`}
        style={({ pressed }) => [styles.main, { opacity: pressed ? 0.6 : 1 }]}
      >
        <View style={styles.text}>
          <AppText variant="heading" numberOfLines={1}>
            {song.title}
          </AppText>
          <AppText color="textMuted" numberOfLines={1}>
            {song.artist || 'Artista não informado'}
          </AppText>
        </View>
        <KeyBadge musicalKey={song.currentKey} capo={song.capo} />
      </Pressable>
      <IconButton
        icon={song.favorite ? 'star' : 'star-outline'}
        color={song.favorite ? colors.accent : colors.textSubtle}
        onPress={() => onToggleFavorite(song)}
        accessibilityLabel={song.favorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  main: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingLeft: spacing.lg,
    minHeight: 72,
  },
  text: { flex: 1, gap: spacing.xxs },
});
