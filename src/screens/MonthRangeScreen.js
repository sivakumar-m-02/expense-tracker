import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTransactions } from "../context/TransactionContext";
import { useNavigation } from "@react-navigation/native";

const RUPEE = "\u20B9";
const { width } = Dimensions.get("window");
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTH_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];

// ─── Month Picker ──────────────────────────────────────────────────────────────
const MonthPicker = ({ label, value, onChange, highlightStart, highlightEnd }) => {
  const now = new Date();
  const [year, setYear] = useState(value.year);

  const isHighlighted = (m) => {
    if (!highlightStart || !highlightEnd) return false;
    const sy = highlightStart.year, sm = highlightStart.month;
    const ey = highlightEnd.year,   em = highlightEnd.month;
    const cy = year, cm = m;
    const after  = cy > sy || (cy === sy && cm >= sm);
    const before = cy < ey || (cy === ey && cm <= em);
    return after && before;
  };

  const isSelected = (m) => value.year === year && value.month === m;

  return (
    <View style={pk.container}>
      {/* Year row */}
      <View style={pk.yearRow}>
        <TouchableOpacity onPress={() => setYear(y => y - 1)} style={pk.yearBtn}>
          <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
        <Text style={pk.yearText}>{year}</Text>
        <TouchableOpacity onPress={() => setYear(y => Math.min(y + 1, now.getFullYear()))} style={pk.yearBtn}>
          <Ionicons name="chevron-forward" size={16} color={year >= now.getFullYear() ? "rgba(255,255,255,0.2)" : "rgba(255,255,255,0.6)"} />
        </TouchableOpacity>
      </View>

      {/* Month grid */}
      <View style={pk.grid}>
        {MONTH_NAMES.map((name, idx) => {
          const sel  = isSelected(idx);
          const high = isHighlighted(idx);
          return (
            <TouchableOpacity
              key={name}
              style={[
                pk.chip,
                high && pk.chipHighlight,
                sel  && pk.chipSelected,
              ]}
              onPress={() => onChange({ year, month: idx })}
              activeOpacity={0.7}
            >
              <Text style={[
                pk.chipText,
                high && pk.chipTextHighlight,
                sel  && pk.chipTextSelected,
              ]}>{name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

// ─── Main Screen ───────────────────────────────────────────────────────────────
const MonthRangeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { expenses, incomes } = useTransactions();

  const now = new Date();
  const [startMonth, setStartMonth] = useState({ year: now.getFullYear(), month: Math.max(0, now.getMonth() - 2) });
  const [endMonth,   setEndMonth]   = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [pickerMode, setPickerMode] = useState(null); // null | "start" | "end"
  const [applied, setApplied] = useState(false);

  // Clamp: end must not be before start
  const clampedEnd = useMemo(() => {
    const s = startMonth.year * 12 + startMonth.month;
    const e = endMonth.year   * 12 + endMonth.month;
    return e < s ? startMonth : endMonth;
  }, [startMonth, endMonth]);

  const toJSDate = (d) => {
    if (!d) return null;
    if (d?.seconds) return new Date(d.seconds * 1000);
    if (typeof d === "string" || typeof d === "number") return new Date(d);
    if (d instanceof Date) return d;
    return null;
  };

  // Build month range list
  const monthRange = useMemo(() => {
    const list = [];
    let y = startMonth.year, m = startMonth.month;
    const ey = clampedEnd.year, em = clampedEnd.month;
    while (y < ey || (y === ey && m <= em)) {
      list.push({ year: y, month: m });
      m++;
      if (m > 11) { m = 0; y++; }
      if (list.length > 60) break; // safety cap 5 years
    }
    return list;
  }, [startMonth, clampedEnd]);

  // Aggregate per-month
  const monthStats = useMemo(() => {
    return monthRange.map(({ year, month }) => {
      const inRange = (arr) => arr.filter(t => {
        const d = toJSDate(t.date);
        return d && d.getMonth() === month && d.getFullYear() === year;
      });
      const monthExp = inRange(expenses);
      const monthInc = inRange(incomes);
      const totalExpense = monthExp.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const totalIncome  = monthInc.reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const net = totalIncome - totalExpense;
      return { year, month, totalExpense, totalIncome, net };
    });
  }, [monthRange, expenses, incomes]);

  const grandTotals = useMemo(() => {
    return monthStats.reduce((acc, s) => ({
      expense: acc.expense + s.totalExpense,
      income:  acc.income  + s.totalIncome,
      net:     acc.net     + s.net,
    }), { expense: 0, income: 0, net: 0 });
  }, [monthStats]);

  const handleApply = () => {
    setPickerMode(null);
    setApplied(true);
  };

  const startLabel = `${MONTH_NAMES[startMonth.month]} ${startMonth.year}`;
  const endLabel   = `${MONTH_NAMES[clampedEnd.month]} ${clampedEnd.year}`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={["#050D1A", "#071828", "#0A2535", "#062520"]}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <LinearGradient
              colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
              style={styles.backBtnInner}
            >
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Month Range</Text>
          <View style={{ width: 36 }} />
        </View>

        {/* Range selector row */}
        <View style={styles.rangeRow}>
          <TouchableOpacity
            style={[styles.rangeChip, pickerMode === "start" && styles.rangeChipActive]}
            onPress={() => setPickerMode(pickerMode === "start" ? null : "start")}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar-outline" size={14} color={pickerMode === "start" ? "#00C9A7" : "rgba(255,255,255,0.5)"} style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.rangeChipLabel}>FROM</Text>
              <Text style={[styles.rangeChipValue, pickerMode === "start" && { color: "#00C9A7" }]}>{startLabel}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.rangeDivider}>
            <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.3)" />
          </View>

          <TouchableOpacity
            style={[styles.rangeChip, pickerMode === "end" && styles.rangeChipActive]}
            onPress={() => setPickerMode(pickerMode === "end" ? null : "end")}
            activeOpacity={0.75}
          >
            <Ionicons name="calendar-outline" size={14} color={pickerMode === "end" ? "#00C9A7" : "rgba(255,255,255,0.5)"} style={{ marginRight: 6 }} />
            <View>
              <Text style={styles.rangeChipLabel}>TO</Text>
              <Text style={[styles.rangeChipValue, pickerMode === "end" && { color: "#00C9A7" }]}>{endLabel}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Inline picker */}
        {pickerMode !== null && (
          <Animated.View entering={FadeInDown.duration(220)} style={styles.pickerBox}>
            <MonthPicker
              label={pickerMode === "start" ? "Start Month" : "End Month"}
              value={pickerMode === "start" ? startMonth : clampedEnd}
              onChange={(val) => {
                if (pickerMode === "start") {
                  setStartMonth(val);
                  // If new start > current end, push end forward
                  const s = val.year * 12 + val.month;
                  const e = clampedEnd.year * 12 + clampedEnd.month;
                  if (s > e) setEndMonth(val);
                } else {
                  setEndMonth(val);
                }
              }}
              highlightStart={startMonth}
              highlightEnd={clampedEnd}
            />
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <LinearGradient colors={["#00C9A7", "#00897B"]} style={styles.applyBtnInner}>
                <Text style={styles.applyBtnText}>Apply Range</Text>
                <Ionicons name="checkmark" size={16} color="#fff" style={{ marginLeft: 6 }} />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Grand total summary */}
        {monthStats.length > 0 && (
          <Animated.View entering={FadeInUp.duration(280).delay(60)} style={styles.summaryCard}>
            <LinearGradient colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]} style={styles.summaryCardInner}>
              <View style={styles.summaryCardBorder} />
              <Text style={styles.summaryCardTitle}>{startLabel} — {endLabel}</Text>
              <View style={styles.summaryCardRow}>
                <View style={styles.summaryPill}>
                  <LinearGradient colors={["rgba(29,233,182,0.2)", "rgba(29,233,182,0.07)"]} style={styles.summaryPillInner}>
                    <Ionicons name="arrow-down" size={14} color="#1DE9B6" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.summaryPillLabel}>Total In</Text>
                      <Text style={[styles.summaryPillValue, { color: "#1DE9B6" }]}>{RUPEE} {grandTotals.income.toLocaleString()}</Text>
                    </View>
                  </LinearGradient>
                </View>
                <View style={styles.summaryPill}>
                  <LinearGradient colors={["rgba(255,107,107,0.2)", "rgba(255,107,107,0.07)"]} style={styles.summaryPillInner}>
                    <Ionicons name="arrow-up" size={14} color="#FF6B6B" />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.summaryPillLabel}>Total Out</Text>
                      <Text style={[styles.summaryPillValue, { color: "#FF6B6B" }]}>{RUPEE} {grandTotals.expense.toLocaleString()}</Text>
                    </View>
                  </LinearGradient>
                </View>
              </View>
              <View style={styles.netRow}>
                <Text style={styles.netLabel}>Net Balance</Text>
                <Text style={[styles.netValue, { color: grandTotals.net >= 0 ? "#1DE9B6" : "#FF6B6B" }]}>
                  {grandTotals.net >= 0 ? "+" : ""}{RUPEE} {Math.abs(grandTotals.net).toLocaleString()}
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Per-month list */}
        {monthStats.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={40} color="rgba(255,255,255,0.15)" />
            <Text style={styles.emptyText}>Select a month range above</Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
            {monthStats.map(({ year, month, totalExpense, totalIncome, net }, i) => {
              const isPos = net >= 0;
              return (
                <Animated.View
                  key={`${year}-${month}`}
                  entering={FadeInDown.duration(220).delay(Math.min(i * 40, 200))}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.06)", "rgba(255,255,255,0.02)"]}
                    style={styles.monthCard}
                  >
                    {/* Month label */}
                    <View style={styles.monthLabelCol}>
                      <Text style={styles.monthName}>{MONTH_NAMES[month]}</Text>
                      <Text style={styles.monthYear}>{year}</Text>
                    </View>

                    {/* Income / Expense bars */}
                    <View style={styles.monthDataCol}>
                      <View style={styles.monthDataRow}>
                        <View style={[styles.dot, { backgroundColor: "#1DE9B6" }]} />
                        <Text style={styles.monthDataLabel}>In</Text>
                        <Text style={[styles.monthDataValue, { color: "#1DE9B6" }]}>
                          {RUPEE} {totalIncome.toLocaleString()}
                        </Text>
                      </View>
                      <View style={styles.monthDataRow}>
                        <View style={[styles.dot, { backgroundColor: "#FF6B6B" }]} />
                        <Text style={styles.monthDataLabel}>Out</Text>
                        <Text style={[styles.monthDataValue, { color: "#FF6B6B" }]}>
                          {RUPEE} {totalExpense.toLocaleString()}
                        </Text>
                      </View>
                    </View>

                    {/* Net pill */}
                    <View style={[styles.netPill, { backgroundColor: isPos ? "rgba(29,233,182,0.15)" : "rgba(255,107,107,0.15)" }]}>
                      <Ionicons
                        name={isPos ? "trending-up" : "trending-down"}
                        size={12}
                        color={isPos ? "#1DE9B6" : "#FF6B6B"}
                        style={{ marginBottom: 3 }}
                      />
                      <Text style={[styles.netPillLabel, { color: isPos ? "#1DE9B6" : "#FF6B6B" }]}>
                        {isPos ? "+" : "-"}{RUPEE}{Math.abs(net).toLocaleString()}
                      </Text>
                    </View>
                  </LinearGradient>
                </Animated.View>
              );
            })}
          </>
        )}
      </ScrollView>
    </View>
  );
};

export default MonthRangeScreen;

// ─── Picker styles ─────────────────────────────────────────────────────────────
const pk = StyleSheet.create({
  container: { paddingVertical: 8 },
  yearRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 14 },
  yearBtn: { padding: 8 },
  yearText: { fontSize: RFValue(15), fontWeight: "700", color: "#fff", minWidth: 50, textAlign: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: 8 },
  chip: {
    width: (width - 32 - 64) / 4 - 6,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  chipHighlight: {
    backgroundColor: "rgba(0,201,167,0.12)",
    borderColor: "rgba(0,201,167,0.25)",
  },
  chipSelected: {
    backgroundColor: "#00897B",
    borderColor: "#00C9A7",
  },
  chipText: { fontSize: RFValue(12), fontWeight: "600", color: "rgba(255,255,255,0.5)" },
  chipTextHighlight: { color: "#00C9A7" },
  chipTextSelected: { color: "#fff", fontWeight: "700" },
});

// ─── Main styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050D1A" },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  backBtn: {},
  backBtnInner: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  headerTitle: { fontSize: RFValue(17), fontWeight: "700", color: "#fff", letterSpacing: 0.2 },

  rangeRow: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 12, gap: 8 },
  rangeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rangeChipActive: {
    borderColor: "#00C9A7",
    backgroundColor: "rgba(0,201,167,0.08)",
  },
  rangeChipLabel: { fontSize: RFValue(9), fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 2 },
  rangeChipValue: { fontSize: RFValue(13), fontWeight: "700", color: "#fff" },
  rangeDivider: { alignItems: "center", justifyContent: "center", paddingHorizontal: 2 },

  pickerBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16,
    marginBottom: 12,
  },
  applyBtn: { marginTop: 14, borderRadius: 14, overflow: "hidden" },
  applyBtnInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 13 },
  applyBtnText: { fontSize: RFValue(14), fontWeight: "700", color: "#fff" },

  summaryCard: { marginBottom: 20, borderRadius: 22, overflow: "hidden" },
  summaryCardInner: { borderRadius: 22, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  summaryCardBorder: { position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.15)" },
  summaryCardTitle: { fontSize: RFValue(12), fontWeight: "600", color: "rgba(255,255,255,0.5)", letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 14 },
  summaryCardRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  summaryPill: { flex: 1, borderRadius: 14, overflow: "hidden" },
  summaryPillInner: { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  summaryPillLabel: { fontSize: RFValue(10), fontWeight: "600", color: "rgba(255,255,255,0.4)", marginBottom: 2 },
  summaryPillValue: { fontSize: RFValue(14), fontWeight: "800" },
  netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", paddingTop: 12 },
  netLabel: { fontSize: RFValue(13), color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  netValue: { fontSize: RFValue(16), fontWeight: "900" },

  sectionTitle: { fontSize: RFValue(15), fontWeight: "800", color: "#fff", marginBottom: 12, letterSpacing: 0.2 },

  monthCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  monthLabelCol: { width: 48 },
  monthName: { fontSize: RFValue(14), fontWeight: "800", color: "#fff" },
  monthYear: { fontSize: RFValue(10), color: "rgba(255,255,255,0.35)", marginTop: 2, fontWeight: "600" },
  monthDataCol: { flex: 1, paddingHorizontal: 14, gap: 5 },
  monthDataRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  monthDataLabel: { fontSize: RFValue(11), color: "rgba(255,255,255,0.4)", fontWeight: "600", width: RFValue(25) },
  monthDataValue: { fontSize: RFValue(12), fontWeight: "700" },
  netPill: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: "center" },
  netPillLabel: { fontSize: RFValue(11), fontWeight: "800" },

  emptyBox: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60, gap: 12 },
  emptyText: { fontSize: RFValue(14), color: "rgba(255,255,255,0.3)", fontWeight: "600" },
});