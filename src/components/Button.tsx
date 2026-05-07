import { Pressable, Text } from 'react-native';

interface ButtonProps {
  title: string;
  onPress?: () => void;
}

export default function Button({ title, onPress }: ButtonProps) {
  return (
    <Pressable onPress={onPress} className="px-4 py-2 bg-blue-600 rounded-md">
      <Text className="text-white font-semibold text-center">{title}</Text>
    </Pressable>
  );
}
