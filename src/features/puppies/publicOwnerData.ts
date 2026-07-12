import type { Puppy } from './types';

export interface PublicPuppyOwnerData {
  breed: string;
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
