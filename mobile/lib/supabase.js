import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Public client config (safe to ship — RLS protects the data). Override with
// EXPO_PUBLIC_* env vars if you ever point at a different project.
const url =
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vynjwxbinssfmmqoshmv.supabase.co';
const anonKey =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_n2tZjOm8o18af9mtAF2S7g_xqFZSSYC';

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
