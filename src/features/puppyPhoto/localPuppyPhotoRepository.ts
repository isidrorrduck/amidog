import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import { PuppyPhotoError, type PuppyPhotoRepository, type StoredPuppyPhoto } from './types';

const STORAGE_PREFIX = 'amidog:owner-photo:v1:';

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
    try {
      await writeStorage(getStorageKey(puppyId), JSON.stringify(photo));
    } catch {
      throw new PuppyPhotoError('storage-failed');
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
