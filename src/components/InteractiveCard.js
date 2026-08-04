import React from "react";
import { StyleSheet } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const SPRING_CONFIG = {
  damping: 14,
  stiffness: 220,
  mass: 0.45,
};

const InteractiveCard = ({
  children,
  style,
  onPress,
  onLongPress,
  enabled = true,
  pressScale = 0.97,
}) => {
  const progress = useSharedValue(0);

  const tapGesture = Gesture.Tap()
    .enabled(enabled)
    .onBegin(() => {
      progress.value = withSpring(1, SPRING_CONFIG);
    })
    .onFinalize((_event, success) => {
      progress.value = withSpring(0, SPRING_CONFIG);
      if (success && onPress) {
        runOnJS(onPress)();
      }
    });

  const longPressGesture = Gesture.LongPress()
    .enabled(enabled)
    .minDuration(380)
    .onFinalize((_event, success) => {
      if (success && onLongPress) {
        runOnJS(onLongPress)();
      }
    });

  const composed = Gesture.Race(longPressGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => {
    const scale = 1 - progress.value * (1 - pressScale);
    const translateY = -2 * progress.value;

    return {
      transform: [{ perspective: 900 }, { scale }, { translateY }],
    };
  });

  if (!enabled) {
    return <Animated.View style={[styles.base, style]}>{children}</Animated.View>;
  }

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={[styles.base, style, animatedStyle]}>{children}</Animated.View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  base: {},
});

export default InteractiveCard;
