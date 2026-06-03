import { Stack, useLocalSearchParams } from 'expo-router';

import { DocumentsScreen, documentEntityTypeOptions, documentTypeOptions } from '../../src/features/documents';
import type { DocumentEntityType, DocumentType } from '../../src/features/documents';

export default function NewDocumentRoute() {
  const { documentType, entityId, entityType } = useLocalSearchParams<{
    documentType?: string | string[];
    entityId?: string | string[];
    entityType?: string | string[];
  }>();

  return (
    <>
      <Stack.Screen options={{ title: 'Subir documento' }} />
      <DocumentsScreen
        initialMode="create"
        initialDocumentType={asDocumentType(documentType)}
        initialEntityId={asString(entityId)}
        initialEntityType={asDocumentEntityType(entityType)}
      />
    </>
  );
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

function asDocumentEntityType(value: string | string[] | undefined): DocumentEntityType | null {
  const normalized = asString(value);

  return documentEntityTypeOptions.includes(normalized as DocumentEntityType)
    ? (normalized as DocumentEntityType)
    : null;
}

function asDocumentType(value: string | string[] | undefined): DocumentType | null {
  const normalized = asString(value);

  return documentTypeOptions.includes(normalized as DocumentType) ? (normalized as DocumentType) : null;
}
