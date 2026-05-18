import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, AppCard, Input, AppScreen } from '../../components';
import { useAuth } from '../auth/AuthProvider';
import { useKennels } from './KennelProvider';
import { normalizeKennelName } from './kennelService';

export function NoKennelOnboarding() {
  const { signOut, user } = useAuth();
  const { createKennel, isKennelMutating, kennelError } = useKennels();
  const [kennelName, setKennelName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const handleCreateKennel = async () => {
    const normalizedName = normalizeKennelName(kennelName, user?.email);

    setFormError(null);

    try {
      await createKennel(normalizedName);
    } catch (error) {
      setFormError(getErrorMessage(error));
    }
  };

  return (
    <AppScreen contentClassName="justify-center">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Crea tu criadero</Text>
        <Text className="text-base leading-6 text-slate-600">
          Tu cuenta necesita un criadero activo antes de usar Amidog.
        </Text>
      </View>

      <AppCard>
        <View className="gap-4">
          <Input
            label="Nombre del criadero"
            placeholder="Criadero Valle del Roble"
            value={kennelName}
            onChangeText={setKennelName}
          />
          {kennelError ? <Text className="text-sm leading-5 text-red-600">{kennelError}</Text> : null}
          {formError ? <Text className="text-sm leading-5 text-red-600">{formError}</Text> : null}
          <Button title="Crear criadero" loading={isKennelMutating} onPress={handleCreateKennel} />
          <Button title="Cerrar sesión" variant="secondary" onPress={signOut} />
        </View>
      </AppCard>
    </AppScreen>
  );
}

function getErrorMessage(_error: unknown) {
  return 'No se ha podido crear el criadero. Inténtalo de nuevo.';
}
