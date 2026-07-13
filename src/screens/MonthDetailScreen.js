import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Modal,
  TextInput,
  Animated,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";
import { Swipeable } from "react-native-gesture-handler";
import ReAnimated, { FadeInDown } from "react-native-reanimated";
import { useNavigation, useRoute } from "@react-navigation/native";
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import moment from "moment";
import { useTransactions } from "../context/TransactionContext";
import AppPromptModal from "../components/AppPromptModal";
import useAppModal from "../hooks/useAppModal";

const RUPEE = "\u20B9";
const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const toJSDate = (d) => {
  if (!d) return null;
  if (d?.seconds) return new Date(d.seconds * 1000);
  if (typeof d === "string" || typeof d === "number") return new Date(d);
  if (d instanceof Date) return d;
  return null;
};

const MonthDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { year, month } = route.params || {};

  const { expenses, incomes, removeLocalPendingExpense } = useTransactions();
  const { showModal: showPrompt, modalProps } = useAppModal();

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    Animated.timing(searchBarAnim, {
      toValue: searchFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchFocused]);

  const searchBorderColor = searchBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(255,255,255,0.1)", "#00C9A7"],
  });

  // ── Transactions scoped to this month/year ────────────────────────────────
  const monthTransactions = useMemo(() => {
    const inMonth = (arr) =>
      arr.filter((t) => {
        const d = toJSDate(t.date);
        return d && d.getMonth() === month && d.getFullYear() === year;
      });
    const all = [...inMonth(expenses), ...inMonth(incomes)].sort(
      (a, b) => toJSDate(b.date) - toJSDate(a.date)
    );
    return all;
  }, [expenses, incomes, month, year]);

  const isSearchActive = searchQuery.trim().length > 0;
  const isFilterActive = isSearchActive;

  const filteredTransactions = useMemo(() => {
    if (!isSearchActive) return monthTransactions;
    const q = searchQuery.trim().toLowerCase();
    return monthTransactions.filter(
      (t) =>
        (t.category || "").toLowerCase().includes(q) ||
        (t.subcategory || "").toLowerCase().includes(q) ||
        (t.note || "").toLowerCase().includes(q)
    );
  }, [monthTransactions, searchQuery, isSearchActive]);

  const {
    sections,
    totalExpense,
    totalIncome,
    netTotal,
    isNetPositive,
    filteredExpense,
    filteredIncome,
    filteredNet,
    isFilteredNetPositive,
  } = useMemo(() => {
    const expenseTotal = monthTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const incomeTotal = monthTransactions
      .filter((t) => t.type !== "expense")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const net = incomeTotal - expenseTotal;

    const fExp = filteredTransactions
      .filter((t) => t.type === "expense")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const fInc = filteredTransactions
      .filter((t) => t.type !== "expense")
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
    const fNet = fInc - fExp;

    const groupByDate = {};
    filteredTransactions.forEach((item) => {
      const d = toJSDate(item.date);
      const dateStr = `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${d.toLocaleDateString("en-US", { weekday: "long" })}`;
      if (!groupByDate[dateStr]) groupByDate[dateStr] = [];
      groupByDate[dateStr].push(item);
    });
    const sectionData = Object.keys(groupByDate).map((title) => ({
      title,
      data: groupByDate[title],
    }));

    return {
      sections: sectionData,
      totalExpense: expenseTotal,
      totalIncome: incomeTotal,
      netTotal: net,
      isNetPositive: net >= 0,
      filteredExpense: fExp,
      filteredIncome: fInc,
      filteredNet: fNet,
      isFilteredNetPositive: fNet >= 0,
    };
  }, [monthTransactions, filteredTransactions]);

  // ── Delete / edit handlers (mirrors ListExpensesScreen) ───────────────────
  const handleDelete = async (item) => {
    try {
      if (item?.pending) {
        await removeLocalPendingExpense(item.id);
        return;
      }
      const user = auth().currentUser;
      if (!user) return;
      await firestore()
        .collection("users")
        .doc(user.uid)
        .collection(item.type === "expense" ? "expenses" : "income")
        .doc(item.id)
        .delete();
    } catch (error) {
      console.log("Error deleting:", error);
      showPrompt({
        type: "error",
        title: "Delete Failed",
        message: "Unable to delete the expense. Please try again.",
      });
    }
  };

  const confirmDelete = (item) => {
    showPrompt({
      type: "warning",
      title: "Confirm Delete",
      message: "Are you sure you want to delete this transaction? This cannot be undone.",
      buttons: [
        { text: "Cancel", style: "secondary" },
        { text: "Delete", style: "danger", onPress: () => handleDelete(item) },
      ],
    });
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) return;
      const ref = firestore()
        .collection("users")
        .doc(user.uid)
        .collection(editItem.type === "expense" ? "expenses" : "income")
        .doc(editItem.id);
      const updateData = { amount: Number(editAmount), note: editNote };
      if (editItem.category === "Food") updateData.subcategory = editSubcategory;
      await ref.update(updateData);
      setEditModalVisible(false);
      setEditItem(null);
    } catch (error) {
      console.log("Error editing:", error);
    }
    setEditLoading(false);
  };

  const renderRightActions = (item) => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", height: "96%" }}>
      <TouchableOpacity
        style={styles.editContainer}
        onPress={() => {
          setEditItem(item);
          setEditAmount(String(item.amount));
          setEditNote(item.note || "");
          setEditSubcategory(item.subcategory || "");
          setEditModalVisible(true);
        }}
      >
        <Ionicons name="create" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteContainer} onPress={() => confirmDelete(item)}>
        <Ionicons name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => {
    const d = toJSDate(item.date);
    const displayDate = d ? moment(d).format("h:mm a") : "";
    const query = searchQuery.trim().toLowerCase();
    const catLabel = item.subcategory ? `${item.category} - ${item.subcategory}` : item.category;
    const isIncome = item.type !== "expense";
    const amountColor = isIncome ? "#1DE9B6" : "#FF6B6B";

    const highlightText = (text) => {
      if (!text || !query || !isSearchActive) return <Text style={styles.category}>{text}</Text>;
      const lower = text.toLowerCase();
      const idx = lower.indexOf(query);
      if (idx === -1) return <Text style={styles.category}>{text}</Text>;
      return (
        <Text style={styles.category}>
          {text.slice(0, idx)}
          <Text style={[styles.category, { backgroundColor: "#00C9A720", color: "#00C9A7", fontWeight: "700" }]}>
            {text.slice(idx, idx + query.length)}
          </Text>
          {text.slice(idx + query.length)}
        </Text>
      );
    };

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <View style={styles.transactionCard}>
          <LinearGradient
            colors={
              isIncome
                ? ["rgba(29,233,182,0.12)", "rgba(29,233,182,0.04)"]
                : ["rgba(255,107,107,0.12)", "rgba(255,107,107,0.04)"]
            }
            style={styles.txIconWrap}
          >
            <Ionicons name={isIncome ? "trending-up" : "trending-down"} size={RFValue(16)} color={amountColor} />
          </LinearGradient>
          <View style={styles.leftContent}>
            <View style={{ flex: 1 }}>
              {isSearchActive ? highlightText(catLabel) : <Text style={styles.category}>{catLabel}</Text>}
              {item.note ? (
                <Text style={styles.note} numberOfLines={1}>
                  {item.note}
                </Text>
              ) : null}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.amount, { color: amountColor }]}>
              {isIncome ? "+" : "-"}{RUPEE} {item.amount}
            </Text>
            <Text style={styles.date}>{displayDate}</Text>
          </View>
        </View>
      </Swipeable>
    );
  };

  const renderEmpty = () => (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: 60 }}>
      {isSearchActive ? (
        <>
          <Ionicons name="search-outline" size={60} color="rgba(255,255,255,0.12)" />
          <Text style={styles.emptyTitle}>No results for "{searchQuery}"</Text>
          <Text style={styles.emptySub}>Try a different search term</Text>
        </>
      ) : (
        <>
          <Ionicons name="document-text-outline" size={80} color="rgba(255,255,255,0.1)" />
          <Text style={styles.emptySub}>No transactions this month</Text>
        </>
      )}
    </View>
  );

  // ── Search result summary bar (mirrors ListExpensesScreen) ────────────────
  const SearchResultBar = () => {
    if (!isFilterActive) return null;
    const count = filteredTransactions.length;
    return (
      <View style={srb.wrap}>
        <View style={srb.left}>
          <Ionicons name="filter" size={13} color="#00C9A7" />
          <Text style={[srb.countText, { color: "#00C9A7" }]}>{count} result{count !== 1 ? "s" : ""}</Text>
          {isSearchActive && (
            <>
              <Text style={srb.forText}>for </Text>
              <Text style={srb.queryText}>"{searchQuery}"</Text>
            </>
          )}
        </View>
        {count > 0 && (
          <View
            style={[
              srb.pill,
              { backgroundColor: isFilteredNetPositive ? "rgba(29,233,182,0.15)" : "rgba(255,107,107,0.15)" },
            ]}
          >
            <Text
              style={[
                srb.pillText,
                { color: isFilteredNetPositive ? "#1DE9B6" : "#FF6B6B", fontWeight: "700" },
              ]}
            >
              Net {isFilteredNetPositive ? "+" : "-"}{RUPEE}{Math.abs(filteredNet).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  // ── List header: summary card + search result bar scroll away with the list ──
  const ListHeader = () => (
    <>
      <ReAnimated.View entering={FadeInDown.duration(240)} style={styles.summaryCard}>
        <LinearGradient colors={["rgba(255,255,255,0.07)", "rgba(255,255,255,0.03)"]} style={styles.summaryCardInner}>
          <View style={styles.summaryCardRow}>
            <View style={styles.summaryPill}>
              <LinearGradient colors={["rgba(29,233,182,0.2)", "rgba(29,233,182,0.07)"]} style={styles.summaryPillInner}>
                <Ionicons name="arrow-down" size={14} color="#1DE9B6" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.summaryPillLabel}>Total In</Text>
                  <Text style={[styles.summaryPillValue, { color: "#1DE9B6" }]}>{RUPEE} {totalIncome.toLocaleString()}</Text>
                </View>
              </LinearGradient>
            </View>
            <View style={styles.summaryPill}>
              <LinearGradient colors={["rgba(255,107,107,0.2)", "rgba(255,107,107,0.07)"]} style={styles.summaryPillInner}>
                <Ionicons name="arrow-up" size={14} color="#FF6B6B" />
                <View style={{ marginLeft: 8 }}>
                  <Text style={styles.summaryPillLabel}>Total Out</Text>
                  <Text style={[styles.summaryPillValue, { color: "#FF6B6B" }]}>{RUPEE} {totalExpense.toLocaleString()}</Text>
                </View>
              </LinearGradient>
            </View>
          </View>
          <View style={styles.netRow}>
            <Text style={styles.netLabel}>Net Balance</Text>
            <Text style={[styles.netValue, { color: isNetPositive ? "#1DE9B6" : "#FF6B6B" }]}>
              {isNetPositive ? "+" : ""}{RUPEE} {Math.abs(netTotal).toLocaleString()}
            </Text>
          </View>
        </LinearGradient>
      </ReAnimated.View>

      <SearchResultBar />
    </>
  );

  // ── List footer: gentle end-of-list cap so the last card doesn't feel cut off ──
  const ListFooter = () => {
    if (sections.length === 0) return null;
    return (
      <View style={styles.listFooter}>
        <View style={styles.listFooterLine} />
        <Text style={styles.listFooterText}>You've reached the end</Text>
      </View>
    );
  };

  const monthLabel = `${MONTH_NAMES[month] ?? ""} ${year ?? ""}`;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient
        colors={["#050D1A", "#071828", "#0A2535"]}
        style={StyleSheet.absoluteFill}
      />

      {/* Edit Modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Transaction</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="Amount"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            {editItem?.category === "Food" && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: RFValue(13), fontWeight: "600", marginBottom: 8, color: "rgba(255,255,255,0.7)" }}>
                  Subcategory
                </Text>
                <View style={{ borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", borderRadius: 14, overflow: "hidden" }}>
                  {["Breakfast", "Lunch", "Dinner", "Snacks", "Drinks"].map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={{ padding: 12, backgroundColor: editSubcategory === sub ? "#00897B" : "transparent" }}
                      onPress={() => setEditSubcategory(sub)}
                    >
                      <Text style={{ color: editSubcategory === sub ? "#fff" : "rgba(255,255,255,0.6)", fontWeight: "500" }}>
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <TextInput
              style={styles.input}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Note"
              multiline
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setEditModalVisible(false)} disabled={editLoading}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: "#00897B" }]} onPress={handleEditSave} disabled={editLoading}>
                <Text style={[styles.modalBtnText, { color: "#fff" }]}>{editLoading ? "Saving..." : "Save"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Header */}
      <SafeAreaView edges={["top"]} style={{ paddingHorizontal: 16, paddingBottom: 4 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
            <LinearGradient colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]} style={styles.backBtnInner}>
              <Ionicons name="chevron-back" size={18} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerTitle}>{monthLabel}</Text>
            <Text style={styles.headerSub}>
              {monthTransactions.length} transaction{monthTransactions.length !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Search bar */}
        <Animated.View style={[searchStyles.bar, { borderColor: searchBorderColor }]}>
          <Ionicons name="search" size={17} color={searchFocused ? "#00C9A7" : "rgba(255,255,255,0.25)"} style={{ marginRight: 9 }} />
          <TextInput
            ref={searchInputRef}
            style={searchStyles.input}
            placeholder="Search by category or note…"
            placeholderTextColor="rgba(255,255,255,0.25)"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); searchInputRef.current?.blur(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={searchStyles.clearBtn}>
                <Ionicons name="close" size={12} color="#00C9A7" />
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
      </SafeAreaView>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id + item.type}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => {
          const { title, data } = section;
          const dayTotal = data.reduce((sum, item) => {
            const amt = item.type === "expense" ? -Math.abs(item.amount || 0) : Math.abs(item.amount || 0);
            return sum + amt;
          }, 0);
          const isPositive = dayTotal >= 0;
          return (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionHeaderText}>{title}</Text>
              </View>
              <View
                style={[
                  styles.sectionHeader,
                  { alignItems: "flex-end", borderRadius: 50, backgroundColor: isPositive ? "rgba(29,233,182,0.15)" : "rgba(255,107,107,0.15)" },
                ]}
              >
                <Text style={[styles.sectionHeaderText, { color: isPositive ? "#1DE9B6" : "#FF6B6B" }]}>
                  {isPositive ? "+" : "-"} {RUPEE} {Math.abs(dayTotal)}
                </Text>
              </View>
            </View>
          );
        }}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, flexGrow: 1, paddingTop: 4 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      <AppPromptModal {...modalProps} />
    </View>
  );
};

export default MonthDetailScreen;

const searchStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 10,
  },
  input: { flex: 1, fontSize: RFValue(13), color: "#fff", padding: 0, margin: 0 },
  clearBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(0,201,167,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
});

// ─── Search result bar styles (mirrors ListExpensesScreen's `srb`) ────────────
const srb = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 6, marginBottom: 2, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 14, paddingVertical: 9, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  left: { flexDirection: "row", alignItems: "center", gap: 4 },
  countText: { fontSize: RFValue(11), fontWeight: "800", marginLeft: 4 },
  forText: { fontSize: RFValue(11), color: "rgba(255,255,255,0.35)" },
  queryText: { fontSize: RFValue(11), color: "rgba(255,255,255,0.6)", fontWeight: "700", fontStyle: "italic" },
  pill: { flexDirection: "row", alignItems: "center", gap: 3, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  pillText: { fontSize: RFValue(10) },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#050D1A" },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12 },
  backBtn: {},
  backBtnInner: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)" },
  headerTitle: { fontSize: RFValue(17), fontWeight: "700", color: "#fff", letterSpacing: 0.2 },
  headerSub: { fontSize: RFValue(11), color: "rgba(255,255,255,0.4)", marginTop: 2, fontWeight: "600" },

  summaryCard: { marginTop: 2, marginBottom: 4, borderRadius: 20, overflow: "hidden" },
  summaryCardInner: { borderRadius: 20, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  summaryCardRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  summaryPill: { flex: 1, borderRadius: 14, overflow: "hidden" },
  summaryPillInner: { flexDirection: "row", alignItems: "center", borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.06)" },
  summaryPillLabel: { fontSize: RFValue(10), fontWeight: "600", color: "rgba(255,255,255,0.4)", marginBottom: 2 },
  summaryPillValue: { fontSize: RFValue(13), fontWeight: "800" },
  netRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)", paddingTop: 10 },
  netLabel: { fontSize: RFValue(12), color: "rgba(255,255,255,0.5)", fontWeight: "600" },
  netValue: { fontSize: RFValue(15), fontWeight: "900" },

  sectionHeader: { backgroundColor: "rgba(255,255,255,0.06)", paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, marginTop: 12 },
  sectionHeaderText: { fontSize: RFValue(13), fontWeight: "600", color: "rgba(255,255,255,0.6)" },

  editContainer: { backgroundColor: "#00897B", justifyContent: "center", alignItems: "center", borderRadius: 14, marginBottom: 12, paddingHorizontal: 18, marginRight: 4, height: "90%" },
  deleteContainer: { backgroundColor: "#E53935", justifyContent: "center", alignItems: "center", borderRadius: 14, marginBottom: 12, paddingHorizontal: 18, height: "90%" },

  transactionCard: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.05)", padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", alignItems: "center" },
  txIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  leftContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  category: { fontSize: RFValue(14), fontWeight: "600", color: "#fff" },
  note: { fontSize: RFValue(11), color: "rgba(255,255,255,0.4)", marginTop: 2, maxWidth: Dimensions.get("window").width * 0.5 },
  date: { fontSize: RFValue(11), color: "rgba(255,255,255,0.3)", marginTop: 2 },
  amount: { fontSize: RFValue(14), fontWeight: "700" },

  emptyTitle: { marginTop: 16, fontSize: RFValue(15), color: "rgba(255,255,255,0.4)", fontWeight: "600", textAlign: "center" },
  emptySub: { marginTop: 6, fontSize: RFValue(13), color: "rgba(255,255,255,0.3)", fontWeight: "600" },

  listFooter: { alignItems: "center", paddingTop: 18, paddingBottom: 8 },
  listFooterLine: { width: 40, height: 2, borderRadius: 1, backgroundColor: "rgba(255,255,255,0.1)", marginBottom: 10 },
  listFooterText: { fontSize: RFValue(11), color: "rgba(255,255,255,0.25)", fontWeight: "600", letterSpacing: 0.3 },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", alignItems: "center", paddingHorizontal: 18 },
  modalBox: { backgroundColor: "#0D1F2D", borderRadius: 24, padding: 24, width: "100%", maxWidth: 370, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  modalTitle: { fontSize: RFValue(17), fontWeight: "800", color: "#fff", marginBottom: 16, textAlign: "center" },
  input: { borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 12, fontSize: RFValue(14), marginBottom: 12, backgroundColor: "rgba(255,255,255,0.05)", color: "#fff" },
  modalActions: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10, gap: 10 },
  modalBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.08)" },
  modalBtnText: { fontSize: RFValue(14), fontWeight: "600", color: "rgba(255,255,255,0.7)" },
});