import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Document, DocumentFilters, DocumentMutationInput } from './types';

const DOCUMENTS_BUCKET = 'documents';
const DEFAULT_MIME_TYPE = 'application/octet-stream';

type DocumentInsert = Database['public']['Tables']['documents']['Insert'];

export async function listDocuments(
  kennelId: string,
  filters: DocumentFilters = {},
): Promise<Document[]> {
  const supabase = getSupabaseClient();
  let query = supabase
    .from('documents')
    .select('*')
    .eq('kennel_id', kennelId)
    .order('created_at', { ascending: false })
    .order('title', { ascending: true });

  if (filters.entityType) {
    query = query.eq('entity_type', filters.entityType);
  }

  if (filters.entityId) {
    query = query.eq('entity_id', filters.entityId);
  }

  if (filters.documentType) {
    query = query.eq('document_type', filters.documentType);
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

export async function getDocument(kennelId: string, documentId: string): Promise<Document> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('id', documentId)
    .eq('kennel_id', kennelId)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export async function uploadDocument(kennelId: string, input: DocumentMutationInput): Promise<Document> {
  const supabase = getSupabaseClient();
  const mimeType = input.file.mimeType ?? DEFAULT_MIME_TYPE;
  const fileBody = await readFileBody(input.file.uri);
  const filePath = buildDocumentStoragePath({
    entityId: input.entity_id,
    entityType: input.entity_type,
    fileName: input.file.name,
    kennelId,
  });
  const { error: uploadError } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, fileBody, {
    contentType: mimeType,
    upsert: false,
  });

  if (uploadError) {
    throw uploadError;
  }

  const payload: DocumentInsert = {
    kennel_id: kennelId,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    title: input.title,
    document_type: input.document_type,
    file_path: filePath,
    file_name: input.file.name,
    mime_type: mimeType,
    size_bytes: input.file.size ?? fileBody.byteLength,
    notes: input.notes,
  };

  const { data, error } = await supabase.from('documents').insert(payload).select().single();

  if (error) {
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]).catch(() => undefined);
    throw error;
  }

  return data;
}

export async function createDocumentDownloadUrl(filePath: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(filePath, 60);

  if (error) {
    throw error;
  }

  return data.signedUrl;
}

export async function deleteDocument(kennelId: string, documentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const document = await getDocument(kennelId, documentId);
  const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([document.file_path]);

  if (storageError) {
    throw storageError;
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('kennel_id', kennelId);

  if (error) {
    throw error;
  }
}

async function readFileBody(uri: string) {
  const response = await fetch(uri);

  if (!response.ok) {
    throw new Error('No se ha podido leer el archivo seleccionado.');
  }

  return response.arrayBuffer();
}

function buildDocumentStoragePath({
  entityId,
  entityType,
  fileName,
  kennelId,
}: {
  entityId: string;
  entityType: string;
  fileName: string;
  kennelId: string;
}) {
  const uniqueFileName = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${sanitizeFileName(fileName)}`;

  return `kennels/${kennelId}/${entityType}/${entityId}/${uniqueFileName}`;
}

function sanitizeFileName(fileName: string) {
  return fileName.trim().replace(/[/\\?#%]+/g, '-').replace(/\s+/g, '-');
}
