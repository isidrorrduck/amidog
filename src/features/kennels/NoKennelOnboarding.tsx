import { useState } from 'react';
import { Text, View } from 'react-native';

import { Button, Card, Input, Screen } from '../../components';
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
    <Screen contentClassName="justify-center">
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Create your kennel</Text>
        <Text className="text-base leading-6 text-slate-600">
          Your account needs an active kennel before you can use Amidog.
        </Text>
      </View>

      <Card>
        <View className="gap-4">
          <Input
            label="Kennel name"
            placeholder="Oak Valley Kennels"
            value={kennelName}
            onChangeText={setKennelName}
          />
          {kennelError ? <Text className="text-sm leading-5 text-red-600">{kennelError}</Text> : null}
          {formError ? <Text className="text-sm leading-5 text-red-600">{formError}</Text> : null}
          <Button title="Create kennel" loading={isKennelMutating} onPress={handleCreateKennel} />
          <Button title="Log out" variant="secondary" onPress={signOut} />
        </View>
      </Card>
    </Screen>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to create the kennel. Please try again.';
}
