import { z } from 'zod';

const publicEnvSchema = z.object({
  EXPO_PUBLIC_SUPABASE_URL: z.union([z.literal(''), z.string().url()]),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: z.string(),
});

const rawEnv = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

const parsedEnv = publicEnvSchema.safeParse(rawEnv);
const supabaseUrl = rawEnv.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey),
  validationErrors: parsedEnv.success ? [] : parsedEnv.error.issues.map((issue) => issue.message),
};

export function assertSupabaseEnv() {
  if (!env.isSupabaseConfigured) {
    throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (env.validationErrors.length > 0) {
    throw new Error(env.validationErrors.join('\n'));
  }
}
