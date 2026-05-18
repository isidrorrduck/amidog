import { ReactNode } from 'react';
import { Text, View, ViewProps } from 'react-native';

import { tokens } from '../theme';

export interface AppCardProps extends ViewProps {
  children?: ReactNode;
  className?: string;
  contentClassName?: string;
  footer?: ReactNode;
  subtitle?: string;
  title?: string;
}

export default function AppCard({
  children,
  className,
  contentClassName,
  footer,
  style,
  subtitle,
  title,
  ...props
}: AppCardProps) {
  return (
    <View
      className={`rounded-lg border border-border bg-white p-4 ${className ?? ''}`}
      style={[tokens.shadows.card, style]}
      {...props}
    >
      {title || subtitle ? (
        <View className="mb-3 gap-1">
          {title ? <Text className="text-lg font-semibold text-ink">{title}</Text> : null}
          {subtitle ? <Text className="text-sm leading-5 text-muted">{subtitle}</Text> : null}
        </View>
      ) : null}
      <View className={contentClassName}>{children}</View>
      {footer ? <View className="mt-4">{footer}</View> : null}
    </View>
  );
}
