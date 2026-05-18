import 'react-native-url-polyfill/auto';

const rawEnv = {
  EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
};

const normalizedEnv = {
  EXPO_PUBLIC_SUPABASE_URL: normalizeEnvValue('EXPO_PUBLIC_SUPABASE_URL', rawEnv.EXPO_PUBLIC_SUPABASE_URL),
  EXPO_PUBLIC_SUPABASE_ANON_KEY: normalizeEnvValue(
    'EXPO_PUBLIC_SUPABASE_ANON_KEY',
    rawEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  ),
};
const supabaseUrl = normalizedEnv.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = normalizedEnv.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const validationErrors = getSupabaseConfigErrors(supabaseUrl, supabaseAnonKey);

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  isSupabaseConfigured: Boolean(supabaseUrl && supabaseAnonKey && validationErrors.length === 0),
  validationErrors,
};

export function assertSupabaseEnv() {
  if (!env.isSupabaseConfigured) {
    throw new Error('Falta EXPO_PUBLIC_SUPABASE_URL o EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  if (env.validationErrors.length > 0) {
    throw new Error(env.validationErrors.join('\n'));
  }
}

function normalizeEnvValue(name: string, value: string) {
  let normalized = value.trim();
  const assignmentMatch = normalized.match(new RegExp(`^(?:export\\s+)?${escapeRegExp(name)}\\s*=\\s*(.*)$`));

  if (assignmentMatch) {
    normalized = assignmentMatch[1].trim();
  }

  if (normalized.endsWith(';')) {
    normalized = normalized.slice(0, -1).trim();
  }

  if (
    (normalized.startsWith('"') && normalized.endsWith('"')) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function getSupabaseConfigErrors(supabaseUrl: string, supabaseAnonKey: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  if (!hasHttpUrlShape(supabaseUrl)) {
    return ['La URL de Supabase debe empezar por https:// y usar el dominio de tu proyecto de Supabase.'];
  }

  return [];
}

function hasHttpUrlShape(value: string) {
  if (value.length === 0) {
    return false;
  }

  try {
    const url = new URL(value);

    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
