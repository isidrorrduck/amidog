import { Stack, useLocalSearchParams } from 'expo-router';

import { PuppyOwnerPreviewScreen } from '../../../src/features/puppies';

export default function PuppyOwnerPreviewRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PuppyOwnerPreviewScreen puppyId={asString(id)} />
    </>
  );
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
