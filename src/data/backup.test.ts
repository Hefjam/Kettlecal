import { describe, it, expect } from 'vitest';
import { exportBackup, importBackup, BACKUP_SCHEMA_VERSION, StoreRegistry } from './backup';
import { findLastLogFor } from '../engine/history';
import { UserEquipment, WorkoutSession } from '../types';

/**
 * In-memory fake of the three persisted zustand stores, so these tests never
 * touch react-native-mmkv. Each slice mirrors the real store's persisted data
 * fields (no actions).
 */
function makeRegistry(initial?: {
  equipment?: { equipment: UserEquipment };
  history?: { sessions: WorkoutSession[] };
  rotation?: { lastEmphasis: 'strength' | 'skill' | 'conditioning' | null; sessionCount: number };
}): StoreRegistry {
  let equipment = initial?.equipment ?? { equipment: { items: [], kettlebells: [] } };
  let history = initial?.history ?? { sessions: [] };
  let rotation = initial?.rotation ?? { lastEmphasis: null, sessionCount: 0 };
  return {
    equipment: { get: () => equipment, set: (s) => (equipment = s) },
    'workout-history': { get: () => history, set: (s) => (history = s) },
    rotation: { get: () => rotation, set: (s) => (rotation = s) },
  };
}

const sampleSession: WorkoutSession = {
  id: 's1',
  date: '2026-06-01',
  startedAt: '2026-06-01T10:00:00.000Z',
  completedAt: '2026-06-01T10:30:00.000Z',
  exerciseLogs: [
    { exerciseId: 'push-up', sets: [{ reps: 10, completedAt: '2026-06-01T10:05:00.000Z' }] },
  ],
  isCompleted: true,
};

describe('backup round-trip', () => {
  it('export then import reproduces equivalent store state', () => {
    const source = makeRegistry({
      equipment: { equipment: { items: ['pull-up-bar'], kettlebells: [{ weightKg: 24, quantity: 2 }] } },
      history: { sessions: [sampleSession] },
      rotation: { lastEmphasis: 'strength', sessionCount: 7 },
    });

    const json = exportBackup(source);

    const target = makeRegistry();
    importBackup(json, target);

    expect(target.equipment.get()).toEqual(source.equipment.get());
    expect(target['workout-history'].get()).toEqual(source['workout-history'].get());
    expect(target.rotation.get()).toEqual(source.rotation.get());
  });

  it('import accepts a JSON string (what the UI pastes)', () => {
    const source = makeRegistry({
      history: { sessions: [sampleSession] },
      rotation: { lastEmphasis: 'skill', sessionCount: 3 },
    });
    const jsonString = JSON.stringify(exportBackup(source));

    const target = makeRegistry();
    importBackup(jsonString, target);

    expect(target['workout-history'].get()).toEqual(source['workout-history'].get());
    expect(target.rotation.get()).toEqual(source.rotation.get());
  });
});

describe('backup validation', () => {
  it('rejects malformed JSON and leaves stores untouched', () => {
    const target = makeRegistry({ rotation: { lastEmphasis: 'strength', sessionCount: 5 } });
    expect(() => importBackup('{ not valid json', target)).toThrow();
    // unchanged
    expect(target.rotation.get()).toEqual({ lastEmphasis: 'strength', sessionCount: 5 });
  });

  it('rejects an object that is not a kettlecal backup with a clear error', () => {
    const target = makeRegistry();
    expect(() => importBackup({ hello: 'world' }, target)).toThrow(/not a Kettlecal backup/i);
  });

  it('rejects a backup whose schemaVersion does not match, leaving stores untouched', () => {
    const source = makeRegistry({ rotation: { lastEmphasis: 'strength', sessionCount: 9 } });
    const backup = exportBackup(source);
    const wrongVersion = { ...backup, schemaVersion: BACKUP_SCHEMA_VERSION + 1 };

    const target = makeRegistry({ rotation: { lastEmphasis: null, sessionCount: 0 } });
    expect(() => importBackup(wrongVersion, target)).toThrow(/version/i);
    expect(target.rotation.get()).toEqual({ lastEmphasis: null, sessionCount: 0 });
  });

  it('rejects a backup missing a store slice without partially applying', () => {
    const source = makeRegistry({
      equipment: { equipment: { items: ['bands'], kettlebells: [] } },
      rotation: { lastEmphasis: 'conditioning', sessionCount: 4 },
    });
    const backup = exportBackup(source);
    // valid format + version, but corrupt: drop the history slice
    const corrupt = { ...backup, stores: { equipment: backup.stores.equipment, rotation: backup.stores.rotation } };

    const target = makeRegistry({
      equipment: { equipment: { items: [], kettlebells: [] } },
      rotation: { lastEmphasis: null, sessionCount: 0 },
    });
    expect(() => importBackup(corrupt, target)).toThrow();
    // equipment must NOT have been written despite being present and first
    expect(target.equipment.get()).toEqual({ equipment: { items: [], kettlebells: [] } });
    expect(target.rotation.get()).toEqual({ lastEmphasis: null, sessionCount: 0 });
  });

  it('exports and imports an empty/cold state cleanly', () => {
    const cold = makeRegistry(); // defaults: empty equipment, no sessions, null emphasis
    const json = exportBackup(cold);
    expect(json.schemaVersion).toBe(BACKUP_SCHEMA_VERSION);

    const target = makeRegistry({ rotation: { lastEmphasis: 'skill', sessionCount: 2 } });
    expect(() => importBackup(json, target)).not.toThrow();
    expect(target['workout-history'].get()).toEqual({ sessions: [] });
    expect(target.rotation.get()).toEqual({ lastEmphasis: null, sessionCount: 0 });
  });
});

describe('backup preserves history correctness regardless of order', () => {
  // Deliberately out-of-order: the genuinely-latest session is NOT first.
  const older: WorkoutSession = {
    id: 'old',
    date: '2026-05-01',
    startedAt: '2026-05-01T10:00:00.000Z',
    completedAt: '2026-05-01T10:30:00.000Z',
    exerciseLogs: [{ exerciseId: 'push-up', sets: [{ reps: 8, completedAt: '2026-05-01T10:05:00.000Z' }] }],
    isCompleted: true,
  };
  const newer: WorkoutSession = {
    id: 'new',
    date: '2026-06-01',
    startedAt: '2026-06-01T10:00:00.000Z',
    completedAt: '2026-06-01T10:30:00.000Z',
    exerciseLogs: [{ exerciseId: 'push-up', sets: [{ reps: 12, completedAt: '2026-06-01T10:05:00.000Z' }] }],
    isCompleted: true,
  };

  it('round-trips history array verbatim and getLastLogFor still finds the true latest', () => {
    const source = makeRegistry({ history: { sessions: [older, newer] } }); // newest LAST

    const json = exportBackup(source);
    const target = makeRegistry();
    importBackup(json, target);

    const imported = target['workout-history'].get().sessions;
    // backup must not reorder/mutate the array
    expect(imported).toEqual([older, newer]);
    // recency is computed by completedAt, so the reordered array still yields newer
    expect(findLastLogFor(imported, 'push-up')).toEqual(newer.exerciseLogs[0]);
  });
});
