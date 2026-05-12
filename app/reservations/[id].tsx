import { useLocalSearchParams } from 'expo-router';

import { ReservationsScreen } from '../../src/features/reservations';

export default function EditReservationRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();

  return <ReservationsScreen initialReservationId={asString(id)} />;
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
