import React, { useCallback, useEffect, useMemo, useState } from "react";
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
import TopCategoriesSection from "../components/TopCategoriesSection";
import DateRangeSection from "../components/DateRangeSection";
import CashbookMultiSelect from "../components/CashbookMultiSelect";

const RUPEE = "\u20B9";
const { width } = Dimensions.get("window");
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const FloatingOrb = React.memo(({ size, color, delay, startX, startY }) => {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0.12);
  useEffect(() => {
    y.value = withDelay(delay, withRepeat(withTiming(-14, { duration: 3200, easing: Easing.inOut(Easing.sin) }), -1, true));
    opacity.value = withDelay(delay, withRepeat(withTiming(0.08, { duration: 3000, easing: Easing.inOut(Easing.quad) }), -1, true));
  }, []);
  const orbStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }], opacity: opacity.value }));
  return <Animated.View style={[orbStyle, { position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: color, left: startX, top: startY }]} />;
});

// ── Today's Summary Strip ─────────────────────────────────────────────────────
const TodaySummaryStrip = React.memo(({ todayIncome, todayExpense, todayTxCount }) => {
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
});

// ── Main Screen ───────────────────────────────────────────────────────────────
const HomeScreen = ({
  overrideExpenses,
  overrideIncomes,
  overrideLoading,
  cashbookOptions,
  selectedCashbookIds,
  selectedCashbookNames,
  onCashbookChange,
  onViewTransactions,
  showCashbookSelector = false,
  hideActions = false,
}) => {
  const navigation = useNavigation();
  const {
    expenses: contextExpenses, incomes: contextIncomes, loading: contextLoading, error,
    primaryColor = "#37474F",
    selectedMonth, setSelectedMonth,
    selectedYear, setSelectedYear,
  } = useTransactions();

  const expenses = overrideExpenses ?? contextExpenses;
  const incomes = overrideIncomes ?? contextIncomes;
  const loading = overrideLoading ?? contextLoading;

  const now = new Date();
  const balanceIntro = useSharedValue(0);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [modalStep, setModalStep] = useState("month");
  const [tempMonth, setTempMonth] = useState(selectedMonth);
  const [tempYear, setTempYear] = useState(selectedYear);

  // ── Date Range filter ──────────────────────────────────────────────────────
  // DateRangeSection (This Week / This Month / Custom) hands back two
  // {day,month,year} date-parts once the user taps "View Transactions". We
  // convert those to a concrete Date range and hand off to the existing
  // ListExpensesScreen — which does the actual filtering — flagged as
  // "locked" so the user can't then override it from inside that screen.
  const handleDateRangeApply = useCallback((startPart, endPart) => {
    const start = new Date(startPart.year, startPart.month, startPart.day, 0, 0, 0, 0);
    const end = new Date(endPart.year, endPart.month, endPart.day, 23, 59, 59, 999);
    navigation.navigate("ListExpenses", {
      cashbookScope: showCashbookSelector,
      cashbookIds: showCashbookSelector ? selectedCashbookIds : undefined,
      dateRangeStart: start.toISOString(),
      dateRangeEnd: end.toISOString(),
      lockDateFilter: true,
    });
  }, [navigation, showCashbookSelector, selectedCashbookIds]);

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

  // Note: these run after the loading/error early-returns above, so they are
  // plain values rather than useMemo/useCallback (hooks can't follow a
  // conditional return). They're cheap to (re)build, unlike the memoized
  // useTransactions()-derived data above.
  const monthNames = MONTH_NAMES;
  const yearOptions = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 2 + i);
  const isPositive = balance >= 0;

  // 1×3 action row — Cash In removed.
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

        {/* Month / Year Filter Modal — temporarily disabled for Statistics. */}
        {/*
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
        */}

        {/* Balance Card */}
        <View style={styles.topWrap}>
          {showCashbookSelector && (
            <View style={styles.cashbookSection}>
              <CashbookMultiSelect
                options={cashbookOptions || []}
                selectedIds={selectedCashbookIds || []}
                selectedNames={selectedCashbookNames}
                onChange={onCashbookChange}
              />
            </View>
          )}
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
                {!showCashbookSelector ? (
                  <TouchableOpacity
                    style={styles.filterBtn}
                    onPress={() => { setShowFilterModal(true); setModalStep("month"); setTempMonth(selectedMonth); setTempYear(selectedYear); }}
                  >
                    <Ionicons name="options-outline" size={20} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.filterBtn}
                    onPress={onViewTransactions}
                  >
                    <Ionicons name="list" size={20} color="rgba(255,255,255,0.7)" />
                  </TouchableOpacity>
                )}
              </View>

              {/* Today In / Today Out removed — the same numbers are already
                  shown in the Today summary cards below (TodaySummaryStrip). */}
            </LinearGradient>
          </Animated.View>
        </View>

        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 110 }}
        >
          {/* Date Range filter — presets or a custom range, ending in
              "View Transactions" which hands off to ListExpensesScreen. */}
          <DateRangeSection onApply={handleDateRangeApply} />
          {/* {!hideActions && <View style={styles.actionsRow}>
            {actionButtons.map((btn, i) => (
              <Animated.View
                key={btn.label}
                style={styles.actionBtnWrap}
                entering={FadeInUp.duration(280).delay(40 + i * 55)}
              >
                <InteractiveCard
                  style={styles.actionBtnOuter}
                  onPress={btn.onPress || (() => navigation.navigate(btn.screen, btn.params))}
                >
                  <LinearGradient colors={btn.color} style={styles.actionBtn}>
                    <Ionicons name={btn.icon} size={20} color="#fff" />
                    <Text style={styles.actionText}>{btn.label}</Text>
                  </LinearGradient>
                </InteractiveCard>
              </Animated.View>
            ))}
          </View>} */}

          {/* Today's Summary Strip */}
          <TodaySummaryStrip
            todayIncome={todayIncome}
            todayExpense={todayExpense}
            todayTxCount={todayTxCount}
          />

          <View style={{ height: 20 }} />

          {/* Top 3 Spending Categories */}
          <View style={{ paddingBottom: RFValue(30) }}>
            <TopCategoriesSection monthExpenses={monthExpenses} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

// Memoized: StatisticsScreen now passes useCallback-wrapped handlers and a
// stable-shaped selectedCashbookIds array, so HomeScreen can safely skip
// re-rendering (and thus skip re-mounting/reflowing CashbookMultiSelect,
// FloatingOrbs, etc.) when nothing it actually uses has changed.
export default React.memo(HomeScreen);

// ── Base styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050D1A" },
  safeArea: { flex: 1 },
  topWrap: { paddingHorizontal: 16, paddingTop: 14 },
  cashbookSection: { marginBottom: 12 },
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
