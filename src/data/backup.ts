import {
  CoachProfile,
  DEFAULT_COACH_PROFILE,
  mergeCoachProfile,
  UserEquipment,
  WorkoutSession,
  Emphasis,
} from '../types';

/**
 * JSON export/import backup for the persisted stores. MMKV is the ONLY
 * copy of training history, so this is the safety net: serialize the live
 * stores to a versioned blob the user can save off-device, and rehydrate them
 * back — validating shape + version, never partially applying.
 *
 * `today-plan` is intentionally NOT backed up: it regenerates from history,
 * rotation, equipment, and coach profile, so persisting it would risk staleness.
 */

export const BACKUP_FORMAT = 'kettlecal-backup';
export const BACKUP_SCHEMA_VERSION = 2;

/** Persisted data of each backed-up store (the data fields only — no actions). */
export interface EquipmentSlice {
  equipment: UserEquipment;
}
export interface HistorySlice {
  sessions: WorkoutSession[];
}
export interface RotationSlice {
  lastEmphasis: Emphasis | null;
  sessionCount: number;
}
export interface CoachProfileSlice {
  profile: CoachProfile;
}

/**
 * Read/write access to one store's persisted data. Injected so backup logic is
 * pure and testable without react-native-mmkv. `get` returns the current data,
 * `set` fully replaces it.
 */
export interface StoreSlice<T> {
  get: () => T;
  set: (next: T) => void;
}

/** The stores we back up, keyed by their MMKV persist name. */
export interface StoreRegistry {
  equipment: StoreSlice<EquipmentSlice>;
  'workout-history': StoreSlice<HistorySlice>;
  rotation: StoreSlice<RotationSlice>;
  'coach-profile': StoreSlice<CoachProfileSlice>;
}

export interface Backup {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  exportedAt: string;
  stores: {
    equipment: EquipmentSlice;
    'workout-history': HistorySlice;
    rotation: RotationSlice;
    'coach-profile': CoachProfileSlice;
  };
}

/** Serialize the three live stores into a versioned backup object. */
export function exportBackup(registry: StoreRegistry): Backup {
  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    stores: {
      equipment: registry.equipment.get(),
      'workout-history': registry['workout-history'].get(),
      rotation: registry.rotation.get(),
      'coach-profile': registry['coach-profile'].get(),
    },
  };
}

/**
 * Validate a backup and rehydrate the three stores. Accepts either a parsed
 * object or a JSON string. Throws on malformed/old-version input; never
 * partially applies (all validation happens before any store is written).
 */
export function importBackup(input: unknown, registry: StoreRegistry): void {
  const backup = parseBackup(input);
  registry.equipment.set(backup.stores.equipment);
  registry['workout-history'].set(backup.stores['workout-history']);
  registry.rotation.set(backup.stores.rotation);
  registry['coach-profile'].set(backup.stores['coach-profile']);
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseBackup(input: unknown): Backup {
  let obj: unknown = input;
  if (typeof input === 'string') {
    try {
      obj = JSON.parse(input);
    } catch {
      throw new Error('Could not read backup: not valid JSON.');
    }
  }

  if (!isRecord(obj) || obj.format !== BACKUP_FORMAT) {
    throw new Error('This is not a Kettlecal backup file.');
  }

  if (obj.schemaVersion !== 1 && obj.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported backup version (got ${String(obj.schemaVersion)}, expected ${BACKUP_SCHEMA_VERSION}).`
    );
  }

  const stores = obj.stores;
  if (!isRecord(stores)) {
    throw new Error('Backup is corrupt: missing store data.');
  }
  if (!isRecord(stores.equipment) || !isRecord(stores.equipment.equipment)) {
    throw new Error('Backup is corrupt: missing equipment data.');
  }
  if (!isRecord(stores['workout-history']) || !Array.isArray(stores['workout-history'].sessions)) {
    throw new Error('Backup is corrupt: missing workout history.');
  }
  if (!isRecord(stores.rotation) || typeof stores.rotation.sessionCount !== 'number') {
    throw new Error('Backup is corrupt: missing rotation data.');
  }
  if (obj.schemaVersion === BACKUP_SCHEMA_VERSION) {
    if (!isRecord(stores['coach-profile']) || !isRecord(stores['coach-profile'].profile)) {
      throw new Error('Backup is corrupt: missing coach profile.');
    }
    const parsed = obj as unknown as Backup;
    // Fill any missing profile fields with defaults so a partial/older-shape
    // profile can't crash the engine after import.
    return {
      ...parsed,
      stores: {
        ...parsed.stores,
        'coach-profile': { profile: mergeCoachProfile(stores['coach-profile'].profile) },
      },
    };
  }

  return {
    ...(obj as unknown as Omit<Backup, 'stores'>),
    schemaVersion: BACKUP_SCHEMA_VERSION,
    stores: {
      equipment: stores.equipment as unknown as EquipmentSlice,
      'workout-history': stores['workout-history'] as unknown as HistorySlice,
      rotation: stores.rotation as unknown as RotationSlice,
      'coach-profile': { profile: DEFAULT_COACH_PROFILE },
    },
  };
}
