import { getSupabaseClient } from '../../lib/supabase';
import type { Database, PuppyExperienceStatus } from '../../types/database';

export type PuppyExperience = Database['public']['Tables']['puppy_experiences']['Row'];

export const PUBLIC_PUPPY_ORIGIN = (process.env.EXPO_PUBLIC_PUPPY_ORIGIN ?? 'https://www.sgservice.es').replace(
  /\/+$/,
  '',
);

export function getPublicPuppyUrl(publicId: string) {
  return `${PUBLIC_PUPPY_ORIGIN}/public/puppies/${publicId}`;
}

export async function getPuppyExperience(puppyId: string): Promise<PuppyExperience | null> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('puppy_experiences')
    .select('*')
    .eq('puppy_id', puppyId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function updatePuppyExperienceStatus(
  puppyId: string,
  status: PuppyExperienceStatus,
): Promise<PuppyExperience> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('puppy_experiences')
    .update({ status })
    .eq('puppy_id', puppyId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

