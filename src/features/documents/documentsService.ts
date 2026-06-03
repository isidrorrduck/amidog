import * as FileSystem from 'expo-file-system/legacy';

import { getSupabaseClient } from '../../lib/supabase';
import type { Database } from '../../types/database';
import type { Document, DocumentFileAsset, DocumentFilters, DocumentMutationInput } from './types';

const DOCUMENTS_BUCKET = 'documents';
const DEFAULT_MIME_TYPE = 'application/octet-stream';

type DocumentInsert = Database['public']['Tables']['documents']['Insert'];
type DocumentReadResult = {
  arrayBuffer: ArrayBuffer;
  method: string;
};

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
  const filePath = buildDocumentStoragePath({
    entityId: input.entity_id,
    entityType: input.entity_type,
    fileName: input.file.name,
    kennelId,
  });
  const uploadContext = {
    bucket: DOCUMENTS_BUCKET,
    documentType: input.document_type,
    entityId: input.entity_id,
    entityType: input.entity_type,
    fileName: input.file.name,
    filePath,
    kennelId,
    mimeType,
    pickerSize: input.file.size ?? 'unknown',
    uriScheme: getUriScheme(input.file.uri),
  };
  let readResult: DocumentReadResult;

  console.info('[documentsService.upload.start] Preparing document upload', uploadContext);

  try {
    await requireSupabaseSession(supabase);
  } catch (error) {
    logDocumentError('auth.session', error, uploadContext);
    throw createDiagnosticError('Autenticación Supabase', getAuthErrorMessage(error), error, uploadContext);
  }

  try {
    readResult = await readFileBody(input.file);
  } catch (error) {
    logDocumentError('readFileBody', error, uploadContext);
    throw createDiagnosticError('Lectura local del archivo', getFileReadErrorMessage(error), error, uploadContext);
  }

  console.info('[documentsService.upload.readFileBody] Document file read', {
    ...uploadContext,
    readMethod: readResult.method,
    readSize: readResult.arrayBuffer.byteLength,
  });

  const storageContext = {
    ...uploadContext,
    readMethod: readResult.method,
    readSize: readResult.arrayBuffer.byteLength,
  };
  let uploadResult: Awaited<ReturnType<ReturnType<typeof supabase.storage.from>['upload']>>;

  try {
    uploadResult = await supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, readResult.arrayBuffer, {
      contentType: mimeType,
      upsert: false,
    });
  } catch (error) {
    logDocumentError('storage.upload', error, storageContext);
    throw createDiagnosticError('Supabase Storage upload', getStorageUploadErrorMessage(error), error, storageContext);
  }

  const { data: uploadData, error: uploadError } = uploadResult;

  if (uploadError) {
    logDocumentError('storage.upload', uploadError, storageContext);
    throw createDiagnosticError('Supabase Storage upload', getStorageUploadErrorMessage(uploadError), uploadError, storageContext);
  }

  console.info('[documentsService.storage.upload] Document uploaded to Storage', {
    ...uploadContext,
    storageId: uploadData?.id ?? 'unknown',
    storagePath: uploadData?.path ?? filePath,
  });

  const payload: DocumentInsert = {
    kennel_id: kennelId,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    title: input.title,
    document_type: input.document_type,
    url: filePath,
    file_path: filePath,
    file_name: input.file.name,
    mime_type: mimeType,
    size_bytes: input.file.size ?? readResult.arrayBuffer.byteLength,
    notes: input.notes,
  };

  const insertContext = {
    ...uploadContext,
    insertSizeBytes: payload.size_bytes,
    readMethod: readResult.method,
    readSize: readResult.arrayBuffer.byteLength,
  };
  let insertResult: Awaited<ReturnType<ReturnType<ReturnType<ReturnType<typeof supabase.from>['insert']>['select']>['single']>>;

  try {
    insertResult = await supabase.from('documents').insert(payload).select().single();
  } catch (error) {
    logDocumentError('documents.insert', error, insertContext);
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]).catch((cleanupError) => {
      logDocumentError('storage.cleanupAfterInsert', cleanupError, insertContext);
    });
    throw createDiagnosticError('Inserción en tabla documents', getDocumentInsertErrorMessage(error), error, insertContext);
  }

  const { data, error } = insertResult;

  if (error) {
    logDocumentError('documents.insert', error, insertContext);
    await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]).catch((cleanupError) => {
      logDocumentError('storage.cleanupAfterInsert', cleanupError, insertContext);
    });
    throw createDiagnosticError('Inserción en tabla documents', getDocumentInsertErrorMessage(error), error, insertContext);
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
    return {
      arrayBuffer: await file.webFile.arrayBuffer(),
      method: 'web File.arrayBuffer',
    };
  }

  if (file.uri.startsWith('data:')) {
    return {
      arrayBuffer: dataUriToArrayBuffer(file.uri),
      method: 'data URI base64',
    };
  }

  try {
    const base64 = await FileSystem.readAsStringAsync(file.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return {
      arrayBuffer: base64ToArrayBuffer(base64),
      method: 'expo-file-system/legacy.readAsStringAsync(base64)',
    };
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

  return base64ToArrayBuffer(uri.slice(markerIndex + marker.length));
}

function base64ToArrayBuffer(base64: string) {
  const cleanBase64 = base64.replace(/\s/g, '');

  if (!cleanBase64) {
    throw new Error('El archivo seleccionado está vacío o no se ha podido leer en base64.');
  }

  const padding = cleanBase64.endsWith('==') ? 2 : cleanBase64.endsWith('=') ? 1 : 0;
  const bytes = new Uint8Array(Math.floor((cleanBase64.length * 3) / 4) - padding);
  let buffer = 0;
  let bits = 0;
  let byteIndex = 0;

  for (const character of cleanBase64) {
    if (character === '=') {
      break;
    }

    const value = getBase64CharacterValue(character);

    if (value < 0) {
      throw new Error(`El archivo contiene base64 no válido cerca de "${character}".`);
    }

    buffer = (buffer << 6) | value;
    bits += 6;

    if (bits >= 8) {
      bits -= 8;
      bytes[byteIndex] = (buffer >> bits) & 0xff;
      byteIndex += 1;
    }
  }

  return bytes.buffer;
}

function getBase64CharacterValue(character: string) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const value = alphabet.indexOf(character);

  if (value >= 0) {
    return value;
  }

  if (character === '-') {
    return 62;
  }

  if (character === '_') {
    return 63;
  }

  return -1;
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

async function requireSupabaseSession(supabase: ReturnType<typeof getSupabaseClient>) {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  if (!data.session) {
    throw new Error('No hay sesión activa de Supabase para aplicar las políticas RLS.');
  }

  return data.session;
}

function createDiagnosticError(
  stage: string,
  summary: string,
  error: unknown,
  context: Record<string, unknown>,
) {
  const lines = [
    summary,
    `Fase: ${stage}`,
    ...formatDiagnosticSection('Contexto', context),
    ...formatDiagnosticSection('Error real', getErrorDiagnostics(error)),
  ];

  return new Error(lines.filter(Boolean).join('\n'));
}

function formatDiagnosticSection(title: string, values: Record<string, unknown>) {
  const entries = Object.entries(values).filter(([, value]) => value !== undefined && value !== null && value !== '');

  if (entries.length === 0) {
    return [];
  }

  return [title, ...entries.map(([key, value]) => `- ${key}: ${formatDiagnosticValue(value)}`)];
}

function formatDiagnosticValue(value: unknown) {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function getErrorDiagnostics(error: unknown) {
  return {
    code: getErrorField(error, 'code'),
    details: getErrorField(error, 'details'),
    hint: getErrorField(error, 'hint'),
    message: getErrorMessage(error),
    status: getStatusCode(error),
    statusCode: getErrorField(error, 'statusCode'),
  };
}

function getAuthErrorMessage(error: unknown) {
  const message = getErrorMessage(error);

  return message
    ? `No se ha podido confirmar la sesión de Supabase antes de subir el documento. Detalle: ${message}`
    : 'No se ha podido confirmar la sesión de Supabase antes de subir el documento.';
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
