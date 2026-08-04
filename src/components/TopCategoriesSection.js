import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";

const RUPEE = "\u20B9";

export const CATEGORY_COLORS = [
  ["#00C9A7", "#00897B"],
  ["#5C9BFF", "#1565C0"],
  ["#A78BFA", "#6D28D9"],
  ["#FFB300", "#F57C00"],
  ["#FF6B6B", "#E53935"],
];

// ── Top 3 Spending Categories ─────────────────────────────────────────────────
// Moved out of HomeScreen.js so it can be reused as-is (same UI/logic) from
// other screens (e.g. ReportScreen) without duplicating the code.
const TopCategoriesSection = ({ monthExpenses, subtitle = "This month" }) => {
  const categories = useMemo(() => {
    const map = {};
    monthExpenses.forEach((t) => {
      const c = t.category || "Other";
      map[c] = (map[c] || 0) + (Number(t.amount) || 0);
    });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, amount]) => ({
        name,
        amount,
        percent: total > 0 ? Math.round((amount / total) * 100) : 0,
      }));
  }, [monthExpenses]);

  const totalSpent = monthExpenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);

  if (categories.length === 0) {
    return (
      <Animated.View entering={FadeInDown.duration(300).delay(120)}>
        <View style={cat.headerRow}>
          <Text style={cat.sectionTitle}>Top Spending</Text>
          <Text style={cat.subLabel}>{subtitle}</Text>
        </View>
        <LinearGradient
          colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
          style={[cat.card, { alignItems: "center", paddingVertical: 32 }]}
        >
          <View style={cat.topHighlight} />
          <Ionicons name="pie-chart-outline" size={32} color="rgba(255,255,255,0.15)" />
          <Text style={cat.emptyText}>No expenses recorded this month</Text>
        </LinearGradient>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(120)}>
      <View style={cat.headerRow}>
        <Text style={cat.sectionTitle}>Top Spending</Text>
        <Text style={cat.subLabel}>{subtitle}</Text>
      </View>

      <LinearGradient
        colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
        style={cat.card}
      >
        <View style={cat.topHighlight} />

        {/* Pill list */}
        <View style={cat.pillsCol}>
          {categories.map((item, i) => {
            const [c1] = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
            return (
              <Animated.View
                key={item.name}
                entering={FadeInUp.duration(260).delay(140 + i * 60)}
              >
                <LinearGradient
                  colors={[c1 + "28", c1 + "0D"]}
                  style={[cat.pill, { borderColor: c1 + "40" }]}
                >
                  {/* Rank badge */}
                  <View style={[cat.rankBadge, { backgroundColor: c1 + "33" }]}>
                    <Text style={[cat.rankText, { color: c1 }]}>#{i + 1}</Text>
                  </View>

                  <View style={[cat.pillDot, { backgroundColor: c1 }]} />

                  <View style={cat.pillTextCol}>
                    <Text style={cat.pillName} numberOfLines={1}>{item.name}</Text>
                    {/* Progress bar inline */}
                    <View style={cat.inlineBarTrack}>
                      <LinearGradient
                        colors={[c1, c1 + "55"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={[cat.inlineBarFill, { width: `${item.percent}%` }]}
                      />
                    </View>
                  </View>

                  <View style={{ alignItems: "flex-end", marginLeft: 10 }}>
                    <Text style={[cat.pillAmount, { color: c1 }]}>{RUPEE} {item.amount.toLocaleString()}</Text>
                    <View style={[cat.pillBadge, { backgroundColor: c1 + "22" }]}>
                      <Text style={[cat.pillPercent, { color: c1 }]}>{item.percent}%</Text>
                    </View>
                  </View>
                </LinearGradient>
              </Animated.View>
            );
          })}
        </View>

        {/* Footer total */}
        <View style={cat.footer}>
          <Text style={cat.footerLabel}>Total spent</Text>
          <Text style={cat.footerValue}>{RUPEE} {totalSpent.toLocaleString()}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export default TopCategoriesSection;

const cat = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: RFValue(15), fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
  subLabel: { fontSize: RFValue(11), color: "rgba(255,255,255,0.35)", fontWeight: "600" },

  card: {
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  topHighlight: { position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.12)" },

  pillsCol: { gap: 10, marginBottom: 16 },

  pill: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14,
    borderWidth: 1,
  },
  rankBadge: { borderRadius: 7, paddingHorizontal: 7, paddingVertical: 3, marginRight: 10 },
  rankText: { fontSize: RFValue(10), fontWeight: "800" },
  pillDot: { width: 7, height: 7, borderRadius: 4, marginRight: 10, flexShrink: 0 },
  pillTextCol: { flex: 1 },
  pillName: { fontSize: RFValue(13), fontWeight: "700", color: "#fff", marginBottom: 5 },

  inlineBarTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 3, overflow: "hidden" },
  inlineBarFill: { height: 3, borderRadius: 3 },

  pillAmount: { fontSize: RFValue(13), fontWeight: "800", marginBottom: 3 },
  pillBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, alignSelf: "flex-end" },
  pillPercent: { fontSize: RFValue(10), fontWeight: "800" },

  footer: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)",
  },
  footerLabel: { fontSize: RFValue(11), color: "rgba(255,255,255,0.4)", fontWeight: "600" },
  footerValue: { fontSize: RFValue(13), fontWeight: "800", color: "rgba(255,255,255,0.85)" },

  emptyText: { color: "rgba(255,255,255,0.3)", fontSize: RFValue(12), fontWeight: "600", textAlign: "center", marginTop: 10 },
});
