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
  | 'storage-failed';

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

export class PuppyPhotoError extends Error {
  constructor(public readonly code: PuppyPhotoErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'PuppyPhotoError';
  }
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
    'storage-failed': 'La foto se verá ahora, pero no se ha podido guardar en este dispositivo.',
  };

  return messages[code];
}
