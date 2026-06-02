import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Puppy, PuppyMutationInput } from './types';

type PuppyInsert = Database['public']['Tables']['puppies']['Insert'];
type PuppyUpdate = Database['public']['Tables']['puppies']['Update'];

export async function listPuppies(kennelId: string, litterId?: string | null): Promise<Puppy[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('puppies')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('created_at', { ascending: true })
    .order('name', { ascending: true });

  if (litterId) {
    query = query.eq('litter_id', litterId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getPuppy(kennelId: string, puppyId: string): Promise<Puppy | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('puppies')
    .select('*')
    .eq('id', puppyId)
    .eq('kennel_id', kennelId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data ?? null;
}

export async function createPuppy(kennelId: string, input: PuppyMutationInput): Promise<Puppy> {
  const supabase = getSupabaseClient();
  const payload: PuppyInsert = {
    kennel_id: kennelId,
    ...input,
  };

  const { data, error } = await supabase.from('puppies').insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updatePuppy(
  kennelId: string,
  puppyId: string,
  input: PuppyMutationInput,
): Promise<Puppy> {
  const supabase = getSupabaseClient();
  const payload: PuppyUpdate = {
    ...input,
  };

  const { data, error } = await supabase
    .from('puppies')
    .update(payload)
    .eq('id', puppyId)
    .eq('kennel_id', kennelId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deletePuppy(kennelId: string, puppyId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('puppies').delete().eq('id', puppyId).eq('kennel_id', kennelId);

  if (error) {
    throw error;
  }
}
