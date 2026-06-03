import { File as ExpoFile } from 'expo-file-system';

import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Document, DocumentFileAsset, DocumentFilters, DocumentMutationInput } from './types';

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
  let fileBody: ArrayBuffer;

  try {
    fileBody = await readFileBody(input.file);
  } catch (error) {
    logDocumentError('readFileBody', error, { uriScheme: getUriScheme(input.file.uri) });
    throw new Error(getFileReadErrorMessage(error));
  }

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
    logDocumentError('storage.upload', uploadError, { bucket: DOCUMENTS_BUCKET, filePath });
    throw new Error(getStorageUploadErrorMessage(uploadError));
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
    logDocumentError('documents.insert', error, {
      documentType: input.document_type,
      entityType: input.entity_type,
      filePath,
      kennelId,
    });
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]).catch(() => undefined);
    throw new Error(getDocumentInsertErrorMessage(error));
  }

  return data;
}

export async function createDocumentDownloadUrl(filePath: string): Promise<string> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(filePath, 60);

  if (error) {
    logDocumentError('storage.createSignedUrl', error, { bucket: DOCUMENTS_BUCKET, filePath });
    throw new Error(getStorageDownloadErrorMessage(error));
  }

  return data.signedUrl;
}

export async function deleteDocument(kennelId: string, documentId: string): Promise<void> {
  const supabase = getSupabaseClient();
  const document = await getDocument(kennelId, documentId);
  const { error: storageError } = await supabase.storage.from(DOCUMENTS_BUCKET).remove([document.file_path]);

  if (storageError) {
    logDocumentError('storage.remove', storageError, { bucket: DOCUMENTS_BUCKET, filePath: document.file_path });
    throw new Error(getStorageDeleteErrorMessage(storageError));
  }

  const { error } = await supabase
    .from('documents')
    .delete()
    .eq('id', documentId)
    .eq('kennel_id', kennelId);

  if (error) {
    logDocumentError('documents.delete', error, { documentId, kennelId });
    throw new Error(getDocumentDeleteErrorMessage(error));
  }
}

async function readFileBody(file: DocumentFileAsset) {
  if (file.webFile) {
    return file.webFile.arrayBuffer();
  }

  if (file.uri.startsWith('data:')) {
    return dataUriToArrayBuffer(file.uri);
  }

  try {
    return await new ExpoFile(file.uri).arrayBuffer();
  } catch (error) {
    throw new Error(getLocalFileReadErrorMessage(error));
  }
}

function dataUriToArrayBuffer(uri: string) {
  const marker = ';base64,';
  const markerIndex = uri.indexOf(marker);

  if (markerIndex < 0) {
    throw new Error('El archivo seleccionado no contiene datos en base64.');
  }

  if (typeof globalThis.atob !== 'function') {
    throw new Error('El entorno no permite decodificar archivos en base64.');
  }

  const binary = globalThis.atob(uri.slice(markerIndex + marker.length));
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes.buffer;
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
  return fileName.trim().replace(/[/\\?#%]+/g, '-').replace(/\s+/g, '-') || 'documento';
}

function getFileReadErrorMessage(error: unknown) {
  const message = getErrorMessage(error);

  return message
    ? `No se ha podido leer el archivo seleccionado antes de subirlo. Vuelve a elegirlo e inténtalo de nuevo. Detalle: ${message}`
    : 'No se ha podido leer el archivo seleccionado antes de subirlo. Vuelve a elegirlo e inténtalo de nuevo.';
}

function getLocalFileReadErrorMessage(error: unknown) {
  const message = getErrorMessage(error);

  return message || 'Expo no ha podido leer el URI local del documento.';
}

function getStorageUploadErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = normalizeMessage(message);

  if (isBucketMissingError(error, normalized)) {
    return 'No se ha encontrado el bucket de Storage "documents". Revisa que la migración de documentos esté aplicada en Supabase.';
  }

  if (isPermissionError(error, normalized)) {
    return 'Supabase no permite subir archivos al bucket "documents" para este usuario. Revisa las políticas de Storage y que la cuenta pertenezca al criadero.';
  }

  if (isDuplicateError(error, normalized)) {
    return 'Ya existe un archivo con esa ruta en Storage. Vuelve a intentarlo para generar un nombre nuevo.';
  }

  return message
    ? `No se ha podido subir el archivo a Storage. Detalle: ${message}`
    : 'No se ha podido subir el archivo a Storage. Revisa el bucket "documents" y la conexión con Supabase.';
}

function getDocumentInsertErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = normalizeMessage(message);

  if (isPermissionError(error, normalized)) {
    return 'El archivo se ha subido, pero Supabase no permite crear el registro en la tabla "documents". Revisa la RLS de documentos y que la cuenta pertenezca al criadero.';
  }

  if (
    normalized.includes('must belong to the document kennel') ||
    normalized.includes('unsupported document entity type')
  ) {
    return 'El archivo se ha subido, pero el registro vinculado no pertenece al criadero actual. Revisa el perro, cachorro, camada o cliente seleccionado.';
  }

  if (normalized.includes('not-null') || normalized.includes('check constraint')) {
    return 'El archivo se ha subido, pero la tabla "documents" ha rechazado algún dato obligatorio. Revisa título, tipo, vínculo, nombre y tamaño del archivo.';
  }

  if (isDuplicateError(error, normalized)) {
    return 'El archivo se ha subido, pero ya existe un documento con la misma ruta. Vuelve a intentarlo.';
  }

  return message
    ? `El archivo se ha subido, pero no se ha podido guardar el documento. Detalle: ${message}`
    : 'El archivo se ha subido, pero no se ha podido guardar el documento en la tabla "documents".';
}

function getStorageDownloadErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = normalizeMessage(message);

  if (isPermissionError(error, normalized)) {
    return 'No tienes permiso para abrir este archivo. Revisa tu acceso al criadero y las políticas de Storage.';
  }

  return message ? `No se ha podido abrir el documento. Detalle: ${message}` : 'No se ha podido abrir el documento.';
}

function getStorageDeleteErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = normalizeMessage(message);

  if (isPermissionError(error, normalized)) {
    return 'No tienes permiso para eliminar este archivo. Solo el propietario del criadero puede borrar documentos.';
  }

  return message ? `No se ha podido eliminar el archivo de Storage. Detalle: ${message}` : 'No se ha podido eliminar el archivo de Storage.';
}

function getDocumentDeleteErrorMessage(error: unknown) {
  const message = getErrorMessage(error);
  const normalized = normalizeMessage(message);

  if (isPermissionError(error, normalized)) {
    return 'No tienes permiso para eliminar este documento. Solo el propietario del criadero puede borrar documentos.';
  }

  return message ? `No se ha podido eliminar el documento. Detalle: ${message}` : 'No se ha podido eliminar el documento.';
}

function isBucketMissingError(error: unknown, normalizedMessage: string) {
  return getStatusCode(error) === '404' || normalizedMessage.includes('bucket not found');
}

function isPermissionError(error: unknown, normalizedMessage: string) {
  const statusCode = getStatusCode(error);

  return (
    statusCode === '401' ||
    statusCode === '403' ||
    normalizedMessage.includes('row-level security') ||
    normalizedMessage.includes('permission denied') ||
    normalizedMessage.includes('unauthorized') ||
    normalizedMessage.includes('not authorized') ||
    normalizedMessage.includes('violates row-level security policy')
  );
}

function isDuplicateError(error: unknown, normalizedMessage: string) {
  return (
    getStatusCode(error) === '409' ||
    getErrorField(error, 'code') === '23505' ||
    normalizedMessage.includes('already exists') ||
    normalizedMessage.includes('duplicate key')
  );
}

function normalizeMessage(message: string | null) {
  return message?.toLowerCase() ?? '';
}

function getStatusCode(error: unknown) {
  const statusCode = getErrorField(error, 'statusCode') ?? getErrorField(error, 'status');

  return statusCode ? String(statusCode) : null;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return getErrorField(error, 'message');
}

function getErrorField(error: unknown, field: string) {
  if (typeof error !== 'object' || error === null || !(field in error)) {
    return null;
  }

  const value = (error as Record<string, unknown>)[field];

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  if (typeof value === 'number') {
    return String(value);
  }

  return null;
}

function getUriScheme(uri: string) {
  const separatorIndex = uri.indexOf(':');

  return separatorIndex > 0 ? uri.slice(0, separatorIndex) : 'unknown';
}

function logDocumentError(operation: string, error: unknown, context?: Record<string, unknown>) {
  console.error(`[documentsService.${operation}] Document operation failed`, {
    code: getErrorField(error, 'code'),
    details: getErrorField(error, 'details'),
    hint: getErrorField(error, 'hint'),
    message: getErrorMessage(error),
    status: getStatusCode(error),
    ...context,
  });
}
