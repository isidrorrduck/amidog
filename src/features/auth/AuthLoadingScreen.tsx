import { ActivityIndicator, Text, View } from 'react-native';

import { AppScreen } from '../../components';

export function AuthLoadingScreen() {
  return (
    <AppScreen contentClassName="items-center justify-center">
      <View className="items-center gap-3">
        <ActivityIndicator color="#1d4ed8" />
        <Text className="text-sm font-medium text-slate-600">Preparando tu espacio de trabajo...</Text>
      </View>
    </AppScreen>
  );
}
