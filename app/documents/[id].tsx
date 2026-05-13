import { useLocalSearchParams } from 'expo-router';

import { DocumentsScreen } from '../../src/features/documents';

export default function DocumentDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();

  return <DocumentsScreen initialDocumentId={asString(id)} />;
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
