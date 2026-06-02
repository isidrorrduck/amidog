import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { HealthEvent, HealthEventFilters, HealthEventMutationInput } from './types';

type HealthEventInsert = Database['public']['Tables']['health_events']['Insert'];
type HealthEventUpdate = Database['public']['Tables']['health_events']['Update'];

export async function listHealthEvents(
  kennelId: string,
  filters: HealthEventFilters = {},
): Promise<HealthEvent[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('health_events')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('event_date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.dogId) {
    query = query.eq('dog_id', filters.dogId);
  }

  if (filters.puppyId) {
    query = query.eq('puppy_id', filters.puppyId);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createHealthEvent(
  kennelId: string,
  input: HealthEventMutationInput,
): Promise<HealthEvent> {
  const supabase = getSupabaseClient();
  const payload: HealthEventInsert = {
    kennel_id: kennelId,
    created_by: await getCurrentUserId(),
    ...input,
  };

  const { data, error } = await supabase.from('health_events').insert(payload).select().single();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateHealthEvent(
  kennelId: string,
  healthEventId: string,
  input: HealthEventMutationInput,
): Promise<HealthEvent> {
  const supabase = getSupabaseClient();
  const payload: HealthEventUpdate = {
    ...input,
  };

  const { data, error } = await supabase
    .from('health_events')
    .update(payload)
    .eq('id', healthEventId)
    .eq('kennel_id', kennelId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function deleteHealthEvent(kennelId: string, healthEventId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from('health_events')
    .delete()
    .eq('id', healthEventId)
    .eq('kennel_id', kennelId);

  if (error) {
    throw error;
  }
}

async function getCurrentUserId() {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error('Inicia sesion antes de registrar eventos de salud.');
  }

  return data.user.id;
}
