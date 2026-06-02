import { Stack, useLocalSearchParams } from 'expo-router';

import { HealthTimelineScreen } from '../../../src/features/health';

export default function DogHealthRoute() {
  const { dogId } = useLocalSearchParams<{ dogId?: string | string[] }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Salud' }} />
      <HealthTimelineScreen subjectType="dog" subjectId={asString(dogId)} />
    </>
  );
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
