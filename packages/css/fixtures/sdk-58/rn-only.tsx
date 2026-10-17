import { Animated, Text, View } from "react-native";
export function NativeOnly() {
  return (
    <View>
      <Text>RN-only declaration control</Text>
      <Animated.View style={{ opacity: 1 }} />
    </View>
  );
}
