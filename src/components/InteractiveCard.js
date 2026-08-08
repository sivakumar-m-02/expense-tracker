import React, { useMemo } from "react";
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

  // Building the gesture objects is non-trivial work (Gesture.Tap /
  // Gesture.LongPress / Gesture.Race all allocate handler config), so it's
  // memoized rather than redone on every render/navigation frame — this is
  // the "instant to open" fix for anything wrapped in an InteractiveCard.
  const composed = useMemo(() => {
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

    return Gesture.Race(longPressGesture, tapGesture);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, onPress, onLongPress]);

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

// Memoized so a parent re-render with the same onPress/onLongPress/style
// doesn't force a rebuild of this card's gesture handlers.
export default React.memo(InteractiveCard);
