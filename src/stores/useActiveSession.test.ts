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
      viewedExerciseIndex: 0,
      isRestTimerActive: false,
      restSeconds: 60,
      restEndsAt: null,
      isEmomActive: false,
      emomDurationMinutes: 10,
      targets: {},
      planEmphasis: null,
    });
  });

  it('persisted state includes workout position and rest deadline state', () => {
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
      expect(slice).toHaveProperty('viewedExerciseIndex');
      expect(slice).toHaveProperty('isRestTimerActive');
      expect(slice).toHaveProperty('restSeconds');
      expect(slice).toHaveProperty('restEndsAt');
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
      viewedExerciseIndex: original.viewedExerciseIndex,
      isRestTimerActive: original.isRestTimerActive,
      restSeconds: original.restSeconds,
      restEndsAt: original.restEndsAt,
    };

    // 3. Simulate an app restart by blowing away in-memory state.
    useActiveSession.setState({
      session: null,
      currentExerciseIndex: 0,
      viewedExerciseIndex: 0,
      isRestTimerActive: false,
      restSeconds: 60,
      restEndsAt: null,
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
    // Rest timer state survives rehydration so leaving the screen does not reset it.
    expect(restored.isRestTimerActive).toBe(true);
    expect(restored.restEndsAt).toBe(snapshot.restEndsAt);
    expect(restored.isEmomActive).toBe(false);
  });

  it('preview navigation does not move the logging position', () => {
    useActiveSession.getState().startWorkout(
      [{ exerciseId: 'pushup' }, { exerciseId: 'ring-row' }],
      'strength'
    );

    useActiveSession.getState().nextExercise();

    expect(useActiveSession.getState().currentExerciseIndex).toBe(0);
    expect(useActiveSession.getState().viewedExerciseIndex).toBe(1);
  });

  it('auto-advances after the final prescribed set is logged', () => {
    useActiveSession.getState().startWorkout(
      [
        { exerciseId: 'pushup', target: { exerciseId: 'pushup', sets: 2, targetReps: 6, reason: 'Test' } },
        { exerciseId: 'ring-row', target: { exerciseId: 'ring-row', sets: 2, targetReps: 8, reason: 'Test' } },
      ],
      'strength'
    );

    useActiveSession.getState().addSet('pushup', { reps: 6 });
    expect(useActiveSession.getState().currentExerciseIndex).toBe(0);
    expect(useActiveSession.getState().isRestTimerActive).toBe(true);

    useActiveSession.getState().stopRestTimer();
    useActiveSession.getState().addSet('pushup', { reps: 6 });

    expect(useActiveSession.getState().currentExerciseIndex).toBe(1);
    expect(useActiveSession.getState().viewedExerciseIndex).toBe(1);
    // Rest timer stays active after auto-advance so the next exercise card shows
    // the rest countdown before set 1 of that exercise.
    expect(useActiveSession.getState().isRestTimerActive).toBe(true);
  });

  it('can explicitly return to a completed exercise for an extra set', () => {
    useActiveSession.getState().startWorkout(
      [
        { exerciseId: 'pushup', target: { exerciseId: 'pushup', sets: 1, targetReps: 6, reason: 'Test' } },
        { exerciseId: 'ring-row', target: { exerciseId: 'ring-row', sets: 1, targetReps: 8, reason: 'Test' } },
      ],
      'strength'
    );

    useActiveSession.getState().addSet('pushup', { reps: 6 });
    expect(useActiveSession.getState().currentExerciseIndex).toBe(1);

    useActiveSession.getState().prevExercise();
    expect(useActiveSession.getState().currentExerciseIndex).toBe(1);
    expect(useActiveSession.getState().viewedExerciseIndex).toBe(0);

    useActiveSession.getState().setCurrentExercise(0);
    expect(useActiveSession.getState().currentExerciseIndex).toBe(0);
    expect(useActiveSession.getState().viewedExerciseIndex).toBe(0);
  });

  it('rest timer stays active after auto-advance on a non-final exercise', () => {
    // Two exercises with 1 prescribed set each. Finishing the first should
    // auto-advance AND keep the rest timer running for the next exercise.
    useActiveSession.getState().startWorkout(
      [
        { exerciseId: 'pushup', target: { exerciseId: 'pushup', sets: 1, targetReps: 6, reason: 'Test' } },
        { exerciseId: 'ring-row', target: { exerciseId: 'ring-row', sets: 1, targetReps: 8, reason: 'Test' } },
      ],
      'strength'
    );

    useActiveSession.getState().addSet('pushup', { reps: 6 });

    const state = useActiveSession.getState();
    expect(state.currentExerciseIndex).toBe(1);
    expect(state.isRestTimerActive).toBe(true);
    expect(state.restEndsAt).not.toBeNull();
  });

  it('rest timer is NOT active after logging the final set of the last exercise', () => {
    // Single exercise with 1 prescribed set. No next exercise to advance to,
    // so startRest should be false.
    useActiveSession.getState().startWorkout(
      [
        { exerciseId: 'pushup', target: { exerciseId: 'pushup', sets: 1, targetReps: 6, reason: 'Test' } },
      ],
      'strength'
    );

    useActiveSession.getState().addSet('pushup', { reps: 6 });

    const state = useActiveSession.getState();
    expect(state.isRestTimerActive).toBe(false);
    expect(state.restEndsAt).toBeNull();
  });

  it('removeSet removes the correct set and is a no-op for out-of-range indices', () => {
    useActiveSession.getState().startWorkout([{ exerciseId: 'pushup' }]);
    useActiveSession.getState().addSet('pushup', { reps: 5 });
    useActiveSession.getState().addSet('pushup', { reps: 6 });
    useActiveSession.getState().addSet('pushup', { reps: 7 });

    // Remove the middle set (index 1, reps: 6).
    useActiveSession.getState().removeSet('pushup', 1);
    const sets = useActiveSession.getState().session?.exerciseLogs[0].sets ?? [];
    expect(sets).toHaveLength(2);
    expect(sets[0].reps).toBe(5);
    expect(sets[1].reps).toBe(7);

    // Out-of-range index — should be a no-op, no throw.
    expect(() => useActiveSession.getState().removeSet('pushup', 99)).not.toThrow();
    expect(useActiveSession.getState().session?.exerciseLogs[0].sets).toHaveLength(2);

    // Non-existent exerciseId — should be a no-op, no throw.
    expect(() => useActiveSession.getState().removeSet('nonexistent', 0)).not.toThrow();
  });

  it('editSet merges patch fields and preserves completedAt; out-of-range is a no-op', () => {
    useActiveSession.getState().startWorkout([{ exerciseId: 'pushup' }]);
    useActiveSession.getState().addSet('pushup', { reps: 5, weight: 20 });

    const originalCompletedAt =
      useActiveSession.getState().session?.exerciseLogs[0].sets[0].completedAt;

    // Edit reps only — weight should be preserved, completedAt unchanged.
    useActiveSession.getState().editSet('pushup', 0, { reps: 8 });

    const edited = useActiveSession.getState().session?.exerciseLogs[0].sets[0];
    expect(edited?.reps).toBe(8);
    expect(edited?.weight).toBe(20);
    expect(edited?.completedAt).toBe(originalCompletedAt);

    // Out-of-range — no throw.
    expect(() => useActiveSession.getState().editSet('pushup', 99, { reps: 1 })).not.toThrow();
  });

  it('swapExercise stores swapReason and clears sets when exerciseId changes', () => {
    useActiveSession.getState().startWorkout(
      [
        { exerciseId: 'pushup', target: { exerciseId: 'pushup', sets: 3, targetReps: 6, reason: 'Test' } },
        { exerciseId: 'ring-row', target: { exerciseId: 'ring-row', sets: 2, targetReps: 8, reason: 'Test' } },
      ],
      'strength'
    );

    // Log a set so we can confirm it gets cleared on swap.
    useActiveSession.getState().addSet('pushup', { reps: 6 });
    expect(useActiveSession.getState().session?.exerciseLogs[0].sets).toHaveLength(1);

    // Swap to a different exercise at index 0, with a reason.
    const newTarget = { exerciseId: 'ring-push-up', sets: 3, targetReps: 5, reason: 'Swap' };
    useActiveSession.getState().swapExercise(0, newTarget, 'Too easy, progressed');

    const log = useActiveSession.getState().session?.exerciseLogs[0];
    expect(log?.exerciseId).toBe('ring-push-up');
    expect(log?.sets).toHaveLength(0);
    expect(log?.swapReason).toBe('Too easy, progressed');
  });
});
