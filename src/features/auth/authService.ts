import type { User } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';

export type AuthProfile = Database['public']['Tables']['profiles']['Row'];

interface SignInInput {
  email: string;
  password: string;
}

interface SignUpInput extends SignInInput {
  kennelName: string;
}

export interface AuthAccount {
  profile: AuthProfile;
}

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

const fallbackKennelName = 'Mi criadero';

export async function signInWithPassword({ email, password }: SignInInput) {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password,
  });

  if (error) {
    throw error;
  }

  if (data.session) {
    await ensureAuthenticatedProfile(data.session.user);
  }

  return data;
}

export async function signUpWithPassword({ email, password, kennelName }: SignUpInput): Promise<SignUpResult> {
  const supabase = getSupabaseClient();
  const normalizedEmail = normalizeEmail(email);
  const normalizedKennelName = normalizeKennelName(kennelName, normalizedEmail);

  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
    options: {
      data: {
        kennel_name: normalizedKennelName,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data.session) {
    await ensureAuthenticatedProfile(data.session.user);
  }

  return {
    needsEmailConfirmation: !data.session,
  };
}

export async function signOut() {
  const supabase = getSupabaseClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw error;
  }
}

export async function ensureAuthenticatedAccount(user: User): Promise<AuthAccount> {
  const profile = await ensureProfile(user);

  return {
    profile,
  };
}

export async function ensureAuthenticatedProfile(user: User): Promise<AuthProfile> {
  return ensureProfile(user);
}

async function ensureProfile(user: User): Promise<AuthProfile> {
  const supabase = getSupabaseClient();
  const displayName = getStringMetadataValue(user.user_metadata.display_name);

  const { data, error } = await supabase
    .from('profiles')
    .upsert(
      {
        id: user.id,
        email: user.email ?? '',
        display_name: displayName,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'id',
      },
    )
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeKennelName(kennelName: string | undefined, email: string | undefined) {
  const trimmedName = kennelName?.trim();

  if (trimmedName) {
    return trimmedName;
  }

  const emailPrefix = email?.split('@')[0]?.trim();

  return emailPrefix ? `Criadero ${emailPrefix}` : fallbackKennelName;
}

function getStringMetadataValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
