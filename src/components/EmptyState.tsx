import { Text, View } from 'react-native';

import AppCard from './AppCard';
import Button from './Button';

interface EmptyStateProps {
  actionLabel?: string;
  className?: string;
  message: string;
  title: string;
  onAction?: () => void;
}

export default function EmptyState({ actionLabel, className, message, onAction, title }: EmptyStateProps) {
  return (
    <AppCard className={className}>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="text-lg font-semibold text-ink">{title}</Text>
          <Text className="text-sm leading-5 text-muted">{message}</Text>
        </View>
        {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} /> : null}
      </View>
    </AppCard>
  );
}
