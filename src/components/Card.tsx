import { ReactNode } from 'react';
import { View } from 'react-native';

type CardProps = {
  children: ReactNode;
};

export function Card({ children }: CardProps) {
  return <View className="rounded-2xl border border-slate-800 bg-slate-900 p-5">{children}</View>;
}
