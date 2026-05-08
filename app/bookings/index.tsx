import { View, Text } from 'react-native';

import { Card, Screen } from '../../src/components';

export default function BookingsScreen() {
  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Bookings</Text>
        <Text className="text-base leading-6 text-slate-600">
          A stable route for reservations and client requests.
        </Text>
      </View>
      <Card title="Foundation">
        <Text className="text-sm leading-5 text-slate-600">
          Reservation flows can connect here once clients and litters are implemented.
        </Text>
      </Card>
    </Screen>
  );
}
