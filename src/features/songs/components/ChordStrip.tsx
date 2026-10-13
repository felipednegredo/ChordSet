import { memo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '../../../components';
import { radius, spacing, useTheme } from '../../../theme';
import { type ChordInstrumentId, getFingerings } from '../../chords';
import { ChordDiagram } from './ChordDiagram';

export interface ChordStripProps {
  chords: string[];
  instrument: ChordInstrumentId;
  leftHanded: boolean;
}

/** Horizontal list with a diagram for every chord of the song. Tap a chord to see other shapes. */
export const ChordStrip = memo(function ChordStrip({ chords, instrument, leftHanded }: ChordStripProps) {
  const [variations, setVariations] = useState<Record<string, number>>({});
  if (chords.length === 0) return null;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {chords.map((chord) => (
        <ChordCard
          key={chord}
          chord={chord}
          instrument={instrument}
          leftHanded={leftHanded}
          variation={variations[chord] ?? 0}
          onNext={(total) =>
            setVariations((current) => ({ ...current, [chord]: ((current[chord] ?? 0) + 1) % total }))
          }
        />
      ))}
    </ScrollView>
  );
});

interface ChordCardProps {
  chord: string;
  instrument: ChordInstrumentId;
  leftHanded: boolean;
  variation: number;
  onNext: (total: number) => void;
}

function ChordCard({ chord, instrument, leftHanded, variation, onNext }: ChordCardProps) {
  const { colors } = useTheme();
  const fingerings = getFingerings(chord, instrument);
  const fingering = fingerings[Math.min(variation, fingerings.length - 1)];
  const many = fingerings.length > 1;

  return (
    <Pressable
      onPress={() => many && onNext(fingerings.length)}
      disabled={!many}
      accessibilityRole="button"
      accessibilityLabel={
        fingering
          ? `Acorde ${chord}, forma ${variation + 1} de ${fingerings.length}`
          : `Acorde ${chord}, sem diagrama`
      }
      accessibilityHint={many ? 'Toque para ver outra forma' : undefined}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
      ]}
    >
      <AppText variant="heading" style={{ color: colors.chord }} numberOfLines={1}>
        {chord}
      </AppText>
      {fingering ? (
        <ChordDiagram fingering={fingering} leftHanded={leftHanded} />
      ) : (
        <View style={styles.empty}>
          <AppText variant="caption" color="textMuted" align="center">
            Sem diagrama
          </AppText>
        </View>
      )}
      {many ? (
        <AppText variant="caption" color="textSubtle">
          {variation + 1}/{fingerings.length}
        </AppText>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  card: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    minWidth: 104,
  },
  empty: { width: 100, height: 120, alignItems: 'center', justifyContent: 'center' },
});
