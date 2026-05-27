import { useLocalSearchParams } from 'expo-router';

import { PromotionsScreen } from '../../src/features/promotions';

export default function PromotionDetailRoute() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();

  return <PromotionsScreen initialPromotionId={asString(id)} />;
}

function asString(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}
