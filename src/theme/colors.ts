export interface ColorPalette {
  background: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentMuted: string;
  onAccent: string;
  chord: string;
  danger: string;
  success: string;
  flat: string;
  sharp: string;
  overlay: string;
}

/** Stage-friendly dark theme: warm amber chords on a near-black background. */
export const darkColors: ColorPalette = {
  background: '#0F1115',
  surface: '#171A21',
  surfaceAlt: '#20242D',
  border: '#2B303B',
  text: '#F3F1EC',
  textMuted: '#A3A9B6',
  textSubtle: '#6C7280',
  accent: '#F2B544',
  accentMuted: 'rgba(242, 181, 68, 0.16)',
  onAccent: '#1A1405',
  chord: '#F2B544',
  danger: '#FF6B6B',
  success: '#3DD68C',
  flat: '#5AA9FF',
  sharp: '#FF7A59',
  overlay: 'rgba(0, 0, 0, 0.55)',
};

/** Paper-like light theme for daylight rehearsals. */
export const lightColors: ColorPalette = {
  background: '#F7F4EE',
  surface: '#FFFFFF',
  surfaceAlt: '#EFEAE0',
  border: '#E1D9CB',
  text: '#1C1B19',
  textMuted: '#625D55',
  textSubtle: '#9A948A',
  accent: '#C2560C',
  accentMuted: 'rgba(194, 86, 12, 0.12)',
  onAccent: '#FFFFFF',
  chord: '#B4490A',
  danger: '#C62828',
  success: '#1E9E5A',
  flat: '#1F6FD1',
  sharp: '#D2452B',
  overlay: 'rgba(0, 0, 0, 0.35)',
};
