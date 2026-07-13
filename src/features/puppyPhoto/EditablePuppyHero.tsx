import { useState, type ReactNode } from 'react';

import { PuppyPhotoControl } from './PuppyPhotoControl';
import { usePuppyPhoto } from './usePuppyPhoto';

export function EditablePuppyHero({
  children,
  initialUri,
  petName,
  puppyId,
}: {
  children: (photoUri: string | null, controls: ReactNode) => ReactNode;
  initialUri?: string | null;
  petName: string;
  puppyId: string;
}) {
  const [visible, setVisible] = useState(false);
  const photo = usePuppyPhoto({ initialUri, puppyId });

  const controls = (
    <PuppyPhotoControl
      errorMessage={photo.errorMessage}
      hasPhoto={Boolean(photo.photoUri)}
      onChoose={(source) => {
        void photo.choosePhoto(source).then((changed) => {
          if (changed) setVisible(false);
        });
      }}
      onClose={() => {
        if (!photo.isBusy) setVisible(false);
      }}
      onOpen={() => {
        photo.clearError();
        setVisible(true);
      }}
      petName={petName}
      phase={photo.phase}
      visible={visible}
    />
  );

  return children(photo.photoUri, controls);
}
