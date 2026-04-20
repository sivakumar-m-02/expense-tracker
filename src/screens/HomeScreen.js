import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  Modal,
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
} from "react-native-reanimated";
import { useTransactions } from "../context/TransactionContext";
import InteractiveCard from "../components/InteractiveCard";
import LottieLoader from "../components/LottieLoader";

const RUPEE = "\u20B9";

const HomeScreen = () => {
  const navigation = useNavigation();
  const {
    expenses,
    incomes,
    loading,
    error,
    primaryColor = "#37474F",
    selectedMonth,
    setSelectedMonth,
    selectedYear,
    setSelectedYear,
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

    const inMonth = (arr) =>
      arr.filter((t) => {
        const d = toJSDate(t.date);
        return d && d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
      });

    const isToday = (d) =>
      d &&
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear();

    const monthExpenses = inMonth(expenses);
    const monthIncomes = inMonth(incomes);

    const totalExpense = monthExpenses.reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const totalIncome = monthIncomes.reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const todaysExpense = monthExpenses
      .filter((t) => isToday(toJSDate(t.date)))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const todaysIncome = monthIncomes
      .filter((t) => isToday(toJSDate(t.date)))
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

    const mergedRecent = [...monthExpenses, ...monthIncomes].sort((a, b) => {
      const da = toJSDate(a.date) || 0;
      const db = toJSDate(b.date) || 0;
      return db - da;
    });

    return {
      balance: totalIncome - totalExpense,
      recent: mergedRecent.slice(0, 6),
      todayIncome: todaysIncome,
      todayExpense: todaysExpense,
    };
  }, [expenses, incomes, selectedMonth, selectedYear]);

  useEffect(() => {
    balanceIntro.value = 0;
    balanceIntro.value = withSpring(1, { damping: 15, stiffness: 145, mass: 0.4 });
  }, [balance, selectedMonth, selectedYear, balanceIntro]);

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

  const renderTx = ({ item, index }) => {
    const isIncome = item.type === "income";
    const d = toJSDate(item.date);
    const amountColor = isIncome ? "#4CAF50" : "#F44336";
    const amountPrefix = isIncome ? "+" : "-";

    let dateStr = "";
    if (d) {
      const momentDate = require("moment")(d);
      dateStr = `${momentDate.format("ddd")} ${momentDate.format("DD")}`;
    }

    return (
      <Animated.View
        entering={FadeInDown.duration(350).delay(Math.min(index * 55, 250))}
        layout={Layout.springify().damping(16).stiffness(160)}
      >
        <InteractiveCard style={styles.txCardWrap} pressScale={0.986}>
          <View style={styles.txItem}>
            <View style={styles.txIconWrap}>
              <Ionicons
                name={isIncome ? "trending-up" : "trending-down"}
                size={RFValue(18)}
                color={amountColor}
              />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.txTitle} numberOfLines={1}>
                {item.category || (isIncome ? "Income" : "Expense")}
              </Text>
              {!!item.note && (
                <Text style={styles.txNote} numberOfLines={1}>
                  {item.note}
                </Text>
              )}
              <View style={styles.txDateRow}>
                <Text style={styles.txDate}>{dateStr}</Text>
                <Text style={styles.txDate}>
                  , {d ? require("moment")(d).format("hh:mm A") : ""}
                </Text>
              </View>
            </View>

            <Text style={[styles.txAmount, { color: amountColor }]}>
              {amountPrefix}
              {RUPEE} {item.amount ?? 0}
            </Text>
          </View>
        </InteractiveCard>
      </Animated.View>
    );
  };

  if (error) {
    return (
      <View style={styles.loader}>
        <Ionicons
          name="alert-circle-outline"
          size={44}
          color="#E53935"
          style={{ marginBottom: 12 }}
        />
        <Text style={styles.errorTitle}>Error</Text>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loader}>
        <LottieLoader
          color={primaryColor}
          title="Loading your dashboard"
          subtitle="Preparing your latest income and expense snapshot."
        />
      </View>
    );
  }

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const yearOptions = Array.from({ length: 11 }, (_, i) => now.getFullYear() - 2 + i);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "right", "left"]}>
      <View style={styles.topWrap}>
        <Modal visible={showFilterModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <TouchableOpacity
                style={[styles.closeBtn, { backgroundColor: primaryColor }]}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={20} color="#fff" />
              </TouchableOpacity>

              {modalStep === "month" ? (
                <>
                  <Text style={styles.modalTitle}>Select Month</Text>
                  <View style={styles.optionGrid}>
                    {monthNames.map((name, idx) => (
                      <TouchableOpacity
                        key={name}
                        style={[
                          styles.optionChip,
                          { backgroundColor: tempMonth === idx ? primaryColor : "#eee" },
                        ]}
                        onPress={() => setTempMonth(idx)}
                      >
                        <Text
                          style={{
                            color: tempMonth === idx ? "#fff" : "#333",
                            fontWeight: "700",
                          }}
                        >
                          {name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TouchableOpacity
                    style={[styles.modalPrimaryBtn, { backgroundColor: primaryColor }]}
                    onPress={() => setModalStep("year")}
                  >
                    <Text style={styles.modalPrimaryBtnText}>Next: Select Year</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={styles.modalTitle}>Select Year</Text>
                  <View style={styles.optionGrid}>
                    {yearOptions.map((yr) => (
                      <TouchableOpacity
                        key={yr}
                        style={[
                          styles.optionChip,
                          { backgroundColor: tempYear === yr ? primaryColor : "#eee" },
                        ]}
                        onPress={() => setTempYear(yr)}
                      >
                        <Text
                          style={{
                            color: tempYear === yr ? "#fff" : "#333",
                            fontWeight: "700",
                          }}
                        >
                          {yr}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  <View style={styles.modalActionsRow}>
                    <TouchableOpacity style={styles.modalBackBtn} onPress={() => setModalStep("month")}>
                      <Text style={styles.modalBackText}>Back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.modalApplyBtn, { backgroundColor: primaryColor }]}
                      onPress={() => {
                        setSelectedMonth(tempMonth);
                        setSelectedYear(tempYear);
                        setShowFilterModal(false);
                      }}
                    >
                      <Text style={styles.modalApplyText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>

        <Animated.View style={balanceCardAnimatedStyle}>
          <InteractiveCard style={{ borderRadius: 18 }} pressScale={0.985}>
            <LinearGradient
              colors={["#a6a6a6", "#f2f2f2", "#a6a6a6"]}
              style={styles.balanceCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.balanceHeadRow}>
                <View>
                  <Text style={styles.balanceTitle}>
                    {monthNames[selectedMonth]} {selectedYear}
                  </Text>
                  <Text style={styles.balanceAmount}>
                    {RUPEE} {balance}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowFilterModal(true);
                    setModalStep("month");
                    setTempMonth(selectedMonth);
                    setTempYear(selectedYear);
                  }}
                >
                  <Ionicons name="options-outline" size={22} color="#000" style={{ alignSelf: "center" }} />
                </TouchableOpacity>
              </View>

              <View style={styles.ieRow}>
                <View style={[styles.iePillBox, styles.incomeBox]}>
                  <Ionicons name="arrow-down" size={20} color="#fff" style={styles.pillIcon} />
                  <Text style={styles.ieValue}>{formatAmount(todayIncome)}</Text>
                </View>
                <View style={[styles.iePillBox, styles.expenseBox]}>
                  <Ionicons name="arrow-up" size={20} color="#fff" style={styles.pillIcon} />
                  <Text style={styles.ieValue}>{formatAmount(todayExpense)}</Text>
                </View>
              </View>
            </LinearGradient>
          </InteractiveCard>
        </Animated.View>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.actionsRow}>
          <Animated.View style={styles.actionBtnWrap} entering={FadeInUp.duration(350).delay(60)}>
            <InteractiveCard
              style={[styles.actionBtn, { backgroundColor: primaryColor }]}
              onPress={() => navigation.navigate("AddExpense", { initialTab: 1 })}
            >
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.actionText}>Cash In</Text>
            </InteractiveCard>
          </Animated.View>

          <Animated.View style={styles.actionBtnWrap} entering={FadeInUp.duration(350).delay(130)}>
            <InteractiveCard
              style={[styles.actionBtn, { backgroundColor: primaryColor }]}
              onPress={() => navigation.navigate("AddExpense", { initialTab: 0 })}
            >
              <Ionicons name="remove-circle" size={22} color="#fff" />
              <Text style={styles.actionText}>Cash Out</Text>
            </InteractiveCard>
          </Animated.View>

          <Animated.View style={styles.actionBtnWrap} entering={FadeInUp.duration(350).delay(200)}>
            <InteractiveCard
              style={[styles.actionBtn, { backgroundColor: primaryColor }]}
              onPress={() => navigation.navigate("ListExpenses")}
            >
              <Ionicons name="list" size={22} color="#fff" />
              <Text style={styles.actionText}>Expenses</Text>
            </InteractiveCard>
          </Animated.View>
        </View>

        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        {recent.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="file-tray-outline" size={22} color="#999" />
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
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#F8F8F8" },
  topWrap: { paddingHorizontal: 14, paddingTop: 14 },
  container: { flex: 1, backgroundColor: "#F8F8F8", padding: 14 },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  errorTitle: {
    color: "#E53935",
    fontWeight: "700",
    fontSize: 18,
    marginBottom: 8,
  },
  errorText: {
    color: "#333",
    fontSize: 15,
    textAlign: "center",
    maxWidth: 280,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.18)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 18,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 18,
    padding: 22,
    minWidth: 280,
    width: "100%",
    maxWidth: 370,
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    borderRadius: 999,
    padding: 3,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontWeight: "700",
    fontSize: RFValue(16),
    marginBottom: 12,
    textAlign: "center",
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },
  optionChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    margin: 4,
  },
  modalPrimaryBtn: {
    marginTop: 18,
    borderRadius: 8,
    paddingVertical: 10,
  },
  modalPrimaryBtnText: { color: "#fff", fontWeight: "700", textAlign: "center" },
  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  modalBackBtn: {
    backgroundColor: "#eee",
    borderRadius: 8,
    paddingVertical: 10,
    flex: 1,
    marginRight: 8,
  },
  modalBackText: { color: "#333", fontWeight: "700", textAlign: "center" },
  modalApplyBtn: { borderRadius: 8, paddingVertical: 10, flex: 1 },
  modalApplyText: { color: "#fff", fontWeight: "700", textAlign: "center" },

  balanceCard: {
    borderRadius: 18,
    padding: 22,
    marginBottom: 18,
    shadowColor: "#FF9800",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  balanceHeadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  balanceTitle: {
    color: "#404040",
    fontSize: RFValue(15),
    opacity: 0.95,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  balanceAmount: {
    color: "#404040",
    fontSize: RFValue(34),
    fontWeight: "900",
    marginTop: 8,
    marginBottom: 8,
    letterSpacing: 1.2,
    textShadowColor: "rgba(0,0,0,0.12)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  ieRow: {
    flexDirection: "row",
    marginTop: 16,
    justifyContent: "space-between",
  },
  iePillBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 50,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginHorizontal: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 3,
  },
  incomeBox: { backgroundColor: "#43A047" },
  expenseBox: { backgroundColor: "#E53935" },
  pillIcon: { marginRight: 8 },
  ieValue: { color: "#fff", fontSize: RFValue(15), fontWeight: "700" },

  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  actionBtnWrap: { flex: 1, marginHorizontal: 4 },
  actionBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  actionText: {
    color: "#fff",
    fontSize: RFValue(14),
    fontWeight: "500",
    marginLeft: 6,
  },

  sectionTitle: {
    fontSize: RFValue(16.5),
    fontWeight: "700",
    color: "#333",
    marginBottom: 10,
    marginTop: 4,
  },
  txCardWrap: { borderRadius: 12, marginBottom: 10 },
  txItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },
  txIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f2f2f2",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  txTitle: { fontSize: RFValue(14), fontWeight: "600", color: "#222" },
  txNote: { fontSize: RFValue(12), color: "#666", marginTop: 2 },
  txDateRow: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  txDate: { fontSize: RFValue(11), color: "#999" },
  txAmount: { fontSize: RFValue(14), fontWeight: "700", marginLeft: 8 },

  emptyBox: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  emptyText: {
    marginTop: 6,
    color: "#777",
    fontSize: RFValue(12),
    fontWeight: "600",
  },
});
