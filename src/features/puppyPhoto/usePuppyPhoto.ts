import { useCallback, useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { localPuppyPhotoRepository } from './localPuppyPhotoRepository';
import { pickPuppyPhoto, releasePickedPuppyPhoto } from './photoPickerService';
import { processPuppyPhoto } from './photoProcessor';
import {
  getPuppyPhotoErrorMessage,
  type PuppyPhotoPhase,
  type PuppyPhotoRepository,
  type PuppyPhotoSource,
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
    setErrorMessage(null);
    setPhase(source === 'camera' && Platform.OS !== 'web' ? 'permission' : 'picking');
    let pickedPhoto = null;

    try {
      pickedPhoto = await pickPuppyPhoto(source);
      if (!pickedPhoto) {
        setPhase('idle');
        return false;
      }

      setPhase('processing');
      const processedPhoto = await processPuppyPhoto(pickedPhoto);
      setPhotoUri(processedPhoto.uri);
      setPhase('saving');

      try {
        await repository.save(puppyId, processedPhoto);
      } catch (error) {
        setErrorMessage(getPuppyPhotoErrorMessage(error));
        setPhase('idle');
        return false;
      }

      setPhase('idle');
      return true;
    } catch (error) {
      setErrorMessage(getPuppyPhotoErrorMessage(error));
      setPhase('idle');
      return false;
    } finally {
      if (pickedPhoto) releasePickedPuppyPhoto(pickedPhoto);
    }
  }, [puppyId, repository]);

  return {
    choosePhoto,
    clearError: () => setErrorMessage(null),
    errorMessage,
    isBusy: phase !== 'idle',
    phase,
    photoUri,
  };
}
