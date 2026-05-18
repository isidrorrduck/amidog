import { Pressable, PressableProps, Text, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';

import { tokens } from '../theme';

interface QuickActionCardProps extends Omit<PressableProps, 'style'> {
  body: string;
  className?: string;
  label?: string;
  style?: StyleProp<ViewStyle>;
  title: string;
}

export default function QuickActionCard({
  body,
  className,
  disabled,
  label,
  title,
  style,
  ...props
}: QuickActionCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      className={`min-h-32 flex-1 rounded-lg border border-border bg-white p-4 ${disabled ? 'opacity-60' : ''} ${
        className ?? ''
      }`}
      style={({ pressed }) => [tokens.shadows.card, pressed ? { transform: [{ scale: 0.99 }] } : null, style]}
      {...props}
    >
      <View className="gap-3">
        {label ? (
          <View className="h-9 w-9 items-center justify-center rounded-full bg-brand-50">
            <Text className="text-sm font-bold text-brand-700">{label}</Text>
          </View>
        ) : null}
        <View className="gap-1">
          <Text className="text-base font-semibold text-ink">{title}</Text>
          <Text className="text-sm leading-5 text-muted">{body}</Text>
        </View>
      </View>
    </Pressable>
  );
}
