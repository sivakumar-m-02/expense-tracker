import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ScrollView,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RFValue } from 'react-native-responsive-fontsize';

const MIN_SELECTION = 1;

const CashbookMultiSelect = memo(({ data = [], value = [], onChange }) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [draft, setDraft] = useState(value);

  const allIds = useMemo(() => data.map((item) => item.value), [data]);
  const selectedSet = useMemo(() => new Set(value), [value]);
  const isAllSelected = allIds.length > 0 && allIds.every((id) => selectedSet.has(id));

  const selectedItems = useMemo(
    () => data.filter((item) => selectedSet.has(item.value)),
    [data, selectedSet],
  );

  const summaryLabel = useMemo(() => {
    if (data.length === 0) return 'No Cashbooks';
    if (isAllSelected) return `All Cashbooks (${data.length})`;
    if (selectedItems.length === 1) return selectedItems[0].label;
    return `${selectedItems.length} of ${data.length} selected`;
  }, [data.length, isAllSelected, selectedItems]);

  useEffect(() => {
    if (!modalVisible) setDraft(value);
  }, [value, modalVisible]);

  const openModal = useCallback(() => {
    setDraft(value);
    setModalVisible(true);
  }, [value]);

  const closeModal = useCallback(() => setModalVisible(false), []);

  const toggleDraftItem = useCallback((id) => {
    setDraft((prev) => {
      const set = new Set(prev);
      if (set.has(id)) {
        if (set.size <= MIN_SELECTION) return prev;
        set.delete(id);
      } else {
        set.add(id);
      }
      return allIds.filter((itemId) => set.has(itemId));
    });
  }, [allIds]);

  const selectAllDraft = useCallback(() => setDraft(allIds), [allIds]);

  const applyDraft = useCallback(() => {
    if (draft.length >= MIN_SELECTION) {
      onChange(draft);
    }
    setModalVisible(false);
  }, [draft, onChange]);

  const draftSet = useMemo(() => new Set(draft), [draft]);
  const draftAllSelected = allIds.length > 0 && allIds.every((id) => draftSet.has(id));

  const renderChip = useCallback(({ item }) => (
    <View style={styles.chip}>
      <Ionicons name="book" size={10} color="#00C9A7" style={{ marginRight: 4 }} />
      <Text style={styles.chipText} numberOfLines={1}>{item.label}</Text>
    </View>
  ), []);

  const renderModalItem = useCallback(({ item }) => {
    const isSelected = draftSet.has(item.value);
    const isLastSelected = isSelected && draft.length <= MIN_SELECTION;

    return (
      <TouchableOpacity
        style={[styles.listItem, isSelected && styles.listItemActive]}
        onPress={() => toggleDraftItem(item.value)}
        activeOpacity={0.75}
        disabled={isLastSelected}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
          {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
        </View>
        <Text style={[styles.listItemText, isSelected && styles.listItemTextActive]} numberOfLines={1}>
          {item.label}
        </Text>
        {isLastSelected && (
          <Text style={styles.minHint}>Min 1</Text>
        )}
      </TouchableOpacity>
    );
  }, [draft.length, draftSet, toggleDraftItem]);

  if (data.length === 0) {
    return (
      <View style={[styles.trigger, styles.triggerDisabled]}>
        <Ionicons name="book-outline" size={17} color="rgba(255,255,255,0.3)" style={{ marginRight: 9 }} />
        <Text style={styles.placeholderText}>No cashbooks available</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <TouchableOpacity style={styles.trigger} onPress={openModal} activeOpacity={0.8}>
        <LinearGradient
          colors={['rgba(0,201,167,0.18)', 'rgba(0,201,167,0.06)']}
          style={styles.triggerIcon}
        >
          <Ionicons name="book-outline" size={16} color="#00C9A7" />
        </LinearGradient>
        <View style={styles.triggerTextWrap}>
          <Text style={styles.triggerLabel}>Cashbooks</Text>
          <Text style={styles.triggerValue} numberOfLines={1}>{summaryLabel}</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countBadgeText}>{value.length}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.45)" />
      </TouchableOpacity>

      {!isAllSelected && selectedItems.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          {selectedItems.map((item) => (
            <View key={item.value} style={styles.chip}>
              <Ionicons name="book" size={10} color="#00C9A7" style={{ marginRight: 4 }} />
              <Text style={styles.chipText} numberOfLines={1}>{item.label}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Select Cashbooks</Text>
                <Text style={styles.sheetSubtitle}>
                  {draft.length} of {data.length} selected
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.selectAllRow, draftAllSelected && styles.selectAllRowActive]}
              onPress={selectAllDraft}
              activeOpacity={0.75}
            >
              <Ionicons
                name={draftAllSelected ? 'checkbox' : 'square-outline'}
                size={20}
                color={draftAllSelected ? '#00C9A7' : 'rgba(255,255,255,0.4)'}
              />
              <Text style={[styles.selectAllText, draftAllSelected && styles.selectAllTextActive]}>
                Select All
              </Text>
            </TouchableOpacity>

            <FlatList
              data={data}
              keyExtractor={(item) => item.value}
              renderItem={renderModalItem}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={5}
            />

            <TouchableOpacity style={styles.applyBtn} onPress={applyDraft} activeOpacity={0.85}>
              <LinearGradient
                colors={['#00C9A7', '#00897B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.applyBtnGradient}
              >
                <Text style={styles.applyBtnText}>Apply Selection</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
});

CashbookMultiSelect.displayName = 'CashbookMultiSelect';

export default CashbookMultiSelect;

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  triggerDisabled: { opacity: 0.6 },
  triggerIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.2)',
  },
  triggerTextWrap: { flex: 1, minWidth: 0 },
  triggerLabel: {
    fontSize: RFValue(9),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  triggerValue: {
    fontSize: RFValue(13),
    fontWeight: '700',
    color: '#fff',
  },
  placeholderText: {
    flex: 1,
    fontSize: RFValue(13),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.35)',
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: 'rgba(0,201,167,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  countBadgeText: {
    fontSize: RFValue(11),
    fontWeight: '800',
    color: '#00C9A7',
  },
  chipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 8,
    paddingRight: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 140,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: 'rgba(0,201,167,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.25)',
  },
  chipText: {
    fontSize: RFValue(10),
    fontWeight: '700',
    color: '#00C9A7',
    flexShrink: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0D1F2D',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    maxHeight: '75%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: RFValue(16),
    fontWeight: '800',
    color: '#fff',
  },
  sheetSubtitle: {
    fontSize: RFValue(11),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 3,
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    padding: 6,
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 10,
  },
  selectAllRowActive: {
    backgroundColor: 'rgba(0,201,167,0.1)',
    borderColor: 'rgba(0,201,167,0.25)',
  },
  selectAllText: {
    fontSize: RFValue(13),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.6)',
  },
  selectAllTextActive: { color: '#00C9A7' },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: 4 },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  listItemActive: {
    backgroundColor: 'rgba(0,201,167,0.1)',
    borderColor: 'rgba(0,201,167,0.25)',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxActive: {
    backgroundColor: '#00897B',
    borderColor: '#00C9A7',
  },
  listItemText: {
    flex: 1,
    fontSize: RFValue(13),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },
  listItemTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  minHint: {
    fontSize: RFValue(9),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  applyBtn: {
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  applyBtnGradient: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  applyBtnText: {
    fontSize: RFValue(14),
    fontWeight: '700',
    color: '#fff',
  },
});
