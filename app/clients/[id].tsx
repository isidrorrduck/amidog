import { useLocalSearchParams } from 'expo-router';

import { ClientsScreen } from '../../src/features/clients';

export default function EditClientRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();

  return <ClientsScreen initialClientId={asString(id)} />;
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
