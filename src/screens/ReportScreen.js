import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, Dimensions,
  TouchableOpacity, ScrollView, StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute, useFocusEffect } from "@react-navigation/native";
import { LineChart } from "react-native-chart-kit";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";
import LottieView from "lottie-react-native";
import LinearGradient from "react-native-linear-gradient";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import { useTransactions } from "../context/TransactionContext";
import BudgetProgress from "../components/BudgetProgress";
import AISummaryCard from "../components/AISummaryCard";
import InteractiveCard from "../components/InteractiveCard";
import LottieLoader from "../components/LottieLoader";
import TopCategoriesSection from "../components/TopCategoriesSection";

const RUPEE = "\u20B9";
const screenWidth = Dimensions.get("window").width;
const H_PADDING = 16;
const CHART_WIDTH = screenWidth - H_PADDING * 2;

const toJSDate = (d) => {
  if (!d) return null;
  if (typeof d?.toDate === "function") return d.toDate();
  if (d?.seconds) return new Date(d.seconds * 1000);
  if (d instanceof Date) return d;
  return new Date(d);
};

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

export default function ReportScreen() {
  const {
    selectedMonth, selectedYear, budget,
    primaryColor = "#37474F",
    statisticsCashbookIds,
    statisticsCashbookNames,
    isStatisticsSelectionActive,
  } = useTransactions();

  const navigation = useNavigation();
  const route = useRoute();
  const routeSource = route.params?.source;
  const routeCashbookIds = Array.isArray(route.params?.cashbookIds) ? route.params.cashbookIds : [];
  const routeCashbookNames = Array.isArray(route.params?.cashbookNames) ? route.params.cashbookNames : [];
  const routeCashbookIdsKey = useMemo(() => routeCashbookIds.join(","), [routeCashbookIds]);
  const routeCashbookNamesKey = useMemo(() => routeCashbookNames.join(","), [routeCashbookNames]);

  const [activeCashbookIds, setActiveCashbookIds] = useState([]);
  const [activeCashbookNames, setActiveCashbookNames] = useState([]);
  const [refreshTick, setRefreshTick] = useState(0);
  const [reportExpenses, setReportExpenses] = useState([]);
  const [reportIncomes, setReportIncomes] = useState([]);
  const [reportLoading, setReportLoading] = useState(true);
  const activeCashbookIdsKey = useMemo(() => activeCashbookIds.join(","), [activeCashbookIds]);
  const isCashbookMode = activeCashbookIds.length > 0;
  useEffect(() => {
    if (routeSource === "cashbook" && routeCashbookIds.length > 0) {
      setActiveCashbookIds(routeCashbookIds);
      setActiveCashbookNames(routeCashbookNames);
    } else if (isStatisticsSelectionActive) {
      setActiveCashbookIds(statisticsCashbookIds);
      setActiveCashbookNames(statisticsCashbookNames);
    } else {
      setActiveCashbookIds([]);
      setActiveCashbookNames([]);
    }
  }, [
    isStatisticsSelectionActive,
    routeSource,
    routeCashbookIdsKey,
    routeCashbookNamesKey,
    statisticsCashbookIds,
    statisticsCashbookNames,
  ]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const loadReportData = async () => {
        setReportLoading(true);
        try {
          const user = auth().currentUser;
          if (!user) {
            if (!cancelled) {
              setReportExpenses([]);
              setReportIncomes([]);
            }
            return;
          }

          const targetCashbookIds = isCashbookMode ? activeCashbookIds : [];
          let snapshots = [];

          if (isCashbookMode) {
            snapshots = await Promise.all(
              targetCashbookIds.map((id) =>
                firestore()
                  .collection("users")
                  .doc(user.uid)
                  .collection("cashbooks")
                  .doc(id)
                  .collection("transactions")
                  .get()
              )
            );
          } else {
            const cashbooksSnap = await firestore()
              .collection("users")
              .doc(user.uid)
              .collection("cashbooks")
              .get();

            const allCashbookIds = cashbooksSnap.docs.map((doc) => doc.id);
            snapshots = await Promise.all(
              allCashbookIds.map((id) =>
                firestore()
                  .collection("users")
                  .doc(user.uid)
                  .collection("cashbooks")
                  .doc(id)
                  .collection("transactions")
                  .get()
              )
            );
          }

          const exp = [];
          const inc = [];
          snapshots.forEach((qs) => {
            qs.forEach((doc) => {
              const data = { id: doc.id, ...doc.data() };
              if (data.type === "income") inc.push(data);
              else exp.push(data);
            });
          });

          if (!cancelled) {
            setReportExpenses(exp);
            setReportIncomes(inc);
          }
        } catch (e) {
          console.log("ReportScreen aggregate error:", e);
        }

        if (!cancelled) setReportLoading(false);
      };

      loadReportData();

      return () => {
        cancelled = true;
      };
    }, [activeCashbookIdsKey, isCashbookMode, refreshTick])
  );

  const expenses = reportExpenses;
  const incomes = reportIncomes;
  const loading = reportLoading;

  const [clickedData, setClickedData] = useState(null);

  const monthExpenses = useMemo(() =>
    expenses.map((t) => ({ ...t, _date: toJSDate(t.date) }))
      .filter((t) => t._date && t._date.getMonth() === selectedMonth && t._date.getFullYear() === selectedYear),
    [expenses, selectedMonth, selectedYear]);

  const monthIncomes = useMemo(() =>
    incomes.map((t) => ({ ...t, _date: toJSDate(t.date) }))
      .filter((t) => t._date && t._date.getMonth() === selectedMonth && t._date.getFullYear() === selectedYear),
    [incomes, selectedMonth, selectedYear]);

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  const prevMonthExpenses = useMemo(() =>
    expenses.map((t) => ({ ...t, _date: toJSDate(t.date) }))
      .filter((t) => t._date && t._date.getMonth() === prevMonth && t._date.getFullYear() === prevYear),
    [expenses, prevMonth, prevYear]);

  const totalExpense = useMemo(() => monthExpenses.reduce((s, t) => s + (Number(t.amount) || 0), 0), [monthExpenses]);
  const totalIncome = useMemo(() => monthIncomes.reduce((s, t) => s + (Number(t.amount) || 0), 0), [monthIncomes]);
  const net = totalIncome - totalExpense;
  const isNetPositive = net >= 0;

  const { labels, incomeSeries, expenseSeries, hasAnyData } = useMemo(() => {
    const nDays = daysInMonth(selectedYear, selectedMonth);
    const inc = new Array(nDays).fill(0);
    const exp = new Array(nDays).fill(0);
    monthIncomes.forEach((t) => { const d = t._date?.getDate() || 1; inc[d - 1] += Number(t.amount) || 0; });
    monthExpenses.forEach((t) => { const d = t._date?.getDate() || 1; exp[d - 1] += Number(t.amount) || 0; });
    const step = Math.max(1, Math.ceil(nDays / 7));
    const labs = Array.from({ length: nDays }, (_, i) => i === 0 || i === nDays - 1 || i % step === 0 ? `${i + 1}` : "");
    return { labels: labs, incomeSeries: inc, expenseSeries: exp, hasAnyData: inc.some((v) => v > 0) || exp.some((v) => v > 0) };
  }, [monthIncomes, monthExpenses, selectedMonth, selectedYear]);

  const chartConfig = {
    backgroundGradientFrom: "#0D1F2D",
    backgroundGradientTo: "#0D1F2D",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255,255,255, ${opacity * 0.7})`,
    labelColor: (opacity = 1) => `rgba(255,255,255, ${opacity * 0.4})`,
    propsForDots: { r: "3" },
    propsForBackgroundLines: { strokeDasharray: "4 6", stroke: "rgba(255,255,255,0.06)" },
  };

  const subtitleText = new Date(selectedYear, selectedMonth, 1).toLocaleString("en-US", { month: "long", year: "numeric" });
  const selectedCashbooksText = activeCashbookNames.length
    ? activeCashbookNames.join(", ")
    : isCashbookMode ? `${activeCashbookIds.length} CashBooks` : null;
  const headerSubtitle = selectedCashbooksText ? "Selected CashBooks" : "This month";

  const handleRefresh = useCallback(() => {
    navigation.setParams({
      source: undefined,
      cashbookIds: undefined,
      cashbookNames: undefined,
    });
    setActiveCashbookIds([]);
    setActiveCashbookNames([]);
    setRefreshTick((value) => value + 1);
  }, [navigation]);

  if (loading) {
    return (
      <LinearGradient colors={["#050D1A", "#071828", "#0A2535"]} style={[styles.container, styles.center]}>
        <LottieLoader color={primaryColor} title="Generating report" subtitle="Crunching your monthly trends and budget health." />
      </LinearGradient>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#050D1A", "#071828", "#0A2535", "#062520"]} locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safe} edges={["top", "right", "left"]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

          {/* ── Header: title + refresh (top-right) ── */}
          <Animated.View entering={FadeInUp.duration(280)}>
            <View style={styles.headerTopRow}>
              <View style={styles.headerTitleBlock}>
                <Text style={styles.header}>Monthly Trend</Text>
                <Text style={styles.subheader}>{headerSubtitle}</Text>
                {selectedCashbooksText ? (
                  <Text style={styles.cashbookSubtitle} numberOfLines={1}>{selectedCashbooksText}</Text>
                ) : (
                  <Text style={styles.monthSubtitle}>{subtitleText}</Text>
                )}
              </View>
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} activeOpacity={0.85}>
                <LinearGradient
                  colors={["rgba(0,201,167,0.24)", "rgba(0,201,167,0.08)"]}
                  style={styles.refreshButtonInner}
                >
                  <Ionicons name="refresh-outline" style={{paddingLeft: RFValue(2)}} size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Summary cards: Income / Expense / Surplus-Deficit, one compact row ── */}
          <View style={styles.summaryRow}>
            <Animated.View style={{ flex: 1 }} entering={FadeInUp.duration(280).delay(50)}>
              <InteractiveCard style={styles.summaryCard}>
                <LinearGradient colors={["rgba(29,233,182,0.2)", "rgba(29,233,182,0.05)"]} style={styles.summaryGrad}>
                  <View style={styles.summaryHeaderRow}>
                    <Ionicons name="cash-outline" size={13} color="#1DE9B6" />
                    <Text style={styles.summaryLabel} numberOfLines={1}>Income</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: "#1DE9B6" }]} numberOfLines={1}>{RUPEE} {totalIncome.toFixed(0)}</Text>
                </LinearGradient>
              </InteractiveCard>
            </Animated.View>
            <Animated.View style={{ flex: 1 }} entering={FadeInUp.duration(280).delay(90)}>
              <InteractiveCard style={styles.summaryCard}>
                <LinearGradient colors={["rgba(255,107,107,0.2)", "rgba(255,107,107,0.05)"]} style={styles.summaryGrad}>
                  <View style={styles.summaryHeaderRow}>
                    <Ionicons name="card-outline" size={13} color="#FF6B6B" />
                    <Text style={styles.summaryLabel} numberOfLines={1}>Expense</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: "#FF6B6B" }]} numberOfLines={1}>{RUPEE} {totalExpense.toFixed(0)}</Text>
                </LinearGradient>
              </InteractiveCard>
            </Animated.View>
            <Animated.View style={{ flex: 1 }} entering={FadeInUp.duration(280).delay(130)}>
              <InteractiveCard style={styles.summaryCard}>
                <LinearGradient
                  colors={isNetPositive ? ["rgba(29,233,182,0.2)", "rgba(29,233,182,0.05)"] : ["rgba(255,107,107,0.2)", "rgba(255,107,107,0.05)"]}
                  style={styles.summaryGrad}
                >
                  <View style={styles.summaryHeaderRow}>
                    <Ionicons name={isNetPositive ? "trending-up" : "trending-down"} size={13} color={isNetPositive ? "#1DE9B6" : "#FF6B6B"} />
                    <Text style={styles.summaryLabel} numberOfLines={1}>{isNetPositive ? "Surplus" : "Deficit"}</Text>
                  </View>
                  <Text style={[styles.summaryValue, { color: isNetPositive ? "#1DE9B6" : "#FF6B6B" }]} numberOfLines={1}>{RUPEE} {Math.abs(net).toFixed(0)}</Text>
                </LinearGradient>
              </InteractiveCard>
            </Animated.View>
          </View>

          {/* ── Chart ── */}
          <Animated.View entering={FadeInUp.duration(300).delay(140)}>
            <InteractiveCard style={styles.cardBlock} pressScale={0.988}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>Daily (Income vs Expense)</Text>
              </View>
              {hasAnyData ? (
                <>
                  <LineChart
                    data={{
                      labels,
                      datasets: [
                        { data: incomeSeries, color: () => "#1DE9B6" },
                        { data: expenseSeries, color: () => "#FF6B6B" },
                      ],
                      legend: ["Income", "Expense"],
                    }}
                    width={CHART_WIDTH}
                    height={220}
                    chartConfig={chartConfig}
                    bezier
                    withShadow={false}
                    style={styles.chart}
                    onDataPointClick={({ index }) => setClickedData({ day: index + 1, income: incomeSeries[index], expense: expenseSeries[index] })}
                    withInnerLines
                    withOuterLines
                    withDots
                  />
                  {clickedData && (
                    <Animated.View entering={FadeInDown.duration(260)} style={styles.clickedDataCard}>
                      <View style={styles.clickedDataHeader}>
                        <Text style={styles.clickedDataDay}>
                          Day {clickedData.day} — {new Date(selectedYear, selectedMonth, clickedData.day).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </Text>
                        <TouchableOpacity onPress={() => setClickedData(null)}>
                          <Ionicons name="close-circle" size={22} color="rgba(255,255,255,0.3)" />
                        </TouchableOpacity>
                      </View>
                      <View style={styles.clickedDataRow}>
                        <View style={styles.clickedDataItem}>
                          <View style={styles.clickedDataLabelRow}>
                            <View style={[styles.clickedDataDot, { backgroundColor: "#1DE9B6" }]} />
                            <Text style={styles.clickedDataLabel}>Income</Text>
                          </View>
                          <Text style={[styles.clickedDataValue, { color: "#1DE9B6" }]}>{RUPEE} {clickedData.income.toFixed(0)}</Text>
                        </View>
                        <View style={styles.clickedDataDivider} />
                        <View style={styles.clickedDataItem}>
                          <View style={styles.clickedDataLabelRow}>
                            <View style={[styles.clickedDataDot, { backgroundColor: "#FF6B6B" }]} />
                            <Text style={styles.clickedDataLabel}>Expense</Text>
                          </View>
                          <Text style={[styles.clickedDataValue, { color: "#FF6B6B" }]}>{RUPEE} {clickedData.expense.toFixed(0)}</Text>
                        </View>
                      </View>
                      <View style={styles.clickedDataNet}>
                        <Text style={styles.clickedDataNetLabel}>Net</Text>
                        <Text style={[styles.clickedDataNetValue, { color: clickedData.income - clickedData.expense >= 0 ? "#1DE9B6" : "#FF6B6B" }]}>
                          {clickedData.income - clickedData.expense >= 0 ? "+" : "-"} {RUPEE} {Math.abs(clickedData.income - clickedData.expense).toFixed(0)}
                        </Text>
                      </View>
                    </Animated.View>
                  )}
                </>
              ) : (
                <View style={styles.noDataBlock}>
                  <LottieView source={require("../assets/lottie/sparkle-pulse.json")} autoPlay loop style={styles.noDataLottie} />
                  <Text style={styles.noDataTitle}>No activity this month</Text>
                  <Text style={styles.noDataText}>Add income or expenses to view a daily trend.</Text>
                </View>
              )}
            </InteractiveCard>
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(300).delay(180)}>
            {/* MonthlyProgress (BudgetProgress) temporarily disabled for this
                branch — kept in place, not removed, so it can be restored
                later by uncommenting. */}
            {/* <BudgetProgress spent={Math.abs(net).toFixed(0)} budget={budget} primaryColor={primaryColor} /> */}
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(300).delay(200)}>
            <TopCategoriesSection monthExpenses={monthExpenses} subtitle={isCashbookMode ? "Selected Transactions" : "This month"} />
          </Animated.View>

          <Animated.View entering={FadeInUp.duration(300).delay(220)}>
            <AISummaryCard
              currentMonthExpenses={monthExpenses}
              previousMonthExpenses={prevMonthExpenses}
              selectedMonth={selectedMonth}
              selectedYear={selectedYear}
              primaryColor={primaryColor}
            />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050D1A" },
  safe: { flex: 1 },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: H_PADDING, paddingTop: 14, paddingBottom: 110 },
  center: { justifyContent: "center", alignItems: "center" },

  headerTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  headerTitleBlock: { flex: 1, paddingRight: 12 },
  header: { fontSize: RFValue(20), fontWeight: "800", color: "#fff" },
  subheader: { fontSize: RFValue(12), color: "rgba(255,255,255,0.4)", marginTop: 3 },
  monthSubtitle: { fontSize: RFValue(10.5), color: "rgba(255,255,255,0.35)", marginTop: 2 },
  cashbookSubtitle: { fontSize: RFValue(10.5), color: "rgba(255,255,255,0.35)", marginTop: 2 },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#00C9A7",
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  refreshButtonInner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },


  summaryRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  summaryCard: { borderRadius: 14, overflow: "hidden" },
  summaryGrad: { borderRadius: 14, paddingVertical: 10, paddingHorizontal: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  summaryHeaderRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  summaryLabel: { fontSize: RFValue(10), color: "rgba(255,255,255,0.5)", flexShrink: 1 },
  summaryValue: { fontSize: RFValue(13.5), fontWeight: "800" },

  cardBlock: { backgroundColor: "#0D1F2D", borderRadius: 20, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  cardTitle: { fontSize: RFValue(14), fontWeight: "800", color: "#fff" },
  chart: { borderRadius: 12, marginLeft: -40 },

  noDataBlock: { height: 190, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.04)", alignItems: "center", justifyContent: "center", padding: 12 },
  noDataLottie: { width: 86, height: 86 },
  noDataTitle: { fontSize: RFValue(15), fontWeight: "700", color: "rgba(255,255,255,0.6)", marginTop: 4 },
  noDataText: { fontSize: RFValue(12), color: "rgba(255,255,255,0.35)", marginTop: 6, textAlign: "center", maxWidth: "90%" },

  clickedDataCard: { marginTop: 12, backgroundColor: "rgba(255,255,255,0.06)", borderRadius: 14, padding: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  clickedDataHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  clickedDataDay: { fontSize: RFValue(13), fontWeight: "700", color: "#fff" },
  clickedDataRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  clickedDataItem: { flex: 1 },
  clickedDataLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  clickedDataDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  clickedDataLabel: { fontSize: RFValue(11), color: "rgba(255,255,255,0.5)", fontWeight: "500" },
  clickedDataValue: { fontSize: RFValue(16), fontWeight: "800" },
  clickedDataDivider: { width: 1, height: 40, backgroundColor: "rgba(255,255,255,0.1)", marginHorizontal: 10 },
  clickedDataNet: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.08)" },
  clickedDataNetLabel: { fontSize: RFValue(12), color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  clickedDataNetValue: { fontSize: RFValue(15), fontWeight: "800" },
});
