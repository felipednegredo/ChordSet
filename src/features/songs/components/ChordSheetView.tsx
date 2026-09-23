import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { fonts, radius, spacing, useTheme } from '../../../theme';
import {
  type ChordSheet,
  lyricsOnly,
  type PositionedChord,
  type SheetLine,
  type SheetSection,
  toDisplayWords,
} from '../../chords';

export interface ChordSheetViewProps {
  sheet: ChordSheet;
  fontSize: number;
  showChords: boolean;
}

const NBSP = ' ';

/** Keeps trailing spaces visible inside flex rows. */
function preserveSpaces(text: string): string {
  return text.replace(/ /g, NBSP);
}

/** Rebuilds a chord-only line keeping the original columns (at least one space apart). */
function layoutChordLine(chords: PositionedChord[]): string {
  let out = '';
  chords.forEach(({ chord, column }) => {
    const padding = Math.max(out.length === 0 ? 0 : 1, column - out.length);
    out += ' '.repeat(padding) + chord;
  });
  return out;
}

interface LineProps {
  line: SheetLine;
  fontSize: number;
  showChords: boolean;
}

const SheetLineView = memo(function SheetLineView({ line, fontSize, showChords }: LineProps) {
  const { colors } = useTheme();
  const chordSize = Math.round(fontSize * 0.88);
  const lyricStyle = { fontSize, lineHeight: Math.round(fontSize * 1.35), color: colors.text };
  const chordStyle = {
    fontSize: chordSize,
    lineHeight: Math.round(chordSize * 1.3),
    color: colors.chord,
    fontWeight: '700' as const,
  };

  switch (line.kind) {
    case 'empty':
      return <View style={{ height: Math.round(fontSize * 0.9) }} />;

    case 'label':
      return (
        <Text style={[styles.label, { color: colors.accent, fontSize: Math.max(12, fontSize * 0.7) }]}>
          {line.text.toUpperCase()}
        </Text>
      );

    case 'comment':
      return (
        <View style={[styles.comment, { backgroundColor: colors.surfaceAlt }]}>
          <Text style={{ color: colors.textMuted, fontSize: fontSize * 0.8, fontStyle: 'italic' }}>
            {line.text}
          </Text>
        </View>
      );

    case 'tab':
      return (
        <Text style={{ fontFamily: fonts.mono, fontSize: fontSize * 0.75, color: colors.text }}>
          {line.text || NBSP}
        </Text>
      );

    case 'chords':
      if (!showChords) return null;
      return (
        <Text
          style={[chordStyle, { fontFamily: fonts.mono }]}
          accessibilityLabel={`Acordes ${line.chords.map((c) => c.chord).join(', ')}`}
        >
          {layoutChordLine(line.chords)}
        </Text>
      );

    case 'lyrics': {
      const hasChord = line.segments.some((s) => s.chord !== null);
      if (!showChords || !hasChord) {
        return <Text style={lyricStyle}>{lyricsOnly(line.segments) || NBSP}</Text>;
      }
      const words = toDisplayWords(line.segments);
      return (
        <View style={styles.wrapRow}>
          {words.map((word, wordIndex) => (
            <View key={wordIndex} style={styles.word}>
              {word.map((token, tokenIndex) => (
                <View key={tokenIndex}>
                  <Text style={[chordStyle, token.chord ? styles.chordGap : null]}>
                    {token.chord ?? NBSP}
                  </Text>
                  <Text style={lyricStyle}>{preserveSpaces(token.text) || NBSP}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>
      );
    }
  }
});

function SectionView({ section, fontSize, showChords }: { section: SheetSection } & Omit<LineProps, 'line'>) {
  const { colors } = useTheme();
  const highlighted = section.kind === 'chorus';
  return (
    <View
      style={[
        styles.section,
        highlighted && { borderLeftColor: colors.accent, borderLeftWidth: 3, paddingLeft: spacing.md },
      ]}
    >
      {section.label ? (
        <Text style={[styles.label, { color: colors.accent, fontSize: Math.max(12, fontSize * 0.7) }]}>
          {section.label.toUpperCase()}
        </Text>
      ) : null}
      {section.lines.map((line, index) => (
        <SheetLineView key={index} line={line} fontSize={fontSize} showChords={showChords} />
      ))}
    </View>
  );
}

/** Renders a parsed chord sheet. Lyrics and chords are the main element of the screen. */
export const ChordSheetView = memo(function ChordSheetView({
  sheet,
  fontSize,
  showChords,
}: ChordSheetViewProps) {
  const sections = useMemo(() => sheet.sections, [sheet]);
  return (
    <View style={styles.sheet}>
      {sections.map((section, index) => (
        <SectionView key={index} section={section} fontSize={fontSize} showChords={showChords} />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  sheet: { gap: spacing.xs },
  section: { marginBottom: spacing.sm, borderRadius: radius.sm },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: spacing.xxs },
  word: { flexDirection: 'row' },
  chordGap: { paddingRight: 6 },
  label: { fontWeight: '800', letterSpacing: 1.2, marginTop: spacing.sm, marginBottom: spacing.xs },
  comment: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    marginVertical: spacing.xs,
  },
});
