import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import LottieView from "lottie-react-native";
import { RFValue } from "react-native-responsive-fontsize";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import InteractiveCard from "./InteractiveCard";

const RUPEE = "\u20B9";

const BudgetProgress = ({ spent, budget, primaryColor = "#00C9A7" }) => {
  const spentValue = Number(spent) || 0;
  const budgetValue = Number(budget) || 0;
  const hasValidBudget = budgetValue > 0;
  const safeBudgetValue = hasValidBudget ? budgetValue : 1;

  const percent = spentValue / safeBudgetValue;
  const cappedPercent = Math.min(percent, 1);
  const percentDisplay = Math.min(percent * 100, 100).toFixed(1);
  const extraSpent = percent > 1 ? spentValue - budgetValue : 0;
  const remaining = budgetValue - spentValue;

  const isOverBudget = percent > 1;
  const isWarning = percent > 0.8 && !isOverBudget;

  const progressColor = isOverBudget
    ? ["#E53935", "#FF6B6B"]
    : isWarning
    ? ["#FFB300", "#FFD54F"]
    : [primaryColor, "#1DE9B6"];

  const statusColor = isOverBudget ? "#FF6B6B" : isWarning ? "#FFB300" : "#1DE9B6";
  const statusBg = isOverBudget
    ? "rgba(255,107,107,0.15)"
    : isWarning
    ? "rgba(255,179,0,0.15)"
    : "rgba(29,233,182,0.15)";

  const progressValue = useSharedValue(0);
  const barWidth = useSharedValue(0);

  useEffect(() => {
    progressValue.value = withTiming(cappedPercent, {
      duration: 650,
      easing: Easing.out(Easing.cubic),
    });
  }, [cappedPercent]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: barWidth.value * progressValue.value,
  }));

  if (!hasValidBudget) return null;

  return (
    <InteractiveCard style={styles.card} pressScale={0.985}>
      <LinearGradient
        colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
        style={styles.gradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.iconCircle, { backgroundColor: statusBg }]}>
              <LottieView
                source={require("../assets/lottie/sparkle-pulse.json")}
                autoPlay
                loop
                style={styles.iconLottie}
              />
              <Ionicons name="wallet-outline" size={17} color={statusColor} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.title}>Monthly Budget</Text>
              <Text style={[styles.statusLabel, { color: statusColor }]}>
                {isOverBudget ? "Over Budget" : isWarning ? "Almost Full" : "On Track"}
              </Text>
            </View>
          </View>
          <View style={[styles.percentBadge, { backgroundColor: statusBg, borderColor: statusColor + "40" }]}>
            <Text style={[styles.percentText, { color: statusColor }]}>{percentDisplay}%</Text>
          </View>
        </View>

        <View style={styles.amountRow}>
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Spent</Text>
            <Text style={[styles.amountValue, { color: statusColor }]}>
              {RUPEE}{spentValue.toLocaleString()}
            </Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>Budget</Text>
            <Text style={styles.amountValueNeutral}>
              {RUPEE}{budgetValue.toLocaleString()}
            </Text>
          </View>
          <View style={styles.amountDivider} />
          <View style={styles.amountItem}>
            <Text style={styles.amountLabel}>{isOverBudget ? "Overspent" : "Remaining"}</Text>
            <Text style={[styles.amountValue, { color: isOverBudget ? "#FF6B6B" : "rgba(255,255,255,0.7)" }]}>
              {RUPEE}{Math.abs(remaining).toLocaleString()}
            </Text>
          </View>
        </View>

        <View
          style={styles.progressWrap}
          onLayout={(e) => { barWidth.value = e.nativeEvent.layout.width; }}
        >
          <View style={styles.progressBg} />
          <Animated.View style={[styles.progressBarWrap, animatedBarStyle]}>
            <LinearGradient
              colors={progressColor}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBar}
            />
          </Animated.View>
        </View>

        {isOverBudget && (
          <View style={styles.overspentRow}>
            <Ionicons name="alert-circle" size={14} color="#FF6B6B" />
            <Text style={styles.overspentText}>
              Overspent by {RUPEE}{extraSpent.toLocaleString()} this month
            </Text>
          </View>
        )}
      </LinearGradient>
    </InteractiveCard>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginVertical: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  gradient: {
    borderRadius: 20,
    padding: 18,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconLottie: {
    position: "absolute",
    width: 46,
    height: 46,
  },
  title: {
    fontSize: RFValue(14),
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
  statusLabel: {
    fontSize: RFValue(10),
    fontWeight: "600",
    marginTop: 2,
  },
  percentBadge: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  percentText: {
    fontSize: RFValue(13),
    fontWeight: "800",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  amountItem: {
    alignItems: "center",
    flex: 1,
  },
  amountDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  amountLabel: {
    fontSize: RFValue(10),
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
    marginBottom: 3,
    textAlign: "center",
  },
  amountValue: {
    fontSize: RFValue(13),
    fontWeight: "800",
    textAlign: "center",
  },
  amountValueNeutral: {
    fontSize: RFValue(13),
    fontWeight: "800",
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },
  progressWrap: {
    height: 8,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  progressBg: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "100%",
    height: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  progressBarWrap: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 8,
    borderRadius: 8,
    overflow: "hidden",
  },
  gradientBar: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    minWidth: 8,
  },
  overspentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    backgroundColor: "rgba(255,107,107,0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,107,107,0.2)",
  },
  overspentText: {
    marginLeft: 7,
    fontSize: RFValue(11),
    fontWeight: "600",
    color: "#FF6B6B",
  },
});

export default BudgetProgress;
