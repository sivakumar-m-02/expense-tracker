import React, { useEffect } from "react";
import { StyleSheet, Text } from "react-native";
import LottieView from "lottie-react-native";
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const LottieLoader = ({
  title = "Loading",
  subtitle = "",
  color = "#37474F",
  size = 132,
}) => {
  const subtitleOpacity = useSharedValue(0.55);

  useEffect(() => {
    subtitleOpacity.value = withRepeat(
      withTiming(1, {
        duration: 900,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );
  }, [subtitleOpacity]);

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.wrapper}>
      <LottieView
        source={require("../assets/lottie/finance-loader.json")}
        autoPlay
        loop
        style={{ width: size, height: size }}
      />
      <Text style={[styles.title, { color }]}>{title}</Text>
      {!!subtitle && (
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Animated.Text>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  title: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    fontSize: 12,
    color: "#808080",
    textAlign: "center",
    maxWidth: 240,
  },
});

export default LottieLoader;
