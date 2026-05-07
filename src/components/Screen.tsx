import { ReactNode } from 'react';
import { SafeAreaView, ScrollView, View } from 'react-native';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
};

export function Screen({ children, scroll = false }: ScreenProps) {
  if (scroll) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <ScrollView contentContainerClassName="flex-grow p-6">
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-950">
      <View className="flex-1 p-6">{children}</View>
    </SafeAreaView>
  );
}
