export type PuppyPhotoSource = 'camera' | 'library';

export type PuppyPhotoPhase = 'idle' | 'loading' | 'permission' | 'picking' | 'processing' | 'saving';

export type PuppyPhotoErrorCode =
  | 'camera-permission'
  | 'camera-unavailable'
  | 'invalid-format'
  | 'invalid-image'
  | 'original-too-large'
  | 'processed-too-large'
  | 'processing-failed'
  | 'picker-failed'
  | 'storage-failed'
  | 'storage-quota'
  | 'storage-too-large';

export type PuppyPhotoStage = 'selection' | 'processing' | 'persistence';

export interface PickedPuppyPhoto {
  fileName: string | null;
  height: number;
  mimeType: string;
  sizeBytes: number | null;
  uri: string;
  width: number;
}

export interface StoredPuppyPhoto {
  height: number;
  mimeType: 'image/jpeg';
  sizeBytes: number;
  updatedAt: string;
  uri: string;
  width: number;
}

export interface PuppyPhotoRepository {
  get(puppyId: string): Promise<StoredPuppyPhoto | null>;
  save(puppyId: string, photo: StoredPuppyPhoto): Promise<void>;
}

interface PuppyPhotoErrorOptions extends ErrorOptions {
  diagnostics?: Record<string, unknown>;
}

export class PuppyPhotoError extends Error {
  readonly diagnostics?: Record<string, unknown>;

  constructor(public readonly code: PuppyPhotoErrorCode, message?: string, options?: PuppyPhotoErrorOptions) {
    super(message ?? code);
    this.name = 'PuppyPhotoError';
    this.diagnostics = options?.diagnostics;
    if (options?.cause !== undefined) this.cause = options.cause;
  }
}

export function logPuppyPhotoError(
  stage: PuppyPhotoStage,
  platform: string,
  error: unknown,
  context: Record<string, unknown> = {},
) {
  const diagnostics = error instanceof PuppyPhotoError ? error.diagnostics : undefined;

  console.error(`[puppyPhoto:${stage}]`, {
    stage,
    platform,
    ...context,
    ...diagnostics,
    error: getErrorDetails(error),
  });
}

export function getPuppyPhotoErrorMessage(error: unknown) {
  const code = error instanceof PuppyPhotoError ? error.code : 'picker-failed';
  const messages: Record<PuppyPhotoErrorCode, string> = {
    'camera-permission': 'Necesitamos permiso para usar la cámara. Puedes permitirlo en los ajustes del dispositivo.',
    'camera-unavailable': 'La cámara no está disponible ahora. Prueba a elegir una foto de la galería.',
    'invalid-format': 'Esta imagen no es compatible. Elige una foto JPG, PNG o WebP.',
    'invalid-image': 'No hemos podido leer esta imagen. Prueba con otra fotografía.',
    'original-too-large': 'La foto es demasiado grande. Elige una imagen de menos de 15 MB.',
    'processed-too-large': 'No hemos podido reducir suficientemente la foto. Prueba con una imagen más pequeña.',
    'processing-failed': 'No hemos podido preparar la foto. Prueba con otra imagen.',
    'picker-failed': 'No hemos podido abrir tus fotos. Inténtalo de nuevo.',
    'storage-failed': 'No hemos podido guardar la foto en este dispositivo. Inténtalo de nuevo.',
    'storage-quota': 'No queda espacio suficiente en este dispositivo para guardar la foto. Libera espacio e inténtalo de nuevo.',
    'storage-too-large': 'La foto sigue siendo demasiado grande para guardarla en este dispositivo.',
  };

  return messages[code];
}

function getErrorDetails(error: unknown): Record<string, unknown> {
  const details = describeError(error);
  const cause = error instanceof Error ? error.cause : undefined;
  return cause === undefined ? details : { ...details, cause: describeError(cause) };
}

function describeError(error: unknown) {
  const value = error && typeof error === 'object'
    ? error as { constructor?: { name?: string }; message?: unknown; name?: unknown }
    : null;
  const type = typeof value?.name === 'string'
    ? value.name
    : value?.constructor?.name ?? typeof error;
  const message = typeof value?.message === 'string' ? value.message : String(error);
  return { type, message: sanitizeErrorMessage(message) };
}

function sanitizeErrorMessage(message: string) {
  return message
    .replace(/data:[^\s"'<>]+/gi, '[data-uri]')
    .replace(/\b(?:file|content|blob):[^\s"'<>]+/gi, '[local-uri]')
    .replace(/\b[A-Z]:\\[^\r\n"'<>]*/gi, '[local-path]')
    .replace(/\\\\[^\\\s]+\\[^\r\n"'<>]*/g, '[local-path]')
    .replace(/\/(?:Users|home|data|storage|private|var|tmp|cache|sdcard|mnt|DCIM)\/[^\r\n"'<>]*/gi, '[local-path]')
    .slice(0, 500);
}
