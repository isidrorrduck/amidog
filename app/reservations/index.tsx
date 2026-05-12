import { useLocalSearchParams } from 'expo-router';

import { ReservationsScreen } from '../../src/features/reservations';

export default function ReservationsIndexRoute() {
  const { clientId, puppyId } = useLocalSearchParams<{
    clientId?: string | string[];
    puppyId?: string | string[];
  }>();

  return <ReservationsScreen initialClientId={asString(clientId)} initialPuppyId={asString(puppyId)} />;
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
