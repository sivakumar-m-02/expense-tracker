import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useTransactions } from "../context/TransactionContext";
import InteractiveCard from "../components/InteractiveCard";
import LottieLoader from "../components/LottieLoader";

const RUPEE = "\u20B9";
const { width } = Dimensions.get("window");

const CATEGORY_COLORS = [
  ["#00C9A7", "#00897B"],
  ["#5C9BFF", "#1565C0"],
  ["#A78BFA", "#6D28D9"],
  ["#FFB300", "#F57C00"],
  ["#FF6B6B", "#E53935"],
];

const FloatingOrb = ({ size, color, delay, startX, startY }) => {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0.12);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(-14, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true));
    opacity.value = withDelay(delay, withRepeat(withTiming(0.08, { duration: 3000, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, []);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: opacity.value }));
  return <Animated.View style={[orbStyle, { position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, left: startX, top: startY }]} />;
};

// ── Today's Summary Strip ─────────────────────────────────────────────────────
const TodaySummaryStrip = ({ todayIncome, todayExpense, todayTxCount }) => {
  const todayNet = todayIncome - todayExpense;
  const isNetPos = todayNet >= 0;

  const formatAmt = (amt) => {
    if (amt >= 1000) return `${(amt / 1000).toFixed(amt % 1000 === 0 ? 0 : 1)}k`;
    return String(amt);
  };

  const stats = [
    {
      label: "In",
      value: `${RUPEE} ${formatAmt(todayIncome)}`,
      color: "#1DE9B6",
      icon: "arrow-down-circle",
      bg: ["rgba(29,233,182,0.18)", "rgba(29,233,182,0.06)"],
    },
    {
      label: "Out",
      value: `${RUPEE} ${formatAmt(todayExpense)}`,
      color: "#FF6B6B",
      icon: "arrow-up-circle",
      bg: ["rgba(255,107,107,0.18)", "rgba(255,107,107,0.06)"],
    },
    {
      label: "Txns",
      value: String(todayTxCount),
      color: "#5C9BFF",
      icon: "receipt-outline",
      bg: ["rgba(92,155,255,0.18)", "rgba(92,155,255,0.06)"],
    },
    {
      label: isNetPos ? "Net +" : "Net \u2212",
      value: `${RUPEE} ${formatAmt(Math.abs(todayNet))}`,
      color: isNetPos ? "#1DE9B6" : "#FF6B6B",
      icon: isNetPos ? "trending-up" : "trending-down",
      bg: isNetPos
        ? ["rgba(29,233,182,0.18)", "rgba(29,233,182,0.06)"]
        : ["rgba(255,107,107,0.18)", "rgba(255,107,107,0.06)"],
    },
  ];

  return (
    <Animated.View entering={FadeInDown.duration(300).delay(60)}>
      <View style={strip.headerRow}>
        <Text style={strip.sectionTitle}>Today</Text>
        <View style={strip.datePill}>
          <Ionicons name="today-outline" size={11} color="rgba(255,255,255,0.4)" style={{ marginRight: 4 }} />
          <Text style={strip.dateText}>
            {new Date().toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
          </Text>
        </View>
      </View>

      <LinearGradient
        colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
        style={strip.card}
      >
        <View style={strip.topHighlight} />
        <View style={strip.statsRow}>
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              <View style={strip.statCol}>
                <LinearGradient colors={s.bg} style={strip.iconWrap}>
                  <Ionicons name={s.icon} size={15} color={s.color} />
                </LinearGradient>
                <Text style={strip.statLabel}>{s.label}</Text>
                <Text style={[strip.statValue, { color: s.color }]}>{s.value}</Text>
              </View>
              {i < stats.length - 1 && <View style={strip.divider} />}
            </React.Fragment>
          ))}
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ── Top 3 Spending Categories ─────────────────────────────────────────────────
const TopCategoriesSection = ({ monthExpenses }) => {
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
          <Text style={cat.subLabel}>This month</Text>
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
        <Text style={cat.subLabel}>This month</Text>
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
          <Text style={cat.footerLabel}>Total spent this month</Text>
          <Text style={cat.footerValue}>{RUPEE} {totalSpent.toLocaleString()}</Text>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const HomeScreen = () => {
  const navigation = useNavigation();
  const {
    expenses, incomes, loading, error,
    primaryColor = "#37474F",
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
  } = useTransactions();

  const now = new Date();
  const balanceIntro = useSharedValue(0);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [modalStep, setModalStep] = useState("month");
  const [tempMonth, setTempMonth] = useState(selectedMonth);
  const [tempYear, setTempYear] = useState(selectedYear);

  const toJSDate = (d) => {
    if (!d) return null;
    if (d?.seconds) return new Date(d.seconds * 1000);
    if (typeof d === "string" || typeof d === "number") return new Date(d);
    if (d instanceof Date) return d;
    return null;
  };

  const { balance, todayIncome, todayExpense, todayTxCount, monthExpenses } = useMemo(() => {
    const today = new Date();
    const isToday = (d) =>
      d &&
      d.getDate()     === today.getDate()     &&
      d.getMonth()    === today.getMonth()    &&
      d.getFullYear() === today.getFullYear();

    const inMonth = (arr) =>
      arr.filter((t) => {
        const d = toJSDate(t.date);
        return d && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });

    const mExp = inMonth(expenses);
    const mInc = inMonth(incomes);

    const totalExpense = mExp.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalIncome  = mInc.reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const todayExpArr = mExp.filter((t) => isToday(toJSDate(t.date)));
    const todayIncArr = mInc.filter((t) => isToday(toJSDate(t.date)));

    return {
      balance:       totalIncome - totalExpense,
      todayIncome:   todayIncArr.reduce((s, t) => s + (Number(t.amount) || 0), 0),
      todayExpense:  todayExpArr.reduce((s, t) => s + (Number(t.amount) || 0), 0),
      todayTxCount:  todayExpArr.length + todayIncArr.length,
      monthExpenses: mExp,
    };
  }, [expenses, incomes, selectedMonth, selectedYear]);

  useEffect(() => {
    balanceIntro.value = 0;
    balanceIntro.value = withSpring(1, { damping: 18, stiffness: 180, mass: 0.35 });
  }, [balance, selectedMonth, selectedYear]);

  const balanceCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + balanceIntro.value * 0.28,
    transform: [
      { translateY: (1 - balanceIntro.value) * 14 },
      { scale: 0.986 + balanceIntro.value * 0.014 },
    ],
  }));

  const formatAmount = (amt) => {
    if (amt >= 1000) {
      const val = amt % 1000 === 0 ? amt / 1000 : (amt / 1000).toFixed(1);
      return `${val}k`;
    }
    return amt;
  };

  if (error) {
    return (
      <LinearGradient colors={["#050D1A", "#071828", "#0A2535"]} style={styles.loader}>
        <Ionicons name="alert-circle-outline" size={44} color="#FF6B6B" style={{ marginBottom: 12 }} />
        <Text style={[styles.errorTitle, { color: "#FF6B6B" }]}>Error</Text>
        <Text style={[styles.errorText, { color: "rgba(255,255,255,0.6)" }]}>{error}</Text>
      </LinearGradient>
    );
  }

  if (loading) {
    return (
      <LinearGradient colors={["#050D1A", "#071828", "#0A2535"]} style={styles.loader}>
        <LottieLoader color={primaryColor} title="Loading your dashboard" subtitle="Preparing your latest income and expense snapshot." />
      </LinearGradient>
    );
  }

  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const yearOptions = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 2 + i);
  const isPositive = balance >= 0;

  // 1×3 action row — Cash In removed
  const actionButtons = [
    { label: "Cash Out", icon: "remove-circle", screen: "AddExpense",   params: { initialTab: 0 }, color: ["#FF6B6B", "#E53935"] },
    { label: "History",  icon: "list",           screen: "ListExpenses", params: {},                color: ["#5C9BFF", "#1565C0"] },
    { label: "By Range", icon: "stats-chart",    screen: "MonthRange",   params: {},                color: ["#A78BFA", "#6D28D9"] },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={["#050D1A", "#071828", "#0A2535", "#062520"]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      <FloatingOrb size={180} color="#00695C" delay={0}    startX={-60}         startY={80}  />
      <FloatingOrb size={140} color="#1565C0" delay={600}  startX={width - 80}  startY={200} />
      <FloatingOrb size={100} color="#00897B" delay={1200} startX={width * 0.4} startY={350} />

      <SafeAreaView style={styles.safeArea} edges={["top", "right", "left"]}>

        {/* Month / Year Filter Modal */}
        <Modal visible={showFilterModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowFilterModal(false)}>
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>
              {modalStep === "month" ? (
                <>
                  <Text style={styles.modalTitle}>Select Month</Text>
                  <View style={styles.optionGrid}>
                    {monthNames.map((name, idx) => (
                      <TouchableOpacity
                        key={name}
                        style={[styles.optionChip, tempMonth === idx && styles.optionChipActive]}
                        onPress={() => setTempMonth(idx)}
                      >
                        <Text style={{ color: tempMonth === idx ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: "700", fontSize: RFValue(12) }}>
                          {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity style={styles.modalPrimaryBtn} onPress={() => setModalStep("year")}>
                    <Text style={styles.modalPrimaryBtnText}>Select Year →</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Select Year</Text>
                  <View style={styles.optionGrid}>
                    {yearOptions.map((yr) => (
                      <TouchableOpacity
                        key={yr}
                        style={[styles.optionChip, tempYear === yr && styles.optionChipActive]}
                        onPress={() => setTempYear(yr)}
                      >
                        <Text style={{ color: tempYear === yr ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: "700", fontSize: RFValue(12) }}>
                          {yr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity style={styles.modalBackBtn} onPress={() => setModalStep("month")}>
                      <Text style={styles.modalBackText}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.modalApplyBtn}
                      onPress={() => { setSelectedMonth(tempMonth); setSelectedYear(tempYear); setShowFilterModal(false); }}
                    >
                      <Text style={styles.modalApplyText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Balance Card */}
        <View style={styles.topWrap}>
          <Animated.View style={balanceCardAnimatedStyle}>
            <LinearGradient
              colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]}
              style={styles.balanceCard}
            >
              <View style={styles.balanceCardBorder} />
              <View style={styles.balanceHeadRow}>
                <View>
                  <Text style={styles.balanceTitle}>{monthNames[selectedMonth]} {selectedYear}</Text>
                  <Text style={[styles.balanceAmount, { color: isPositive ? "#1DE9B6" : "#FF6B6B" }]}>
                    {RUPEE} {balance}
                  </Text>
                  <Text style={styles.balanceSubtitle}>
                    {isPositive ? "Surplus this month" : "Deficit this month"}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.filterBtn}
                  onPress={() => { setShowFilterModal(true); setModalStep("month"); setTempMonth(selectedMonth); setTempYear(selectedYear); }}
                >
                  <Ionicons name="options-outline" size={20} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              </View>

              <View style={styles.ieRow}>
                <LinearGradient colors={["rgba(29,233,182,0.2)", "rgba(29,233,182,0.08)"]} style={styles.iePillBox}>
                  <Ionicons name="arrow-down" size={16} color="#1DE9B6" style={styles.pillIcon} />
                  <View>
                    <Text style={styles.iePillLabel}>Today In</Text>
                    <Text style={[styles.ieValue, { color: "#1DE9B6" }]}>{RUPEE} {formatAmount(todayIncome)}</Text>
                  </View>
                </LinearGradient>
                <LinearGradient colors={["rgba(255,107,107,0.2)", "rgba(255,107,107,0.08)"]} style={styles.iePillBox}>
                  <Ionicons name="arrow-up" size={16} color="#FF6B6B" style={styles.pillIcon} />
                  <View>
                    <Text style={styles.iePillLabel}>Today Out</Text>
                    <Text style={[styles.ieValue, { color: "#FF6B6B" }]}>{RUPEE} {formatAmount(todayExpense)}</Text>
                  </View>
                </LinearGradient>
              </View>
            </LinearGradient>
          </Animated.View>
        </View>

        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* 1×3 Action Row */}
          <View style={styles.actionsRow}>
            {actionButtons.map((btn, i) => (
              <Animated.View
                key={btn.label}
                style={styles.actionBtnWrap}
                entering={FadeInUp.duration(280).delay(40 + i * 55)}
              >
                <InteractiveCard
                  style={styles.actionBtnOuter}
                  onPress={() => navigation.navigate(btn.screen, btn.params)}
                >
                  <LinearGradient colors={btn.color} style={styles.actionBtn}>
                    <Ionicons name={btn.icon} size={20} color="#fff" />
                    <Text style={styles.actionText}>{btn.label}</Text>
                  </LinearGradient>
                </InteractiveCard>
              </Animated.View>
            ))}
          </View>

          {/* Today's Summary Strip */}
          <TodaySummaryStrip
            todayIncome={todayIncome}
            todayExpense={todayExpense}
            todayTxCount={todayTxCount}
          />

          <View style={{ height: 20 }} />

          {/* Top 3 Spending Categories */}
          <TopCategoriesSection monthExpenses={monthExpenses} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default HomeScreen;

// ── Base styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050D1A" },
  safeArea: { flex: 1 },
  topWrap: { paddingHorizontal: 16, paddingTop: 14 },
  container: { flex: 1, padding: 16 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorTitle: { fontWeight: "700", fontSize: 18, marginBottom: 8 },
  errorText: { fontSize: 15, textAlign: "center", maxWidth: 280 },

  balanceCard: {
    borderRadius: 24, padding: 22, marginBottom: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  balanceCardBorder: { position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  balanceHeadRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  balanceTitle: { color: "rgba(255,255,255,0.5)", fontSize: RFValue(12), fontWeight: "600", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 },
  balanceAmount: { fontSize: RFValue(36), fontWeight: "900", letterSpacing: 1 },
  balanceSubtitle: { color: "rgba(255,255,255,0.35)", fontSize: RFValue(11), marginTop: 4 },
  filterBtn: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },

  ieRow: { flexDirection: "row", marginTop: 20, gap: 12 },
  iePillBox: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  pillIcon: { marginRight: 10 },
  iePillLabel: { color: "rgba(255,255,255,0.4)", fontSize: RFValue(10), fontWeight: "600", marginBottom: 2 },
  ieValue: { fontSize: RFValue(14), fontWeight: "800" },

  actionsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22, gap: 10 },
  actionBtnWrap: { flex: 1 },
  actionBtnOuter: { borderRadius: 16, overflow: "hidden" },
  actionBtn: { borderRadius: 16, paddingVertical: 16, alignItems: "center", gap: 4 },
  actionText: { color: "#fff", fontSize: RFValue(11), fontWeight: "700", marginTop: 2 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
  modalCard: { backgroundColor: "#0D1F2D", borderRadius: 24, padding: 22, width: "100%", maxWidth: 370, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", position: "relative" },
  closeBtn: { position: "absolute", top: 14, right: 14, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 999, padding: 5, zIndex: 10 },
  modalTitle: { fontWeight: "800", fontSize: RFValue(16), marginBottom: 16, textAlign: "center", color: "#fff" },
  optionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.07)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  optionChipActive: { backgroundColor: "#00897B", borderColor: "#00C9A7" },
  modalPrimaryBtn: { marginTop: 20, borderRadius: 14, paddingVertical: 13, backgroundColor: "#00897B", alignItems: "center" },
  modalPrimaryBtnText: { color: "#fff", fontWeight: "700", fontSize: RFValue(14) },
  modalActionsRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, gap: 10 },
  modalBackBtn: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14, paddingVertical: 13, flex: 1, alignItems: "center" },
  modalBackText: { color: "rgba(255,255,255,0.7)", fontWeight: "700", fontSize: RFValue(13) },
  modalApplyBtn: { borderRadius: 14, paddingVertical: 13, flex: 1, alignItems: "center", backgroundColor: "#00897B" },
  modalApplyText: { color: "#fff", fontWeight: "700", fontSize: RFValue(13) },
});

// ── Today's Summary Strip styles ──────────────────────────────────────────────
const strip = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  sectionTitle: { fontSize: RFValue(15), fontWeight: "800", color: "#fff", letterSpacing: 0.2 },
  datePill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 20,
    paddingVertical: 4, paddingHorizontal: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
  },
  dateText: { fontSize: RFValue(10), color: "rgba(255,255,255,0.4)", fontWeight: "600" },

  card: {
    borderRadius: 20, padding: 18,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  topHighlight: { position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.12)" },

  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  statCol: { flex: 1, alignItems: "center" },
  iconWrap: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    marginBottom: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.06)",
  },
  statLabel: { fontSize: RFValue(9), color: "rgba(255,255,255,0.4)", fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 3 },
  statValue: { fontSize: RFValue(13), fontWeight: "800" },
  divider: { width: 1, height: 44, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 4 },
});

// ── Top Categories styles ─────────────────────────────────────────────────────
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