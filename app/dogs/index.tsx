import { Text, View } from 'react-native';

import { Card, Screen } from '../../src/components';

export default function DogsScreen() {
  return (
    <Screen>
      <View className="gap-2">
        <Text className="text-3xl font-bold text-slate-950">Dogs</Text>
        <Text className="text-base leading-6 text-slate-600">
          A stable route for the dog registry.
        </Text>
      </View>
      <Card title="Foundation">
        <Text className="text-sm leading-5 text-slate-600">
          Dog profiles, ownership and documents can be layered on top of this screen.
        </Text>
      </Card>
    </Screen>
  );
}
