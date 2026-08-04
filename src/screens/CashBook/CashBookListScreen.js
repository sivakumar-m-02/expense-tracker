import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, TextInput,
  ActivityIndicator, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { RFValue } from 'react-native-responsive-fontsize';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import InteractiveCard from '../../components/InteractiveCard';
import AppPromptModal from '../../components/AppPromptModal';
import useAppModal from '../../hooks/useAppModal';
import { Dropdown } from 'react-native-element-dropdown';

const ACCENT = '#00C9A7';
const ACCENT_DARK = '#00A58A';

const toJSDate = (d) => {
  if (!d) return null;
  if (typeof d?.toDate === 'function') return d.toDate();
  if (d?.seconds) return new Date(d.seconds * 1000);
  if (d instanceof Date) return d;
  return new Date(d);
};

const CreateCashBookModal = ({ visible, onCancel, onCreate, creating }) => {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) setName('');
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={modal.overlay}>
        <Animated.View entering={FadeInDown.duration(220)} style={modal.card}>
          <Text style={modal.title}>New CashBook</Text>
          <Text style={modal.subtitle}>Give your cashbook a name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="e.g. Shop Register, Staff Wallet"
            placeholderTextColor="rgba(255,255,255,0.28)"
            style={modal.input}
            autoFocus
          />
          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onCancel} disabled={creating}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={modal.saveBtn}
              onPress={() => onCreate(name.trim())}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={modal.saveText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const BackButton = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.backBtnWrap}>
    <LinearGradient
      colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
      style={styles.backBtn}
    >
      <Icon name="chevron-back" size={18} color="#fff" />
    </LinearGradient>
  </TouchableOpacity>
);

const CashBookListScreen = () => {
  const navigation = useNavigation();
  const { showModal, modalProps } = useAppModal();

  const [cashbooks, setCashbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createVisible, setCreateVisible] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  // Long-press / action modal state
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [actionItem, setActionItem] = useState(null);
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameName, setRenameName] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [mergeVisible, setMergeVisible] = useState(false);
  const [destinationCashbookId, setDestinationCashbookId] = useState(null);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    const runMonthlyCashBook = async () => {
      const today = new Date();
      if (today.getDate() !== 1) return;

      const monthKey = `cashbook_created_${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      try {
        const existingFlag = await AsyncStorage.getItem(monthKey);
        if (existingFlag === 'true') return;
      } catch (error) {
        console.log('CashBookListScreen AsyncStorage read failed:', error);
      }

      const user = auth().currentUser;
      if (!user) return;

      const monthName = `${today.toLocaleString('default', { month: 'long' })} ${today.getFullYear()}`;
      const cashbooksRef = firestore().collection('users').doc(user.uid).collection('cashbooks');

      try {
        await firestore().runTransaction(async (transaction) => {
          const querySnapshot = await transaction.get(cashbooksRef.where('name', '==', monthName).limit(1));
          if (!querySnapshot.empty) {
            return;
          }
          const docRef = cashbooksRef.doc();
          transaction.set(docRef, {
            name: monthName,
            createdAt: firestore.FieldValue.serverTimestamp(),
            updatedAt: firestore.FieldValue.serverTimestamp(),
          });
        });
        await AsyncStorage.setItem(monthKey, 'true');
      } catch (error) {
        console.log('CashBookListScreen monthly cashbook error:', error);
      }
    };

    runMonthlyCashBook();
  }, []);

  useEffect(() => {
    const user = auth().currentUser;
    if (!user) {
      setCashbooks([]);
      setLoading(false);
      return undefined;
    }
    const unsub = firestore()
      .collection('users')
      .doc(user.uid)
      .collection('cashbooks')
      .orderBy('createdAt', 'desc')
      .onSnapshot(
        (qs) => {
          const list = [];
          qs.forEach((doc) => list.push({ id: doc.id, ...doc.data() }));
          setCashbooks(list);
          setLoading(false);
        },
        (e) => {
          console.log('CashBookListScreen onSnapshot error:', e);
          setLoading(false);
        }
      );
    return unsub;
  }, []);

  const handleCreate = async (name) => {
    if (!name) {
      showModal({ type: 'warning', title: 'Name Required', message: 'Please enter a cashbook name.' });
      return;
    }
    const user = auth().currentUser;
    if (!user) {
      showModal({ type: 'error', title: 'Error', message: 'You must be logged in.' });
      return;
    }
    setCreating(true);
    try {
      const now = firestore.FieldValue.serverTimestamp();
      await firestore().collection('users').doc(user.uid).collection('cashbooks').add({
        name,
        createdAt: now,
        updatedAt: now,
      });
      setCreateVisible(false);
    } catch (e) {
      console.log('CashBookListScreen create error:', e);
      showModal({ type: 'error', title: 'Error', message: 'Could not create the cashbook. Please try again.' });
    }
    setCreating(false);
  };

  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedIds([]);
  };

  const toggleSelected = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const openCashbook = (item) => {
    if (selectMode) {
      toggleSelected(item.id);
      return;
    }
    navigation.navigate('CashBookDetail', { cashbookId: item.id, cashbookName: item.name });
  };

  const handleLongPress = (item) => {
    setActionItem(item);
    setActionModalVisible(true);
  };

  const openRename = () => {
    setActionModalVisible(false);
    setRenameName(actionItem?.name || '');
    setRenameVisible(true);
  };

  const openMerge = () => {
    setActionModalVisible(false);
    setDestinationCashbookId(null);
    setMergeVisible(true);
  };

  const renameCashbook = async (name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) {
      showModal({ type: 'warning', title: 'Name required', message: 'Please enter a name.' });
      return;
    }
    if (!actionItem) return;
    setRenaming(true);
    try {
      const user = auth().currentUser;
      if (!user) throw new Error('Not authenticated');
      const ref = firestore().collection('users').doc(user.uid).collection('cashbooks').doc(actionItem.id);
      await ref.update({ name: trimmed, updatedAt: firestore.FieldValue.serverTimestamp() });
      setRenameVisible(false);
      showModal({ type: 'success', title: 'Renamed', message: 'CashBook renamed successfully.' });
    } catch (e) {
      console.log('renameCashbook error:', e);
      showModal({ type: 'error', title: 'Rename failed', message: 'Could not rename cashbook. Please try again.' });
    }
    setRenaming(false);
  };

  const confirmDeleteCashbook = (item) => {
    setActionModalVisible(false);
    showModal({
      type: 'warning',
      title: 'Delete CashBook',
      message: 'Are you sure you want to delete this cashbook and all its transactions? This cannot be undone.',
      buttons: [
        { text: 'Cancel', style: 'secondary' },
        { text: 'Delete', style: 'danger', onPress: () => deleteCashbook(item) },
      ],
    });
  };

  const deleteCashbook = async (item) => {
    if (!item) return;
    setDeleting(true);
    try {
      const user = auth().currentUser;
      if (!user) throw new Error('Not authenticated');
      const cbRef = firestore().collection('users').doc(user.uid).collection('cashbooks').doc(item.id);

      // Delete transactions in chunks (max 500 per batch)
      const txCol = cbRef.collection('transactions');
      const snapshot = await txCol.get();
      if (!snapshot.empty) {
        const docs = snapshot.docs;
        const chunkSize = 500;
        for (let i = 0; i < docs.length; i += chunkSize) {
          const batch = firestore().batch();
          const chunk = docs.slice(i, i + chunkSize);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }

      // Delete the cashbook doc
      await cbRef.delete();
      showModal({ type: 'success', title: 'Deleted', message: 'CashBook deleted successfully.' });
    } catch (e) {
      console.log('deleteCashbook error:', e);
      showModal({ type: 'error', title: 'Delete failed', message: 'Could not delete the cashbook. Please try again.' });
    }
    setDeleting(false);
  };

  const mergeCashbook = async () => {
    if (!actionItem || !destinationCashbookId || actionItem.id === destinationCashbookId) {
      showModal({ type: 'warning', title: 'Choose Another CashBook', message: 'Select a different destination CashBook.' });
      return;
    }

    const destination = cashbooks.find(cashbook => cashbook.id === destinationCashbookId);
    showModal({
      type: 'warning',
      title: 'Merge CashBooks',
      message: `Move every transaction from ${actionItem.name} to ${destination?.name || 'this CashBook'}? The source CashBook will be deleted.`,
      buttons: [
        { text: 'Cancel', style: 'secondary' },
        { text: 'Merge', style: 'danger', onPress: async () => {
          setMerging(true);
          try {
            const user = auth().currentUser;
            if (!user) throw new Error('Not authenticated');
            const userRef = firestore().collection('users').doc(user.uid);
            const sourceRef = userRef.collection('cashbooks').doc(actionItem.id);
            const destinationRef = userRef.collection('cashbooks').doc(destinationCashbookId);
            const sourceTransactions = await sourceRef.collection('transactions').get();
            const chunkSize = 200;

            for (let index = 0; index < sourceTransactions.docs.length; index += chunkSize) {
              const batch = firestore().batch();
              sourceTransactions.docs.slice(index, index + chunkSize).forEach(transactionDoc => {
                batch.set(destinationRef.collection('transactions').doc(), {
                  ...transactionDoc.data(),
                  cashbookId: destinationCashbookId,
                });
                batch.delete(transactionDoc.ref);
              });
              await batch.commit();
            }

            await destinationRef.set({ updatedAt: firestore.FieldValue.serverTimestamp() }, { merge: true });
            await sourceRef.delete();
            setMergeVisible(false);
            setDestinationCashbookId(null);
            showModal({ type: 'success', title: 'Merged', message: `${actionItem.name} was merged into ${destination?.name || 'the destination CashBook'}.` });
          } catch (error) {
            console.log('CashBookListScreen merge error:', error);
            showModal({ type: 'error', title: 'Merge Failed', message: 'Could not merge the CashBooks. Please try again.' });
          }
          setMerging(false);
        } },
      ],
    });
  };

  const mergeOptions = useMemo(() => cashbooks
    .filter(cashbook => cashbook.id !== actionItem?.id)
    .map(cashbook => ({ label: cashbook.name || 'Untitled CashBook', value: cashbook.id })), [cashbooks, actionItem]);

  const handleSubmitStatistics = () => {
    if (selectedIds.length === 0) {
      showModal({ type: 'warning', title: 'Select a CashBook', message: 'Please select at least one cashbook.' });
      return;
    }
    const names = cashbooks.filter((c) => selectedIds.includes(c.id)).map((c) => c.name);
    setSelectMode(false);
    setSelectedIds([]);
    navigation.navigate('MainApp', {
      screen: 'Reports',
      params: { source: 'cashbook', cashbookIds: selectedIds, cashbookNames: names },
    });
  };

  const emptyState = useMemo(() => (
    <Animated.View entering={FadeInUp.duration(280)} style={styles.emptyWrap}>
      <Icon name="wallet-outline" size={46} color="rgba(255,255,255,0.22)" />
      <Text style={styles.emptyTitle}>No CashBooks yet</Text>
      <Text style={styles.emptySubtitle}>Tap the + button to create your first cashbook.</Text>
    </Animated.View>
  ), []);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={['#050D1A', '#071828', '#0A2535']} style={StyleSheet.absoluteFill} />

      <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'left']}>
        <Animated.View entering={FadeInUp.duration(260)} style={styles.header}>
          <View style={styles.headerLeft}>
            <BackButton onPress={() => navigation.goBack()} />
            <View style={styles.headerTitleWrap}>
              <Text style={styles.headerTitle}>CashBooks</Text>
              <Text style={styles.headerSubtitle}>
                {cashbooks.length} {cashbooks.length === 1 ? 'book' : 'books'}
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={toggleSelectMode} style={styles.selectToggle} activeOpacity={0.8}>
            <Icon name={selectMode ? 'close' : 'checkbox-outline'} size={16} color={ACCENT} />
            <Text style={styles.selectToggleText}>{selectMode ? 'Cancel' : 'Select'}</Text>
          </TouchableOpacity>
        </Animated.View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={ACCENT} size="large" />
          </View>
        ) : (
          <FlatList
            data={cashbooks}
            keyExtractor={(item) => item.id}
            contentContainerStyle={cashbooks.length === 0 ? styles.listEmptyContent : styles.listContent}
            ListEmptyComponent={emptyState}
            renderItem={({ item, index }) => {
              const isSelected = selectedIds.includes(item.id);
              const updated = toJSDate(item.updatedAt) || toJSDate(item.createdAt);
              return (
                <Animated.View
                  entering={FadeInUp.duration(240).delay(Math.min(index, 8) * 40)}
                  layout={Layout.springify().damping(16).stiffness(170)}
                >
                  <InteractiveCard onPress={() => openCashbook(item)} onLongPress={() => handleLongPress(item)} pressScale={0.98} style={styles.cardTouchable}>
                    <LinearGradient
                      colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
                      style={[styles.card, isSelected && styles.cardSelected]}
                    >
                      <View style={styles.cardIcon}>
                        <Icon name="book-outline" size={20} color={ACCENT} />
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                        {!!updated && (
                          <Text style={styles.cardSubtitle}>
                            Updated {updated.toLocaleDateString()}
                          </Text>
                        )}
                      </View>
                      {selectMode ? (
                        <Icon
                          name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
                          size={22}
                          color={isSelected ? ACCENT : 'rgba(255,255,255,0.3)'}
                        />
                      ) : (
                        <Icon name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
                      )}
                    </LinearGradient>
                  </InteractiveCard>
                </Animated.View>
              );
            }}
          />
        )}

        {selectMode && selectedIds.length > 0 && (
          <Animated.View entering={FadeInUp.duration(200)} style={styles.submitBarWrap}>
            <TouchableOpacity style={styles.submitBar} onPress={handleSubmitStatistics} activeOpacity={0.88}>
              <LinearGradient colors={[ACCENT, ACCENT_DARK]} style={styles.submitBarGrad}>
                <Icon name="bar-chart" size={18} color="#fff" />
                <Text style={styles.submitBarText}>
                  Submit ({selectedIds.length} selected)
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        )}

        {!selectMode && (
          <TouchableOpacity
            style={styles.fab}
            activeOpacity={0.85}
            onPress={() => setCreateVisible(true)}
          >
            <LinearGradient colors={[ACCENT, ACCENT_DARK]} style={styles.fabGrad}>
              <Icon name="add" size={28} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}
      </SafeAreaView>

      <CreateCashBookModal
        visible={createVisible}
        creating={creating}
        onCancel={() => setCreateVisible(false)}
        onCreate={handleCreate}
      />
      {/* Action bottom sheet for long-press on a cashbook */}
      <Modal visible={actionModalVisible} transparent animationType="none" onRequestClose={() => setActionModalVisible(false)}>
        <View style={actionModal.overlay}>
          <Animated.View entering={FadeInUp.duration(220)} style={actionModal.sheet}>
            <TouchableOpacity style={actionModal.row} onPress={openRename} activeOpacity={0.8}>
              <Icon name="create" size={20} color={ACCENT} />
              <Text style={actionModal.rowText}>Rename CashBook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={actionModal.row} onPress={openMerge} activeOpacity={0.8}>
              <Icon name="git-merge-outline" size={20} color={ACCENT} />
              <Text style={actionModal.rowText}>Merge into another CashBook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={actionModal.row} onPress={() => confirmDeleteCashbook(actionItem)} activeOpacity={0.8}>
              <Icon name="trash" size={20} color="#E53935" />
              <Text style={[actionModal.rowText, { color: '#E53935' }]}>Delete CashBook</Text>
            </TouchableOpacity>
            <TouchableOpacity style={actionModal.cancelRow} onPress={() => setActionModalVisible(false)} activeOpacity={0.85}>
              <Text style={actionModal.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={mergeVisible} transparent animationType="none" onRequestClose={() => setMergeVisible(false)}>
        <View style={modal.overlay}>
          <Animated.View entering={FadeInDown.duration(220)} style={modal.card}>
            <Text style={modal.title}>Merge CashBook</Text>
            <Text style={modal.subtitle}>Move all transactions from {actionItem?.name || 'this CashBook'} to:</Text>
            <Dropdown
              style={styles.mergeDropdown}
              containerStyle={styles.mergeDropdownMenu}
              itemContainerStyle={styles.mergeDropdownItem}
              itemTextStyle={styles.mergeDropdownText}
              selectedTextStyle={styles.mergeDropdownText}
              placeholderStyle={styles.mergeDropdownPlaceholder}
              activeColor="rgba(0,201,167,0.16)"
              data={mergeOptions}
              labelField="label"
              valueField="value"
              value={destinationCashbookId}
              placeholder="Choose destination CashBook"
              onChange={item => setDestinationCashbookId(item.value)}
              renderLeftIcon={() => <Icon name="book-outline" size={17} color={ACCENT} style={{ marginRight: 9 }} />}
            />
            <View style={modal.actions}>
              <TouchableOpacity style={modal.cancelBtn} onPress={() => setMergeVisible(false)} disabled={merging}>
                <Text style={modal.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={modal.saveBtn} onPress={mergeCashbook} disabled={!destinationCashbookId || merging}>
                {merging ? <ActivityIndicator color="#fff" size="small" /> : <Text style={modal.saveText}>Merge</Text>}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Rename modal */}
      <Modal visible={renameVisible} transparent animationType="none" onRequestClose={() => setRenameVisible(false)}>
        <View style={modal.overlay}>
          <Animated.View entering={FadeInDown.duration(220)} style={modal.card}>
            <Text style={modal.title}>Rename CashBook</Text>
            <Text style={modal.subtitle}>Edit the cashbook name</Text>
            <TextInput
              value={renameName}
              onChangeText={setRenameName}
              placeholder="CashBook name"
              placeholderTextColor="rgba(255,255,255,0.28)"
              style={modal.input}
              autoFocus
            />
            <View style={modal.actions}>
              <TouchableOpacity style={modal.cancelBtn} onPress={() => setRenameVisible(false)} disabled={renaming}>
                <Text style={modal.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modal.saveBtn}
                onPress={() => renameCashbook(renameName)}
                disabled={renaming}
              >
                {renaming ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={modal.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
      <AppPromptModal {...modalProps} />
    </View>
  );
};

export default CashBookListScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050D1A' },
  safeArea: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8,
  },
  headerTitle: { fontSize: RFValue(20), fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  selectToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(0,201,167,0.3)', borderRadius: 20,
    paddingVertical: 8, paddingHorizontal: 13, backgroundColor: 'rgba(0,201,167,0.08)',
  },
  selectToggleText: { color: ACCENT, fontSize: RFValue(11), fontWeight: '700' },

  listContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 140 },
  listEmptyContent: { flexGrow: 1, paddingHorizontal: 16, paddingBottom: 140 },

  cardTouchable: { marginBottom: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.09)',
  },
  cardSelected: { borderColor: ACCENT },
  cardIcon: {
    width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(0,201,167,0.1)', borderWidth: 1, borderColor: 'rgba(0,201,167,0.25)',
    marginRight: 12,
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: RFValue(14), fontWeight: '700', color: '#fff' },
  cardSubtitle: { fontSize: RFValue(10.5), color: 'rgba(255,255,255,0.38)', marginTop: 3 },

  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 90, paddingHorizontal: 30 },
  emptyTitle: { color: '#fff', fontSize: RFValue(15), fontWeight: '700', marginTop: 14 },
  emptySubtitle: { color: 'rgba(255,255,255,0.4)', fontSize: RFValue(12), marginTop: 6, textAlign: 'center' },

  fab: { position: 'absolute', right: 20, bottom: RFValue(100) },
  fabGrad: {
    width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center',
    shadowColor: ACCENT, shadowOpacity: 0.4, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6,
  },

  submitBarWrap: { position: 'absolute', left: 16, right: 16, bottom: RFValue(100) },
  submitBar: { borderRadius: 16, overflow: 'hidden' },
  submitBarGrad: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    height: 52,
  },
  submitBarText: { color: '#fff', fontSize: RFValue(14), fontWeight: '800' },
  backBtnWrap: { marginRight: 12 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitleWrap: { justifyContent: 'center' },
  mergeDropdown: { height: 48, borderRadius: 14, paddingHorizontal: 13, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(0,201,167,0.25)' },
  mergeDropdownMenu: { backgroundColor: '#0D1F2D', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', overflow: 'hidden' },
  mergeDropdownItem: { backgroundColor: '#0D1F2D' },
  mergeDropdownText: { color: '#fff', fontSize: RFValue(13), fontWeight: '700' },
  mergeDropdownPlaceholder: { color: 'rgba(255,255,255,0.38)', fontSize: RFValue(13) },
});

const actionModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end', padding: 18 },
  sheet: { width: '100%', backgroundColor: '#0D1F2D', borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 6 },
  rowText: { color: '#fff', fontSize: RFValue(15), fontWeight: '700', marginLeft: 8 },
  cancelRow: { marginTop: 8, alignItems: 'center', paddingVertical: 12 },
  cancelText: { color: 'rgba(255,255,255,0.6)', fontSize: RFValue(15), fontWeight: '700' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { width: '100%', backgroundColor: '#0D1F2D', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(0,201,167,0.2)' },
  title: { fontSize: RFValue(16), fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  input: {
    borderWidth: 1.5, borderColor: 'rgba(0,201,167,0.25)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: RFValue(14),
    color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 6,
  },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  cancelText: { fontSize: RFValue(13), fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', backgroundColor: ACCENT_DARK },
  saveText: { fontSize: RFValue(13), fontWeight: '700', color: '#fff' },
});
