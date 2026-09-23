import Storage from 'expo-sqlite/kv-store';
import { Platform } from 'react-native';

import { type AppSettings, DEFAULT_SETTINGS, sanitizeSettings } from './settings';
import { logError } from '../../services/errors';

const SETTINGS_KEY = 'chordset.settings.v1';

interface SyncStorage {
  getItemSync(key: string): string | null;
  setItemSync(key: string, value: string): void;
}

/*
 * Native: SQLite-backed key-value store (offline, survives restarts).
 * Web: the synchronous SQLite API needs cross-origin isolation, so plain
 * localStorage is used instead.
 */
const storage: SyncStorage =
  Platform.OS === 'web'
    ? {
        getItemSync: (key) => globalThis.localStorage?.getItem(key) ?? null,
        setItemSync: (key, value) => globalThis.localStorage?.setItem(key, value),
      }
    : Storage;

export function loadSettings(): AppSettings {
  try {
    const raw = storage.getItemSync(SETTINGS_KEY);
    return raw ? sanitizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch (error) {
    logError('loadSettings', error);
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    storage.setItemSync(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    logError('saveSettings', error);
  }
}
