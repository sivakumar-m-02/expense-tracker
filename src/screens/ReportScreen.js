import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LineChart } from "react-native-chart-kit";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";
import LottieView from "lottie-react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTransactions } from "../context/TransactionContext";
import BudgetProgress from "../components/BudgetProgress";
import AISummaryCard from "../components/AISummaryCard";
import InteractiveCard from "../components/InteractiveCard";
import LottieLoader from "../components/LottieLoader";

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
    expenses = [],
    incomes = [],
    loading,
    selectedMonth,
    selectedYear,
    budget,
    primaryColor = "#37474F",
  } = useTransactions();

  const [clickedData, setClickedData] = useState(null);

  const monthExpenses = useMemo(() => {
    return expenses
      .map((t) => ({ ...t, _date: toJSDate(t.date) }))
      .filter(
        (t) =>
          t._date &&
          t._date.getMonth() === selectedMonth &&
          t._date.getFullYear() === selectedYear
      );
  }, [expenses, selectedMonth, selectedYear]);

  const monthIncomes = useMemo(() => {
    return incomes
      .map((t) => ({ ...t, _date: toJSDate(t.date) }))
      .filter(
        (t) =>
          t._date &&
          t._date.getMonth() === selectedMonth &&
          t._date.getFullYear() === selectedYear
      );
  }, [incomes, selectedMonth, selectedYear]);

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  const prevMonthExpenses = useMemo(() => {
    return expenses
      .map((t) => ({ ...t, _date: toJSDate(t.date) }))
      .filter(
        (t) => t._date && t._date.getMonth() === prevMonth && t._date.getFullYear() === prevYear
      );
  }, [expenses, prevMonth, prevYear]);

  const totalExpense = useMemo(
    () => monthExpenses.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [monthExpenses]
  );
  const totalIncome = useMemo(
    () => monthIncomes.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [monthIncomes]
  );

  const net = totalIncome - totalExpense;
  const isNetPositive = net >= 0;

  const { labels, incomeSeries, expenseSeries, hasAnyData } = useMemo(() => {
    const nDays = daysInMonth(selectedYear, selectedMonth);
    const inc = new Array(nDays).fill(0);
    const exp = new Array(nDays).fill(0);

    monthIncomes.forEach((t) => {
      const d = t._date?.getDate() || 1;
      inc[d - 1] += Number(t.amount) || 0;
    });

    monthExpenses.forEach((t) => {
      const d = t._date?.getDate() || 1;
      exp[d - 1] += Number(t.amount) || 0;
    });

    const maxLabels = 7;
    const step = Math.max(1, Math.ceil(nDays / maxLabels));
    const labs = Array.from({ length: nDays }, (_, i) =>
      i === 0 || i === nDays - 1 || i % step === 0 ? `${i + 1}` : ""
    );

    return {
      labels: labs,
      incomeSeries: inc,
      expenseSeries: exp,
      hasAnyData: inc.some((v) => v > 0) || exp.some((v) => v > 0),
    };
  }, [monthIncomes, monthExpenses, selectedMonth, selectedYear]);

  const chartConfig = {
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(34,34,34, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(100,100,100, ${opacity})`,
    propsForDots: { r: "3" },
    propsForBackgroundLines: { strokeDasharray: "4 6" },
  };

  const handleDataPointClick = ({ index }) => {
    setClickedData({
      day: index + 1,
      income: incomeSeries[index],
      expense: expenseSeries[index],
    });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <LottieLoader
          color={primaryColor}
          title="Generating report"
          subtitle="Crunching your monthly trends and budget health."
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "right", "left"]}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Animated.View entering={FadeInUp.duration(350)}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.header}>Monthly Trend</Text>
              <Text style={styles.subheader}>
                {new Date(selectedYear, selectedMonth, 1).toLocaleString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>
            <View style={[styles.netPill, { borderColor: isNetPositive ? "#43A047" : "#E53935" }]}>
              <Ionicons
                name={isNetPositive ? "trending-up" : "trending-down"}
                size={14}
                color={isNetPositive ? "#43A047" : "#E53935"}
              />
              <Text style={[styles.netText, { color: isNetPositive ? "#43A047" : "#E53935" }]}>
                {isNetPositive ? "Surplus" : "Deficit"} {RUPEE} {Math.abs(net).toFixed(0)}
              </Text>
            </View>
          </View>
        </Animated.View>

        <View style={styles.summaryRow}>
          <Animated.View style={{ flex: 1 }} entering={FadeInUp.duration(350).delay(70)}>
            <InteractiveCard style={[styles.summaryCard, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="cash-outline" size={20} color="#2E7D32" />
              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryLabel}>Income</Text>
                <Text style={[styles.summaryValue, { color: "#2E7D32" }]}>
                  {RUPEE} {totalIncome.toFixed(0)}
                </Text>
              </View>
            </InteractiveCard>
          </Animated.View>

          <Animated.View style={{ flex: 1 }} entering={FadeInUp.duration(350).delay(130)}>
            <InteractiveCard style={[styles.summaryCard, { backgroundColor: "#FFEBEE" }]}>
              <Ionicons name="card-outline" size={20} color="#C62828" />
              <View style={styles.summaryTextWrap}>
                <Text style={styles.summaryLabel}>Expense</Text>
                <Text style={[styles.summaryValue, { color: "#C62828" }]}>
                  {RUPEE} {totalExpense.toFixed(0)}
                </Text>
              </View>
            </InteractiveCard>
          </Animated.View>
        </View>

        <Animated.View entering={FadeInUp.duration(380).delay(170)}>
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
                      { data: incomeSeries, color: () => "#43A047" },
                      { data: expenseSeries, color: () => "#E53935" },
                    ],
                    legend: ["Income", "Expense"],
                  }}
                  width={CHART_WIDTH}
                  height={220}
                  chartConfig={chartConfig}
                  bezier
                  withShadow={false}
                  style={styles.chart}
                  onDataPointClick={handleDataPointClick}
                  withInnerLines
                  withOuterLines
                  withDots
                />

                {clickedData && (
                  <Animated.View entering={FadeInDown.duration(260)} style={styles.clickedDataCard}>
                    <View style={styles.clickedDataHeader}>
                      <Text style={styles.clickedDataDay}>
                        Day {clickedData.day} -{" "}
                        {new Date(selectedYear, selectedMonth, clickedData.day).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </Text>
                      <TouchableOpacity onPress={() => setClickedData(null)}>
                        <Ionicons name="close-circle" size={22} color="#999" />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.clickedDataRow}>
                      <View style={styles.clickedDataItem}>
                        <View style={styles.clickedDataLabelRow}>
                          <View style={[styles.clickedDataDot, { backgroundColor: "#43A047" }]} />
                          <Text style={styles.clickedDataLabel}>Income</Text>
                        </View>
                        <Text style={[styles.clickedDataValue, { color: "#2E7D32" }]}>
                          {RUPEE} {clickedData.income.toFixed(0)}
                        </Text>
                      </View>

                      <View style={styles.clickedDataDivider} />

                      <View style={styles.clickedDataItem}>
                        <View style={styles.clickedDataLabelRow}>
                          <View style={[styles.clickedDataDot, { backgroundColor: "#E53935" }]} />
                          <Text style={styles.clickedDataLabel}>Expense</Text>
                        </View>
                        <Text style={[styles.clickedDataValue, { color: "#C62828" }]}>
                          {RUPEE} {clickedData.expense.toFixed(0)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.clickedDataNet}>
                      <Text style={styles.clickedDataNetLabel}>Net</Text>
                      <Text
                        style={[
                          styles.clickedDataNetValue,
                          {
                            color:
                              clickedData.income - clickedData.expense >= 0
                                ? "#2E7D32"
                                : "#C62828",
                          },
                        ]}
                      >
                        {clickedData.income - clickedData.expense >= 0 ? "+" : "-"} {RUPEE}{" "}
                        {Math.abs(clickedData.income - clickedData.expense).toFixed(0)}
                      </Text>
                    </View>
                  </Animated.View>
                )}
              </>
            ) : (
              <View style={styles.noDataBlock}>
                <LottieView
                  source={require("../assets/lottie/sparkle-pulse.json")}
                  autoPlay
                  loop
                  style={styles.noDataLottie}
                />
                <Text style={styles.noDataTitle}>No activity this month</Text>
                <Text style={styles.noDataText}>
                  Add income or expenses to view a daily trend for this month.
                </Text>
              </View>
            )}
          </InteractiveCard>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(360).delay(220)}>
          <BudgetProgress spent={Math.abs(net).toFixed(0)} budget={budget} primaryColor={primaryColor} />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(360).delay(260)}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#FAFAFA" },
  scrollContent: { paddingHorizontal: H_PADDING, paddingTop: 14, paddingBottom: 30 },
  center: { justifyContent: "center", alignItems: "center" },

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  header: { fontSize: RFValue(20), fontWeight: "700", color: "#222" },
  subheader: { fontSize: RFValue(12), color: "#777", marginTop: 4 },

  netPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  netText: { marginLeft: 8, fontWeight: "700" },

  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryCard: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  summaryTextWrap: { marginLeft: 8 },
  summaryLabel: { fontSize: RFValue(12), color: "#555" },
  summaryValue: { fontSize: RFValue(16), fontWeight: "800" },

  cardBlock: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  cardTitle: { fontSize: RFValue(14), fontWeight: "800", color: "#222" },
  chart: { borderRadius: 12, marginLeft: -40 },

  noDataBlock: {
    height: 190,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eee",
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    marginTop: 8,
  },
  noDataLottie: { width: 86, height: 86 },
  noDataTitle: { fontSize: RFValue(15), fontWeight: "700", color: "#444", marginTop: 4 },
  noDataText: {
    fontSize: RFValue(13),
    color: "#888",
    marginTop: 6,
    textAlign: "center",
    maxWidth: "90%",
  },

  clickedDataCard: {
    marginTop: 12,
    backgroundColor: "#F5F5F5",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  clickedDataHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  clickedDataDay: { fontSize: RFValue(13), fontWeight: "700", color: "#333" },
  clickedDataRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  clickedDataItem: { flex: 1 },
  clickedDataLabelRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  clickedDataDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  clickedDataLabel: { fontSize: RFValue(11), color: "#666", fontWeight: "500" },
  clickedDataValue: { fontSize: RFValue(16), fontWeight: "800" },
  clickedDataDivider: { width: 1, height: 40, backgroundColor: "#D0D0D0", marginHorizontal: 10 },
  clickedDataNet: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#D0D0D0",
  },
  clickedDataNetLabel: { fontSize: RFValue(12), color: "#666", fontWeight: "600" },
  clickedDataNetValue: { fontSize: RFValue(15), fontWeight: "800" },
});
