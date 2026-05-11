import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { Database } from '../types/database';
import { assertSupabaseEnv, env } from './env';

const fallbackSupabaseUrl = 'https://example.supabase.co';
const fallbackSupabaseAnonKey = 'missing-supabase-anon-key';
const hasValidSupabaseConfig = env.isSupabaseConfigured && env.validationErrors.length === 0;

export const supabase = createClient<Database>(
  hasValidSupabaseConfig ? env.supabaseUrl : fallbackSupabaseUrl,
  hasValidSupabaseConfig ? env.supabaseAnonKey : fallbackSupabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);

export function getSupabaseClient() {
  assertSupabaseEnv();

  return supabase;
}
