// Supabase client for React Native.
//
// This is the file that differs most from the web app, and the differences
// are not cosmetic — get any of them wrong and the app fails in ways that
// look like a backend problem:
//
//   storage            The web client uses localStorage, which does not exist
//                      in React Native. Without AsyncStorage the session is
//                      held in memory only, so every staff member is signed
//                      out each time the app is closed.
//
//   detectSessionInUrl There is no URL bar to read a session back from. Left
//                      on, the client looks for OAuth fragments that will
//                      never arrive.
//
//   url-polyfill       supabase-js builds URLs internally and React Native's
//                      URL implementation is incomplete. The polyfill import
//                      must come first, before the client is constructed.
//
// The URL and publishable key are pinned here rather than read from env, the
// same as the web app, and for the same reason: a tooling integration has
// twice rewritten env values to the wrong project and locked staff out. See
// supabase/README.md at the repository root.
//
// The publishable key is public by design — it ships inside every installed
// binary and anyone can extract it. RLS on the database is the only thing
// protecting staff data, which is why it is a release gate, not a follow-up.

import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gbimslzxqmxkrkpzwlbn.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_ImQeQfeTm6OaSvbAHAQjZQ_v8sNztZv';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: AsyncStorage,
    persistSession: true,
    autoRefreshToken: true,
    // No URL to parse a session out of on a native client.
    detectSessionInUrl: false,
  },
});
