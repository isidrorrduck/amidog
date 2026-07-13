import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';

import { PuppyPhotoError, type PickedPuppyPhoto, type PuppyPhotoSource } from './types';

export const MAX_ORIGINAL_PHOTO_BYTES = 15 * 1024 * 1024;
export const SUPPORTED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export async function pickPuppyPhoto(source: PuppyPhotoSource): Promise<PickedPuppyPhoto | null> {
  try {
    if (source === 'camera' && Platform.OS !== 'web') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        throw new PuppyPhotoError('camera-permission');
      }
    }

    const options: ImagePicker.ImagePickerOptions = {
      allowsEditing: false,
      allowsMultipleSelection: false,
      base64: false,
      exif: false,
      mediaTypes: ['images'],
      quality: 1,
    };
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ ...options, cameraType: ImagePicker.CameraType.back })
      : await ImagePicker.launchImageLibraryAsync(options);

    if (result.canceled || !result.assets[0]) return null;

    return validatePickedPhoto(result.assets[0]);
  } catch (error) {
    if (error instanceof PuppyPhotoError) throw error;
    if (source === 'camera') throw new PuppyPhotoError('camera-unavailable');
    throw new PuppyPhotoError('picker-failed');
  }
}

export function validatePickedPhoto(asset: ImagePicker.ImagePickerAsset): PickedPuppyPhoto {
  if (asset.type && asset.type !== 'image') {
    throw new PuppyPhotoError('invalid-format');
  }

  const fileName = asset.fileName ?? getFileNameFromUri(asset.uri);
  const mimeType = normalizeMimeType(asset.mimeType ?? asset.file?.type, fileName);

  if (!SUPPORTED_PHOTO_MIME_TYPES.includes(mimeType as (typeof SUPPORTED_PHOTO_MIME_TYPES)[number])) {
    throw new PuppyPhotoError('invalid-format');
  }

  const sizeBytes = asset.fileSize ?? asset.file?.size ?? null;

  if (sizeBytes !== null && sizeBytes > MAX_ORIGINAL_PHOTO_BYTES) {
    throw new PuppyPhotoError('original-too-large');
  }

  if (!asset.uri || asset.width <= 0 || asset.height <= 0) {
    throw new PuppyPhotoError('invalid-image');
  }

  return {
    fileName,
    height: asset.height,
    mimeType,
    sizeBytes,
    uri: asset.uri,
    width: asset.width,
  };
}

export function releasePickedPuppyPhoto(photo: PickedPuppyPhoto) {
  if (Platform.OS === 'web' && photo.uri.startsWith('blob:') && typeof URL !== 'undefined') {
    URL.revokeObjectURL(photo.uri);
  }
}

function normalizeMimeType(mimeType: string | null | undefined, fileName: string | null) {
  const normalized = mimeType?.toLowerCase().split(';')[0]?.trim();
  if (normalized === 'image/jpg') return 'image/jpeg';
  if (normalized) return normalized;

  const extension = fileName?.split('.').pop()?.toLowerCase();
  if (extension === 'jpg' || extension === 'jpeg') return 'image/jpeg';
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  return '';
}

function getFileNameFromUri(uri: string) {
  const value = uri.split('?')[0]?.split('/').pop();
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
