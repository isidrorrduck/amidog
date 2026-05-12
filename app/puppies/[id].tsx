import { useLocalSearchParams } from 'expo-router';

import { PuppiesScreen } from '../../src/features/puppies';

export default function EditPuppyRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();

  return <PuppiesScreen initialPuppyId={asString(id)} />;
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
