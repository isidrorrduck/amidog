import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { PuppyPhotoError, type PickedPuppyPhoto, type StoredPuppyPhoto } from './types';

export const MAX_PHOTO_DIMENSION = 1280;
export const MAX_STORED_PHOTO_BYTES = 1_200_000;
const JPEG_QUALITIES = [0.72, 0.56, 0.42] as const;

export async function processPuppyPhoto(photo: PickedPuppyPhoto): Promise<StoredPuppyPhoto> {
  try {
    const context = ImageManipulator.manipulate(photo.uri);

    if (Math.max(photo.width, photo.height) > MAX_PHOTO_DIMENSION) {
      if (photo.width >= photo.height) context.resize({ width: MAX_PHOTO_DIMENSION, height: null });
      else context.resize({ height: MAX_PHOTO_DIMENSION, width: null });
    }

    const rendered = await context.renderAsync();

    for (const quality of JPEG_QUALITIES) {
      const result = await rendered.saveAsync({ base64: true, compress: quality, format: SaveFormat.JPEG });
      if (!result.base64) continue;

      const sizeBytes = getBase64ByteLength(result.base64);

      if (sizeBytes <= MAX_STORED_PHOTO_BYTES) {
        return {
          height: result.height,
          mimeType: 'image/jpeg',
          sizeBytes,
          updatedAt: new Date().toISOString(),
          uri: `data:image/jpeg;base64,${result.base64}`,
          width: result.width,
        };
      }
    }

    throw new PuppyPhotoError('processed-too-large');
  } catch (error) {
    if (error instanceof PuppyPhotoError) throw error;
    throw new PuppyPhotoError('processing-failed');
  }
}

function getBase64ByteLength(base64: string) {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}
