import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../../theme';
import { diagramBaseFret, type Fingering } from '../../chords';

export interface ChordDiagramProps {
  fingering: Fingering;
  /** Mirror the diagram for left-handed players (thinnest string on the left). */
  leftHanded?: boolean;
  /** Distance between two strings, in dp. */
  stringGap?: number;
}

const VISIBLE_FRETS = 5;
const MARKER_ROW = 16;
const FRET_LABEL_WIDTH = 22;

/** Fretboard diagram drawn with plain views (no SVG dependency). */
export const ChordDiagram = memo(function ChordDiagram({
  fingering,
  leftHanded = false,
  stringGap = 16,
}: ChordDiagramProps) {
  const { colors } = useTheme();
  const frets = leftHanded ? [...fingering.frets].reverse() : fingering.frets;
  const count = frets.length;
  const fretGap = Math.round(stringGap * 1.25);
  const width = stringGap * (count - 1);
  const height = fretGap * VISIBLE_FRETS;
  const baseFret = diagramBaseFret(fingering, VISIBLE_FRETS);
  const dot = Math.round(stringGap * 0.75);
  const x = (index: number) => FRET_LABEL_WIDTH + index * stringGap;
  const y = (fret: number) => MARKER_ROW + (fret - baseFret + 0.5) * fretGap;

  const barre = fingering.barre;
  const barreFrom = barre ? (leftHanded ? count - 1 - barre.to : barre.from) : 0;
  const barreTo = barre ? (leftHanded ? count - 1 - barre.from : barre.to) : 0;

  return (
    <View style={{ width: FRET_LABEL_WIDTH + width + stringGap / 2, height: MARKER_ROW + height + 4 }}>
      {frets.map((fret, index) =>
        fret <= 0 ? (
          <Text
            key={`m${index}`}
            style={[
              styles.marker,
              { left: x(index) - 6, color: fret < 0 ? colors.textSubtle : colors.textMuted },
            ]}
          >
            {fret < 0 ? '×' : '○'}
          </Text>
        ) : null,
      )}

      {baseFret > 1 ? (
        <Text style={[styles.fretLabel, { top: MARKER_ROW + fretGap / 2 - 8, color: colors.textMuted }]}>
          {baseFret}
        </Text>
      ) : null}

      {/* Nut (thick) or first fret line. */}
      <View
        style={[
          styles.line,
          {
            left: x(0),
            top: MARKER_ROW,
            width,
            height: baseFret === 1 ? 4 : 1,
            backgroundColor: colors.text,
          },
        ]}
      />
      {Array.from({ length: VISIBLE_FRETS }, (_, i) => (
        <View
          key={`f${i}`}
          style={[
            styles.line,
            {
              left: x(0),
              top: MARKER_ROW + (i + 1) * fretGap,
              width,
              height: 1,
              backgroundColor: colors.border,
            },
          ]}
        />
      ))}
      {frets.map((_, index) => (
        <View
          key={`s${index}`}
          style={[
            styles.line,
            { left: x(index), top: MARKER_ROW, width: 1, height, backgroundColor: colors.textMuted },
          ]}
        />
      ))}

      {barre ? (
        <View
          style={[
            styles.line,
            {
              left: x(barreFrom) - dot / 2,
              top: y(barre.fret) - dot / 2,
              width: x(barreTo) - x(barreFrom) + dot,
              height: dot,
              borderRadius: dot / 2,
              backgroundColor: colors.chord,
            },
          ]}
        />
      ) : null}
      {frets.map((fret, index) =>
        fret > 0 && !(barre && fret === barre.fret && index >= barreFrom && index <= barreTo) ? (
          <View
            key={`d${index}`}
            style={[
              styles.line,
              {
                left: x(index) - dot / 2,
                top: y(fret) - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: colors.chord,
              },
            ]}
          />
        ) : null,
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  line: { position: 'absolute' },
  marker: { position: 'absolute', top: 0, width: 12, fontSize: 11, lineHeight: 14, textAlign: 'center' },
  fretLabel: { position: 'absolute', left: 0, width: FRET_LABEL_WIDTH - 6, fontSize: 11, textAlign: 'right' },
});
