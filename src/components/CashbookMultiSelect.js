import React, { memo, useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Ionicons from "react-native-vector-icons/Ionicons";
import { RFValue } from "react-native-responsive-fontsize";

// Tapping the trigger row opens a bottom sheet with a checkbox list of
// CashBooks (plus an "All CashBooks" row at the top). This replaces
// react-native-element-dropdown's MultiSelect, whose own chip/box/chevron
// rendering couldn't be made to match the app's existing glass-card design
// language. The selection contract is unchanged: `onChange` is still just
// handed the full array of selected CashBook ids, so StatisticsScreen's
// existing multi-cashbook logic (all/one/many → statisticsCashbookIds) is
// reused exactly as before.
const CashbookMultiSelect = ({ options = [], selectedIds = [], selectedNames = [], onChange }) => {
  const [visible, setVisible] = useState(false);
  // Selections are staged here while the sheet is open and only committed
  // (via onChange) when Done is tapped. Committing on every tap used to
  // call onChange immediately, which kicks off StatisticsScreen's
  // transaction reload for the new scope — that reload briefly flips
  // HomeScreen into its loading screen, which unmounts this sheet (and its
  // `visible` state) mid-selection, making it look like the sheet
  // "auto-closed" after picking just one CashBook.
  const [pendingIds, setPendingIds] = useState(selectedIds);

  const isAllSelected = options.length > 0 && pendingIds.length === options.length;

  const summaryLabel = useMemo(() => {
    if (!selectedNames || selectedNames.length === 0) return "All CashBooks";
    if (selectedNames.length === 1) return selectedNames[0];
    if (selectedNames[0] === "All CashBooks") return "All CashBooks";
    return `${selectedNames[0]} +${selectedNames.length - 1} more`;
  }, [selectedNames]);

  const openSheet = useCallback(() => {
    // Seed staged selection from the last committed selection each time
    // the sheet is opened.
    setPendingIds(selectedIds);
    setVisible(true);
  }, [selectedIds]);

  const closeSheet = useCallback(() => {
    // Closing without Done (backdrop tap, X, or hardware back) discards
    // whatever was staged — nothing is applied until Done is pressed.
    setVisible(false);
  }, []);

  const handleSelectAll = useCallback(() => {
    if (!options.length) return;
    // Selecting every id is the same "All CashBooks" path StatisticsScreen
    // already treats specially — no new selection logic.
    setPendingIds(options.map((o) => o.value));
  }, [options]);

  const handleToggle = useCallback((id) => {
    setPendingIds((prev) => (
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    ));
  }, []);

  const handleDone = useCallback(() => {
    onChange?.(pendingIds);
    setVisible(false);
  }, [onChange, pendingIds]);

  return (
    <>
      <TouchableOpacity style={styles.trigger} onPress={openSheet} activeOpacity={0.8}>
        <View style={styles.triggerIconWrap}>
          <Ionicons name="book-outline" size={16} color="#00C9A7" />
        </View>
        <View style={styles.triggerTextWrap}>
          <Text style={styles.triggerLabel}>CashBooks</Text>
          <Text style={styles.triggerValue} numberOfLines={1}>{summaryLabel}</Text>
        </View>
        <Ionicons name="chevron-down" size={16} color="rgba(255,255,255,0.4)" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={closeSheet}>
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />

            <View style={styles.sheetHeaderRow}>
              <Text style={styles.sheetTitle}>Select CashBooks</Text>
              <TouchableOpacity onPress={closeSheet} style={styles.sheetCloseBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={16} color="#fff" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.sheetRow, styles.sheetAllRow, isAllSelected && styles.sheetRowActive]}
              onPress={handleSelectAll}
              activeOpacity={0.75}
            >
              <Ionicons
                name={isAllSelected ? "checkbox" : "square-outline"}
                size={19}
                color={isAllSelected ? "#00C9A7" : "rgba(255,255,255,0.4)"}
                style={{ marginRight: 11 }}
              />
              <Text style={[styles.sheetRowText, styles.sheetAllRowText, isAllSelected && styles.sheetRowTextActive]}>
                All CashBooks
              </Text>
            </TouchableOpacity>

            <ScrollView style={styles.sheetList} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const selected = pendingIds.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.sheetRow, selected && styles.sheetRowActive]}
                    onPress={() => handleToggle(opt.value)}
                    activeOpacity={0.75}
                  >
                    <Ionicons
                      name={selected ? "checkbox" : "square-outline"}
                      size={19}
                      color={selected ? "#00C9A7" : "rgba(255,255,255,0.35)"}
                      style={{ marginRight: 11 }}
                    />
                    <Text style={[styles.sheetRowText, selected && styles.sheetRowTextActive]} numberOfLines={1}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {options.length === 0 && (
                <Text style={styles.sheetEmptyText}>No CashBooks yet</Text>
              )}
            </ScrollView>

            <TouchableOpacity style={styles.sheetDoneBtn} onPress={handleDone} activeOpacity={0.85}>
              <LinearGradient colors={["#00C9A7", "#00897B"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.sheetDoneBtnGradient}>
                <Text style={styles.sheetDoneBtnText}>
                  Done{pendingIds.length > 0 && !isAllSelected ? ` \u00B7 ${pendingIds.length} selected` : ""}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default memo(CashbookMultiSelect);

const styles = StyleSheet.create({
  // Trigger row — styled to match the app's existing glass-card fields
  // (rgba borders, rounded-14, teal accents), instead of a library-default
  // dropdown box.
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderRadius: 14,
    paddingHorizontal: 13,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  triggerIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,201,167,0.12)",
    marginRight: 10,
  },
  triggerTextWrap: { flex: 1 },
  triggerLabel: { color: "rgba(255,255,255,0.4)", fontSize: RFValue(9), fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  triggerValue: { color: "#fff", fontSize: RFValue(13), fontWeight: "700", marginTop: 1 },

  // Bottom sheet
  sheetOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#0D1F2D",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 26,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderBottomWidth: 0,
    maxHeight: "78%",
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignSelf: "center", marginBottom: 14,
  },
  sheetHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  sheetTitle: { color: "#fff", fontSize: RFValue(16), fontWeight: "800" },
  sheetCloseBtn: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 999, padding: 7 },

  sheetList: { maxHeight: 340 },
  sheetRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.07)",
  },
  sheetRowActive: { backgroundColor: "rgba(0,201,167,0.1)", borderColor: "rgba(0,201,167,0.35)" },
  sheetAllRow: { marginBottom: 12 },
  sheetRowText: { color: "rgba(255,255,255,0.65)", fontSize: RFValue(13.5), fontWeight: "600", flexShrink: 1 },
  sheetRowTextActive: { color: "#fff", fontWeight: "700" },
  sheetAllRowText: { fontWeight: "700" },
  sheetEmptyText: { color: "rgba(255,255,255,0.35)", fontSize: RFValue(13), textAlign: "center", paddingVertical: 20 },

  sheetDoneBtn: { marginTop: 16, borderRadius: 14, overflow: "hidden" },
  sheetDoneBtnGradient: { paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  sheetDoneBtnText: { color: "#fff", fontSize: RFValue(14), fontWeight: "700" },
});
