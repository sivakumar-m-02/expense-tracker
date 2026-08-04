import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, ActivityIndicator, StatusBar,
  Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { Swipeable } from 'react-native-gesture-handler';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { RFValue } from 'react-native-responsive-fontsize';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInUp, Layout } from 'react-native-reanimated';
import AppPromptModal from '../../components/AppPromptModal';
import useAppModal from '../../hooks/useAppModal';

const RUPEE = '\u20B9';
const INCOME_COLOR = '#1DE9B6';
const EXPENSE_COLOR = '#FF6B6B';
const ACCENT = '#00C9A7';
const ACCENT_DARK = '#00A58A';

const toJSDate = (d) => {
  if (!d) return null;
  if (typeof d?.toDate === 'function') return d.toDate();
  if (d?.seconds) return new Date(d.seconds * 1000);
  if (d instanceof Date) return d;
  return new Date(d);
};

const CashBookDetailScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { cashbookId, cashbookName } = route.params || {};
  const { showModal: showPrompt, modalProps } = useAppModal();

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [transactionType, setTransactionType] = useState('all');

  // ── Edit modal state (mirrors ListExpensesScreen's edit behavior) ─────────
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editSubcategory, setEditSubcategory] = useState('');
  const [editLoading, setEditLoading] = useState(false);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user || !cashbookId) {
      setTransactions([]);
      setLoading(false);
      return undefined;
    }
    const unsub = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('cashbooks')
      .doc(cashbookId)
      .collection('transactions')
      .orderBy('date', 'desc')
      .onSnapshot(
        (qs) => {
          const list = [];
          qs.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
          setTransactions(list);
          setLoading(false);
        },
        (e) => {
          console.log('CashBookDetailScreen onSnapshot error:', e);
          setLoading(false);
        }
      );
    return unsub;
  }, [cashbookId]);

  const { totalIncome, totalExpense } = useMemo(() => {
    let income = 0;
    let expense = 0;
    transactions.forEach((t) => {
      const amt = Number(t.amount) || 0;
      if (t.type === 'income') income += amt;
      else expense += amt;
    });
    return { totalIncome: income, totalExpense: expense };
  }, [transactions]);

  const totalBalance = totalIncome - totalExpense;
  const isBalancePositive = totalBalance >= 0;

  // Keep the same category/note search behavior as the main transaction
  // history, scoped only to this cashbook's already-subscribed transactions.
  const filteredTransactions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return transactions.filter((transaction) => {
      const matchesType = transactionType === 'all' || transaction.type === transactionType;
      const matchesSearch = !query ||
        (transaction.category || '').toLowerCase().includes(query) ||
        (transaction.subcategory || '').toLowerCase().includes(query) ||
        (transaction.note || '').toLowerCase().includes(query);
      return matchesType && matchesSearch;
    });
  }, [transactions, searchQuery, transactionType]);

  // Group transactions by calendar date for the SectionList below. Firestore
  // already returns them ordered by date desc, so groups come out in order
  // as a simple single pass.
  const sections = useMemo(() => {
    const groups = [];
    const indexByKey = {};
    filteredTransactions.forEach((item) => {
      const d = toJSDate(item.date);
      const key = d ? d.toDateString() : 'Unknown date';
      if (!(key in indexByKey)) {
        indexByKey[key] = groups.length;
        groups.push({
          title: d
            ? d.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
            : 'Unknown date',
          data: [],
        });
      }
      groups[indexByKey[key]].data.push(item);
    });
    return groups;
  }, [filteredTransactions]);

  const goToAdd = (initialTab) => {
    navigation.navigate('MainApp', {
      screen: 'AddExpense',
      params: { cashbookId, cashbookName, initialTab },
    });
  };

  // ── Delete (mirrors ListExpensesScreen's handleDelete/confirmDelete) ──────
  const transactionRef = (id) =>
    firestore().collection('users').doc(auth().currentUser?.uid).collection('cashbooks').doc(cashbookId).collection('transactions').doc(id);

  const handleDelete = async (item) => {
    try {
      const user = auth().currentUser;
      if (!user) return;
      await transactionRef(item.id).delete();
    } catch (error) {
      console.log('CashBookDetailScreen delete error:', error);
      showPrompt({ type: 'error', title: 'Delete Failed', message: 'Unable to delete the transaction. Please try again.' });
    }
  };

  const confirmDelete = (item) => {
    showPrompt({
      type: 'warning',
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this transaction? This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'secondary' },
        { text: 'Delete', style: 'danger', onPress: () => handleDelete(item) },
      ],
    });
  };

  const openEdit = (item) => {
    setEditItem(item);
    setEditAmount(String(item.amount));
    setEditNote(item.note || '');
    setEditSubcategory(item.subcategory || '');
    setEditModalVisible(true);
  };

  const handleEditSave = async () => {
    if (!editItem) return;
    setEditLoading(true);
    try {
      const updateData = { amount: Number(editAmount), note: editNote };
      if (editItem.category === 'Food') updateData.subcategory = editSubcategory;
      await transactionRef(editItem.id).update(updateData);
      setEditModalVisible(false);
      setEditItem(null);
    } catch (error) {
      console.log('CashBookDetailScreen edit error:', error);
      showPrompt({ type: 'error', title: 'Save Failed', message: 'Unable to update the transaction. Please try again.' });
    }
    setEditLoading(false);
  };

  const renderRightActions = (item) => (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: '90%' }}>
      <TouchableOpacity style={styles.editAction} onPress={() => openEdit(item)}>
        <Icon name="create" size={20} color="#fff" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.deleteAction} onPress={() => confirmDelete(item)}>
        <Icon name="trash" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#050D1A', '#071828', '#0A2535']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['right', 'left']}>
        <Animated.View entering={FadeInUp.duration(220)} style={styles.balanceWrap}>
          <LinearGradient
            colors={isBalancePositive ? ['rgba(29,233,182,0.16)', 'rgba(29,233,182,0.04)'] : ['rgba(255,107,107,0.16)', 'rgba(255,107,107,0.04)']}
            style={styles.balanceCard}
          >
            <View>
              <Text style={styles.balanceLabel}>CURRENT BALANCE</Text>
              <Text style={[styles.balanceValue, { color: isBalancePositive ? INCOME_COLOR : EXPENSE_COLOR }]}>
                {isBalancePositive ? '' : '-'}{RUPEE}{Math.abs(totalBalance).toFixed(0)}
              </Text>
              <Text style={styles.balanceSubtext}>{isBalancePositive ? 'Available in this CashBook' : 'CashBook is in deficit'}</Text>
            </View>
            <View style={[styles.balanceIcon, { backgroundColor: isBalancePositive ? 'rgba(29,233,182,0.14)' : 'rgba(255,107,107,0.14)' }]}>
              <Icon name={isBalancePositive ? 'wallet-outline' : 'trending-down-outline'} size={23} color={isBalancePositive ? INCOME_COLOR : EXPENSE_COLOR} />
            </View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(240)} style={styles.summaryRow}>
          <LinearGradient colors={['rgba(29,233,182,0.12)', 'rgba(29,233,182,0.03)']} style={styles.summaryCard}>
            <Icon name="arrow-down-circle-outline" size={16} color={INCOME_COLOR} />
            <Text style={styles.summaryLabel} numberOfLines={1}>Income</Text>
            <Text style={[styles.summaryValue, { color: INCOME_COLOR }]}>{RUPEE}{totalIncome.toFixed(0)}</Text>
          </LinearGradient>
          <LinearGradient colors={['rgba(255,107,107,0.12)', 'rgba(255,107,107,0.03)']} style={styles.summaryCard}>
            <Icon name="arrow-up-circle-outline" size={16} color={EXPENSE_COLOR} />
            <Text style={styles.summaryLabel} numberOfLines={1}>Outcome</Text>
            <Text style={[styles.summaryValue, { color: EXPENSE_COLOR }]}>{RUPEE}{totalExpense.toFixed(0)}</Text>
          </LinearGradient>
          <LinearGradient
            colors={isBalancePositive ? ['rgba(29,233,182,0.12)', 'rgba(29,233,182,0.03)'] : ['rgba(255,107,107,0.12)', 'rgba(255,107,107,0.03)']}
            style={styles.summaryCard}
          >
            <Icon name={isBalancePositive ? 'wallet-outline' : 'trending-down-outline'} size={16} color={isBalancePositive ? INCOME_COLOR : EXPENSE_COLOR} />
            <Text style={styles.summaryLabel} numberOfLines={1}>Total Amount</Text>
            <Text style={[styles.summaryValue, { color: isBalancePositive ? INCOME_COLOR : EXPENSE_COLOR }]}>
              {isBalancePositive ? '' : '-'}{RUPEE}{Math.abs(totalBalance).toFixed(0)}
            </Text>
          </LinearGradient>
        </Animated.View>

        <View style={styles.filterWrap}>
          <View style={styles.searchBox}>
            <Icon name="search" size={16} color="rgba(255,255,255,0.35)" />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search transactions"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={styles.searchInput}
              returnKeyType="search"
            />
            {!!searchQuery && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Icon name="close-circle" size={17} color={ACCENT} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.typeFilterRow}>
            {[
              { value: 'all', label: 'All' },
              { value: 'income', label: 'Income' },
              { value: 'expense', label: 'Outcome' },
            ].map((filter) => {
              const active = transactionType === filter.value;
              return (
                <TouchableOpacity
                  key={filter.value}
                  onPress={() => setTransactionType(filter.value)}
                  style={[styles.typeFilter, active && styles.typeFilterActive]}
                >
                  <Text style={[styles.typeFilterText, active && styles.typeFilterTextActive]}>{filter.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={ACCENT} size="large" />
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            contentContainerStyle={filteredTransactions.length === 0 ? styles.listEmptyContent : styles.listContent}
            stickySectionHeadersEnabled={false}
            ListEmptyComponent={(
              <Animated.View entering={FadeInUp.duration(260)} style={styles.emptyWrap}>
                <Icon name="receipt-outline" size={42} color="rgba(255,255,255,0.2)" />
                <Text style={styles.emptyTitle}>{transactions.length ? 'No matching transactions' : 'No transactions yet'}</Text>
                <Text style={styles.emptySubtitle}>{transactions.length ? 'Try adjusting your filters.' : 'Tap + to add your first income or outcome entry.'}</Text>
              </Animated.View>
            )}
            renderSectionHeader={({ section }) => (
              <Text style={styles.sectionHeader}>{section.title}</Text>
            )}
            renderItem={({ item, index }) => {
              const isIncome = item.type === 'income';
              const color = isIncome ? INCOME_COLOR : EXPENSE_COLOR;
              const d = toJSDate(item.date);
              const itemTags = Array.isArray(item.tags) ? item.tags.slice(0, 2) : [];
              return (
                <Animated.View
                  entering={FadeInUp.duration(220).delay(Math.min(index, 8) * 30)}
                  layout={Layout.springify().damping(16).stiffness(170)}
                >
                  <Swipeable renderRightActions={() => renderRightActions(item)}>
                    <View style={styles.txCard}>
                      <View style={[styles.txIcon, { backgroundColor: `${color}1A`, borderColor: `${color}40` }]}>
                        <Icon name={isIncome ? 'trending-up' : 'trending-down'} size={16} color={color} />
                      </View>
                      <View style={styles.txBody}>
                        <Text style={styles.txCategory} numberOfLines={1}>
                          {item.category || (isIncome ? 'Income' : 'Expense')}
                          {item.subcategory ? ` · ${item.subcategory}` : ''}
                        </Text>
                        {!!item.note && <Text style={styles.txNote} numberOfLines={1}>{item.note}</Text>}
                        {itemTags.length > 0 && (
                          <View style={styles.tagRow}>
                            {itemTags.map((tag) => (
                              <View key={tag} style={[styles.tagChip, { borderColor: `${color}40`, backgroundColor: `${color}14` }]}>
                                <Text style={[styles.tagText, { color }]} numberOfLines={1}>{tag}</Text>
                              </View>
                            ))}
                          </View>
                        )}
                      </View>
                      <View style={{ alignItems: 'flex-end', }}>
                        <Text style={[styles.txAmount, { color }]}>
                          {isIncome ? '+' : '-'}{RUPEE}{Number(item.amount || 0).toFixed(0)}
                        </Text>
                        {!!d && <Text style={styles.txDate}>{d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</Text>}
                      </View>
                    </View>
                  </Swipeable>
                </Animated.View>
              );
            }}
          />
        )}

        <TouchableOpacity style={styles.fab} activeOpacity={0.85} onPress={() => goToAdd(0)}>
          <LinearGradient colors={[ACCENT, ACCENT_DARK]} style={styles.fabGrad}>
            <Icon name="add" size={28} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>

      {/* Edit Modal — mirrors ListExpensesScreen's edit modal */}
      <Modal visible={editModalVisible} transparent animationType="slide">
        <View style={editModal.overlay}>
          <View style={editModal.box}>
            <Text style={editModal.title}>Edit Transaction</Text>
            <TextInput
              style={editModal.input}
              keyboardType="numeric"
              value={editAmount}
              onChangeText={setEditAmount}
              placeholder="Amount"
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            {editItem?.category === 'Food' && (
              <View style={{ marginBottom: 12 }}>
                <Text style={editModal.subLabel}>Subcategory</Text>
                <View style={editModal.subList}>
                  {['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'].map((sub) => (
                    <TouchableOpacity
                      key={sub}
                      style={[editModal.subOption, editSubcategory === sub && editModal.subOptionActive]}
                      onPress={() => setEditSubcategory(sub)}
                    >
                      <Text style={[editModal.subOptionText, editSubcategory === sub && { color: '#fff' }]}>{sub}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
            <TextInput
              style={editModal.input}
              value={editNote}
              onChangeText={setEditNote}
              placeholder="Note"
              multiline
              placeholderTextColor="rgba(255,255,255,0.3)"
            />
            <View style={editModal.actions}>
              <TouchableOpacity style={editModal.btn} onPress={() => setEditModalVisible(false)} disabled={editLoading}>
                <Text style={editModal.btnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[editModal.btn, { backgroundColor: ACCENT_DARK }]} onPress={handleEditSave} disabled={editLoading}>
                <Text style={[editModal.btnText, { color: '#fff' }]}>{editLoading ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <AppPromptModal {...modalProps} />
    </View>
  );
};

export default CashBookDetailScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050D1A' },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  balanceWrap: { paddingHorizontal: 16, paddingTop: 12 },
  balanceCard: {
    borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  balanceLabel: { color: 'rgba(255,255,255,0.48)', fontSize: RFValue(10), fontWeight: '700', letterSpacing: 0.8 },
  balanceValue: { fontSize: RFValue(28), fontWeight: '900', marginTop: 4 },
  balanceSubtext: { color: 'rgba(255,255,255,0.38)', fontSize: RFValue(10.5), marginTop: 3 },
  balanceIcon: { width: 45, height: 45, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },

  summaryRow: { flexDirection: 'row', gap: 7, paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  summaryCard: {
    flex: 1, minWidth: 0, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 9,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  summaryLabel: { color: 'rgba(255,255,255,0.5)', fontSize: RFValue(8.5), fontWeight: '700', marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.25 },
  summaryValue: { fontSize: RFValue(14), fontWeight: '800', marginTop: 1 },

  filterWrap: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 14, paddingHorizontal: 13, paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  searchInput: { flex: 1, color: '#fff', fontSize: RFValue(12.5), padding: 0 },
  typeFilterRow: { flexDirection: 'row', gap: 8, marginTop: RFValue(12.5) },
  typeFilter: { paddingVertical: 7, paddingHorizontal: 13, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  typeFilterActive: { backgroundColor: 'rgba(0,201,167,0.14)', borderColor: 'rgba(0,201,167,0.45)' },
  typeFilterText: { color: 'rgba(255,255,255,0.48)', fontSize: RFValue(10.5), fontWeight: '700' },
  typeFilterTextActive: { color: ACCENT },

  listContent: { paddingHorizontal: 16, paddingTop: 6, paddingBottom: 120 },
  listEmptyContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 120 },

  sectionHeader: {
    color: 'rgba(255,255,255,0.45)', fontSize: RFValue(11.5), fontWeight: '700',
    marginTop: 14, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4,
  },

  txCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12, marginBottom: 10,
    borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  txIcon: {
    width: 36, height: 36, borderRadius: 50, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, marginRight: 12,
  },
  txBody: { flex: 1 },
  txCategory: { color: '#fff', fontSize: RFValue(13), fontWeight: '700' },
  txNote: { color: 'rgba(255,255,255,0.4)', fontSize: RFValue(11), marginTop: 2 },
  txDate: { color: 'rgba(255,255,255,0.32)', fontSize: RFValue(10), marginTop: 5 },
  txAmount: { fontSize: RFValue(14), fontWeight: '800', marginLeft: 8 },

  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 5 },
  tagChip: { borderRadius: 10, paddingVertical: 2, paddingHorizontal: 8, borderWidth: 1, maxWidth: 120 },
  tagText: { fontSize: RFValue(9.5), fontWeight: '700' },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 70, paddingHorizontal: 30 },
  emptyTitle: { color: '#fff', fontSize: RFValue(14), fontWeight: '700', marginTop: 12 },
  emptySubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: RFValue(11.5), marginTop: 6, textAlign: 'center' },

  fab: { position: 'absolute', right: 20, bottom: RFValue(100) },
  fabGrad: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },

  editAction: { backgroundColor: '#00897B', justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginBottom: 10, paddingHorizontal: 18, marginRight: 4, height: '90%' },
  deleteAction: { backgroundColor: '#E53935', justifyContent: 'center', alignItems: 'center', borderRadius: 14, marginBottom: 10, paddingHorizontal: 18, height: '90%' },
});

const editModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 },
  box: { backgroundColor: '#0D1F2D', borderRadius: 24, padding: 24, width: '100%', maxWidth: 370, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  title: { fontSize: RFValue(17), fontWeight: '800', color: '#fff', marginBottom: 16, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, padding: 12, fontSize: RFValue(14), marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff' },
  subLabel: { fontSize: RFValue(13), fontWeight: '600', marginBottom: 8, color: 'rgba(255,255,255,0.7)' },
  subList: { borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, overflow: 'hidden' },
  subOption: { padding: 12, backgroundColor: 'transparent' },
  subOptionActive: { backgroundColor: '#00897B' },
  subOptionText: { color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10, gap: 10 },
  btn: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.08)' },
  btnText: { fontSize: RFValue(14), fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
});
