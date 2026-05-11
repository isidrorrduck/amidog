import type { User } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../lib/supabase';
import type { Database, KennelRole } from '../../types/database';

export type AuthProfile = Database['public']['Tables']['profiles']['Row'];
export type Kennel = Database['public']['Tables']['kennels']['Row'];
type KennelMembership = Database['public']['Tables']['kennel_memberships']['Row'];

interface SignInInput {
  email: string;
  password: string;
}

interface SignUpInput extends SignInInput {
  kennelName: string;
}

interface EnsureWorkspaceOptions {
  kennelName?: string;
}

export interface AuthWorkspace {
  profile: AuthProfile;
  kennel: Kennel | null;
}

export interface SignUpResult {
  needsEmailConfirmation: boolean;
}

const fallbackKennelName = 'My Kennel';

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
    await ensureAuthenticatedWorkspace(data.session.user);
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
    await ensureAuthenticatedWorkspace(data.session.user, {
      kennelName: normalizedKennelName,
    });
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

export async function ensureAuthenticatedWorkspace(
  user: User,
  options: EnsureWorkspaceOptions = {},
): Promise<AuthWorkspace> {
  const profile = await ensureProfile(user);
  const kennel = await ensureStarterKennel(user, options.kennelName);

  return {
    profile,
    kennel,
  };
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

async function ensureStarterKennel(user: User, kennelName?: string): Promise<Kennel | null> {
  const supabase = getSupabaseClient();

  const { data: membership, error: membershipError } = await supabase
    .from('kennel_memberships')
    .select('kennel_id, role')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle<Pick<KennelMembership, 'kennel_id' | 'role'>>();

  if (membershipError) {
    throw membershipError;
  }

  if (membership) {
    return getKennelById(membership.kennel_id);
  }

  const { data: kennel, error: kennelError } = await supabase
    .from('kennels')
    .insert({
      name: normalizeKennelName(kennelName, user.email),
      owner_id: user.id,
    })
    .select()
    .single();

  if (kennelError) {
    throw kennelError;
  }

  await ensureOwnerMembership(kennel.id, user.id);

  return kennel;
}

async function getKennelById(kennelId: string): Promise<Kennel | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from('kennels').select().eq('id', kennelId).maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function ensureOwnerMembership(kennelId: string, profileId: string) {
  const supabase = getSupabaseClient();
  const role: KennelRole = 'owner';
  const { error } = await supabase.from('kennel_memberships').upsert(
    {
      kennel_id: kennelId,
      profile_id: profileId,
      role,
    },
    {
      onConflict: 'kennel_id,profile_id',
    },
  );

  if (error) {
    throw error;
  }
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

  return emailPrefix ? `${emailPrefix} Kennel` : fallbackKennelName;
}

function getStringMetadataValue(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}
