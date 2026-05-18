import { ActivityIndicator, Pressable, PressableProps, Text } from 'react-native';

import { tokens } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends PressableProps {
  title: string;
  variant?: ButtonVariant;
  loading?: boolean;
  className?: string;
  textClassName?: string;
}

const buttonClassByVariant: Record<ButtonVariant, string> = {
  primary: 'bg-brand-600 border-brand-600',
  secondary: 'bg-white border-border',
  ghost: 'bg-transparent border-transparent',
};

const textClassByVariant: Record<ButtonVariant, string> = {
  primary: 'text-white',
  secondary: 'text-ink',
  ghost: 'text-brand-700',
};

export default function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled,
  className,
  textClassName,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      disabled={isDisabled}
      className={`min-h-12 items-center justify-center rounded-lg border px-4 ${buttonClassByVariant[variant]} ${
        isDisabled ? 'opacity-60' : ''
      } ${className ?? ''}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? '#ffffff' : tokens.colors.brand[600]} />
      ) : (
        <Text className={`text-center text-base font-semibold ${textClassByVariant[variant]} ${textClassName ?? ''}`}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}
