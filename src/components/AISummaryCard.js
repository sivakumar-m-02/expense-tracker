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
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { RFValue } from 'react-native-responsive-fontsize';
import { getAIMonthlySummary } from '../services/aiService';
import InteractiveCard from './InteractiveCard';

const monthLabel = (year, month) =>
  new Date(year, month, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });

const BAR_COLORS = ['#00C9A7', '#5C9BFF', '#FF6B6B', '#FFB300', '#A78BFA', '#1DE9B6'];

const InsightChip = ({ icon, label, value, color = '#00C9A7' }) => (
  <View style={[chip.wrap, { borderColor: color + '30', backgroundColor: color + '10' }]}>
    <Ionicons name={icon} size={14} color={color} />
    <View style={{ marginLeft: 7 }}>
      <Text style={chip.label}>{label}</Text>
      <Text style={[chip.value, { color }]}>{value}</Text>
    </View>
  </View>
);

const CategoryBar = ({ category, amount, percent, color }) => (
  <View style={bar.row}>
    <View style={bar.labelRow}>
      <View style={[bar.dot, { backgroundColor: color }]} />
      <Text style={bar.cat}>{category}</Text>
      <Text style={bar.amt}>₹{amount.toLocaleString()}</Text>
    </View>
    <View style={bar.track}>
      <LinearGradient
        colors={[color, color + '80']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[bar.fill, { width: `${Math.min(percent, 100)}%` }]}
      />
    </View>
    <Text style={[bar.pct, { color }]}>{percent}%</Text>
  </View>
);

const TemplateA = ({ summary, primaryColor, expanded, setExpanded }) => {
  const vsPositive = summary?.vsLastMonth?.startsWith('+');
  const vsNeutral = summary?.vsLastMonth === 'same';
  const vsBadgeColor = vsNeutral ? 'rgba(255,255,255,0.5)' : vsPositive ? '#FF6B6B' : '#1DE9B6';
  const vsIcon = vsNeutral ? 'remove' : vsPositive ? 'trending-up' : 'trending-down';

  return (
    <>
      <View style={[tA.headlineBanner, { borderLeftColor: primaryColor, backgroundColor: primaryColor + '12' }]}>
        <Ionicons name="chatbubble-ellipses-outline" size={13} color={primaryColor} style={{ marginRight: 8, marginTop: 2 }} />
        <Text style={[tA.headlineText, { color: primaryColor }]}>"{summary.headline}"</Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 14 }}
        contentContainerStyle={{ paddingRight: 8, gap: 8 }}
      >
        <InsightChip icon="cash-outline" label="Total Spent" value={`₹${(summary.totalSpent || 0).toLocaleString()}`} color="rgba(255,255,255,0.7)" />
        <InsightChip icon="flame-outline" label="Top Category" value={`${summary.topCategory} (${summary.topCategoryPercent}%)`} color={primaryColor} />
        <InsightChip icon={vsIcon} label="vs Last Month" value={summary.vsLastMonth || '—'} color={vsBadgeColor} />
        <InsightChip icon="sunny-outline" label="Peak Day" value={`${summary.peakDay} · ₹${(summary.peakDayAmount || 0).toLocaleString()}`} color="#FFB300" />
      </ScrollView>

      {summary.categoryBreakdown?.length > 0 && (
        <View style={{ marginBottom: 14 }}>
          <Text style={tA.sectionTitle}>Category Breakdown</Text>
          {summary.categoryBreakdown.slice(0, expanded ? undefined : 3).map((item, idx) => (
            <CategoryBar
              key={item.category}
              category={item.category}
              amount={item.amount}
              percent={item.percent}
              color={BAR_COLORS[idx % BAR_COLORS.length]}
            />
          ))}
          {summary.categoryBreakdown.length > 3 && (
            <TouchableOpacity onPress={() => setExpanded(p => !p)} style={tA.showMoreBtn}>
              <Text style={[tA.showMoreText, { color: primaryColor }]}>
                {expanded ? 'Show less' : `+${summary.categoryBreakdown.length - 3} more`}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={13} color={primaryColor} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {summary.dailyPattern && (
        <View style={tA.insightRow}>
          <View style={[tA.insightIcon, { backgroundColor: 'rgba(92,155,255,0.15)' }]}>
            <Ionicons name="calendar-outline" size={14} color="#5C9BFF" />
          </View>
          <Text style={tA.insightText}>{summary.dailyPattern}</Text>
        </View>
      )}

      {summary.suggestion && (
        <View style={[tA.suggestionBox, { borderLeftColor: primaryColor, backgroundColor: primaryColor + '0D' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <Ionicons name="bulb-outline" size={14} color={primaryColor} />
            <Text style={[tA.suggestionLabel, { color: primaryColor }]}>  Tip for next month</Text>
          </View>
          <Text style={tA.suggestionText}>{summary.suggestion}</Text>
        </View>
      )}
    </>
  );
};

const TemplateB = ({ summary, primaryColor, expanded, setExpanded }) => {
  const vsPositive = summary?.vsLastMonth?.startsWith('+');
  const vsNeutral = summary?.vsLastMonth === 'same';
  const vsBadgeColor = vsNeutral ? 'rgba(255,255,255,0.5)' : vsPositive ? '#FF6B6B' : '#1DE9B6';
  const vsIcon = vsNeutral ? 'remove-circle' : vsPositive ? 'arrow-up-circle' : 'arrow-down-circle';

  return (
    <>
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
        <View style={[tB.topCatBox, { backgroundColor: primaryColor + '15', borderColor: primaryColor + '30' }]}>
          <Ionicons name="flame" size={18} color={primaryColor} />
          <Text style={[tB.topCatLabel, { color: primaryColor }]}>Top Spend</Text>
          <Text style={[tB.topCatValue, { color: primaryColor }]}>{summary.topCategory}</Text>
          <Text style={[tB.topCatPct, { color: primaryColor + 'aa' }]}>{summary.topCategoryPercent}% of total</Text>
        </View>
      </View>

      <View style={tB.quoteBox}>
        <Ionicons name="chatbubble-ellipses-outline" size={14} color="rgba(255,255,255,0.3)" style={{ marginRight: 8, marginTop: 1 }} />
        <Text style={tB.quoteText}>{summary.headline}</Text>
      </View>

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
                <View style={[tB.catBarFill, { width: `${Math.min(item.percent, 100)}%`, backgroundColor: BAR_COLORS[idx % BAR_COLORS.length] + '60' }]} />
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

      <View style={tB.infoRow}>
        {summary.peakDay && summary.peakDay !== 'N/A' && (
          <View style={tB.infoBox}>
            <Ionicons name="flame-outline" size={14} color="#FFB300" />
            <Text style={tB.infoLabel}>Busiest Day</Text>
            <Text style={tB.infoValue}>{summary.peakDay}</Text>
            <Text style={tB.infoSub}>₹{(summary.peakDayAmount || 0).toLocaleString()}</Text>
          </View>
        )}
        {summary.dailyPattern && (
          <View style={[tB.infoBox, { backgroundColor: 'rgba(92,155,255,0.1)', borderColor: 'rgba(92,155,255,0.2)' }]}>
            <Ionicons name="analytics-outline" size={14} color="#5C9BFF" />
            <Text style={[tB.infoLabel, { color: '#5C9BFF' }]}>Spending Pattern</Text>
            <Text style={[tB.infoValue, { fontSize: RFValue(10), color: 'rgba(255,255,255,0.7)', fontWeight: '500', lineHeight: 15 }]}>{summary.dailyPattern}</Text>
          </View>
        )}
      </View>

      {summary.suggestion && (
        <View style={[tB.suggestionPill, { borderColor: primaryColor + '40', backgroundColor: primaryColor + '0D' }]}>
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

const AISummaryCard = ({
  currentMonthExpenses = [],
  previousMonthExpenses = [],
  selectedMonth,
  selectedYear,
  primaryColor = '#00C9A7',
}) => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [template, setTemplate] = useState(0);

  const summaryOpacity = useSharedValue(0);

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;

  useEffect(() => {
    if (summary && !loading) {
      summaryOpacity.value = withTiming(1, { duration: 380 });
    }
  }, [summary, loading, template]);

  const summaryAnimatedStyle = useAnimatedStyle(() => ({
    opacity: summaryOpacity.value,
    transform: [{ translateY: (1 - summaryOpacity.value) * 8 }],
  }));

  const fetchSummary = async (isRetry = false) => {
    if (currentMonthExpenses.length === 0) return;
    setLoading(true);
    setError(null);
    setSummary(null);
    setExpanded(false);
    summaryOpacity.value = 0;
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
      <LinearGradient
        colors={["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]}
        style={styles.cardGradient}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={[styles.sparkleCircle, { backgroundColor: primaryColor + '18' }]}>
              <LottieView
                source={require('../assets/lottie/sparkle-pulse.json')}
                autoPlay
                loop
                style={styles.sparkleLottie}
              />
              <Ionicons name="sparkles" size={13} color={primaryColor} />
            </View>
            <View style={{ marginLeft: 10 }}>
              <Text style={styles.cardTitle}>AI Spending Summary</Text>
              <Text style={[styles.cardSub, { color: primaryColor + 'aa' }]}>{monthLabel(selectedYear, selectedMonth)}</Text>
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
              style={[styles.refreshBtn, { borderColor: primaryColor + '60' }]}
              onPress={() => fetchSummary(true)}
            >
              <Ionicons name="refresh" size={16} color={primaryColor} />
            </TouchableOpacity>
          )}
        </View>

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

        {!loading && !summary && !error && currentMonthExpenses.length > 0 && (
          <View style={styles.promptBox}>
            <Text style={styles.promptText}>
              Tap <Text style={{ fontWeight: '800', color: primaryColor }}>Analyse</Text> to get a smart breakdown of your spending this month.
            </Text>
          </View>
        )}

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

        {error && !loading && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={18} color="#FF6B6B" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchSummary(true)} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {summary && !loading && (
          <Animated.View entering={FadeIn.duration(200)} style={summaryAnimatedStyle}>
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
      </LinearGradient>
    </InteractiveCard>
  );
};

export default AISummaryCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginTop: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardGradient: {
    borderRadius: 20,
    padding: 16,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  sparkleCircle: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sparkleLottie: { width: 42, height: 42, position: 'absolute' },
  cardTitle: { fontSize: RFValue(13), fontWeight: '800', color: '#fff' },
  cardSub: { fontSize: RFValue(10), marginTop: 1 },
  generateBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, paddingVertical: 7, paddingHorizontal: 14, gap: 5 },
  generateBtnText: { color: '#fff', fontSize: RFValue(11), fontWeight: '700' },
  refreshBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.05)' },
  emptyState: { alignItems: 'center', paddingVertical: 20 },
  emptyStateLottie: { width: 72, height: 72, marginBottom: 2 },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: RFValue(12), marginTop: 8, textAlign: 'center' },
  promptBox: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  promptText: { fontSize: RFValue(12), color: 'rgba(255,255,255,0.5)', lineHeight: 18 },
  loadingBox: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, justifyContent: 'center' },
  loadingLottie: { width: 46, height: 46 },
  loadingText: { marginLeft: 10, fontSize: RFValue(12), fontWeight: '600' },
  errorBox: { alignItems: 'center', paddingVertical: 14 },
  errorText: { color: '#FF6B6B', fontSize: RFValue(12), marginTop: 6, textAlign: 'center' },
  retryBtn: { marginTop: 10, paddingHorizontal: 20, paddingVertical: 7, backgroundColor: 'rgba(255,107,107,0.15)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)' },
  retryText: { color: '#FF6B6B', fontWeight: '700', fontSize: RFValue(12) },
  templateBadge: { alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 12 },
  templateBadgeText: { fontSize: RFValue(10), fontWeight: '700' },
});

const tA = StyleSheet.create({
  headlineBanner: { flexDirection: 'row', alignItems: 'flex-start', borderLeftWidth: 3, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 14 },
  headlineText: { fontSize: RFValue(13), fontWeight: '700', fontStyle: 'italic', flex: 1 },
  sectionTitle: { fontSize: RFValue(12), fontWeight: '800', color: 'rgba(255,255,255,0.7)', marginBottom: 10 },
  showMoreBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
  showMoreText: { fontSize: RFValue(11), fontWeight: '700' },
  insightRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  insightIcon: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 10, marginTop: 1, flexShrink: 0 },
  insightText: { fontSize: RFValue(12), color: 'rgba(255,255,255,0.6)', lineHeight: 18, flex: 1 },
  suggestionBox: { borderLeftWidth: 3, borderRadius: 8, padding: 12 },
  suggestionLabel: { fontSize: RFValue(11), fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionText: { fontSize: RFValue(12), color: 'rgba(255,255,255,0.6)', lineHeight: 18 },
});

const tB = StyleSheet.create({
  scoreCard: { flexDirection: 'row', marginBottom: 14, gap: 12 },
  scoreLeft: { flex: 1, justifyContent: 'center' },
  scoreTitle: { fontSize: RFValue(10), color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  scoreAmount: { fontSize: RFValue(28), fontWeight: '900', letterSpacing: -0.5, marginTop: 2, marginBottom: 6 },
  vsBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  vsText: { fontSize: RFValue(11), fontWeight: '700' },
  topCatBox: { borderWidth: 1, borderRadius: 14, padding: 12, alignItems: 'center', minWidth: 110 },
  topCatLabel: { fontSize: RFValue(9), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  topCatValue: { fontSize: RFValue(14), fontWeight: '900', marginTop: 2 },
  topCatPct: { fontSize: RFValue(9), marginTop: 2, fontWeight: '600' },
  quoteBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, marginBottom: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  quoteText: { fontSize: RFValue(12), color: 'rgba(255,255,255,0.5)', fontStyle: 'italic', lineHeight: 18, flex: 1 },
  catSection: { marginBottom: 14 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  catHeaderText: { fontSize: RFValue(12), fontWeight: '800', color: 'rgba(255,255,255,0.8)' },
  catHeaderSub: { fontSize: RFValue(10), color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 9 },
  catDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8, flexShrink: 0 },
  catName: { fontSize: RFValue(11), fontWeight: '600', color: 'rgba(255,255,255,0.7)', width: 64 },
  catBarWrap: { flex: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden', marginHorizontal: 8 },
  catBarFill: { height: 5, borderRadius: 4 },
  catPct: { fontSize: RFValue(10), fontWeight: '700', width: 30, textAlign: 'right' },
  catAmt: { fontSize: RFValue(10), color: 'rgba(255,255,255,0.4)', fontWeight: '600', width: 54, textAlign: 'right' },
  showMore: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  showMoreText: { fontSize: RFValue(11), fontWeight: '700' },
  infoRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  infoBox: { flex: 1, backgroundColor: 'rgba(255,179,0,0.1)', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: 'rgba(255,179,0,0.2)' },
  infoLabel: { fontSize: RFValue(9), fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.4, color: '#FFB300', marginTop: 4, marginBottom: 2 },
  infoValue: { fontSize: RFValue(13), fontWeight: '800', color: '#fff' },
  infoSub: { fontSize: RFValue(10), color: '#FFB300', fontWeight: '600', marginTop: 2 },
  suggestionPill: { flexDirection: 'row', alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, gap: 10 },
  suggestionIconBox: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 },
  suggestionTitle: { fontSize: RFValue(10), fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3 },
  suggestionBody: { fontSize: RFValue(12), color: 'rgba(255,255,255,0.6)', lineHeight: 17 },
});

const chip = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10, minWidth: 110, borderWidth: 1 },
  label: { fontSize: RFValue(9), color: 'rgba(255,255,255,0.4)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  value: { fontSize: RFValue(12), fontWeight: '800', marginTop: 1 },
});

const bar = StyleSheet.create({
  row: { marginBottom: 10 },
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 7, flexShrink: 0 },
  cat: { flex: 1, fontSize: RFValue(12), fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  amt: { fontSize: RFValue(12), fontWeight: '700', color: 'rgba(255,255,255,0.6)' },
  track: { height: 6, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 4 },
  pct: { fontSize: RFValue(10), marginTop: 2, textAlign: 'right', fontWeight: '700' },
});
