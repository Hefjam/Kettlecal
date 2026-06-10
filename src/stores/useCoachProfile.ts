import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { CoachProfile, DEFAULT_COACH_PROFILE, mergeCoachProfile, SessionLength } from '../types';
import { mmkvStorage } from './mmkvStorage';

interface CoachProfileState {
  profile: CoachProfile;
  setProfile: (profile: CoachProfile) => void;
  setSessionLength: (sessionLength: SessionLength) => void;
  toggleRestrictedExercise: (exerciseId: string) => void;
  setAutoAdjustEnabled: (enabled: boolean) => void;
}

export const useCoachProfile = create<CoachProfileState>()(
  persist(
    (set) => ({
      profile: DEFAULT_COACH_PROFILE,

      setProfile: (profile) => set({ profile }),

      setSessionLength: (sessionLength) =>
        set((s) => ({ profile: { ...s.profile, sessionLength } })),

      toggleRestrictedExercise: (exerciseId) =>
        set((s) => {
          const restricted = s.profile.restrictedAutoPickExerciseIds;
          const next = restricted.includes(exerciseId)
            ? restricted.filter((id) => id !== exerciseId)
            : [...restricted, exerciseId];
          return {
            profile: {
              ...s.profile,
              restrictedAutoPickExerciseIds: next,
            },
          };
        }),

      setAutoAdjustEnabled: (enabled) =>
        set((s) => ({
          profile: {
            ...s.profile,
            autoAdjust: { ...s.profile.autoAdjust, enabled },
          },
        })),
    }),
    {
      name: 'coach-profile',
      storage: createJSONStorage(() => mmkvStorage),
      version: 2,
      // v1 → v2 (2026-06-10): the shoulder-protective default grew from
      // presses-only to ALL overhead (snatch, get-up, windmill). Union the new
      // ids into an existing profile so the safer default reaches installs
      // that predate it. The user can still toggle them back off in the Coach
      // tab — the migration runs once, so that choice persists.
      migrate: (persisted, version) => {
        if (version < 2 && persisted && typeof persisted === 'object') {
          const state = persisted as { profile?: { restrictedAutoPickExerciseIds?: string[] } };
          if (state.profile) {
            const existing = state.profile.restrictedAutoPickExerciseIds ?? [];
            state.profile.restrictedAutoPickExerciseIds = Array.from(
              new Set([...existing, 'kb-snatch', 'kb-turkish-getup', 'kb-windmill'])
            );
          }
        }
        return persisted;
      },
      // Rehydrating a profile saved by an older build can be missing fields the
      // engine reads (e.g. a newly added autoAdjust knob). Merge over defaults
      // so generation never hits an undefined nested field.
      merge: (persisted, current) => ({
        ...current,
        profile: mergeCoachProfile((persisted as { profile?: unknown } | undefined)?.profile),
      }),
    }
  )
);
