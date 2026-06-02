import { Stack, useLocalSearchParams } from 'expo-router';

import { HealthTimelineScreen } from '../../../src/features/health';

export default function PuppyHealthRoute() {
  const { puppyId } = useLocalSearchParams<{ puppyId?: string | string[] }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Salud' }} />
      <HealthTimelineScreen subjectType="puppy" subjectId={asString(puppyId)} />
    </>
  );
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
