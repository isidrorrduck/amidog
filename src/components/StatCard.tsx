import { ActivityIndicator, Text, View } from 'react-native';

import { tokens } from '../theme';

type StatTone = 'brand' | 'neutral' | 'accent';

interface StatCardProps {
  helper?: string;
  label: string;
  loading?: boolean;
  tone?: StatTone;
  value: number | string;
}

const toneClassByName: Record<StatTone, string> = {
  accent: 'border-accent-500 bg-accent-50',
  brand: 'border-brand-500 bg-brand-50',
  neutral: 'border-border bg-white',
};

const valueClassByName: Record<StatTone, string> = {
  accent: 'text-accent-600',
  brand: 'text-brand-700',
  neutral: 'text-ink',
};

export default function StatCard({ helper, label, loading = false, tone = 'neutral', value }: StatCardProps) {
  return (
    <View className={`min-h-28 flex-1 rounded-lg border p-4 ${toneClassByName[tone]}`}>
      <Text className="text-sm font-semibold text-muted">{label}</Text>
      <View className="mt-3 min-h-9 justify-center">
        {loading ? (
          <ActivityIndicator color={tokens.colors.brand[600]} />
        ) : (
          <Text className={`text-3xl font-bold ${valueClassByName[tone]}`}>{value}</Text>
        )}
      </View>
      {helper ? <Text className="mt-2 text-xs leading-4 text-muted">{helper}</Text> : null}
    </View>
  );
}
