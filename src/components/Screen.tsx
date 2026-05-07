import { SafeAreaView, ViewProps } from 'react-native';
import { ReactNode } from 'react';

interface ScreenProps extends ViewProps {
  children: ReactNode;
}

export default function Screen({ children, ...props }: ScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-white" {...props}>
      {children}
    </SafeAreaView>
  );
}
