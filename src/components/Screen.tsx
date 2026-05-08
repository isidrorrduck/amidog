import { ReactNode } from 'react';
import { SafeAreaView, ScrollView, View, ViewProps } from 'react-native';

interface ScreenProps extends ViewProps {
  children: ReactNode;
  scrollable?: boolean;
  contentClassName?: string;
  className?: string;
}

export default function Screen({ children, scrollable = false, className, contentClassName, ...props }: ScreenProps) {
  const content = (
    <View className={`flex-1 gap-5 px-5 py-4 ${contentClassName ?? ''}`} {...props}>
      {children}
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 bg-slate-50 ${className ?? ''}`}>
      {scrollable ? (
        <ScrollView contentContainerClassName={`gap-5 px-5 py-4 ${contentClassName ?? ''}`}>{children}</ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
}
