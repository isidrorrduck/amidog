import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Platform } from 'react-native';

import { PuppyPhotoError, type PickedPuppyPhoto, type StoredPuppyPhoto } from './types';

export const MAX_PHOTO_DIMENSION = 960;
export const MAX_STORED_PHOTO_BYTES = 600_000;
const PHOTO_DIMENSIONS = [960, 800, 640] as const;
const JPEG_QUALITIES = [0.68, 0.52, 0.4, 0.32] as const;

export async function processPuppyPhoto(photo: PickedPuppyPhoto): Promise<StoredPuppyPhoto> {
  try {
    for (const maxDimension of PHOTO_DIMENSIONS) {
      const context = ImageManipulator.manipulate(photo.uri);

      if (Math.max(photo.width, photo.height) > maxDimension) {
        if (photo.width >= photo.height) context.resize({ width: maxDimension, height: null });
        else context.resize({ height: maxDimension, width: null });
      }

      const rendered = await context.renderAsync();

      for (const quality of JPEG_QUALITIES) {
        const result = await rendered.saveAsync({ base64: true, compress: quality, format: SaveFormat.JPEG });
        if (!result.base64) continue;

        const sizeBytes = getBase64ByteLength(result.base64);

        if (sizeBytes <= MAX_STORED_PHOTO_BYTES) {
          console.info('[puppyPhoto:processing]', {
            stage: 'processing',
            platform: Platform.OS,
            sourceSizeBytes: photo.sizeBytes,
            sourceWidth: photo.width,
            sourceHeight: photo.height,
            outputSizeBytes: sizeBytes,
            outputWidth: result.width,
            outputHeight: result.height,
            base64Length: result.base64.length,
            quality,
          });

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
    }

    throw new PuppyPhotoError('processed-too-large');
  } catch (error) {
    if (error instanceof PuppyPhotoError) throw error;
    throw new PuppyPhotoError('processing-failed', undefined, { cause: error });
  }
}

function getBase64ByteLength(base64: string) {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}
