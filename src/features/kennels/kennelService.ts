import type { User } from '@supabase/supabase-js';

import { getSupabaseClient } from '../../lib/supabase';
import type { Database, KennelRole } from '../../types/database';

export type Kennel = Database['public']['Tables']['kennels']['Row'];
export type KennelMember = Database['public']['Tables']['kennel_members']['Row'];

export interface KennelWorkspace {
  kennel: Kennel;
  membership: KennelMember;
  role: KennelRole;
}

const fallbackKennelName = 'My Kennel';

export async function listKennelWorkspaces(profileId: string): Promise<KennelWorkspace[]> {
  const supabase = getSupabaseClient();
  const { data: memberships, error: membershipError } = await supabase
    .from('kennel_members')
    .select('*')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: true });

  if (membershipError) {
    throw membershipError;
  }

  if (!memberships || memberships.length === 0) {
    return [];
  }

  const kennelIds = memberships.map((membership) => membership.kennel_id);
  const { data: kennels, error: kennelError } = await supabase.from('kennels').select('*').in('id', kennelIds);

  if (kennelError) {
    throw kennelError;
  }

  const kennelsById = new Map((kennels ?? []).map((kennel) => [kennel.id, kennel]));

  return memberships.flatMap((membership) => {
    const kennel = kennelsById.get(membership.kennel_id);

    if (!kennel) {
      return [];
    }

    return [
      {
        kennel,
        membership,
        role: membership.role,
      },
    ];
  });
}

export async function createKennelForProfile(profileId: string, kennelName: string): Promise<KennelWorkspace> {
  const supabase = getSupabaseClient();
  const { data: kennelId, error } = await supabase.rpc('create_kennel', {
    kennel_name: normalizeKennelName(kennelName, undefined),
  });

  if (error) {
    throw error;
  }

  const workspaces = await listKennelWorkspaces(profileId);
  const workspace = workspaces.find((item) => item.kennel.id === kennelId);

  if (!workspace) {
    throw new Error('The kennel was created, but it could not be loaded for this account.');
  }

  return workspace;
}

export async function ensureInitialKennel(user: Pick<User, 'id' | 'email' | 'user_metadata'>, kennelName?: string) {
  const workspaces = await listKennelWorkspaces(user.id);

  if (workspaces.length > 0) {
    return workspaces[0];
  }

  return createKennelForProfile(user.id, normalizeKennelName(kennelName, user.email));
}

export function getInitialKennelNameFromUser(user: Pick<User, 'email' | 'user_metadata'>) {
  return getStringMetadataValue(user.user_metadata.kennel_name) ?? getStringMetadataValue(user.user_metadata.kennelName);
}

export function normalizeKennelName(kennelName: string | undefined, email: string | undefined) {
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
