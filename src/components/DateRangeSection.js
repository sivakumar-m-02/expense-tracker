import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RFValue } from 'react-native-responsive-fontsize';
import Animated, { FadeInDown } from 'react-native-reanimated';
import DateFilterModal, { MONTH_NAMES } from './DateFilterModal';

const PRESETS = [
  { id: 'week', label: 'This Week', icon: 'calendar-outline' },
  { id: 'month', label: 'This Month', icon: 'today-outline' },
  { id: '30days', label: 'Last 30 Days', icon: 'time-outline' },
];

const toDateParts = (date) => ({
  day: date.getDate(),
  month: date.getMonth(),
  year: date.getFullYear(),
});

const formatDateLabel = (datePart) => {
  if (!datePart) return null;
  return `${datePart.day} ${MONTH_NAMES[datePart.month]} ${datePart.year}`;
};

const getPresetRange = (presetId) => {
  const today = new Date();
  const end = toDateParts(today);

  switch (presetId) {
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - today.getDay());
      return { start: toDateParts(start), end };
    }
    case 'month':
      return { start: { day: 1, month: today.getMonth(), year: today.getFullYear() }, end };
    case '30days': {
      const start = new Date(today);
      start.setDate(today.getDate() - 29);
      return { start: toDateParts(start), end };
    }
    default:
      return { start: null, end: null };
  }
};

const DateRangeSection = ({ onApply }) => {
  const now = new Date();
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [activePreset, setActivePreset] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [pickerMonth, setPickerMonth] = useState(now.getMonth());

  const rangeReady = !!(rangeStart && rangeEnd);

  const rangeSummary = useMemo(() => {
    if (!rangeReady) return 'Pick a preset or choose custom dates';
    return `${formatDateLabel(rangeStart)}  →  ${formatDateLabel(rangeEnd)}`;
  }, [rangeStart, rangeEnd, rangeReady]);

  const handlePreset = useCallback((presetId) => {
    const { start, end } = getPresetRange(presetId);
    setRangeStart(start);
    setRangeEnd(end);
    setActivePreset(presetId);
  }, []);

  const handleOpenCustom = useCallback(() => {
    const seed = rangeStart || toDateParts(now);
    setPickerYear(seed.year);
    setPickerMonth(seed.month);
    setActivePreset('custom');
    setModalVisible(true);
  }, [rangeStart]);

  const handleRangeChange = useCallback(({ start, end }) => {
    setRangeStart(start);
    setRangeEnd(end);
    if (start || end) setActivePreset('custom');
  }, []);

  const handleClear = useCallback(() => {
    setRangeStart(null);
    setRangeEnd(null);
    setActivePreset(null);
    setModalVisible(false);
  }, []);

  const handleApply = useCallback(() => {
    if (!rangeReady || !onApply) return;
    onApply(rangeStart, rangeEnd);
    setRangeStart(null);
    setRangeEnd(null);
    setActivePreset(null);
  }, [onApply, rangeEnd, rangeReady, rangeStart]);

  const handleModalClose = useCallback(() => {
    setModalVisible(false);
    if (rangeStart && !rangeEnd) {
      setRangeStart(null);
      setActivePreset(null);
    }
  }, [rangeEnd, rangeStart]);

  return (
    <Animated.View entering={FadeInDown.duration(320).delay(40)} style={styles.wrap}>
      <LinearGradient
        colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.02)']}
        style={styles.card}
      >
        <View style={styles.topLine} />

        <View style={styles.headerRow}>
          <LinearGradient
            colors={['rgba(0,201,167,0.2)', 'rgba(0,201,167,0.06)']}
            style={styles.headerIcon}
          >
            <Ionicons name="calendar" size={16} color="#00C9A7" />
          </LinearGradient>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Date Range</Text>
            <Text style={styles.subtitle} numberOfLines={2}>{rangeSummary}</Text>
          </View>
          {rangeReady && (
            <TouchableOpacity onPress={handleClear} style={styles.clearBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.35)" />
            </TouchableOpacity>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetsRow}
        >
          {PRESETS.map((preset) => {
            const isActive = activePreset === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                onPress={() => handlePreset(preset.id)}
                activeOpacity={0.75}
              >
                {isActive ? (
                  <LinearGradient
                    colors={['#00C9A7', '#00897B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.presetChipActive}
                  >
                    <Ionicons name={preset.icon} size={13} color="#fff" style={{ marginRight: 5 }} />
                    <Text style={styles.presetTextActive}>{preset.label}</Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.presetChip}>
                    <Ionicons name={preset.icon} size={13} color="rgba(255,255,255,0.45)" style={{ marginRight: 5 }} />
                    <Text style={styles.presetText}>{preset.label}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
          <TouchableOpacity onPress={handleOpenCustom} activeOpacity={0.75}>
            {activePreset === 'custom' ? (
              <LinearGradient
                colors={['#5C9BFF', '#1565C0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.presetChipActive}
              >
                <Ionicons name="options-outline" size={13} color="#fff" style={{ marginRight: 5 }} />
                <Text style={styles.presetTextActive}>Custom</Text>
              </LinearGradient>
            ) : (
              <View style={styles.presetChip}>
                <Ionicons name="options-outline" size={13} color="rgba(255,255,255,0.45)" style={{ marginRight: 5 }} />
                <Text style={styles.presetText}>Custom</Text>
              </View>
            )}
          </TouchableOpacity>
        </ScrollView>

        {rangeReady && (
          <View style={styles.rangeDisplay}>
            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>From</Text>
              <Text style={styles.dateBoxValue}>{formatDateLabel(rangeStart)}</Text>
            </View>
            <View style={styles.arrowWrap}>
              <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.3)" />
            </View>
            <View style={styles.dateBox}>
              <Text style={styles.dateBoxLabel}>To</Text>
              <Text style={styles.dateBoxValue}>{formatDateLabel(rangeEnd)}</Text>
            </View>
          </View>
        )}

        <TouchableOpacity
          style={[styles.applyBtn, !rangeReady && styles.applyBtnDisabled]}
          onPress={handleApply}
          disabled={!rangeReady}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={rangeReady ? ['#5C9BFF', '#1565C0'] : ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.03)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.applyBtnGradient}
          >
            <Ionicons name="list" size={17} color={rangeReady ? '#fff' : 'rgba(255,255,255,0.25)'} style={{ marginRight: 8 }} />
            <Text style={[styles.applyBtnText, !rangeReady && styles.applyBtnTextDisabled]}>
              View Transactions
            </Text>
            {rangeReady && (
              <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.7)" style={{ marginLeft: 4 }} />
            )}
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>

      <DateFilterModal
        visible={modalVisible}
        onClose={handleModalClose}
        title="Select Date Range"
        mode="range"
        pickerYear={pickerYear}
        pickerMonth={pickerMonth}
        onPickerYearChange={setPickerYear}
        onPickerMonthChange={setPickerMonth}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
        onRangeChange={handleRangeChange}
        onClear={handleClear}
        clearLabel="Reset"
      />
    </Animated.View>
  );
};

export default memo(DateRangeSection);

const styles = StyleSheet.create({
  wrap: { marginBottom: 20 },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.2)',
  },
  headerTextWrap: { flex: 1 },
  title: {
    fontSize: RFValue(14),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: RFValue(10),
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    marginTop: 2,
    lineHeight: RFValue(14),
  },
  clearBtn: { padding: 2 },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 2,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  presetChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  presetText: {
    fontSize: RFValue(11),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.55)',
  },
  presetTextActive: {
    fontSize: RFValue(11),
    fontWeight: '700',
    color: '#fff',
  },
  rangeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    gap: 8,
  },
  dateBox: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0,201,167,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.2)',
  },
  dateBoxLabel: {
    fontSize: RFValue(9),
    fontWeight: '700',
    color: 'rgba(0,201,167,0.7)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  dateBoxValue: {
    fontSize: RFValue(12),
    fontWeight: '700',
    color: '#fff',
  },
  arrowWrap: {
    width: 24,
    alignItems: 'center',
  },
  applyBtn: {
    marginTop: 14,
    borderRadius: 14,
    overflow: 'hidden',
  },
  applyBtnDisabled: { opacity: 0.7 },
  applyBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
  },
  applyBtnText: {
    fontSize: RFValue(13),
    fontWeight: '700',
    color: '#fff',
  },
  applyBtnTextDisabled: {
    color: 'rgba(255,255,255,0.25)',
  },
});
