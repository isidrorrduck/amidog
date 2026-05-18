import { ActivityIndicator, Text, View } from 'react-native';

import { tokens } from '../theme';
import AppCard from './AppCard';

interface LoadingStateProps {
  className?: string;
  message?: string;
  title?: string;
}

export default function LoadingState({ className, message, title = 'Loading' }: LoadingStateProps) {
  return (
    <AppCard className={className}>
      <View className="flex-row items-center gap-3">
        <ActivityIndicator color={tokens.colors.brand[600]} />
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-ink">{title}</Text>
          {message ? <Text className="text-sm leading-5 text-muted">{message}</Text> : null}
        </View>
      </View>
    </AppCard>
  );
}
