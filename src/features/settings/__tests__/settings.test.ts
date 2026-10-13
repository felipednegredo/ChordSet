import { DEFAULT_SETTINGS, sanitizeSettings } from '../settings';

describe('sanitizeSettings', () => {
  it('fills new options for settings saved by older versions', () => {
    expect(sanitizeSettings({ themeMode: 'dark', sheetFontSize: 22 })).toEqual({
      ...DEFAULT_SETTINGS,
      themeMode: 'dark',
      sheetFontSize: 22,
    });
  });

  it('rejects invalid values', () => {
    const settings = sanitizeSettings({
      tunerInstrument: 'theremin',
      tunerTuning: 42,
      chordInstrument: 'harp',
      leftHanded: 'yes',
      showDiagrams: 1,
    });
    expect(settings.tunerInstrument).toBe(DEFAULT_SETTINGS.tunerInstrument);
    expect(settings.tunerTuning).toBe(DEFAULT_SETTINGS.tunerTuning);
    expect(settings.chordInstrument).toBe(DEFAULT_SETTINGS.chordInstrument);
    expect(settings.leftHanded).toBe(false);
    expect(settings.showDiagrams).toBe(false);
  });

  it('keeps valid values', () => {
    const settings = sanitizeSettings({
      tunerInstrument: 'bass',
      tunerTuning: 'five',
      chordInstrument: 'ukulele',
      leftHanded: true,
      tunerHaptics: false,
    });
    expect(settings).toMatchObject({
      tunerInstrument: 'bass',
      tunerTuning: 'five',
      chordInstrument: 'ukulele',
      leftHanded: true,
      tunerHaptics: false,
    });
  });
});
