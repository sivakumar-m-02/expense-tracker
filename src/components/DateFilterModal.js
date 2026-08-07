import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { RFValue } from 'react-native-responsive-fontsize';

export const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const datePartToTime = ({ day, month, year }) =>
  new Date(year, month, day).getTime();

export const isSameDatePart = (a, b) =>
  a && b && a.day === b.day && a.month === b.month && a.year === b.year;

export const isDateInRange = (datePart, start, end) => {
  if (!start || !end) return false;
  const t = datePartToTime(datePart);
  const s = datePartToTime(start);
  const e = datePartToTime(end);
  const lo = Math.min(s, e);
  const hi = Math.max(s, e);
  return t >= lo && t <= hi;
};

const DateFilterModal = ({
  visible,
  onClose,
  pickerYear,
  pickerMonth,
  onPickerYearChange,
  onPickerMonthChange,
  selectedDate,
  onSelectDate,
  title = 'Filter by Date',
  clearLabel = 'Clear',
  onClear,
  mode = 'single',
  rangeStart = null,
  rangeEnd = null,
  onRangeChange,
}) => {
  const daysInPickerMonth = useMemo(
    () => new Date(pickerYear, pickerMonth + 1, 0).getDate(),
    [pickerYear, pickerMonth],
  );

  const firstWeekday = useMemo(
    () => new Date(pickerYear, pickerMonth, 1).getDay(),
    [pickerYear, pickerMonth],
  );

  const calendarCells = useMemo(() => {
    const cells = Array.from({ length: firstWeekday }, (_, i) => ({ type: 'blank', key: `b-${i}` }));
    for (let day = 1; day <= daysInPickerMonth; day += 1) {
      cells.push({ type: 'day', day, key: `d-${day}` });
    }
    return cells;
  }, [daysInPickerMonth, firstWeekday]);

  const today = new Date();
  const isFutureMonth = pickerYear > today.getFullYear()
    || (pickerYear === today.getFullYear() && pickerMonth > today.getMonth());

  const handleDayPress = (day) => {
    const datePart = { day, month: pickerMonth, year: pickerYear };

    if (mode === 'range') {
      if (!rangeStart || (rangeStart && rangeEnd)) {
        onRangeChange?.({ start: datePart, end: null });
        return;
      }
      const startTime = datePartToTime(rangeStart);
      const endTime = datePartToTime(datePart);
      if (endTime < startTime) {
        onRangeChange?.({ start: datePart, end: rangeStart });
      } else {
        onRangeChange?.({ start: rangeStart, end: datePart });
      }
      return;
    }

    const isSel = isSameDatePart(selectedDate, datePart);
    onSelectDate?.(datePart, isSel);
  };

  const handleClear = () => {
    if (mode === 'range') {
      onRangeChange?.({ start: null, end: null });
    }
    onClear?.();
  };

  const hasSelection = mode === 'range'
    ? !!(rangeStart || rangeEnd)
    : !!selectedDate;

  const rangeReady = mode === 'range' && rangeStart && rangeEnd;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalBox}>
          <LinearGradient
            colors={['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.02)']}
            style={styles.topHighlight}
          />

          <View style={styles.titleRow}>
            <View style={styles.titleIconWrap}>
              <Icon name="calendar" size={18} color="#00C9A7" />
            </View>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>

          {mode === 'range' && (
            <View style={styles.rangePills}>
              <View style={[styles.rangePill, rangeStart && styles.rangePillFilled]}>
                <Text style={styles.rangePillLabel}>From</Text>
                <Text style={[styles.rangePillValue, !rangeStart && styles.rangePillPlaceholder]}>
                  {rangeStart
                    ? `${rangeStart.day} ${MONTH_NAMES[rangeStart.month]}`
                    : 'Tap to select'}
                </Text>
              </View>
              <View style={styles.rangeArrow}>
                <Icon name="arrow-forward" size={14} color="rgba(255,255,255,0.35)" />
              </View>
              <View style={[styles.rangePill, rangeEnd && styles.rangePillFilled]}>
                <Text style={styles.rangePillLabel}>To</Text>
                <Text style={[styles.rangePillValue, !rangeEnd && styles.rangePillPlaceholder]}>
                  {rangeEnd
                    ? `${rangeEnd.day} ${MONTH_NAMES[rangeEnd.month]}`
                    : rangeStart ? 'Tap end date' : '—'}
                </Text>
              </View>
            </View>
          )}

          <View style={df.row}>
            <TouchableOpacity
              style={df.navBtn}
              onPress={() => {
                if (pickerMonth === 0) {
                  onPickerMonthChange(11);
                  onPickerYearChange(pickerYear - 1);
                } else {
                  onPickerMonthChange(pickerMonth - 1);
                }
              }}
            >
              <Icon name="chevron-back" size={18} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
            <Text style={df.monthLabel}>{MONTH_NAMES[pickerMonth]} {pickerYear}</Text>
            <TouchableOpacity
              style={[df.navBtn, isFutureMonth && df.navBtnDisabled]}
              disabled={isFutureMonth}
              onPress={() => {
                const now = new Date();
                const atMax = pickerYear === now.getFullYear() && pickerMonth === now.getMonth();
                if (atMax) return;
                if (pickerMonth === 11) {
                  onPickerMonthChange(0);
                  onPickerYearChange(pickerYear + 1);
                } else {
                  onPickerMonthChange(pickerMonth + 1);
                }
              }}
            >
              <Icon name="chevron-forward" size={18} color={isFutureMonth ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.7)'} />
            </TouchableOpacity>
          </View>

          <View style={df.weekdayRow}>
            {WEEKDAYS.map((wd) => (
              <Text key={wd} style={df.weekdayText}>{wd}</Text>
            ))}
          </View>

          <View style={df.dayGrid}>
            {calendarCells.map((cell) => {
              if (cell.type === 'blank') {
                return <View key={cell.key} style={df.dayCell} />;
              }

              const { day } = cell;
              const datePart = { day, month: pickerMonth, year: pickerYear };
              const isToday = day === today.getDate()
                && pickerMonth === today.getMonth()
                && pickerYear === today.getFullYear();
              const isFuture = datePartToTime(datePart) > datePartToTime({
                day: today.getDate(),
                month: today.getMonth(),
                year: today.getFullYear(),
              });

              let isStart = false;
              let isEnd = false;
              let inRange = false;
              let isSel = false;
              let isEndpoint = false;

              if (mode === 'range') {
                isStart = isSameDatePart(rangeStart, datePart);
                isEnd = isSameDatePart(rangeEnd, datePart);
                inRange = isDateInRange(datePart, rangeStart, rangeEnd) && !isStart && !isEnd;
                isEndpoint = isStart || isEnd;
              } else {
                isSel = isSameDatePart(selectedDate, datePart);
                isEndpoint = isSel;
              }

              const showRangeBand = mode === 'range' && rangeStart && rangeEnd && (isStart || isEnd || inRange);
              const isSameDayRange = isStart && isEnd;

              return (
                <TouchableOpacity
                  key={cell.key}
                  style={[df.dayCell, isFuture && df.dayCellDisabled]}
                  disabled={isFuture}
                  onPress={() => handleDayPress(day)}
                  activeOpacity={0.7}
                >
                  {showRangeBand && !isSameDayRange && (
                    <View style={[
                      df.rangeBand,
                      isStart && df.rangeBandFromStart,
                      isEnd && df.rangeBandToEnd,
                      inRange && df.rangeBandMiddle,
                    ]} />
                  )}

                  {isEndpoint ? (
                    <LinearGradient
                      colors={['#00C9A7', '#00897B']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[df.dayDot, isToday && df.dayDotToday]}
                    >
                      <Text style={df.dayDotText}>{day}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={[df.dayInner, isToday && df.dayInnerToday]}>
                      <Text style={[
                        df.dayText,
                        inRange && df.dayTextInRange,
                        isFuture && df.dayTextDisabled,
                        isToday && df.dayTextToday,
                      ]}>
                        {day}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {mode === 'range' && !rangeEnd && rangeStart && (
            <Text style={styles.hintText}>Now tap the end date to complete your range</Text>
          )}

          <View style={styles.modalActions}>
            {hasSelection && (onClear || mode === 'range') && (
              <TouchableOpacity style={styles.modalBtnSecondary} onPress={handleClear}>
                <Icon name="refresh-outline" size={15} color="rgba(255,255,255,0.6)" style={{ marginRight: 5 }} />
                <Text style={styles.modalBtnSecondaryText}>{clearLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.modalBtnPrimary, mode === 'range' && !rangeReady && styles.modalBtnDisabled]}
              disabled={mode === 'range' && !rangeReady}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={mode === 'range' && !rangeReady ? ['#3a3a3a', '#2a2a2a'] : ['#00C9A7', '#00897B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.modalBtnGradient}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {mode === 'range' ? 'Done' : 'Apply'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

export default DateFilterModal;

const df = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingHorizontal: 2,
  },
  navBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  navBtnDisabled: { opacity: 0.4 },
  monthLabel: { fontSize: RFValue(16), fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    fontSize: RFValue(10),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: 0.5,
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  dayCellDisabled: { opacity: 0.3 },
  rangeBand: {
    position: 'absolute',
    top: 5,
    height: 32,
    backgroundColor: 'rgba(0,201,167,0.14)',
  },
  rangeBandFromStart: {
    left: '50%',
    right: 0,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
  },
  rangeBandToEnd: {
    left: 0,
    right: '50%',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
  },
  rangeBandMiddle: {
    left: 0,
    right: 0,
    borderRadius: 0,
  },
  dayDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    shadowColor: '#00C9A7',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  dayDotToday: {
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.85)',
  },
  dayDotText: {
    fontSize: RFValue(13),
    fontWeight: '800',
    color: '#fff',
    lineHeight: RFValue(16),
    textAlign: 'center',
    includeFontPadding: false,
  },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInnerToday: {
    borderWidth: 1.5,
    borderColor: 'rgba(0,201,167,0.55)',
    backgroundColor: 'rgba(0,201,167,0.08)',
  },
  dayText: {
    fontSize: RFValue(13),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.55)',
    lineHeight: RFValue(16),
    textAlign: 'center',
    includeFontPadding: false,
  },
  dayTextInRange: { color: '#00C9A7', fontWeight: '700' },
  dayTextToday: { color: '#00C9A7', fontWeight: '700' },
  dayTextDisabled: { color: 'rgba(255,255,255,0.2)' },
});

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 18,
  },
  modalBox: {
    backgroundColor: '#0D1F2D',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 370,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 10,
  },
  titleIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: 'rgba(0,201,167,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.25)',
  },
  modalTitle: {
    fontSize: RFValue(16),
    fontWeight: '800',
    color: '#fff',
    flex: 1,
  },
  closeBtn: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 999,
    padding: 7,
  },
  rangePills: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  rangePill: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rangePillFilled: {
    backgroundColor: 'rgba(0,201,167,0.1)',
    borderColor: 'rgba(0,201,167,0.3)',
  },
  rangePillLabel: {
    fontSize: RFValue(9),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.35)',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  rangePillValue: {
    fontSize: RFValue(12),
    fontWeight: '700',
    color: '#fff',
  },
  rangePillPlaceholder: {
    color: 'rgba(255,255,255,0.3)',
    fontWeight: '600',
  },
  rangeArrow: {
    width: 24,
    alignItems: 'center',
  },
  hintText: {
    fontSize: RFValue(11),
    color: 'rgba(0,201,167,0.8)',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
    gap: 10,
  },
  modalBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modalBtnSecondaryText: {
    fontSize: RFValue(13),
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
  },
  modalBtnPrimary: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
  },
  modalBtnDisabled: { opacity: 0.5 },
  modalBtnGradient: {
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnPrimaryText: {
    fontSize: RFValue(14),
    fontWeight: '700',
    color: '#fff',
  },
});
