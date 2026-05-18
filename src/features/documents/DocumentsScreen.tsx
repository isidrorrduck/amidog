import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, Text, View } from 'react-native';

import { Button, AppCard, AppScreen } from '../../components';
import { ProtectedRoute } from '../auth';
import { getClientFullName, useClients, type Client } from '../clients';
import { useDogs, type Dog } from '../dogs';
import { useCurrentKennel } from '../kennels';
import { useLitters, type Litter } from '../litters';
import { usePuppies, type Puppy } from '../puppies';
import { DocumentForm } from './DocumentForm';
import { createDocumentDownloadUrl } from './documentsService';
import {
  documentEntityTypeOptions,
  documentTypeOptions,
  getDocumentEntityTypeLabel,
  getDocumentTypeLabel,
  type Document as KennelDocument,
  type DocumentEntityOption,
  type DocumentEntityType,
  type DocumentFilters,
  type DocumentMutationInput,
  type DocumentType,
} from './types';
import { useDeleteDocument, useDocument, useDocuments, useUploadDocument } from './useDocuments';

interface DocumentsScreenProps {
  initialDocumentId?: string | null;
  initialDocumentType?: DocumentType | null;
  initialEntityId?: string | null;
  initialEntityType?: DocumentEntityType | null;
  initialMode?: 'create';
}

export function DocumentsScreen(props: DocumentsScreenProps = {}) {
  return (
    <ProtectedRoute>
      <DocumentsContent {...props} />
    </ProtectedRoute>
  );
}

function DocumentsContent({
  initialDocumentId,
  initialDocumentType,
  initialEntityId,
  initialEntityType,
  initialMode,
}: DocumentsScreenProps) {
  const { currentKennel, currentMembership } = useCurrentKennel();
  const kennelId = currentKennel?.id ?? null;
  const [selectedDocumentType, setSelectedDocumentType] = useState<DocumentType | ''>(initialDocumentType ?? '');
  const [selectedEntityType, setSelectedEntityType] = useState<DocumentEntityType | ''>(initialEntityType ?? '');
  const [selectedEntityId, setSelectedEntityId] = useState(initialEntityId ?? '');
  const filters = useMemo<DocumentFilters>(
    () => ({
      documentType: selectedDocumentType || null,
      entityId: selectedEntityId || null,
      entityType: selectedEntityType || null,
    }),
    [selectedDocumentType, selectedEntityId, selectedEntityType],
  );
  const documentsQuery = useDocuments(kennelId, filters);
  const documentQuery = useDocument(kennelId, initialDocumentId);
  const dogsQuery = useDogs(kennelId);
  const puppiesQuery = usePuppies(kennelId);
  const littersQuery = useLitters(kennelId);
  const clientsQuery = useClients(kennelId);
  const uploadDocumentMutation = useUploadDocument(kennelId);
  const deleteDocumentMutation = useDeleteDocument(kennelId);
  const [isFormOpen, setIsFormOpen] = useState(initialMode === 'create');
  const [formError, setFormError] = useState<string | null>(null);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [openingDocumentId, setOpeningDocumentId] = useState<string | null>(null);
  const dogs = dogsQuery.data ?? [];
  const puppies = puppiesQuery.data ?? [];
  const litters = littersQuery.data ?? [];
  const clients = clientsQuery.data ?? [];
  const dogsById = useMemo(() => new Map(dogs.map((dog) => [dog.id, dog])), [dogs]);
  const puppiesById = useMemo(() => new Map(puppies.map((puppy) => [puppy.id, puppy])), [puppies]);
  const littersById = useMemo(() => new Map(litters.map((litter) => [litter.id, litter])), [litters]);
  const clientsById = useMemo(() => new Map(clients.map((client) => [client.id, client])), [clients]);
  const entityOptions = useMemo(
    () => buildEntityOptions({ clients, dogs, litters, puppies }),
    [clients, dogs, litters, puppies],
  );
  const documents = initialDocumentId ? (documentQuery.data ? [documentQuery.data] : []) : documentsQuery.data ?? [];
  const activeDocumentsQuery = initialDocumentId ? documentQuery : documentsQuery;
  const isOwner = currentMembership?.role === 'owner';
  const isRouteForm = initialMode === 'create' || Boolean(initialDocumentId);
  const isRelationLoading = dogsQuery.isLoading || puppiesQuery.isLoading || littersQuery.isLoading || clientsQuery.isLoading;
  const relationError = dogsQuery.error ?? puppiesQuery.error ?? littersQuery.error ?? clientsQuery.error ?? null;
  const hasActiveFilters = Boolean(selectedDocumentType || selectedEntityType || selectedEntityId);

  const openCreateForm = () => {
    setFormError(null);
    setScreenError(null);
    uploadDocumentMutation.reset();
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setFormError(null);
    setIsFormOpen(false);

    if (isRouteForm) {
      router.replace('/documents' as never);
    }
  };

  const handleEntityTypeChange = (entityType: DocumentEntityType | '') => {
    setSelectedEntityType(entityType);
    setSelectedEntityId('');
  };

  const handleSubmitDocument = async (input: DocumentMutationInput) => {
    setFormError(null);

    try {
      await uploadDocumentMutation.mutateAsync(input);
      closeForm();
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  const handleOpenDocument = async (document: KennelDocument) => {
    setScreenError(null);
    setOpeningDocumentId(document.id);

    try {
      const signedUrl = await createDocumentDownloadUrl(document.file_path);
      await Linking.openURL(signedUrl);
    } catch (error) {
      setScreenError(getErrorMessage(error));
    } finally {
      setOpeningDocumentId(null);
    }
  };

  const handleDeleteDocument = (document: KennelDocument) => {
    Alert.alert('Delete document?', `${document.title} will be removed from ${currentKennel?.name ?? 'this kennel'}.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void deleteDocumentMutation.mutateAsync(document.id).catch((error) => {
            setScreenError(getErrorMessage(error));
          });
        },
      },
    ]);
  };

  return (
    <AppScreen scrollable>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Documents</Text>
        <Text className="text-base leading-6 text-slate-600">
          {currentKennel?.name ?? 'Kennel'} files for dogs, puppies, litters and clients
        </Text>
      </View>

      <Button
        title={isFormOpen ? 'Close form' : 'Upload document'}
        variant={isFormOpen ? 'secondary' : 'primary'}
        onPress={isFormOpen ? closeForm : () => router.push(getNewDocumentHref(filters) as never)}
      />

      {screenError ? (
        <AppCard>
          <Text className="text-sm leading-5 text-red-600">{screenError}</Text>
        </AppCard>
      ) : null}

      {relationError ? (
        <AppCard title="Unable to load linked records">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(relationError)}</Text>
        </AppCard>
      ) : null}

      {!initialDocumentId ? (
        <DocumentFiltersCard
          entityOptions={entityOptions}
          selectedDocumentType={selectedDocumentType}
          selectedEntityId={selectedEntityId}
          selectedEntityType={selectedEntityType}
          onChangeDocumentType={setSelectedDocumentType}
          onChangeEntityId={setSelectedEntityId}
          onChangeEntityType={handleEntityTypeChange}
        />
      ) : null}

      {isFormOpen ? (
        <DocumentForm
          defaultDocumentType={initialDocumentType ?? (selectedDocumentType || null)}
          defaultEntityId={initialEntityId ?? selectedEntityId}
          defaultEntityType={initialEntityType ?? (selectedEntityType || null)}
          entityOptions={entityOptions}
          errorMessage={formError}
          isSubmitting={uploadDocumentMutation.isPending}
          onCancel={closeForm}
          onSubmit={handleSubmitDocument}
        />
      ) : null}

      {activeDocumentsQuery.isLoading || isRelationLoading ? (
        <AppCard title="Loading documents">
          <View className="items-start">
            <ActivityIndicator color="#1d4ed8" />
          </View>
        </AppCard>
      ) : null}

      {activeDocumentsQuery.error ? (
        <AppCard title="Unable to load documents">
          <Text className="text-sm leading-5 text-red-600">{getErrorMessage(activeDocumentsQuery.error)}</Text>
        </AppCard>
      ) : null}

      {!activeDocumentsQuery.isLoading && !activeDocumentsQuery.error && documents.length === 0 ? (
        <AppCard title={initialDocumentId ? 'Document not found' : hasActiveFilters ? 'No matching documents' : 'No documents yet'}>
          <View className="gap-4">
            <Text className="text-sm leading-5 text-slate-600">
              {initialDocumentId
                ? 'This document is not available in the current kennel.'
                : hasActiveFilters
                  ? 'Change the filters to see more documents.'
                  : 'Upload the first document for this kennel.'}
            </Text>
            {!initialDocumentId && !isFormOpen && !hasActiveFilters ? (
              <Button title="Upload document" onPress={openCreateForm} />
            ) : null}
          </View>
        </AppCard>
      ) : null}

      {documents.length > 0 ? (
        <View className="gap-3">
          {documents.map((document) => (
            <DocumentCard
              document={document}
              entityLabel={getDocumentEntityLabel(document, { clientsById, dogsById, littersById, puppiesById })}
              isDeleting={deleteDocumentMutation.isPending}
              isOpening={openingDocumentId === document.id}
              isOwner={isOwner}
              key={document.id}
              showDetails={!initialDocumentId}
              onDelete={() => handleDeleteDocument(document)}
              onDetails={() => router.push(`/documents/${document.id}` as never)}
              onOpen={() => void handleOpenDocument(document)}
            />
          ))}
        </View>
      ) : null}
    </AppScreen>
  );
}

interface DocumentFiltersCardProps {
  entityOptions: DocumentEntityOption[];
  selectedDocumentType: DocumentType | '';
  selectedEntityId: string;
  selectedEntityType: DocumentEntityType | '';
  onChangeDocumentType: (documentType: DocumentType | '') => void;
  onChangeEntityId: (entityId: string) => void;
  onChangeEntityType: (entityType: DocumentEntityType | '') => void;
}

function DocumentFiltersCard({
  entityOptions,
  selectedDocumentType,
  selectedEntityId,
  selectedEntityType,
  onChangeDocumentType,
  onChangeEntityId,
  onChangeEntityType,
}: DocumentFiltersCardProps) {
  const filteredEntityOptions = selectedEntityType
    ? entityOptions.filter((option) => option.type === selectedEntityType)
    : [];

  return (
    <AppCard title="Filters">
      <View className="gap-4">
        <FilterSection label="Document type">
          <FilterOption label="All types" isSelected={!selectedDocumentType} onPress={() => onChangeDocumentType('')} />
          {documentTypeOptions.map((documentType) => (
            <FilterOption
              key={documentType}
              label={getDocumentTypeLabel(documentType)}
              isSelected={selectedDocumentType === documentType}
              onPress={() => onChangeDocumentType(documentType)}
            />
          ))}
        </FilterSection>

        <FilterSection label="Linked to">
          <FilterOption label="All records" isSelected={!selectedEntityType} onPress={() => onChangeEntityType('')} />
          {documentEntityTypeOptions.map((entityType) => (
            <FilterOption
              key={entityType}
              label={getDocumentEntityTypeLabel(entityType)}
              isSelected={selectedEntityType === entityType}
              onPress={() => onChangeEntityType(entityType)}
            />
          ))}
        </FilterSection>

        {selectedEntityType ? (
          <FilterSection label={getDocumentEntityTypeLabel(selectedEntityType)}>
            <FilterOption label="All" isSelected={!selectedEntityId} onPress={() => onChangeEntityId('')} />
            {filteredEntityOptions.map((option) => (
              <FilterOption
                key={option.id}
                label={option.label}
                isSelected={selectedEntityId === option.id}
                onPress={() => onChangeEntityId(option.id)}
              />
            ))}
            {filteredEntityOptions.length === 0 ? (
              <Text className="text-sm leading-5 text-slate-600">No records are available for this filter.</Text>
            ) : null}
          </FilterSection>
        ) : null}
      </View>
    </AppCard>
  );
}

interface FilterSectionProps {
  children: ReactNode;
  label: string;
}

function FilterSection({ children, label }: FilterSectionProps) {
  return (
    <View className="gap-2">
      <Text className="text-sm font-semibold text-slate-700">{label}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

interface FilterOptionProps {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}

function FilterOption({ isSelected, label, onPress }: FilterOptionProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={`min-h-11 max-w-full items-center justify-center rounded-lg border px-3 ${
        isSelected ? 'border-brand-600 bg-brand-50' : 'border-slate-300 bg-white'
      }`}
    >
      <Text
        numberOfLines={1}
        className={`max-w-full text-sm font-semibold ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}
      >
        {label}
      </Text>
    </Pressable>
  );
}

interface DocumentCardProps {
  document: KennelDocument;
  entityLabel: string;
  isDeleting: boolean;
  isOpening: boolean;
  isOwner: boolean;
  showDetails: boolean;
  onDelete: () => void;
  onDetails: () => void;
  onOpen: () => void;
}

function DocumentCard({
  document,
  entityLabel,
  isDeleting,
  isOpening,
  isOwner,
  showDetails,
  onDelete,
  onDetails,
  onOpen,
}: DocumentCardProps) {
  const details = [
    getDocumentTypeLabel(document.document_type),
    entityLabel,
    document.file_name,
    formatSize(document.size_bytes),
    `Uploaded ${formatDate(document.created_at)}`,
  ];

  return (
    <AppCard>
      <View className="gap-3">
        <View className="gap-1">
          <Text className="text-xl font-semibold text-slate-950">{document.title}</Text>
          <Text className="text-sm leading-5 text-slate-600">{details.join(' | ')}</Text>
        </View>

        {document.notes ? <Text className="text-sm leading-5 text-slate-600">{document.notes}</Text> : null}

        <View className="gap-3">
          <Button title="Open" loading={isOpening} onPress={onOpen} />
          {showDetails || isOwner ? (
            <View className="flex-row gap-3">
              {showDetails ? (
                <Button title="Details" variant="secondary" className="flex-1" onPress={onDetails} />
              ) : null}
              {isOwner ? (
                <Button
                  title="Delete"
                  variant="ghost"
                  loading={isDeleting}
                  className="flex-1"
                  textClassName="text-red-600"
                  onPress={onDelete}
                />
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </AppCard>
  );
}

function buildEntityOptions({
  clients,
  dogs,
  litters,
  puppies,
}: {
  clients: Client[];
  dogs: Dog[];
  litters: Litter[];
  puppies: Puppy[];
}): DocumentEntityOption[] {
  return [
    ...dogs.map((dog) => ({ id: dog.id, label: dog.name, type: 'dog' as const })),
    ...puppies.map((puppy) => ({ id: puppy.id, label: puppy.name, type: 'puppy' as const })),
    ...litters.map((litter) => ({ id: litter.id, label: litter.name, type: 'litter' as const })),
    ...clients.map((client) => ({ id: client.id, label: getClientFullName(client), type: 'client' as const })),
  ];
}

function getDocumentEntityLabel(
  document: KennelDocument,
  {
    clientsById,
    dogsById,
    littersById,
    puppiesById,
  }: {
    clientsById: Map<string, Client>;
    dogsById: Map<string, Dog>;
    littersById: Map<string, Litter>;
    puppiesById: Map<string, Puppy>;
  },
) {
  if (document.entity_type === 'dog') {
    return dogsById.get(document.entity_id)?.name ?? 'Unknown dog';
  }

  if (document.entity_type === 'puppy') {
    return puppiesById.get(document.entity_id)?.name ?? 'Unknown puppy';
  }

  if (document.entity_type === 'litter') {
    return littersById.get(document.entity_id)?.name ?? 'Unknown litter';
  }

  return clientsById.get(document.entity_id) ? getClientFullName(clientsById.get(document.entity_id)!) : 'Unknown client';
}

function getNewDocumentHref(filters: DocumentFilters) {
  const params = [
    filters.entityType ? `entityType=${encodeURIComponent(filters.entityType)}` : null,
    filters.entityId ? `entityId=${encodeURIComponent(filters.entityId)}` : null,
    filters.documentType ? `documentType=${encodeURIComponent(filters.documentType)}` : null,
  ].filter(Boolean);

  return params.length > 0 ? `/documents/new?${params.join('&')}` : '/documents/new';
}

function formatDate(value: string) {
  return value.slice(0, 10);
}

function formatSize(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'object' && error !== null && typeof (error as { message?: unknown }).message === 'string'
        ? (error as { message: string }).message
        : null;

  return message ?? 'Something went wrong while managing documents.';
}
