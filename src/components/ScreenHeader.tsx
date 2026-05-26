import { ReactNode } from 'react';
import { Text, View } from 'react-native';

interface ScreenHeaderProps {
  action?: ReactNode;
  eyebrow?: string;
  subtitle?: string;
  title: string;
}

export default function ScreenHeader({ action, eyebrow, subtitle, title }: ScreenHeaderProps) {
  return (
    <View className="gap-3">
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          {eyebrow ? <Text className="text-xs font-semibold uppercase text-brand-700">{eyebrow}</Text> : null}
          <Text className="text-3xl font-bold leading-10 text-ink">{title}</Text>
        </View>
        {action ? <View className="shrink-0">{action}</View> : null}
      </View>
      {subtitle ? <Text className="text-base leading-6 text-muted">{subtitle}</Text> : null}
    </View>
  );
}
