import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteDocument, getDocument, listDocuments, uploadDocument } from './documentsService';
import type { DocumentFilters, DocumentMutationInput } from './types';

export const documentsQueryKeys = {
  all: ['documents'] as const,
  byKennel: (kennelId: string | null | undefined) => [...documentsQueryKeys.all, kennelId] as const,
  byKennelAndFilters: (kennelId: string | null | undefined, filters: DocumentFilters = {}) =>
    [
      ...documentsQueryKeys.byKennel(kennelId),
      {
        documentType: filters.documentType ?? null,
        entityId: filters.entityId ?? null,
        entityType: filters.entityType ?? null,
      },
    ] as const,
  detail: (kennelId: string | null | undefined, documentId: string | null | undefined) =>
    [...documentsQueryKeys.byKennel(kennelId), 'detail', documentId ?? null] as const,
};

export function useDocuments(kennelId: string | null | undefined, filters: DocumentFilters = {}) {
  return useQuery({
    queryKey: documentsQueryKeys.byKennelAndFilters(kennelId, filters),
    queryFn: () => requireKennelId(kennelId).then((id) => listDocuments(id, filters)),
    enabled: Boolean(kennelId),
  });
}

export function useDocument(kennelId: string | null | undefined, documentId: string | null | undefined) {
  return useQuery({
    queryKey: documentsQueryKeys.detail(kennelId, documentId),
    queryFn: () => requireKennelId(kennelId).then((id) => getDocument(id, requireDocumentId(documentId))),
    enabled: Boolean(kennelId && documentId),
  });
}

export function useUploadDocument(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: DocumentMutationInput) => requireKennelId(kennelId).then((id) => uploadDocument(id, input)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsQueryKeys.byKennel(kennelId) }),
  });
}

export function useDeleteDocument(kennelId: string | null | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (documentId: string) => requireKennelId(kennelId).then((id) => deleteDocument(id, documentId)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: documentsQueryKeys.byKennel(kennelId) }),
  });
}

async function requireKennelId(kennelId: string | null | undefined) {
  if (!kennelId) {
    throw new Error('Selecciona un criadero antes de gestionar documentos.');
  }

  return kennelId;
}

function requireDocumentId(documentId: string | null | undefined) {
  if (!documentId) {
    throw new Error('Elige primero un documento.');
  }

  return documentId;
}
