// Home.
//
// Currently a placeholder, but a load-bearing one: it imports and runs
// @sf/core on the device. If the shared package resolves through Metro and
// the maths matches the web app, the hard part of this architecture is
// proven and the remaining screens are ordinary work.

import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatRequestDays, isWorkingDay, workingDaysInclusive } from '@sf/core';

import { useAuth } from '../contexts/AuthContext';

export function HomeScreen() {
  const { session, signOut } = useAuth();
  const insets = useSafeAreaInsets();

  const today = new Date().toISOString().slice(0, 10);

  // Same span asserted in packages/core's tests: 16 calendar days, 12 working.
  const sample = { start_date: '2026-08-03', end_date: '2026-08-18' };

  return (
    <ScrollView
      className="flex-1 bg-ground"
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      contentContainerClassName="px-6"
    >
      <Text className="text-2xl font-bold text-white">Team Hub</Text>
      <Text className="mt-1 text-sm text-white/60">{session?.user?.email}</Text>

      <View className="mt-8 rounded-xl border border-white/10 bg-surface p-5">
        <Text className="text-xs uppercase tracking-widest text-white/40">Shared logic check</Text>
        <Text className="mt-3 text-sm text-white/80">
          Today ({today}) is {isWorkingDay(today) ? 'a working day' : 'not a working day'}.
        </Text>
        <Text className="mt-2 text-sm text-white/80">
          3–18 Aug 2026 charges {formatRequestDays(sample)} (
          {workingDaysInclusive(sample.start_date, sample.end_date)} of 16 calendar days).
        </Text>
        <Text className="mt-3 text-xs text-white/40">
          Computed by @sf/core — the same code, and the same 57 tests, as the web app.
        </Text>
      </View>

      <Pressable
        onPress={signOut}
        accessibilityRole="button"
        className="mt-8 h-12 items-center justify-center rounded-xl border border-white/15"
      >
        <Text className="text-sm text-white/70">Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}
