import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Dog, DogMutationInput } from './types';

type DogInsert = Database['public']['Tables']['dogs']['Insert'];
type DogUpdate = Database['public']['Tables']['dogs']['Update'];

export async function listDogs(kennelId: string): Promise<Dog[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('dogs')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('name', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function createDog(kennelId: string, input: DogMutationInput): Promise<Dog> {
  const supabase = getSupabaseClient();
  const payload: DogInsert = {
    kennel_id: kennelId,
    ...input,
  };

  const { data, error } = await supabase.from('dogs').insert(payload).select().single();

  if (error) {
    logDogMutationError('createDog', payload, error);
    throw error;
  }

  return data;
}

export async function updateDog(kennelId: string, dogId: string, input: DogMutationInput): Promise<Dog> {
  const supabase = getSupabaseClient();
  const payload: DogUpdate = {
    ...input,
  };

  const { data, error } = await supabase
    .from('dogs')
    .update(payload)
    .eq('id', dogId)
    .eq('kennel_id', kennelId)
    .select()
    .single();

  if (error) {
    logDogMutationError('updateDog', payload, error);
    throw error;
  }

  return data;
}

export async function deleteDog(kennelId: string, dogId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('dogs').delete().eq('id', dogId).eq('kennel_id', kennelId);

  if (error) {
    throw error;
  }
}

function logDogMutationError(operation: 'createDog' | 'updateDog', payload: DogInsert | DogUpdate, error: unknown) {
  const errorFields = getSupabaseErrorFields(error);

  console.error(`[dogsService.${operation}] Supabase dog mutation failed`, {
    payload,
    code: errorFields.code,
    message: errorFields.message,
    details: errorFields.details,
    hint: errorFields.hint,
  });
}

function getSupabaseErrorFields(error: unknown) {
  if (typeof error !== 'object' || error === null) {
    return {
      code: undefined,
      message: error instanceof Error ? error.message : undefined,
      details: undefined,
      hint: undefined,
    };
  }

  const record = error as Record<string, unknown>;

  return {
    code: getStringField(record, 'code'),
    message: getStringField(record, 'message'),
    details: getStringField(record, 'details'),
    hint: getStringField(record, 'hint'),
  };
}

function getStringField(record: Record<string, unknown>, field: string) {
  const value = record[field];

  return typeof value === 'string' ? value : undefined;
}
