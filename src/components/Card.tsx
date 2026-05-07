import { View, ViewProps } from 'react-native';

export default function Card({ children, ...props }: ViewProps) {
  return (
    <View className="bg-white rounded-lg shadow-md p-4 mb-4" {...props}>
      {children}
    </View>
  );
}
