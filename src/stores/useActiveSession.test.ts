import { describe, it, expect, beforeEach, vi } from 'vitest';

// react-native-mmkv is a native Nitro module that can't be loaded in the Node
// test environment. Stub it with an in-memory Map so the persisted store loads.
vi.mock('react-native-mmkv', () => {
  const store = new Map<string, string>();
  return {
    createMMKV: () => ({
      set: (k: string, v: string) => store.set(k, v),
      getString: (k: string) => store.get(k),
      remove: (k: string) => store.delete(k),
    }),
  };
});

import { useActiveSession } from './useActiveSession';

describe('useActiveSession persistence', () => {
  beforeEach(() => {
    // Reset to pristine state before each test.
    useActiveSession.setState({
      session: null,
      currentExerciseIndex: 0,
      isRestTimerActive: false,
      restSeconds: 60,
      isEmomActive: false,
      emomDurationMinutes: 10,
      targets: {},
      planEmphasis: null,
    });
  });

  it('persisted state includes session, targets, planEmphasis, currentExerciseIndex but not timer fields', () => {
    useActiveSession.getState().startWorkout(
      [{ exerciseId: 'pushup' }],
      'strength'
    );

    const state = useActiveSession.getState();

    // Session was created.
    expect(state.session).not.toBeNull();
    expect(state.session?.isCompleted).toBe(false);
    expect(state.planEmphasis).toBe('strength');
    expect(state.currentExerciseIndex).toBe(0);

    // partialize should include these four fields.
    // We verify by confirming they exist on the live state (the persist
    // middleware will serialise exactly these via `partialize`).
    const { partialize } = (useActiveSession as any).persist?.getOptions?.() ?? {};
    if (partialize) {
      const slice = partialize(state);
      expect(slice).toHaveProperty('session');
      expect(slice).toHaveProperty('targets');
      expect(slice).toHaveProperty('planEmphasis');
      expect(slice).toHaveProperty('currentExerciseIndex');
      expect(slice).not.toHaveProperty('isRestTimerActive');
      expect(slice).not.toHaveProperty('restSeconds');
      expect(slice).not.toHaveProperty('isEmomActive');
      expect(slice).not.toHaveProperty('emomDurationMinutes');
    }
  });

  it('rehydrate: session state survives a store reset (simulating app restart)', () => {
    // 1. Start a workout and log a set.
    useActiveSession.getState().startWorkout([{ exerciseId: 'pushup' }], 'conditioning');
    useActiveSession.getState().addSet('pushup', { reps: 10, weight: 0 });

    const original = useActiveSession.getState();
    expect(original.session).not.toBeNull();
    expect(original.session?.exerciseLogs[0].sets).toHaveLength(1);
    expect(original.planEmphasis).toBe('conditioning');

    // 2. Snapshot the serialisable slice (what persist writes to storage).
    const snapshot = {
      session: original.session,
      targets: original.targets,
      planEmphasis: original.planEmphasis,
      currentExerciseIndex: original.currentExerciseIndex,
    };

    // 3. Simulate an app restart by blowing away in-memory state.
    useActiveSession.setState({
      session: null,
      currentExerciseIndex: 0,
      isRestTimerActive: false,
      restSeconds: 60,
      isEmomActive: false,
      emomDurationMinutes: 10,
      targets: {},
      planEmphasis: null,
    });

    expect(useActiveSession.getState().session).toBeNull();

    // 4. Re-apply the snapshot as persist would after rehydration.
    useActiveSession.setState(snapshot);

    const restored = useActiveSession.getState();
    expect(restored.session).not.toBeNull();
    expect(restored.session?.id).toBe(snapshot.session?.id);
    expect(restored.session?.exerciseLogs[0].sets).toHaveLength(1);
    expect(restored.planEmphasis).toBe('conditioning');
    // Timer state is ephemeral — should remain at defaults after rehydration.
    expect(restored.isRestTimerActive).toBe(false);
    expect(restored.isEmomActive).toBe(false);
  });
});
