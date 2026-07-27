import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { PuppyPhotoError, type PuppyPhotoRepository, type StoredPuppyPhoto } from './types';

const STORAGE_PREFIX = 'amidog:owner-photo:v1:';
export const MAX_PERSISTED_PHOTO_VALUE_CHARS = 900_000;

export const localPuppyPhotoRepository: PuppyPhotoRepository = {
  async get(puppyId) {
    try {
      const value = await readStorage(getStorageKey(puppyId));
      if (!value) return null;
      const parsed: unknown = JSON.parse(value);
      return isStoredPuppyPhoto(parsed) ? parsed : null;
    } catch {
      return null;
    }
  },

  async save(puppyId, photo) {
    const value = JSON.stringify(photo);
    const context = {
      sizeBytes: photo.sizeBytes,
      base64Length: getBase64Length(photo.uri),
      valueLength: value.length,
    };

    if (value.length > MAX_PERSISTED_PHOTO_VALUE_CHARS) {
      throw new PuppyPhotoError('storage-too-large', undefined, { diagnostics: context });
    }

    try {
      await writeStorage(getStorageKey(puppyId), value);
      console.info('[puppyPhoto:persistence]', {
        stage: 'persistence',
        platform: Platform.OS,
        ...context,
      });
    } catch (error) {
      const code = isStorageQuotaError(error) ? 'storage-quota' : 'storage-failed';
      throw new PuppyPhotoError(code, undefined, { cause: error, diagnostics: context });
    }
  },
};

function getStorageKey(puppyId: string) {
  return `${STORAGE_PREFIX}${puppyId}`;
}

async function readStorage(key: string) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(key);
  }
  return AsyncStorage.getItem(key);
}

async function writeStorage(key: string, value: string) {
  if (Platform.OS === 'web') {
    if (typeof window === 'undefined') throw new Error('Storage is unavailable during static rendering.');
    window.localStorage.setItem(key, value);
    return;
  }
  await AsyncStorage.setItem(key, value);
}

function isStoredPuppyPhoto(value: unknown): value is StoredPuppyPhoto {
  if (!value || typeof value !== 'object') return false;
  const photo = value as Partial<StoredPuppyPhoto>;
  return photo.mimeType === 'image/jpeg'
    && typeof photo.uri === 'string'
    && photo.uri.startsWith('data:image/jpeg;base64,')
    && typeof photo.width === 'number'
    && typeof photo.height === 'number'
    && typeof photo.sizeBytes === 'number'
    && typeof photo.updatedAt === 'string';
}

function getBase64Length(uri: string) {
  const marker = ';base64,';
  const markerIndex = uri.indexOf(marker);
  return markerIndex >= 0 ? uri.length - markerIndex - marker.length : 0;
}

function isStorageQuotaError(error: unknown) {
  const value = error as { code?: unknown; message?: unknown; name?: unknown } | null;
  const name = typeof value?.name === 'string' ? value.name.toLowerCase() : '';
  const message = typeof value?.message === 'string' ? value.message.toLowerCase() : '';
  const code = value?.code;

  return name.includes('quota')
    || code === 22
    || code === 1014
    || message.includes('quota')
    || message.includes('storage is full')
    || message.includes('database or disk is full')
    || message.includes('sqlite_full')
    || message.includes('not enough space');
}
