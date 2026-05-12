import { useLocalSearchParams } from 'expo-router';

import { PuppiesScreen } from '../../src/features/puppies';

export default function NewPuppyRoute() {
  const { litterId } = useLocalSearchParams<{ litterId?: string | string[] }>();

  return <PuppiesScreen initialMode="create" initialLitterId={asString(litterId)} />;
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
