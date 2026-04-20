import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import LottieView from "lottie-react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import InteractiveCard from "./InteractiveCard";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);
const RUPEE = "\u20B9";

const BudgetProgress = ({ spent, budget }) => {
  const spentValue = Number(spent) || 0;
  const budgetValue = Number(budget) || 0;
  const hasValidBudget = budgetValue > 0;
  const safeBudgetValue = hasValidBudget ? budgetValue : 1;

  const percent = spentValue / safeBudgetValue;
  const cappedPercent = Math.min(percent, 1);

  const progressColor =
    percent > 1
      ? ["#E53935", "#FFB300"]
      : percent > 0.8
      ? ["#FFB300", "#FFD54F"]
      : ["#4CAF50", "#81C784"];

  const percentDisplay = Math.min(percent * 100, 100).toFixed(1);
  const extraSpent = percent > 1 ? spentValue - budgetValue : 0;

  const progressValue = useSharedValue(0);
  const barWidth = useSharedValue(0);
  const overspendBadgeScale = useSharedValue(1);

  useEffect(() => {
    progressValue.value = withTiming(cappedPercent, {
      duration: 850,
      easing: Easing.out(Easing.cubic),
    });

    overspendBadgeScale.value = withSpring(extraSpent > 0 ? 1.04 : 1, {
      damping: 10,
      stiffness: 180,
    });
  }, [cappedPercent, extraSpent, progressValue, overspendBadgeScale]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: barWidth.value * progressValue.value,
  }));

  const ribbonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: overspendBadgeScale.value }],
  }));

  if (!hasValidBudget) return null;

  return (
    <InteractiveCard style={styles.card} pressScale={0.985}>
      <View style={styles.headerRow}>
        <View style={styles.iconCircle}>
          <LottieView
            source={require("../assets/lottie/sparkle-pulse.json")}
            autoPlay
            loop
            style={styles.iconLottie}
          />
          <Ionicons
            name="wallet-outline"
            size={20}
            color={extraSpent > 0 ? "#E53935" : "#4CAF50"}
            style={styles.icon}
          />
        </View>
        <Text style={styles.title}>Monthly Budget</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.amount}>
          <Text style={[styles.spent, { color: extraSpent > 0 ? "#E53935" : "#4CAF50" }]}>
            {RUPEE}{spentValue}
          </Text>
          <Text style={styles.slash}> / </Text>
          <Text style={styles.budget}>{RUPEE}{budgetValue}</Text>
        </Text>
        <View style={styles.percentBadge}>
          <Text style={styles.percentText}>{percentDisplay}%</Text>
        </View>
      </View>

      <View
        style={styles.progressWrap}
        onLayout={(event) => {
          barWidth.value = event.nativeEvent.layout.width;
        }}
      >
        <View style={styles.progressBg} />
        <AnimatedLinearGradient
          colors={progressColor}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradientBar, animatedBarStyle]}
        />
      </View>

      {extraSpent > 0 && (
        <Animated.View style={[styles.ribbon, ribbonAnimatedStyle]}>
          <Text style={styles.ribbonText}>Overspent {RUPEE}{extraSpent}</Text>
        </Animated.View>
      )}
    </InteractiveCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 18,
    marginVertical: 12,
    width: "92%",
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    position: "relative",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    backgroundColor: "#F8F8F8",
  },
  iconLottie: {
    position: "absolute",
    width: 42,
    height: 42,
  },
  icon: {
    marginRight: 0,
  },
  title: {
    fontSize: 19,
    fontWeight: "700",
    color: "#222",
    letterSpacing: 0.2,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  spent: {
    fontWeight: "700",
    fontSize: 17,
  },
  slash: {
    color: "#aaa",
    fontWeight: "400",
  },
  budget: {
    color: "#4CAF50",
    fontWeight: "700",
    fontSize: 17,
  },
  percentBadge: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  percentText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
  },
  progressWrap: {
    height: 9,
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 2,
    marginBottom: 10,
    position: "relative",
    width: "100%",
    justifyContent: "center",
  },
  gradientBar: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 9,
    borderRadius: 8,
    zIndex: 2,
  },
  progressBg: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: 9,
    borderRadius: 8,
    backgroundColor: "#eee",
    zIndex: 1,
  },
  ribbon: {
    position: "absolute",
    top: 0,
    right: 0,
    backgroundColor: "#ff554d",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 8,
    borderTopRightRadius: 16,
  },
  ribbonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
});

export default BudgetProgress;
