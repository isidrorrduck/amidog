import { Pressable, Text } from 'react-native';

type ButtonProps = {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
};

export function Button({ title, onPress, variant = 'primary' }: ButtonProps) {
  const className =
    variant === 'primary'
      ? 'rounded-xl bg-emerald-500 px-4 py-3'
      : 'rounded-xl border border-slate-700 px-4 py-3';

  const textClassName =
    variant === 'primary'
      ? 'text-center font-semibold text-slate-950'
      : 'text-center font-semibold text-slate-100';

  return (
    <Pressable className={className} onPress={onPress}>
      <Text className={textClassName}>{title}</Text>
    </Pressable>
  );
}
