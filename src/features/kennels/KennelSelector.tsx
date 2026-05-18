import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Button, AppCard, Input } from '../../components';
import { useAuth } from '../auth/AuthProvider';
import { useKennels } from './KennelProvider';
import { normalizeKennelName } from './kennelService';

interface KennelSelectorProps {
  allowCreate?: boolean;
}

export function KennelSelector({ allowCreate = false }: KennelSelectorProps) {
  const { user } = useAuth();
  const {
    availableKennels,
    createKennel,
    currentKennel,
    isKennelMutating,
    kennelError,
    switchKennel,
  } = useKennels();
  const [kennelName, setKennelName] = useState('');
  const [selectorError, setSelectorError] = useState<string | null>(null);

  const handleSwitchKennel = async (kennelId: string) => {
    setSelectorError(null);

    try {
      await switchKennel(kennelId);
    } catch (error) {
      setSelectorError(getErrorMessage(error));
    }
  };

  const handleCreateKennel = async () => {
    setSelectorError(null);

    try {
      await createKennel(normalizeKennelName(kennelName, user?.email));
      setKennelName('');
    } catch (error) {
      setSelectorError(getErrorMessage(error));
    }
  };

  return (
    <AppCard title="Kennels">
      <View className="gap-3">
        {availableKennels.map((workspace) => {
          const isActive = workspace.kennel.id === currentKennel?.id;

          return (
            <Pressable
              accessibilityRole="button"
              disabled={isActive}
              key={workspace.kennel.id}
              onPress={() => void handleSwitchKennel(workspace.kennel.id)}
              className={`rounded-lg border px-4 py-3 ${
                isActive ? 'border-brand-600 bg-brand-50' : 'border-slate-200 bg-white'
              }`}
            >
              <View className="flex-row items-center justify-between gap-3">
                <View className="min-w-0 flex-1 gap-1">
                  <Text className="text-base font-semibold text-slate-950">{workspace.kennel.name}</Text>
                  <Text className="text-sm capitalize text-slate-500">{workspace.role}</Text>
                </View>
                <Text className={`text-sm font-semibold ${isActive ? 'text-brand-700' : 'text-slate-500'}`}>
                  {isActive ? 'Active' : 'Switch'}
                </Text>
              </View>
            </Pressable>
          );
        })}

        {allowCreate ? (
          <View className="gap-3 border-t border-slate-200 pt-3">
            <Input
              label="New kennel"
              placeholder="Second kennel"
              value={kennelName}
              onChangeText={setKennelName}
            />
            <Button title="Create kennel" loading={isKennelMutating} onPress={handleCreateKennel} />
          </View>
        ) : null}

        {kennelError ? <Text className="text-sm leading-5 text-red-600">{kennelError}</Text> : null}
        {selectorError ? <Text className="text-sm leading-5 text-red-600">{selectorError}</Text> : null}
      </View>
    </AppCard>
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to update kennel selection.';
}
