import { Text, TextInput, TextInputProps, View } from 'react-native';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  className?: string;
  containerClassName?: string;
}

export default function Input({ label, error, className, containerClassName, ...props }: InputProps) {
  return (
    <View className={`gap-2 ${containerClassName ?? ''}`}>
      {label ? <Text className="text-sm font-semibold text-slate-700">{label}</Text> : null}
      <TextInput
        className={`min-h-12 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-950 ${
          error ? 'border-red-500' : ''
        } ${className ?? ''}`}
        placeholderTextColor="#94a3b8"
        {...props}
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
