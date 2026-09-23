import { randomUUID } from 'expo-crypto';

/** UUID v4 identifiers make future cloud sync/merge possible without collisions. */
export function createId(): string {
  return randomUUID();
}
