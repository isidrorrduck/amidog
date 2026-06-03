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
  webFile?: { arrayBuffer: () => Promise<ArrayBuffer> } | null;
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
  title: z.string().trim().min(1, 'Introduce un título para el documento.').max(160, 'Usa 160 caracteres o menos.'),
  entityType: z.enum(documentEntityTypeOptions),
  entityId: requiredUuid('Elige el perro, cachorro, camada o cliente de este documento.'),
  documentType: z.enum(documentTypeOptions),
  notes: optionalText(1000, 'Usa 1000 caracteres o menos.'),
  file: z
    .custom<DocumentFileAsset | null>((value) => isDocumentFileAsset(value))
    .refine((value): value is DocumentFileAsset => Boolean(value), 'Elige un archivo para subir.'),
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
    dog: 'Perro',
    puppy: 'Cachorro',
    litter: 'Camada',
    client: 'Cliente',
  };

  return labels[entityType];
}

export function getDocumentTypeLabel(documentType: DocumentType) {
  const labels: Record<DocumentType, string> = {
    genetic_analysis: 'Análisis genético',
    pedigree: 'Pedigrí',
    contract: 'Contrato',
    vaccine_record: 'Cartilla de vacunas',
    veterinary_report: 'Informe veterinario',
    recommendation: 'Recomendación',
    other: 'Otro',
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
