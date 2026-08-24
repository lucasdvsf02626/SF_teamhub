/**
 * Feature flags — Hive migration (week 1).
 *
 * The old feature-flags table no longer exists. Every previously
 * gated feature shipped before the migration, so flags are constant-true.
 * If gating is ever needed again it will be rebuilt on Hive rails.
 */
export function useFeatureFlag(_flagKey: string) {
  return {
    enabled: true,
    isLoading: false,
    refetch: () => Promise.resolve(),
  };
}
