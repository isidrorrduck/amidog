import { z } from 'zod';

import type { Database } from '../../types/database';

export const documentEntityTypeOptions = ['dog', 'puppy', 'litter', 'client'] as const;
export const documentTypeOptions = [
  'genetic_analysis',
  'pedigree',
  'contract',
  'vaccine_record',
  'veterinary_report',
  'recommendation',
  'other',
] as const;

export type Document = Database['public']['Tables']['documents']['Row'];
export type DocumentEntityType = (typeof documentEntityTypeOptions)[number];
export type DocumentType = (typeof documentTypeOptions)[number];

export interface DocumentFilters {
  documentType?: DocumentType | null;
  entityId?: string | null;
  entityType?: DocumentEntityType | null;
}

export interface DocumentFileAsset {
  uri: string;
  name: string;
  mimeType: string | null;
  size: number | null;
}

export interface DocumentMutationInput {
  title: string;
  document_type: DocumentType;
  entity_type: DocumentEntityType;
  entity_id: string;
  notes: string | null;
  file: DocumentFileAsset;
}

export interface DocumentEntityOption {
  id: string;
  label: string;
  type: DocumentEntityType;
}

export const documentFormSchema = z.object({
  title: z.string().trim().min(1, 'Enter a document title.').max(160, 'Use 160 characters or fewer.'),
  entityType: z.enum(documentEntityTypeOptions),
  entityId: requiredUuid('Choose the dog, puppy, litter or client for this document.'),
  documentType: z.enum(documentTypeOptions),
  notes: optionalText(1000, 'Use 1000 characters or fewer.'),
  file: z
    .custom<DocumentFileAsset | null>((value) => isDocumentFileAsset(value))
    .refine((value): value is DocumentFileAsset => Boolean(value), 'Choose a file to upload.'),
});

export type DocumentFormValues = z.input<typeof documentFormSchema>;
export type ValidDocumentFormValues = z.output<typeof documentFormSchema>;

export function getDocumentFormDefaultValues(
  defaults: {
    documentType?: DocumentType | null;
    entityId?: string | null;
    entityType?: DocumentEntityType | null;
  } = {},
): DocumentFormValues {
  return {
    title: '',
    entityType: defaults.entityType ?? 'dog',
    entityId: defaults.entityId ?? '',
    documentType: defaults.documentType ?? 'other',
    notes: '',
    file: null,
  };
}

export function toDocumentMutationInput(values: ValidDocumentFormValues): DocumentMutationInput {
  return {
    title: values.title,
    document_type: values.documentType,
    entity_type: values.entityType,
    entity_id: values.entityId,
    notes: emptyToNull(values.notes),
    file: values.file,
  };
}

export function getDocumentEntityTypeLabel(entityType: DocumentEntityType) {
  const labels: Record<DocumentEntityType, string> = {
    dog: 'Dog',
    puppy: 'Puppy',
    litter: 'Litter',
    client: 'Client',
  };

  return labels[entityType];
}

export function getDocumentTypeLabel(documentType: DocumentType) {
  const labels: Record<DocumentType, string> = {
    genetic_analysis: 'Genetic analysis',
    pedigree: 'Pedigree',
    contract: 'Contract',
    vaccine_record: 'Vaccine record',
    veterinary_report: 'Veterinary report',
    recommendation: 'Recommendation',
    other: 'Other',
  };

  return labels[documentType];
}

function optionalText(max: number, message: string) {
  return z.string().trim().max(max, message);
}

function requiredUuid(message: string) {
  return z.string().trim().refine(isUuid, message);
}

function emptyToNull(value: string) {
  return value.length > 0 ? value : null;
}

function isDocumentFileAsset(value: unknown): value is DocumentFileAsset {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const file = value as Partial<DocumentFileAsset>;

  return typeof file.uri === 'string' && typeof file.name === 'string';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
