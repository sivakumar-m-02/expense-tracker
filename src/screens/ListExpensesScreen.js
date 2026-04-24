import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View, Text, SectionList, StyleSheet, ActivityIndicator,
  Dimensions, TouchableOpacity, Modal, TextInput, Animated,
} from "react-native";
import { useTransactions } from "../context/TransactionContext";
import Icon from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";
import { Swipeable } from 'react-native-gesture-handler';
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import moment from "moment";
import LinearGradient from "react-native-linear-gradient";
import { StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ListExpensesScreen = () => {
  const { expenses, incomes, selectedMonth, selectedYear, primaryColor, refreshTransactions } = useTransactions();

  const [showToast, setShowToast] = useState(true);
  const toastAnim = useRef(new Animated.Value(80)).current;
  useEffect(() => {
    Animated.timing(toastAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    const timer = setTimeout(() => setShowToast(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [showTime, setShowTime] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const searchBarAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    Animated.timing(searchBarAnim, { toValue: searchFocused ? 1 : 0, duration: 200, useNativeDriver: false }).start();
  }, [searchFocused]);

  const searchBorderColor = searchBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.1)', '#00C9A7'],
  });

  const { allTransactions, loading } = useMemo(() => {
    const filterMonth = (arr) => arr.filter((t) => {
      const d = t.date?.seconds ? new Date(t.date.seconds * 1000) : new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    const all = [...filterMonth(expenses), ...filterMonth(incomes)].sort((a, b) => {
      const da = new Date(a.date?.seconds ? a.date.seconds * 1000 : a.date);
      const db = new Date(b.date?.seconds ? b.date.seconds * 1000 : b.date);
      return db - da;
    });
    return { allTransactions: all, loading: expenses.length === 0 && incomes.length === 0 };
  }, [expenses, incomes, selectedMonth, selectedYear]);

  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return allTransactions;
    const q = searchQuery.trim().toLowerCase();
    return allTransactions.filter((t) =>
      (t.category || "").toLowerCase().includes(q) ||
      (t.subcategory || "").toLowerCase().includes(q) ||
      (t.note || "").toLowerCase().includes(q)
    );
  }, [allTransactions, searchQuery]);

  const { sections, totalExpense, totalIncome, netTotal, isNetPositive,
    filteredExpense, filteredIncome, filteredNet, isFilteredNetPositive } = useMemo(() => {
    const expenseTotal = allTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const incomeTotal  = allTransactions.filter(t => t.type !== 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const net = incomeTotal - expenseTotal;
    const fExp = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const fInc = filteredTransactions.filter(t => t.type !== 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const fNet = fInc - fExp;
    const groupByDate = {};
    filteredTransactions.forEach((item) => {
      const d = item.date?.seconds ? new Date(item.date.seconds * 1000) : new Date(item.date);
      const dateStr = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleDateString('en-US', { weekday: 'long' })}`;
      if (!groupByDate[dateStr]) groupByDate[dateStr] = [];
      groupByDate[dateStr].push(item);
    });
    const sectionData = Object.keys(groupByDate).map(title => ({ title, data: groupByDate[title] }));
    return { sections: sectionData, totalExpense: expenseTotal, totalIncome: incomeTotal, netTotal: net, isNetPositive: net >= 0, filteredExpense: fExp, filteredIncome: fInc, filteredNet: fNet, isFilteredNetPositive: fNet >= 0 };
  }, [allTransactions, filteredTransactions]);

  const isSearchActive = searchQuery.trim().length > 0;

  const handleDelete = async (item) => {
    try {
      const user = auth().currentUser;
      if (!user) return;
      await firestore().collection("users").doc(user.uid)
        .collection(item.type === "expense" ? "expenses" : "income").doc(item.id).delete();
    } catch (error) { console.log("Error deleting:", error); }
  };

  const renderRightActions = (item) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: '96%' }}>
      <TouchableOpacity style={styles.editContainer} onPress={() => {
        setEditItem(item); setEditAmount(String(item.amount));
        setEditNote(item.note || ""); setEditSubcategory(item.subcategory || "");
        setEditModalVisible(true);
      }}>
        <Icon name="create" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteContainer} onPress={() => handleDelete(item)}>
        <Icon name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const handleEditSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      const user = auth().currentUser;
      if (!user) return;
      const ref = firestore().collection("users").doc(user.uid)
        .collection(editItem.type === "expense" ? "expenses" : "income").doc(editItem.id);
      const updateData = { amount: Number(editAmount), note: editNote };
      if (editItem.category === "Food") updateData.subcategory = editSubcategory;
      await ref.update(updateData);
      setEditModalVisible(false); setEditItem(null);
    } catch (error) { console.log("Error editing:", error); }
    setEditLoading(false);
  };

  const renderItem = ({ item }) => {
    let displayDate = "";
    if (item.date) {
      const dateObj = item.date?.seconds ? new Date(item.date.seconds * 1000) : item.date instanceof Date ? item.date : new Date(item.date);
      displayDate = moment(dateObj).format("h:mm a");
    }
    const query = searchQuery.trim().toLowerCase();
    const catLabel = item.subcategory ? `${item.category} - ${item.subcategory}` : item.category;
    const isIncome = item.type !== "expense";
    const amountColor = isIncome ? "#1DE9B6" : "#FF6B6B";

    const highlightText = (text) => {
      if (!text || !query || !isSearchActive) return <Text style={styles.category}>{text}</Text>;
      const lower = text.toLowerCase(); const idx = lower.indexOf(query);
      if (idx === -1) return <Text style={styles.category}>{text}</Text>;
      return (
        <Text style={styles.category}>
          {text.slice(0, idx)}
          <Text style={[styles.category, { backgroundColor: '#00C9A720', color: '#00C9A7', fontWeight: '700' }]}>{text.slice(idx, idx + query.length)}</Text>
          {text.slice(idx + query.length)}
        </Text>
      );
    };

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <View style={styles.transactionCard}>
          <LinearGradient
            colors={isIncome ? ["rgba(29,233,182,0.12)", "rgba(29,233,182,0.04)"] : ["rgba(255,107,107,0.12)", "rgba(255,107,107,0.04)"]}
            style={styles.txIconWrap}
          >
            <Icon name={isIncome ? "trending-up" : "trending-down"} size={RFValue(16)} color={amountColor} />
          </LinearGradient>
          <View style={styles.leftContent}>
            <View style={{ flex: 1 }}>
              {isSearchActive ? highlightText(catLabel) : <Text style={styles.category}>{catLabel}</Text>}
              {item.note ? <Text style={styles.note} numberOfLines={1}>{item.note}</Text> : null}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.amount, { color: amountColor }]}>{isIncome ? "+" : "-"}₹ {item.amount}</Text>
            {showTime ? <Text style={styles.date}>{displayDate}</Text> : null}
          </View>
        </View>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <LinearGradient colors={['#050D1A', '#071828']} style={styles.loader}>
        <ActivityIndicator size="large" color="#00C9A7" />
      </LinearGradient>
    );
  }

  const renderEmpty = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
      {isSearchActive ? (
        <>
          <Icon name="search-outline" size={60} color="rgba(255,255,255,0.12)" />
          <Text style={{ marginTop: 16, fontSize: RFValue(15), color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>No results for "{searchQuery}"</Text>
          <Text style={{ marginTop: 6, fontSize: RFValue(12), color: 'rgba(255,255,255,0.25)' }}>Try searching by category or subcategory</Text>
        </>
      ) : (
        <>
          <Icon name="document-text-outline" size={80} color="rgba(255,255,255,0.1)" />
          <Text style={{ marginTop: 20, fontSize: RFValue(16), color: 'rgba(255,255,255,0.35)' }}>No transactions found</Text>
        </>
      )}
    </View>
  );

  const SearchResultBar = () => {
    if (!isSearchActive) return null;
    const count = filteredTransactions.length;
    return (
      <View style={srb.wrap}>
        <View style={srb.left}>
          <Icon name="filter" size={13} color="#00C9A7" />
          <Text style={[srb.countText, { color: "#00C9A7" }]}>{count} result{count !== 1 ? 's' : ''}</Text>
          <Text style={srb.forText}>for </Text>
          <Text style={srb.queryText}>"{searchQuery}"</Text>
        </View>
        {count > 0 && (
          <View style={[srb.pill, { backgroundColor: isFilteredNetPositive ? 'rgba(29,233,182,0.15)' : 'rgba(255,107,107,0.15)' }]}>
            <Text style={[srb.pillText, { color: isFilteredNetPositive ? '#1DE9B6' : '#FF6B6B', fontWeight: '700' }]}>
              Net {isFilteredNetPositive ? '+' : '-'}₹{Math.abs(filteredNet).toLocaleString()}
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#050D1A', '#071828', '#0A2535']} style={StyleSheet.absoluteFill} />

      {/* Toast */}
      {showToast && (
        <Animated.View style={[styles.toastBox, { transform: [{ translateY: toastAnim }] }]}>
          <LinearGradient colors={['rgba(255,255,255,0.12)', 'rgba(255,255,255,0.06)']} style={styles.toastInner}>
            <Icon name="swap-horizontal-outline" size={14} color="rgba(255,255,255,0.7)" style={{ marginRight: 6 }} />
            <Text style={styles.toastText}>Swipe left to edit or delete</Text>
          </LinearGradient>
        </Animated.View>
      )}

      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Edit Transaction</Text>
            <TextInput style={styles.input} keyboardType="numeric" value={editAmount} onChangeText={setEditAmount} placeholder="Amount" placeholderTextColor="rgba(255,255,255,0.3)" />
            {editItem?.category === "Food" && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: RFValue(13), fontWeight: '600', marginBottom: 8, color: 'rgba(255,255,255,0.7)' }}>Subcategory</Text>
                <View style={{ borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden' }}>
                  {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'].map((sub) => (
                    <TouchableOpacity key={sub} style={{ padding: 12, backgroundColor: editSubcategory === sub ? '#00897B' : 'transparent' }} onPress={() => setEditSubcategory(sub)}>
                      <Text style={{ color: editSubcategory === sub ? '#fff' : 'rgba(255,255,255,0.6)', fontWeight: '500' }}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <TextInput style={[styles.input, { height: 40 }]} value={editNote} onChangeText={setEditNote} placeholder="Note" multiline placeholderTextColor="rgba(255,255,255,0.3)" />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setEditModalVisible(false)} disabled={editLoading}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#00897B' }]} onPress={handleEditSave} disabled={editLoading}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{editLoading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Search bar */}
      <View style={[search.wrapper, { paddingTop: insets.top + 60 }]}>
        <Animated.View style={[search.bar, { borderColor: searchBorderColor }]}>
          <Icon name="search" size={17} color={searchFocused ? '#00C9A7' : 'rgba(255,255,255,0.25)'} style={{ marginRight: 9 }} />
          <TextInput
            ref={searchInputRef}
            style={search.input}
            placeholder="Search by category or subcategory…"
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
              <View style={search.clearBtn}>
                <Icon name="close" size={12} color="#00C9A7" />
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>
        {!searchFocused && searchQuery === "" && (
          <View style={search.chips}>
            {['Food', 'Petrol', 'Travel', 'Shopping', 'Bills'].map((cat) => (
              <TouchableOpacity key={cat} style={search.chip} onPress={() => setSearchQuery(cat)}>
                <Text style={search.chipText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <SearchResultBar />

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id + item.type}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => {
          const { title, data } = section;
          const dayTotal = data.reduce((sum, item) => {
            const amt = item.type === 'expense' ? -Math.abs(item.amount || 0) : Math.abs(item.amount || 0);
            return sum + amt;
          }, 0);
          const isPositive = dayTotal >= 0;
          return (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity style={styles.sectionHeader} onPress={() => setShowTime(!showTime)}>
                <Text style={styles.sectionHeaderText}>{title}</Text>
              </TouchableOpacity>
              <View style={[styles.sectionHeader, { alignItems: 'flex-end', borderRadius: 50, backgroundColor: isPositive ? 'rgba(29,233,182,0.15)' : 'rgba(255,107,107,0.15)' }]}>
                <Text style={[styles.sectionHeaderText, { color: isPositive ? '#1DE9B6' : '#FF6B6B' }]}>
                  {isPositive ? '+' : '-'} ₹ {Math.abs(dayTotal)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, flexGrow: 1, paddingTop: 5.5 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      {/* Summary bar */}
      <LinearGradient colors={['rgba(5,13,26,0.95)', '#050D1A']} style={styles.summaryBar}>
        {[
          { label: "Total Out", amount: totalExpense, color: "#FF6B6B", icon: "remove-circle", bg: "rgba(255,107,107,0.15)" },
          { label: "Total In",  amount: totalIncome,  color: "#1DE9B6", icon: "add-circle",    bg: "rgba(29,233,182,0.15)" },
          { label: isNetPositive ? "Net In" : "Net Out", amount: Math.abs(netTotal), color: isNetPositive ? "#1DE9B6" : "#FF6B6B", icon: isNetPositive ? "trending-up" : "trending-down", bg: "rgba(255,255,255,0.06)" },
        ].map((s) => (
          <View key={s.label} style={[styles.summaryCard, { backgroundColor: s.bg }]}>
            <Icon name={s.icon} size={18} color={s.color} />
            <View style={{ marginLeft: 5, flex: 1 }}>
              <Text style={styles.summaryLabel} numberOfLines={1}>{s.label}</Text>
              <Text style={[styles.summaryAmount, { color: s.color }]} numberOfLines={1}>₹ {s.amount}</Text>
            </View>
          </View>
        ))}
      </LinearGradient>
    </View>
  );
};

export default ListExpensesScreen;

const search = StyleSheet.create({
  wrapper: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 4 },
  bar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 14, paddingVertical: 11 },
  input: { flex: 1, fontSize: RFValue(13), color: '#fff', padding: 0, margin: 0 },
  clearBtn: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'rgba(0,201,167,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 7 },
  chip: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 13, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  chipText: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});

const srb = StyleSheet.create({
  wrap: { marginHorizontal: 16, marginTop: 6, marginBottom: 2, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, paddingVertical: 9, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  countText: { fontSize: RFValue(11), fontWeight: '800', marginLeft: 4 },
  forText: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.35)' },
  queryText: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontStyle: 'italic' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, borderRadius: 20, paddingVertical: 4, paddingHorizontal: 10 },
  pillText: { fontSize: RFValue(10) },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050D1A' },
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },

  editContainer: { backgroundColor: '#00897B', justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginBottom: 12, paddingHorizontal: 18, marginRight: 4, height: '90%' },
  deleteContainer: { backgroundColor: "#E53935", justifyContent: "center", alignItems: "center", borderRadius: 14, marginBottom: 12, paddingHorizontal: 18, height: '90%' },

  toastBox: { position: 'absolute', left: 0, right: 0, bottom: 32, alignItems: 'center', zIndex: 99 },
  toastInner: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 22, paddingVertical: 11, borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  toastText: { color: 'rgba(255,255,255,0.8)', fontSize: RFValue(13), fontWeight: '600' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center' },
  modalBox: { backgroundColor: '#0D1F2D', borderRadius: 24, padding: 24, width: '85%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: RFValue(17), fontWeight: '800', color: '#fff', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, fontSize: RFValue(14), marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  modalBtn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  modalBtnText: { fontSize: RFValue(14), fontWeight: '600', color: 'rgba(255,255,255,0.7)' },

  sectionHeader: { backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, marginBottom: 8, marginTop: 12 },
  sectionHeaderText: { fontSize: RFValue(13), fontWeight: '600', color: 'rgba(255,255,255,0.6)' },

  transactionCard: { flexDirection: "row", justifyContent: "space-between", backgroundColor: "rgba(255,255,255,0.05)", padding: 14, borderRadius: 16, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.07)", alignItems: "center" },
  txIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  leftContent: { flexDirection: "row", alignItems: "center", flex: 1 },
  category: { fontSize: RFValue(14), fontWeight: "600", color: "#fff" },
  note: { fontSize: RFValue(11), color: "rgba(255,255,255,0.4)", marginTop: 2, maxWidth: Dimensions.get("window").width * 0.5 },
  date: { fontSize: RFValue(11), color: "rgba(255,255,255,0.3)", marginTop: 2 },
  amount: { fontSize: RFValue(14), fontWeight: "700" },

  summaryBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", paddingVertical: 12, paddingHorizontal: 10, gap: 6, borderTopWidth: 1, borderColor: "rgba(255,255,255,0.07)" },
  summaryCard: { flex: 1, flexDirection: "row", alignItems: "center", borderRadius: 14, paddingVertical: 10, paddingHorizontal: 8, justifyContent: "center", minWidth: 0, maxWidth: Dimensions.get("window").width / 3.2, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  summaryLabel: { color: "rgba(255,255,255,0.5)", fontSize: RFValue(10), fontWeight: "600" },
  summaryAmount: { fontSize: RFValue(12), fontWeight: "700", marginTop: 1 },
});
