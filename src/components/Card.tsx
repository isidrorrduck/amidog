import { ReactNode } from 'react';
import { Text, View, ViewProps } from 'react-native';

interface CardProps extends ViewProps {
  title?: string;
  children: ReactNode;
  className?: string;
}

export default function Card({ title, children, className, ...props }: CardProps) {
  return (
    <View className={`rounded-lg border border-slate-200 bg-white p-4 shadow-sm ${className ?? ''}`} {...props}>
      {title ? <Text className="mb-3 text-lg font-semibold text-slate-950">{title}</Text> : null}
      {children}
    </View>
  );
}
