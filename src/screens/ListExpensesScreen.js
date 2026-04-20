import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  Text,
  SectionList,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  TouchableOpacity,
  Modal,
  TextInput,
  Animated,
  RefreshControl
} from "react-native";
import { useTransactions } from "../context/TransactionContext";
import Icon from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";
import { Swipeable } from 'react-native-gesture-handler';
import firestore from "@react-native-firebase/firestore";
import auth from "@react-native-firebase/auth";
import moment from "moment";

const ListExpensesScreen = () => {
  const { expenses, incomes, selectedMonth, selectedYear, primaryColor, refreshTransactions } = useTransactions();

  // ── Toast ────────────────────────────────────────────────────────────────────
  const [showToast, setShowToast] = useState(true);
  const toastAnim = useRef(new Animated.Value(80)).current;
  useEffect(() => {
    Animated.timing(toastAnim, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    const timer = setTimeout(() => setShowToast(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  // ── Edit modal ───────────────────────────────────────────────────────────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editAmount, setEditAmount] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editSubcategory, setEditSubcategory] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    refreshTransactions();
    setTimeout(() => setRefreshing(false), 2000);
  }, []);

  const [showTime, setShowTime] = useState(true);

  // ── Search state ─────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const searchBarAnim = useRef(new Animated.Value(0)).current;

  // Animate search bar border glow on focus
  useEffect(() => {
    Animated.timing(searchBarAnim, {
      toValue: searchFocused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [searchFocused]);

  const searchBorderColor = searchBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['#EBEBEB', primaryColor || '#37474F'],
  });

  // ── Base transactions (month filter) ─────────────────────────────────────────
  const { allTransactions, loading } = useMemo(() => {
    const filterMonth = (arr) => arr.filter((t) => {
      const d = t.date?.seconds ? new Date(t.date.seconds * 1000) : new Date(t.date);
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
    const monthExpenses = filterMonth(expenses);
    const monthIncome = filterMonth(incomes);
    const all = [...monthExpenses, ...monthIncome].sort((a, b) => {
      const dateA = new Date(a.date?.seconds ? a.date.seconds * 1000 : a.date);
      const dateB = new Date(b.date?.seconds ? b.date.seconds * 1000 : b.date);
      return dateB - dateA;
    });
    return {
      allTransactions: all,
      loading: expenses.length === 0 && incomes.length === 0,
    };
  }, [expenses, incomes, selectedMonth, selectedYear]);

  // ── Search filter ─────────────────────────────────────────────────────────────
  const filteredTransactions = useMemo(() => {
    if (!searchQuery.trim()) return allTransactions;
    const q = searchQuery.trim().toLowerCase();
    return allTransactions.filter((t) => {
      const cat = (t.category || "").toLowerCase();
      const sub = (t.subcategory || "").toLowerCase();
      const note = (t.note || "").toLowerCase();
      return cat.includes(q) || sub.includes(q) || note.includes(q);
    });
  }, [allTransactions, searchQuery]);

  // ── Sections & totals derived from filtered list ──────────────────────────────
  const { sections, totalExpense, totalIncome, netTotal, isNetPositive,
    filteredExpense, filteredIncome, filteredNet, isFilteredNetPositive } = useMemo(() => {
    // Full-month totals (always from allTransactions)
    const expenseTotal = allTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const incomeTotal = allTransactions.filter(t => t.type !== 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const net = incomeTotal - expenseTotal;

    // Filtered totals
    const fExp = filteredTransactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const fInc = filteredTransactions.filter(t => t.type !== 'expense').reduce((s, t) => s + (t.amount || 0), 0);
    const fNet = fInc - fExp;

    // Section list from filtered
    const groupByDate = {};
    filteredTransactions.forEach((item) => {
      const d = item.date?.seconds ? new Date(item.date.seconds * 1000) : new Date(item.date);
      const dateStr = `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleDateString('en-US', { weekday: 'long' })}`;
      if (!groupByDate[dateStr]) groupByDate[dateStr] = [];
      groupByDate[dateStr].push(item);
    });
    const sectionData = Object.keys(groupByDate).map(title => ({ title, data: groupByDate[title] }));

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
  }, [allTransactions, filteredTransactions]);

  const isSearchActive = searchQuery.trim().length > 0;

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleDelete = async (item) => {
    try {
      const user = auth().currentUser;
      if (!user) return;
      await firestore()
        .collection("users").doc(user.uid)
        .collection(item.type === "expense" ? "expenses" : "income")
        .doc(item.id).delete();
    } catch (error) {
      console.log("Error deleting:", error);
    }
  };

  const renderRightActions = (item) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: '96%' }}>
      <TouchableOpacity style={styles.editContainer} onPress={() => {
        setEditItem(item);
        setEditAmount(String(item.amount));
        setEditNote(item.note || "");
        setEditSubcategory(item.subcategory || "");
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
      const ref = firestore()
        .collection("users").doc(user.uid)
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

  // ── Render item ───────────────────────────────────────────────────────────────
  const renderItem = ({ item }) => {
    let displayDate = "";
    if (item.date) {
      const dateObj = item.date?.seconds
        ? new Date(item.date.seconds * 1000)
        : item.date instanceof Date ? item.date : new Date(item.date);
      displayDate = moment(dateObj).format("h:mm a");
    }

    // Highlight matching text helper
    const query = searchQuery.trim().toLowerCase();
    const highlightText = (text) => {
      if (!text || !query || !isSearchActive) return <Text style={styles.category}>{text}</Text>;
      const lower = text.toLowerCase();
      const idx = lower.indexOf(query);
      if (idx === -1) return <Text style={styles.category}>{text}</Text>;
      return (
        <Text style={styles.category}>
          {text.slice(0, idx)}
          <Text style={[styles.category, { backgroundColor: (primaryColor || '#37474F') + '30', color: primaryColor || '#37474F', fontWeight: '700' }]}>
            {text.slice(idx, idx + query.length)}
          </Text>
          {text.slice(idx + query.length)}
        </Text>
      );
    };

    const catLabel = item.subcategory ? `${item.category} - ${item.subcategory}` : item.category;

    return (
      <Swipeable renderRightActions={() => renderRightActions(item)}>
        <View style={styles.transactionCard}>
          <View style={styles.leftContent}>
            <View style={styles.iconWrapper}>
              <Icon
                name={item.type === "expense" ? "trending-down" : "trending-up"}
                size={RFValue(18)}
                color={item.type === "expense" ? "#FF3B30" : "#388E3C"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row' }}>
                {isSearchActive
                  ? highlightText(catLabel)
                  : <Text style={styles.category}>{catLabel}</Text>
                }
              </View>
              {item.note ? (
                <Text style={styles.note} numberOfLines={1}>{item.note}</Text>
              ) : null}
            </View>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={[styles.amount, item.type === "expense" ? styles.expenseAmount : styles.incomeAmount]}>
              {item.type === "expense" ? "-" : "+"}₹ {item.amount}
            </Text>
            {showTime ? <Text style={styles.date}>{displayDate}</Text> : null}
          </View>
        </View>
      </Swipeable>
    );
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#388E3C" />
      </View>
    );
  }

  const renderEmpty = () => (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
      {isSearchActive ? (
        <>
          <Icon name="search-outline" size={60} color="#ddd" />
          <Text style={{ marginTop: 16, fontSize: RFValue(15), color: '#999', fontWeight: '600' }}>
            No results for "{searchQuery}"
          </Text>
          <Text style={{ marginTop: 6, fontSize: RFValue(12), color: '#bbb' }}>
            Try searching by category or subcategory
          </Text>
        </>
      ) : (
        <>
          <Icon name="document-text-outline" size={80} color="#ccc" />
          <Text style={{ marginTop: 20, fontSize: RFValue(16), color: '#999' }}>No transactions found</Text>
        </>
      )}
    </View>
  );

  // ── Search result summary bar (shown only when searching) ─────────────────────
  const SearchResultBar = () => {
    if (!isSearchActive) return null;
    const count = filteredTransactions.length;
    return (
      <View style={srb.wrap}>
        <View style={srb.left}>
          <Icon name="filter" size={13} color={primaryColor || '#37474F'} />
          <Text style={[srb.countText, { color: primaryColor || '#37474F' }]}>
            {count} result{count !== 1 ? 's' : ''}
          </Text>
          <Text style={srb.forText}>for </Text>
          <Text style={srb.queryText}>"{searchQuery}"</Text>
        </View>
        <View style={srb.pills}>
          {/* {filteredExpense > 0 && (
            <View style={[srb.pill, { backgroundColor: '#FDEDEC' }]}>
              <Icon name="remove-circle" size={10} color="#FF3B30" />
              <Text style={[srb.pillText, { color: '#FF3B30' }]}>₹{filteredExpense.toLocaleString()}</Text>
            </View>
          )}
          {filteredIncome > 0 && (
            <View style={[srb.pill, { backgroundColor: '#E6F4EA' }]}>
              <Icon name="add-circle" size={10} color="#388E3C" />
              <Text style={[srb.pillText, { color: '#388E3C' }]}>₹{filteredIncome.toLocaleString()}</Text>
            </View>
          )} */}
          {count > 0 && (
            <View style={[srb.pill, { backgroundColor: isFilteredNetPositive ? '#E6F4EA' : '#FDEDEC' }]}>
              <Text style={[srb.pillText, { color: isFilteredNetPositive ? '#388E3C' : '#FF3B30', fontWeight: '700' }]}>
                Net {isFilteredNetPositive ? '+' : '-'}₹{Math.abs(filteredNet).toLocaleString()}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Toast */}
      {showToast && (
        <Animated.View style={[styles.toastBox, { transform: [{ translateY: toastAnim }] }]}>
          <View style={styles.toastInner}>
            <Text style={styles.toastText}>Swipe left to edit or delete</Text>
          </View>
        </Animated.View>
      )}

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
            />
            {editItem?.category === "Food" && (
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: RFValue(14), fontWeight: '500', marginBottom: 6 }}>Subcategory</Text>
                <View style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 10, backgroundColor: '#fafafa' }}>
                  {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'].map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={{ padding: 10, backgroundColor: editSubcategory === sub ? '#388E3C' : 'transparent' }}
                      onPress={() => setEditSubcategory(sub)}
                    >
                      <Text style={{ color: editSubcategory === sub ? '#fff' : '#222', fontWeight: '500' }}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <TextInput
              style={[styles.input, { height: 40 }]}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Note"
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalBtn} onPress={() => setEditModalVisible(false)} disabled={editLoading}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: '#388E3C' }]} onPress={handleEditSave} disabled={editLoading}>
                <Text style={[styles.modalBtnText, { color: '#fff' }]}>{editLoading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── Search bar ── */}
      <View style={search.wrapper}>
        <Animated.View style={[search.bar, { borderColor: searchBorderColor }]}>
          <Icon
            name="search"
            size={17}
            color={searchFocused ? (primaryColor || '#37474F') : '#AAAAAA'}
            style={{ marginRight: 9 }}
          />
          <TextInput
            ref={searchInputRef}
            style={search.input}
            placeholder="Search by category or subcategory…"
            placeholderTextColor="#BBBBBB"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            clearButtonMode="never"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => { setSearchQuery(""); searchInputRef.current?.blur(); }} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={[search.clearBtn, { backgroundColor: (primaryColor || '#37474F') + '18' }]}>
                <Icon name="close" size={12} color={primaryColor || '#37474F'} />
              </View>
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Quick-filter chips */}
        {!searchFocused && searchQuery === "" && (
          <View style={search.chips}>
            {['Food', 'Petrol', 'Travel', 'Shopping', 'Bills'].map((cat) => (
              <TouchableOpacity
                key={cat}
                style={search.chip}
                onPress={() => setSearchQuery(cat)}
              >
                <Text style={search.chipText}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* Search result summary */}
      <SearchResultBar />

      {/* Section list */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id + item.type}
        renderItem={renderItem}
        // refreshControl={
        //   <RefreshControl
        //     refreshing={refreshing}
        //     onRefresh={onRefresh}
        //     tintColor="lightGrey"
        //     title="Loading..."
        //     colors={[primaryColor]}
        //     progressBackgroundColor="lightGrey"
        //   />
        // }
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
              <View style={[styles.sectionHeader, { alignItems: 'flex-end', borderRadius: 50, backgroundColor: isPositive ? '#E6F4EA' : '#FDEDEC' }]}>
                <Text style={[styles.sectionHeaderText, { color: isPositive ? '#388E3C' : '#FF3B30' }]}>
                  {isPositive ? '+' : '-'} ₹ {Math.abs(dayTotal)}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80, flexGrow: 1, paddingTop: 5.5 }}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
      />

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <View style={[styles.summaryCard, { backgroundColor: "#FF3B30", marginRight: 6 }]}>
          <Icon name="remove-circle" size={20} color="#fff" />
          <View style={{ marginLeft: 6, flex: 1 }}>
            <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">Total Expense</Text>
            <Text style={styles.summaryAmount} numberOfLines={1} ellipsizeMode="tail">₹ {totalExpense}</Text>
          </View>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#388E3C", marginRight: 6 }]}>
          <Icon name="add-circle" size={20} color="#fff" />
          <View style={{ marginLeft: 6, flex: 1 }}>
            <Text style={styles.summaryLabel} numberOfLines={1} ellipsizeMode="tail">Total Income</Text>
            <Text style={styles.summaryAmount} numberOfLines={1} ellipsizeMode="tail">₹ {totalIncome}</Text>
          </View>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: "#fff", borderWidth: 1, borderColor: "#666666" }]}>
          <Icon name={isNetPositive ? "add-circle" : "remove-circle"} size={20} color={isNetPositive ? "#388E3C" : "#FF3B30"} />
          <View style={{ marginLeft: 6, flex: 1 }}>
            <Text style={[styles.summaryLabel, { color: '#000' }]} numberOfLines={1} ellipsizeMode="tail">
              Net {isNetPositive ? "Income" : "Expense"}
            </Text>
            <Text style={[styles.summaryAmount, { color: isNetPositive ? "#388E3C" : "#FF3B30" }]} numberOfLines={1} ellipsizeMode="tail">
              {isNetPositive ? "+" : "-"}₹ {Math.abs(netTotal)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export default ListExpensesScreen;

// ── Search bar styles (isolated, won't affect originals) ─────────────────────────
const search = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#fafafa',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 13,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  input: {
    flex: 1,
    fontSize: RFValue(13),
    color: '#222',
    padding: 0,
    margin: 0,
  },
  clearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 7,
  },
  chip: {
    backgroundColor: '#F2F2F2',
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 13,
  },
  chipText: {
    fontSize: RFValue(11),
    color: '#555',
    fontWeight: '600',
  },
});

// ── Search result bar styles ──────────────────────────────────────────────────────
const srb = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  countText: {
    fontSize: RFValue(11),
    fontWeight: '800',
    marginLeft: 4,
  },
  forText: {
    fontSize: RFValue(11),
    color: '#999',
  },
  queryText: {
    fontSize: RFValue(11),
    color: '#444',
    fontWeight: '700',
    fontStyle: 'italic',
  },
  pills: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 20,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  pillText: {
    fontSize: RFValue(10),
    fontWeight: '700',
  },
});

// ── Original styles (untouched) ──────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fafafa",
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  editContainer: {
    backgroundColor: '#388E3C',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 18,
    marginRight: 4,
    height: '90%',
  },
  deleteContainer: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
    marginBottom: 12,
    paddingHorizontal: 18,
    height: '90%',
  },
  toastBox: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 32,
    alignItems: 'center',
    zIndex: 99,
  },
  toastInner: {
    backgroundColor: '#fff',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 22,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.13,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  toastText: {
    color: '#222',
    fontSize: RFValue(15),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 24,
    width: '85%',
    elevation: 10,
  },
  modalTitle: {
    fontSize: RFValue(18),
    fontWeight: '700',
    color: '#222',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 10,
    fontSize: RFValue(15),
    marginBottom: 12,
    backgroundColor: '#fafafa',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  modalBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#eee',
    marginLeft: 10,
  },
  modalBtnText: {
    fontSize: RFValue(15),
    fontWeight: '600',
    color: '#222',
  },
  deleteText: {
    color: "#fff",
    fontWeight: "500",
    fontSize: RFValue(14),
  },
  sectionHeader: {
    backgroundColor: "#F5F5F5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 10,
    marginTop: 12,
  },
  sectionHeaderText: {
    fontSize: RFValue(14),
    fontWeight: "500",
    color: "#222",
  },
  transactionCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: "grey",
    shadowOpacity: 0.05,
    shadowRadius: 50,
    elevation: 3,
    alignItems: "center",
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#f4f4f4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  category: {
    fontSize: RFValue(15),
    fontWeight: "500",
    color: "#222",
  },
  note: {
    fontSize: RFValue(12),
    color: "#666",
    marginTop: 2,
    maxWidth: Dimensions.get("window").width * 0.5,
  },
  date: {
    fontSize: RFValue(11),
    color: "#999",
    marginTop: 2,
  },
  amount: {
    fontSize: RFValue(15),
    fontWeight: "500",
  },
  expenseAmount: {
    color: "#FF3B30",
  },
  incomeAmount: {
    color: "#388E3C",
  },
  summaryBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderColor: "#eee",
    elevation: 10,
  },
  summaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
    justifyContent: "center",
    minWidth: 0,
    maxWidth: Dimensions.get("window").width / 3.2,
  },
  summaryLabel: {
    color: "#fff",
    fontSize: RFValue(12),
    fontWeight: "500",
  },
  summaryAmount: {
    color: "#fff",
    fontSize: RFValue(13),
    fontWeight: "500",
    marginTop: 2,
  },
});