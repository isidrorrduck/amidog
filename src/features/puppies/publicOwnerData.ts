import type { Puppy } from './types';
import { getSupabaseClient } from '../../lib/supabase';
import type { PuppyExperienceStatus } from '../../types/database';

export interface PublicPuppyOwnerData {
  breed: string;
  experienceStatus: PuppyExperienceStatus;
  publicId: string;
  puppy: Puppy;
  uniqueCode: string;
}

/** Extracts the stable identifier suffix instead of relying on the puppy name. */
export function getUniqueCodeFromPuppySlug(slug?: string | null) {
  if (!slug) return null;
  const match = slug.trim().toLowerCase().match(/-([a-z0-9]{5,})$/);
  return match?.[1] ?? null;
}

// TODO(public-supabase): Replace this explicitly provisional fixture with a public,
// least-privilege Supabase query after defining RLS and the public data contract.
const PROVISIONAL_PUBLIC_PUPPIES: PublicPuppyOwnerData[] = [
  {
    uniqueCode: '24ad4',
    publicId: '00000000-0000-4000-8000-000000024ad4',
    experienceStatus: 'published',
    breed: 'Caniche toy',
    puppy: {
      id: '00000000-0000-4000-8000-000000024ad4',
      kennel_id: '00000000-0000-4000-8000-000000000001',
      litter_id: '00000000-0000-4000-8000-000000000001',
      client_id: null,
      name: 'Thor',
      sex: 'male',
      birth_date: '2026-04-18',
      color: 'Apricot',
      birth_weight: null,
      photo_url: null,
      status: 'sold',
      notes: null,
      created_at: '2026-04-18T00:00:00.000Z',
      updated_at: '2026-04-18T00:00:00.000Z',
    },
  },
];

export function getProvisionalPublicPuppyBySlug(slug?: string | null) {
  const uniqueCode = getUniqueCodeFromPuppySlug(slug);
  return uniqueCode ? PROVISIONAL_PUBLIC_PUPPIES.find((item) => item.uniqueCode === uniqueCode) ?? null : null;
}

export async function getPublicPuppyBySlug(slug?: string | null): Promise<PublicPuppyOwnerData | null> {
  const provisional = getProvisionalPublicPuppyBySlug(slug);
  if (provisional) return provisional;

  const publicId = getPublicIdFromSlug(slug);
  if (!publicId) return null;

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('get_public_puppy_experience', { p_public_id: publicId }).maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    publicId: data.public_id,
    uniqueCode: data.public_id,
    experienceStatus: data.experience_status,
    breed: data.breed ?? 'Raza no indicada',
    puppy: {
      id: data.puppy_id,
      kennel_id: data.kennel_id,
      litter_id: data.litter_id,
      client_id: null,
      name: data.puppy_name,
      sex: data.puppy_sex,
      birth_date: data.puppy_birth_date,
      color: data.puppy_color,
      birth_weight: data.puppy_birth_weight,
      photo_url: data.puppy_photo_url,
      status: data.puppy_status,
      notes: null,
      created_at: data.puppy_created_at,
      updated_at: data.puppy_updated_at,
    },
  };
}

function getPublicIdFromSlug(slug?: string | null) {
  if (!slug) return null;
  return slug.trim().toLowerCase().match(/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i)?.[1] ?? null;
}
