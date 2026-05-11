import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Litter, LitterMutationInput } from './types';

type LitterInsert = Database['public']['Tables']['litters']['Insert'];
type LitterUpdate = Database['public']['Tables']['litters']['Update'];

export async function listLitters(kennelId: string): Promise<Litter[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('litters')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('created_at', { ascending: false });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createLitter(kennelId: string, input: LitterMutationInput): Promise<Litter> {
  const supabase = getSupabaseClient();
  const payload: LitterInsert = {
    kennel_id: kennelId,
    ...input,
  };

  const { data, error } = await supabase.from('litters').insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateLitter(
  kennelId: string,
  litterId: string,
  input: LitterMutationInput,
): Promise<Litter> {
  const supabase = getSupabaseClient();
  const payload: LitterUpdate = {
    ...input,
  };

  const { data, error } = await supabase
    .from('litters')
    .update(payload)
    .eq('id', litterId)
    .eq('kennel_id', kennelId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteLitter(kennelId: string, litterId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('litters').delete().eq('id', litterId).eq('kennel_id', kennelId);

  if (error) {
    throw error;
  }
}
