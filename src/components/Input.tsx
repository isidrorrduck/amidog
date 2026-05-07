import { Text, TextInput, TextInputProps, View } from 'react-native';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="gap-2">
      {label ? <Text className="text-sm font-medium text-slate-200">{label}</Text> : null}
      <TextInput
        className="rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100"
        placeholderTextColor="#64748b"
        {...props}
      />
      {error ? <Text className="text-sm text-red-400">{error}</Text> : null}
    </View>
  );
}
