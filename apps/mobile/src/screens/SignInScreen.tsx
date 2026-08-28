// Sign in.
//
// Deliberately mirrors the web app's Auth.tsx in wording and layout so staff
// moving between the two do not have to relearn anything — same "Welcome
// back", same "Ask your manager" note, same amber-on-dark palette.
//
// Two differences from the web version, both intentional:
//
//   "Trust this device" is absent. On web it defaults to on, which is a real
//   concern on the shared tablet kiosk (TASKS.md 7b). Rather than carry that
//   decision over unexamined, the mobile app simply persists the session —
//   which is the expected behaviour on a personal phone — and leaves the
//   kiosk question to be settled once.
//
//   Tap targets are 48px, not the 16px the web show-password toggle shipped
//   with. This is a factory floor; people wear gloves.

import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useAuth } from '../contexts/AuthContext';

export function SignInScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !busy;

  async function onSubmit() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    const { error: message } = await signIn(email.trim(), password);
    // On success the auth listener swaps the navigator out from under this
    // screen, so only the failure path needs to clear the busy flag.
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-ground"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-12"
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold text-white">Welcome back</Text>
        <Text className="mt-1 text-base text-white/60">Sign in to continue to SF Team Hub.</Text>

        <View className="mt-8">
          <Text className="mb-2 text-sm font-medium text-white/90">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@company.com"
            placeholderTextColor="#6b7d8b"
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            editable={!busy}
            className="rounded-xl border border-white/15 bg-surface px-4 py-4 text-base text-white"
          />
        </View>

        <View className="mt-5">
          <Text className="mb-2 text-sm font-medium text-white/90">Password</Text>
          <View className="flex-row items-center rounded-xl border border-white/15 bg-surface">
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#6b7d8b"
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoComplete="current-password"
              editable={!busy}
              onSubmitEditing={onSubmit}
              className="flex-1 px-4 py-4 text-base text-white"
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              // 48px square: comfortably past the 44px iOS guideline.
              className="h-12 w-12 items-center justify-center"
            >
              <Text className="text-sm text-white/60">{showPassword ? 'Hide' : 'Show'}</Text>
            </Pressable>
          </View>
        </View>

        {error ? (
          <View className="mt-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3">
            <Text className="text-sm text-red-300">{error}</Text>
          </View>
        ) : null}

        <Pressable
          onPress={onSubmit}
          disabled={!canSubmit}
          accessibilityRole="button"
          className={`mt-7 h-14 items-center justify-center rounded-xl ${
            canSubmit ? 'bg-amber' : 'bg-amber/40'
          }`}
        >
          {busy ? (
            <ActivityIndicator color="#0f1419" />
          ) : (
            <Text className="text-base font-semibold uppercase tracking-wider text-ground">
              Sign in
            </Text>
          )}
        </Pressable>

        <Text className="mt-8 text-center text-sm text-white/50">
          No account? Ask your manager — accounts are set up for you.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
