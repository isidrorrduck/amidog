import { ReactNode } from 'react';
import { SafeAreaView, ScrollView, View, ViewProps } from 'react-native';

export interface AppScreenProps extends ViewProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  scrollable?: boolean;
}

export default function AppScreen({
  children,
  className,
  contentClassName,
  scrollable = false,
  ...props
}: AppScreenProps) {
  if (scrollable) {
    return (
      <SafeAreaView className={`flex-1 bg-background ${className ?? ''}`}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerClassName={`gap-5 px-5 pb-8 pt-4 ${contentClassName ?? ''}`}
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className={`flex-1 bg-background ${className ?? ''}`}>
      <View className={`flex-1 gap-5 px-5 py-4 ${contentClassName ?? ''}`} {...props}>
        {children}
      </View>
    </SafeAreaView>
  );
}
