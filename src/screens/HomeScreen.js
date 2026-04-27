import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
  StatusBar,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";
import Animated, {
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withDelay,
  interpolate,
  Easing,
} from "react-native-reanimated";
import { useTransactions } from "../context/TransactionContext";
import InteractiveCard from "../components/InteractiveCard";
import LottieLoader from "../components/LottieLoader";

const RUPEE = "\u20B9";
const { width } = Dimensions.get("window");

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

  const { balance, recent, todayIncome, todayExpense } = useMemo(() => {
    const today = new Date();
    const inMonth = (arr) => arr.filter((t) => {
      const d = toJSDate(t.date);
      return d && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    const isToday = (d) => d && d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
    const monthExpenses = inMonth(expenses);
    const monthIncomes = inMonth(incomes);
    const totalExpense = monthExpenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalIncome = monthIncomes.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const todaysExpense = monthExpenses.filter((t) => isToday(toJSDate(t.date))).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const todaysIncome = monthIncomes.filter((t) => isToday(toJSDate(t.date))).reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const mergedRecent = [...monthExpenses, ...monthIncomes].sort((a, b) => (toJSDate(b.date) || 0) - (toJSDate(a.date) || 0));
    return { balance: totalIncome - totalExpense, recent: mergedRecent.slice(0, 6), todayIncome: todaysIncome, todayExpense: todaysExpense };
  }, [expenses, incomes, selectedMonth, selectedYear]);

  useEffect(() => {
    balanceIntro.value = 0;
    balanceIntro.value = withSpring(1, { damping: 18, stiffness: 180, mass: 0.35 });
  }, [balance, selectedMonth, selectedYear]);

  const balanceCardAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 0.72 + balanceIntro.value * 0.28,
    transform: [{ translateY: (1 - balanceIntro.value) * 14 }, { scale: 0.986 + balanceIntro.value * 0.014 }],
  }));

  const formatAmount = (amt) => {
    if (amt >= 1000) { const val = amt % 1000 === 0 ? amt / 1000 : (amt / 1000).toFixed(1); return `${val}k`; }
    return amt;
  };

  const renderTx = ({ item, index }) => {
    const isIncome = item.type === "income";
    const d = toJSDate(item.date);
    const amountColor = isIncome ? "#1DE9B6" : "#FF6B6B";
    const amountPrefix = isIncome ? "+" : "-";
    let dateStr = "";
    if (d) { const m = require("moment")(d); dateStr = `${m.format("ddd")} ${m.format("DD")}`; }

    return (
      <Animated.View
        entering={FadeInDown.duration(280).delay(Math.min(index * 40, 160))}
        layout={Layout.springify().damping(18).stiffness(180)}
      >
        <InteractiveCard style={styles.txCardWrap} pressScale={0.986}>
          <View style={styles.txItem}>
            <LinearGradient
              colors={isIncome ? ["rgba(29,233,182,0.15)", "rgba(29,233,182,0.05)"] : ["rgba(255,107,107,0.15)", "rgba(255,107,107,0.05)"]}
              style={styles.txIconWrap}
            >
              <Ionicons name={isIncome ? "trending-up" : "trending-down"} size={RFValue(16)} color={amountColor} />
            </LinearGradient>
            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle} numberOfLines={1}>{item.category || (isIncome ? "Income" : "Expense")}</Text>
              {!!item.note && <Text style={styles.txNote} numberOfLines={1}>{item.note}</Text>}
              <Text style={styles.txDate}>{dateStr}{d ? `, ${require("moment")(d).format("hh:mm A")}` : ""}</Text>
            </View>
            <Text style={[styles.txAmount, { color: amountColor }]}>{amountPrefix}{RUPEE} {item.amount ?? 0}</Text>
          </View>
        </InteractiveCard>
      </Animated.View>
    );
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

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={["#050D1A", "#071828", "#0A2535", "#062520"]} locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />

      <FloatingOrb size={180} color="#00695C" delay={0} startX={-60} startY={80} />
      <FloatingOrb size={140} color="#1565C0" delay={600} startX={width - 80} startY={200} />
      <FloatingOrb size={100} color="#00897B" delay={1200} startX={width * 0.4} startY={350} />

      <SafeAreaView style={styles.safeArea} edges={["top", "right", "left"]}>

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
                        <Text style={{ color: tempMonth === idx ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: "700", fontSize: RFValue(12) }}>{name}</Text>
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
                        <Text style={{ color: tempYear === yr ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: "700", fontSize: RFValue(12) }}>{yr}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity style={styles.modalBackBtn} onPress={() => setModalStep("month")}>
                      <Text style={styles.modalBackText}>← Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.modalApplyBtn} onPress={() => { setSelectedMonth(tempMonth); setSelectedYear(tempYear); setShowFilterModal(false); }}>
                      <Text style={styles.modalApplyText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        <View style={styles.topWrap}>
          <Animated.View style={balanceCardAnimatedStyle}>
            <LinearGradient colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]} style={styles.balanceCard}>
              <View style={styles.balanceCardBorder} />
              <View style={styles.balanceHeadRow}>
                <View>
                  <Text style={styles.balanceTitle}>{monthNames[selectedMonth]} {selectedYear}</Text>
                  <Text style={[styles.balanceAmount, { color: isPositive ? "#1DE9B6" : "#FF6B6B" }]}>
                    {RUPEE} {balance}
                  </Text>
                  <Text style={styles.balanceSubtitle}>{isPositive ? "Surplus this month" : "Deficit this month"}</Text>
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
          contentContainerStyle={{ paddingBottom: 100 }}
        >

          <View style={styles.actionsRow}>
            {[
              { label: "Cash In",  icon: "add-circle",    screen: "AddExpense", params: { initialTab: 1 }, color: ["#00C9A7", "#00897B"] },
              { label: "Cash Out", icon: "remove-circle", screen: "AddExpense", params: { initialTab: 0 }, color: ["#FF6B6B", "#E53935"] },
              { label: "History",  icon: "list",          screen: "ListExpenses",params: {},              color: ["#5C9BFF", "#1565C0"] },
            ].map((btn, i) => (
              <Animated.View key={btn.label} style={styles.actionBtnWrap} entering={FadeInUp.duration(280).delay(40 + i * 50)}>
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

          <Animated.View entering={FadeInDown.delay(150)}>
            <Text style={styles.sectionTitle}>Recent Transactions</Text>
          </Animated.View>

          {recent.length === 0 ? (
            <View style={styles.emptyBox}>
              <Ionicons name="file-tray-outline" size={32} color="rgba(255,255,255,0.2)" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            <FlatList
              data={recent}
              keyExtractor={(item) => item.id + item.type}
              renderItem={renderTx}
              scrollEnabled={false}
              contentContainerStyle={{ paddingBottom: RFValue(20) }}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

export default HomeScreen;

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

  actionsRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22, gap: 8 },
  actionBtnWrap: { flex: 1 },
  actionBtnOuter: { borderRadius: 16, overflow: "hidden" },
  actionBtn: { borderRadius: 16, paddingVertical: 14, alignItems: "center", gap: 4 },
  actionText: { color: "#fff", fontSize: RFValue(11), fontWeight: "700", marginTop: 2 },

  sectionTitle: { fontSize: RFValue(16), fontWeight: "800", color: "#fff", marginBottom: 12, letterSpacing: 0.2 },

  txCardWrap: { borderRadius: 16, marginBottom: 10 },
  txItem: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  txIconWrap: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  txTitle: { fontSize: RFValue(14), fontWeight: "700", color: "#fff" },
  txNote: { fontSize: RFValue(11), color: "rgba(255,255,255,0.4)", marginTop: 2 },
  txDate: { fontSize: RFValue(11), color: "rgba(255,255,255,0.3)", marginTop: 3 },
  txAmount: { fontSize: RFValue(14), fontWeight: "800", marginLeft: 8 },

  emptyBox: { backgroundColor: "rgba(255,255,255,0.04)", borderRadius: 16, padding: 28, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  emptyText: { marginTop: 8, color: "rgba(255,255,255,0.3)", fontSize: RFValue(13), fontWeight: "600" },

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
