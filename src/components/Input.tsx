import { TextInput, TextInputProps } from 'react-native';

export default function Input(props: TextInputProps) {
  return (
    <TextInput
      className="border border-gray-300 rounded-md px-4 py-2"
      placeholderTextColor="#666"
      {...props}
    />
  );
}
