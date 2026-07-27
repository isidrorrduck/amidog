import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

import { localPuppyPhotoRepository } from './localPuppyPhotoRepository';
import { pickPuppyPhoto, releasePickedPuppyPhoto } from './photoPickerService';
import { processPuppyPhoto } from './photoProcessor';
import {
  getPuppyPhotoErrorMessage,
  logPuppyPhotoError,
  type PickedPuppyPhoto,
  type PuppyPhotoPhase,
  type PuppyPhotoRepository,
  type PuppyPhotoSource,
  type PuppyPhotoStage,
  type StoredPuppyPhoto,
} from './types';

export function usePuppyPhoto({
  initialUri,
  puppyId,
  repository = localPuppyPhotoRepository,
}: {
  initialUri?: string | null;
  puppyId: string;
  repository?: PuppyPhotoRepository;
}) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<PuppyPhotoPhase>('loading');
  const [photoUri, setPhotoUri] = useState<string | null>(initialUri ?? null);
  const operationInProgressRef = useRef(false);

  useEffect(() => {
    let active = true;
    setPhase('loading');
    setPhotoUri(initialUri ?? null);

    repository.get(puppyId).then((photo) => {
      if (active && photo) setPhotoUri(photo.uri);
    }).finally(() => {
      if (active) setPhase('idle');
    });

    return () => { active = false; };
  }, [initialUri, puppyId, repository]);

  const choosePhoto = useCallback(async (source: PuppyPhotoSource) => {
    if (operationInProgressRef.current) return false;
    operationInProgressRef.current = true;
    setErrorMessage(null);
    setPhase(source === 'camera' && Platform.OS !== 'web' ? 'permission' : 'picking');
    let stage: PuppyPhotoStage = 'selection';
    let pickedPhoto: PickedPuppyPhoto | null = null;
    let processedPhoto: StoredPuppyPhoto | null = null;
    const previousPhotoUri = photoUri;

    try {
      pickedPhoto = await pickPuppyPhoto(source);
      if (!pickedPhoto) {
        setPhase('idle');
        return false;
      }

      stage = 'processing';
      setPhase('processing');
      processedPhoto = await processPuppyPhoto(pickedPhoto);
      setPhotoUri(processedPhoto.uri);
      stage = 'persistence';
      setPhase('saving');
      await repository.save(puppyId, processedPhoto);

      setPhase('idle');
      return true;
    } catch (error) {
      if (processedPhoto) setPhotoUri(previousPhotoUri);
      logPuppyPhotoError(stage, Platform.OS, error, {
        source,
        originalSizeBytes: pickedPhoto?.sizeBytes ?? null,
      });
      setErrorMessage(getPuppyPhotoErrorMessage(error));
      setPhase('idle');
      return false;
    } finally {
      if (pickedPhoto) releasePickedPuppyPhoto(pickedPhoto);
      operationInProgressRef.current = false;
    }
  }, [photoUri, puppyId, repository]);

  return {
    choosePhoto,
    clearError: () => setErrorMessage(null),
    errorMessage,
    isBusy: phase !== 'idle',
    phase,
    photoUri,
  };
}
