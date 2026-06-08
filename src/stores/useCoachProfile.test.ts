import { describe, it, expect, beforeEach, vi } from 'vitest';

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

import { DEFAULT_COACH_PROFILE } from '../types';
import { useCoachProfile } from './useCoachProfile';

describe('useCoachProfile', () => {
  beforeEach(() => {
    useCoachProfile.setState({ profile: DEFAULT_COACH_PROFILE });
  });

  it('updates session length', () => {
    useCoachProfile.getState().setSessionLength('long');
    expect(useCoachProfile.getState().profile.sessionLength).toBe('long');
  });

  it('toggles restricted auto-pick exercises', () => {
    const { toggleRestrictedExercise } = useCoachProfile.getState();
    toggleRestrictedExercise('kb-press');
    expect(useCoachProfile.getState().profile.restrictedAutoPickExerciseIds).not.toContain('kb-press');
    toggleRestrictedExercise('kb-press');
    expect(useCoachProfile.getState().profile.restrictedAutoPickExerciseIds).toContain('kb-press');
  });

  it('toggles auto-adjust', () => {
    useCoachProfile.getState().setAutoAdjustEnabled(false);
    expect(useCoachProfile.getState().profile.autoAdjust.enabled).toBe(false);
  });
});
