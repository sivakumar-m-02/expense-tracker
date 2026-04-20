// components/AISummaryCard.js
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RFValue } from 'react-native-responsive-fontsize';
import { getAIMonthlySummary } from '../services/aiService'; // adjust path
import InteractiveCard from './InteractiveCard';

// ── helpers ─────────────────────────────────────────────────────────────────────
const monthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

const BAR_COLORS = ['#FF6F00', '#E53935', '#1E88E5', '#43A047', '#8E24AA', '#00897B'];

// ── Shared sub-components ────────────────────────────────────────────────────────
const InsightChip = ({ icon, label, value, color = '#555', bg = '#F5F5F5' }) => (
  <View style={[chip.wrap, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={14} color={color} />
    <View style={{ marginLeft: 6 }}>
      <Text style={chip.label}>{label}</Text>
      <Text style={[chip.value, { color }]}>{value}</Text>
    </View>
  </View>
);

const CategoryBar = ({ category, amount, percent, color }) => (
  <View style={bar.row}>
    <View style={bar.labelRow}>
      <Text style={bar.cat}>{category}</Text>
      <Text style={bar.amt}>₹{amount.toLocaleString()}</Text>
    </View>
    <View style={bar.track}>
      <View style={[bar.fill, { width: `${Math.min(percent, 100)}%`, backgroundColor: color }]} />
    </View>
    <Text style={bar.pct}>{percent}%</Text>
  </View>
);

// ── TEMPLATE A — "Overview" (original layout) ────────────────────────────────────
const TemplateA = ({ summary, primaryColor, expanded, setExpanded }) => {
  const vsPositive = summary?.vsLastMonth?.startsWith('+');
  const vsNeutral = summary?.vsLastMonth === 'same';
  const vsBadgeColor = vsNeutral ? '#757575' : vsPositive ? '#E53935' : '#43A047';
  const vsBadgeBg = vsNeutral ? '#F5F5F5' : vsPositive ? '#FFEBEE' : '#E8F5E9';
  const vsIcon = vsNeutral ? 'remove' : vsPositive ? 'trending-up' : 'trending-down';

  return (
    <>
      {/* Headline */}
      <View style={[tA.headlineBanner, { backgroundColor: primaryColor + '12', borderLeftColor: primaryColor }]}>
        <Text style={[tA.headlineText, { color: primaryColor }]}>"{summary.headline}"</Text>
      </View>

      {/* Chips */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ paddingRight: 8 }}>
        <InsightChip icon="cash-outline" label="Total Spent" value={`₹${(summary.totalSpent || 0).toLocaleString()}`} color="#333" bg="#F5F5F5" />
        <InsightChip icon="flame-outline" label="Top Category" value={`${summary.topCategory} (${summary.topCategoryPercent}%)`} color={primaryColor} bg={primaryColor + '12'} />
        <InsightChip icon={vsIcon} label="vs Last Month" value={summary.vsLastMonth || '—'} color={vsBadgeColor} bg={vsBadgeBg} />
        <InsightChip icon="sunny-outline" label="Peak Day" value={`${summary.peakDay} · ₹${(summary.peakDayAmount || 0).toLocaleString()}`} color="#E65100" bg="#FFF3E0" />
      </ScrollView>

      {/* vs detail */}
      {summary.vsLastMonthLabel && (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, paddingLeft: 2 }}>
          <Ionicons name={vsIcon} size={13} color={vsBadgeColor} />
          <Text style={{ fontSize: RFValue(11), fontWeight: '600', marginLeft: 5, color: vsBadgeColor }}>{summary.vsLastMonthLabel}</Text>
        </View>
      )}

      {/* Category bars */}
      {summary.categoryBreakdown?.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={tA.sectionTitle}>Category Breakdown</Text>
          {summary.categoryBreakdown.slice(0, expanded ? undefined : 3).map((item, idx) => (
            <CategoryBar key={item.category} category={item.category} amount={item.amount} percent={item.percent} color={BAR_COLORS[idx % BAR_COLORS.length]} />
          ))}
          {summary.categoryBreakdown.length > 3 && (
            <TouchableOpacity onPress={() => setExpanded(p => !p)} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
              <Text style={{ fontSize: RFValue(11), fontWeight: '700', marginRight: 3, color: primaryColor }}>
                {expanded ? 'Show less' : `+${summary.categoryBreakdown.length - 3} more`}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={primaryColor} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Daily pattern */}
      {summary.dailyPattern && (
        <View style={tA.insightRow}>
          <View style={[tA.insightIcon, { backgroundColor: '#E3F2FD' }]}>
            <Ionicons name="calendar-outline" size={15} color="#1565C0" />
          </View>
          <Text style={tA.insightText}>{summary.dailyPattern}</Text>
        </View>
      )}

      {/* Suggestion */}
      {summary.suggestion && (
        <View style={[tA.suggestionBox, { borderLeftColor: primaryColor }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="bulb-outline" size={15} color={primaryColor} />
            <Text style={[tA.suggestionLabel, { color: primaryColor }]}>Tip for next month</Text>
          </View>
          <Text style={tA.suggestionText}>{summary.suggestion}</Text>
        </View>
      )}
    </>
  );
};

// ── TEMPLATE B — "Deep Dive" (alternative on retry) ──────────────────────────────
const TemplateB = ({ summary, primaryColor, expanded, setExpanded }) => {
  const vsPositive = summary?.vsLastMonth?.startsWith('+');
  const vsNeutral = summary?.vsLastMonth === 'same';
  const vsBadgeColor = vsNeutral ? '#757575' : vsPositive ? '#E53935' : '#43A047';
  const vsIcon = vsNeutral ? 'remove-circle' : vsPositive ? 'arrow-up-circle' : 'arrow-down-circle';

  return (
    <>
      {/* Score-card style header */}
      <View style={tB.scoreCard}>
        <View style={tB.scoreLeft}>
          <Text style={tB.scoreTitle}>Month Total</Text>
          <Text style={[tB.scoreAmount, { color: primaryColor }]}>
            ₹{(summary.totalSpent || 0).toLocaleString()}
          </Text>
          {summary.vsLastMonthLabel && (
            <View style={tB.vsBadge}>
              <Ionicons name={vsIcon} size={12} color={vsBadgeColor} />
              <Text style={[tB.vsText, { color: vsBadgeColor }]}>{summary.vsLastMonthLabel}</Text>
            </View>
          )}
        </View>
        <View style={tB.scoreRight}>
          <View style={[tB.topCatBox, { backgroundColor: primaryColor + '15', borderColor: primaryColor + '30' }]}>
            <Ionicons name="flame" size={18} color={primaryColor} />
            <Text style={[tB.topCatLabel, { color: primaryColor }]}>Top Spend</Text>
            <Text style={[tB.topCatValue, { color: primaryColor }]}>{summary.topCategory}</Text>
            <Text style={[tB.topCatPct, { color: primaryColor + 'aa' }]}>{summary.topCategoryPercent}% of total</Text>
          </View>
        </View>
      </View>

      {/* Insight quote */}
      <View style={tB.quoteBox}>
        <Ionicons name="chatbubble-ellipses-outline" size={14} color="#888" style={{ marginRight: 8, marginTop: 1 }} />
        <Text style={tB.quoteText}>{summary.headline}</Text>
      </View>

      {/* Category list — compact rows */}
      {summary.categoryBreakdown?.length > 0 && (
        <View style={tB.catSection}>
          <View style={tB.catHeader}>
            <Text style={tB.catHeaderText}>Where did it go?</Text>
            <Text style={tB.catHeaderSub}>{summary.categoryBreakdown.length} categories</Text>
          </View>
          {summary.categoryBreakdown.slice(0, expanded ? undefined : 4).map((item, idx) => (
            <View key={item.category} style={tB.catRow}>
              <View style={[tB.catDot, { backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] }]} />
              <Text style={tB.catName}>{item.category}</Text>
              <View style={tB.catBarWrap}>
                <View style={[tB.catBarFill, { width: `${Math.min(item.percent, 100)}%`, backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] + '55' }]} />
              </View>
              <Text style={[tB.catPct, { color: BAR_COLORS[idx % BAR_COLORS.length] }]}>{item.percent}%</Text>
              <Text style={tB.catAmt}>₹{item.amount.toLocaleString()}</Text>
            </View>
          ))}
          {summary.categoryBreakdown.length > 4 && (
            <TouchableOpacity onPress={() => setExpanded(p => !p)} style={tB.showMore}>
              <Text style={[tB.showMoreText, { color: primaryColor }]}>
                {expanded ? 'Collapse' : `Show ${summary.categoryBreakdown.length - 4} more`}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={primaryColor} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Two-column info row: peak day + daily pattern */}
      <View style={tB.infoRow}>
        {summary.peakDay && summary.peakDay !== 'N/A' && (
          <View style={tB.infoBox}>
            <Ionicons name="flame-outline" size={14} color="#E65100" />
            <Text style={tB.infoLabel}>Busiest Day</Text>
            <Text style={tB.infoValue}>{summary.peakDay}</Text>
            <Text style={tB.infoSub}>₹{(summary.peakDayAmount || 0).toLocaleString()}</Text>
          </View>
        )}
        {summary.dailyPattern && (
          <View style={[tB.infoBox, { backgroundColor: '#F3F8FF', borderColor: '#D0E4FF' }]}>
            <Ionicons name="analytics-outline" size={14} color="#1565C0" />
            <Text style={[tB.infoLabel, { color: '#1565C0' }]}>Spending Pattern</Text>
            <Text style={[tB.infoValue, { fontSize: RFValue(10), color: '#333', fontWeight: '500', lineHeight: 15 }]}>{summary.dailyPattern}</Text>
          </View>
        )}
      </View>

      {/* Suggestion pill */}
      {summary.suggestion && (
        <View style={[tB.suggestionPill, { borderColor: primaryColor + '40', backgroundColor: primaryColor + '08' }]}>
          <View style={[tB.suggestionIconBox, { backgroundColor: primaryColor }]}>
            <Ionicons name="bulb" size={13} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[tB.suggestionTitle, { color: primaryColor }]}>Smart Tip</Text>
            <Text style={tB.suggestionBody}>{summary.suggestion}</Text>
          </View>
        </View>
      )}
    </>
  );
};

// ── MAIN COMPONENT ───────────────────────────────────────────────────────────────
const AISummaryCard = ({
  currentMonthExpenses = [],
  previousMonthExpenses = [],
  selectedMonth,
  selectedYear,
  primaryColor = '#37474F',
}) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [template, setTemplate] = useState(0); // 0 = A, 1 = B — toggles on each retry

  const summaryOpacity = useSharedValue(0);

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  useEffect(() => {
    if (summary && !loading) {
      summaryOpacity.value = withTiming(1, { duration: 420 });
    }
  }, [summary, loading, template, summaryOpacity]);

  const summaryAnimatedStyle = useAnimatedStyle(() => ({
    opacity: summaryOpacity.value,
    transform: [{ translateY: (1 - summaryOpacity.value) * 10 }],
  }));

  const fetchSummary = async (isRetry = false) => {
    if (currentMonthExpenses.length === 0) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    setExpanded(false);
    summaryOpacity.value = 0;

    // Toggle template only on retry / refresh
    if (isRetry) setTemplate(prev => (prev === 0 ? 1 : 0));

    try {
      const result = await getAIMonthlySummary({
        currentMonthExpenses,
        previousMonthExpenses,
        currentMonthLabel: monthLabel(selectedYear, selectedMonth),
        previousMonthLabel: monthLabel(prevYear, prevMonth),
      });
      if (result) {
        setSummary(result);
      } else {
        setError('Could not generate summary. Try again.');
      }
    } catch (e) {
      setError('AI summary failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <InteractiveCard style={styles.card} pressScale={0.986}>
      {/* ── Header ── */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <View style={[styles.sparkleCircle, { backgroundColor: primaryColor + '18' }]}>
            <LottieView
              source={require('../assets/lottie/sparkle-pulse.json')}
              autoPlay
              loop
              style={styles.sparkleLottie}
            />
            <Ionicons name="sparkles" size={13} color={primaryColor} style={styles.sparkleIcon} />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={styles.cardTitle}>AI Spending Summary</Text>
            <Text style={styles.cardSub}>{monthLabel(selectedYear, selectedMonth)}</Text>
          </View>
        </View>

        {!loading && !summary && (
          <TouchableOpacity
            style={[styles.generateBtn, { backgroundColor: primaryColor }]}
            onPress={() => fetchSummary(false)}
            activeOpacity={0.85}
          >
            <Ionicons name="flash" size={13} color="#fff" />
            <Text style={styles.generateBtnText}>Analyse</Text>
          </TouchableOpacity>
        )}

        {summary && !loading && (
          <TouchableOpacity
            style={[styles.refreshBtn, { borderColor: primaryColor }]}
            onPress={() => fetchSummary(true)}  // isRetry=true → toggles template
          >
            <Ionicons name="refresh" size={16} color={primaryColor} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Empty state ── */}
      {!loading && !summary && !error && currentMonthExpenses.length === 0 && (
        <View style={styles.emptyState}>
          <LottieView
            source={require('../assets/lottie/sparkle-pulse.json')}
            autoPlay
            loop
            style={styles.emptyStateLottie}
          />
          <Text style={styles.emptyText}>No expenses this month to analyse.</Text>
        </View>
      )}

      {/* ── Prompt ── */}
      {!loading && !summary && !error && currentMonthExpenses.length > 0 && (
        <View style={styles.promptBox}>
          <Text style={styles.promptText}>
            Tap <Text style={{ fontWeight: '800', color: primaryColor }}>Analyse</Text> to get a smart breakdown of your spending this month.
          </Text>
        </View>
      )}

      {/* ── Loading ── */}
      {loading && (
        <View style={styles.loadingBox}>
          <LottieView
            source={require('../assets/lottie/finance-loader.json')}
            autoPlay
            loop
            style={styles.loadingLottie}
          />
          <Text style={[styles.loadingText, { color: primaryColor }]}>Analysing your spending...</Text>
        </View>
      )}

      {/* ── Error ── */}
      {error && !loading && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#E53935" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => fetchSummary(true)} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Summary — alternates between Template A and B ── */}
      {summary && !loading && (
        <Animated.View entering={FadeIn.duration(220)} style={summaryAnimatedStyle}>

          {/* Small badge showing which view is active */}
          <View style={[styles.templateBadge, { backgroundColor: primaryColor + '15' }]}>
            <Text style={[styles.templateBadgeText, { color: primaryColor }]}>
              {template === 0 ? 'Overview' : 'Deep Dive'}
            </Text>
          </View>

          {template === 0
            ? <TemplateA summary={summary} primaryColor={primaryColor} expanded={expanded} setExpanded={setExpanded} />
            : <TemplateB summary={summary} primaryColor={primaryColor} expanded={expanded} setExpanded={setExpanded} />
          }

        </Animated.View>
      )}
    </InteractiveCard>
  );
};

export default AISummaryCard;

// ── Shared card styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  sparkleCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  sparkleLottie: { width: 40, height: 40, position: 'absolute' },
  sparkleIcon: { opacity: 0.9 },
  cardTitle: { fontSize: RFValue(13), fontWeight: '800', color: '#1A1A1A' },
  cardSub: { fontSize: RFValue(10), color: '#999', marginTop: 1 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14 },
  generateBtnText: { color: '#fff', fontSize: RFValue(11), fontWeight: '700', marginLeft: 5 },
  refreshBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyStateLottie: { width: 72, height: 72, marginBottom: 2 },
  emptyText: { color: '#bbb', fontSize: RFValue(12), marginTop: 8, textAlign: 'center' },
  promptBox: { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#F0F0F0' },
  promptText: { fontSize: RFValue(12), color: '#888', lineHeight: 18 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, justifyContent: 'center' },
  loadingLottie: { width: 46, height: 46 },
  loadingText: { marginLeft: 10, fontSize: RFValue(12), fontWeight: '600' },
  errorBox: { alignItems: 'center', paddingVertical: 14 },
  errorText: { color: '#E53935', fontSize: RFValue(12), marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 10, paddingHorizontal: 20, paddingVertical: 7, backgroundColor: '#FFEBEE', borderRadius: 20 },
  retryText: { color: '#E53935', fontWeight: '700', fontSize: RFValue(12) },
  templateBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 12 },
  templateBadgeText: { fontSize: RFValue(10), fontWeight: '700' },
});

// ── Template A styles ────────────────────────────────────────────────────────────
const tA = StyleSheet.create({
  headlineBanner: { borderLeftWidth: 3, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14 },
  headlineText: { fontSize: RFValue(13), fontWeight: '700', fontStyle: 'italic' },
  sectionTitle: { fontSize: RFValue(12), fontWeight: '800', color: '#333', marginBottom: 10 },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F8FAFF', borderRadius: 10, padding: 10, marginBottom: 12 },
  insightIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1, flexShrink: 0 },
  insightText: { fontSize: RFValue(12), color: '#444', lineHeight: 18, flex: 1 },
  suggestionBox: { backgroundColor: '#FFFDF5', borderLeftWidth: 3, borderRadius: 8, padding: 12 },
  suggestionLabel: { fontSize: RFValue(11), fontWeight: '800', marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionText: { fontSize: RFValue(12), color: '#555', lineHeight: 18 },
});

// ── Template B styles ────────────────────────────────────────────────────────────
const tB = StyleSheet.create({
  scoreCard: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  scoreLeft: { flex: 1, justifyContent: 'center' },
  scoreTitle: { fontSize: RFValue(10), color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  scoreAmount: { fontSize: RFValue(28), fontWeight: '900', letterSpacing: -0.5, marginTop: 2, marginBottom: 6 },
  vsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vsText: { fontSize: RFValue(11), fontWeight: '700' },
  scoreRight: { justifyContent: 'center' },
  topCatBox: { borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', minWidth: 110 },
  topCatLabel: { fontSize: RFValue(9), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  topCatValue: { fontSize: RFValue(14), fontWeight: '900', marginTop: 2 },
  topCatPct: { fontSize: RFValue(9), marginTop: 2, fontWeight: '600' },
  quoteBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F9F9F9', borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: '#EFEFEF' },
  quoteText: { fontSize: RFValue(12), color: '#555', fontStyle: 'italic', lineHeight: 18, flex: 1 },
  catSection: { marginBottom: 14 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catHeaderText: { fontSize: RFValue(12), fontWeight: '800', color: '#222' },
  catHeaderSub: { fontSize: RFValue(10), color: '#aaa', fontWeight: '600' },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, flexShrink: 0 },
  catName: { fontSize: RFValue(11), fontWeight: '600', color: '#333', width: 64 },
  catBarWrap: { flex: 1, height: 5, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  catBarFill: { height: 5, borderRadius: 4 },
  catPct: { fontSize: RFValue(10), fontWeight: '700', width: 30, textAlign: 'right' },
  catAmt: { fontSize: RFValue(10), color: '#666', fontWeight: '600', width: 54, textAlign: 'right' },
  showMore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  showMoreText: { fontSize: RFValue(11), fontWeight: '700' },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  infoBox: { flex: 1, backgroundColor: '#FFF5EE', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#FFE0CC' },
  infoLabel: { fontSize: RFValue(9), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: '#E65100', marginTop: 4, marginBottom: 2 },
  infoValue: { fontSize: RFValue(13), fontWeight: '800', color: '#222' },
  infoSub: { fontSize: RFValue(10), color: '#E65100', fontWeight: '600', marginTop: 2 },
  suggestionPill: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  suggestionIconBox: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  suggestionTitle: { fontSize: RFValue(10), fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  suggestionBody: { fontSize: RFValue(12), color: '#555', lineHeight: 17 },
});

// ── Chip styles ──────────────────────────────────────────────────────────────────
const chip = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, marginRight: 8, minWidth: 110 },
  label: { fontSize: RFValue(9), color: '#999', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { fontSize: RFValue(12), fontWeight: '800', marginTop: 1 },
});

// ── Category bar styles (Template A) ────────────────────────────────────────────
const bar = StyleSheet.create({
  row: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  cat: { fontSize: RFValue(12), fontWeight: '600', color: '#333' },
  amt: { fontSize: RFValue(12), fontWeight: '700', color: '#333' },
  track: { height: 6, backgroundColor: '#F0F0F0', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 4 },
  pct: { fontSize: RFValue(10), color: '#999', marginTop: 2, textAlign: 'right' },
});

