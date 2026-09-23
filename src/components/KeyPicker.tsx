import { StyleSheet, View } from 'react-native';

import { Chip } from './Chip';
import { SegmentedControl } from './SegmentedControl';
import { KEY_ROOTS, noteToSemitone, parseKey } from '../features/chords';
import { spacing } from '../theme';

export interface KeyPickerProps {
  value: string;
  onChange: (key: string) => void;
}

/** Grid of the 12 roots plus a major/minor toggle. */
export function KeyPicker({ value, onChange }: KeyPickerProps) {
  const parsed = parseKey(value);
  const minor = parsed?.minor ?? false;
  const root = parsed?.root ?? null;
  const rootSemitone = root ? noteToSemitone(root) : null;

  return (
    <View style={styles.container}>
      <SegmentedControl
        options={[
          { value: 'major', label: 'Maior' },
          { value: 'minor', label: 'Menor' },
        ]}
        value={minor ? 'minor' : 'major'}
        onChange={(mode) => onChange(`${root ?? 'C'}${mode === 'minor' ? 'm' : ''}`)}
      />
      <View style={styles.grid}>
        {KEY_ROOTS.map((option) => (
          <Chip
            key={option}
            label={`${option}${minor ? 'm' : ''}`}
            selected={rootSemitone !== null && noteToSemitone(option) === rootSemitone}
            onPress={() => onChange(`${option}${minor ? 'm' : ''}`)}
            size="lg"
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
