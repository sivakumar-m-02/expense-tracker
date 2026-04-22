import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Modal, ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RFValue } from 'react-native-responsive-fontsize';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing, FadeInDown, FadeInUp, Layout,
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import { getAIParsedExpense } from '../services/aiService';
import InteractiveCard from '../components/InteractiveCard';
import AppPromptModal from '../components/AppPromptModal';
import useAppModal from '../hooks/useAppModal';

const categories = [
  { label: 'Food',     icon: 'fast-food-outline',           subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'] },
  { label: 'Petrol',   icon: 'flame-outline',               subcategories: ['Bike', 'Car', 'Other'] },
  { label: 'Travel',   icon: 'car-outline' },
  { label: 'Shopping', icon: 'cart-outline' },
  { label: 'Bills',    icon: 'receipt-outline' },
  { label: 'Other',    icon: 'ellipsis-horizontal-outline' },
];

const ACCENT = '#FF6B6B';
const ACCENT_DARK = '#E53935';

// ── Detail row for AI modal ───────────────────────────────────────────────────
const DetailRow = ({ icon, label, value, highlight }) => (
  <View style={modal.row}>
    <View style={modal.rowLeft}>
      <Icon name={icon} size={16} color={ACCENT} />
      <Text style={modal.rowLabel}>{label}</Text>
    </View>
    <Text style={[modal.rowValue, highlight && modal.rowValueHighlight]}>{value}</Text>
  </View>
);

// ── AI Confirm Modal ──────────────────────────────────────────────────────────
const AIConfirmModal = ({ visible, parsed, onAdd, onCancel, saving }) => {
  if (!parsed) return null;
  const categoryIcon = categories.find((c) => c.label === parsed.category)?.icon || 'ellipsis-horizontal-outline';
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={modal.overlay}>
        <Animated.View entering={FadeInDown.duration(240)} style={modal.card}>
          <LinearGradient colors={['rgba(255,107,107,0.15)', 'rgba(255,107,107,0.05)']} style={modal.header}>
            <View style={modal.iconCircle}>
              <LottieView source={require('../assets/lottie/sparkle-pulse.json')} autoPlay loop style={modal.iconLottie} />
              <Icon name="sparkles" size={22} color={ACCENT} />
            </View>
            <Text style={modal.title}>AI Parsed Expense</Text>
            <Text style={modal.subtitle}>Please confirm before adding</Text>
          </LinearGradient>
          <View style={modal.detailsBox}>
            <DetailRow icon="cash-outline" label="Amount" value={`\u20B9 ${parsed.amount}`} highlight />
            <DetailRow icon={categoryIcon} label="Category" value={parsed.category} />
            {parsed.subcategory && <DetailRow icon="layers-outline" label="Subcategory" value={parsed.subcategory} />}
            {parsed.note && <DetailRow icon="create-outline" label="Note" value={parsed.note} />}
          </View>
          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onCancel} disabled={saving}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.addBtn} onPress={onAdd} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <><Icon name="checkmark" size={16} color="#fff" /><Text style={modal.addText}>Add</Text></>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ── AI Input View ─────────────────────────────────────────────────────────────
const AIInputView = ({ onResult, onBack, onNotify }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) { onNotify({ type: 'warning', title: 'Empty Input', message: 'Please describe your expense.' }); return; }
    setLoading(true);
    try {
      const result = await getAIParsedExpense(prompt.trim());
      if (result && result.amount) { onResult(result); }
      else { onNotify({ type: 'warning', title: 'Parse Failed', message: 'Try something like: spent 150 on bike petrol.' }); }
    } catch { onNotify({ type: 'error', title: 'Error', message: 'AI parsing failed. Please try again.' }); }
    finally { setLoading(false); }
  };

  return (
    <Animated.View entering={FadeInUp.duration(280)} style={ai.container}>
      <TouchableOpacity style={ai.backBtn} onPress={onBack}>
        <Icon name="arrow-back-outline" size={18} color={ACCENT} />
        <Text style={ai.backText}>Manual</Text>
      </TouchableOpacity>
      <Animated.View entering={FadeInDown.duration(300).delay(40)} style={ai.card}>
        <View style={ai.sparkleRow}>
          <LottieView source={require('../assets/lottie/sparkle-pulse.json')} autoPlay loop style={ai.sparkleLottie} />
          <Icon name="sparkles" size={20} color={ACCENT} />
          <Text style={ai.cardTitle}>Describe your expense</Text>
        </View>
        <Text style={ai.hint}>Example: had lunch for 120 or bike petrol 500</Text>
        <TextInput
          style={ai.textArea}
          placeholder="Type here..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          value={prompt}
          onChangeText={setPrompt}
          multiline
          autoFocus
        />
        <TouchableOpacity
          style={[ai.submitBtn, (!prompt.trim() || loading) && ai.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!prompt.trim() || loading}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : (
            <><Icon name="send" size={16} color="#fff" style={{ marginRight: 6 }} /><Text style={ai.submitText}>Parse with AI</Text></>
          )}
        </TouchableOpacity>
      </Animated.View>
      <Animated.View entering={FadeInDown.duration(320).delay(80)} style={ai.tipsBox}>
        <Text style={ai.tipsTitle}>Try saying</Text>
        {['Spent 60 on dinner', 'Bike petrol 150', 'Grocery shopping 1200', 'Snacks for 62rs'].map((tip) => (
          <TouchableOpacity key={tip} onPress={() => setPrompt(tip)}>
            <Text style={ai.tip}>"{tip}"</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Animated.View>
  );
};

// ── Main CashOutForm ──────────────────────────────────────────────────────────
const CashOutForm = () => {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(categories[0].label);
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [note, setNote] = useState('');
  const [aiMode, setAiMode] = useState(false);
  const [parsedExpense, setParsedExpense] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showModal: showPrompt, modalProps } = useAppModal();

  const aiPulse = useSharedValue(1);
  const addPulse = useSharedValue(1);

  useEffect(() => {
    aiPulse.value = withRepeat(withSequence(withTiming(1.04, { duration: 900, easing: Easing.out(Easing.cubic) }), withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })), -1, false);
    addPulse.value = withRepeat(withSequence(withTiming(1.06, { duration: 900, easing: Easing.out(Easing.cubic) }), withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })), -1, false);
  }, []);

  const aiPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: aiPulse.value }] }));
  const addPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: addPulse.value }] }));

  const saveExpense = async ({ amount: amt, category: cat, subcategory: sub, note: userNote, expenseDate }) => {
    const user = auth().currentUser;
    if (!user) { showPrompt({ type: 'error', title: 'Error', message: 'You must be logged in.' }); return false; }
    await firestore().collection('users').doc(user.uid).collection('expenses').add({
      amount: parseFloat(amt), category: cat, subcategory: sub || null,
      note: userNote || null, date: expenseDate || new Date(), createdAt: new Date(),
    });
    return true;
  };

  const resetManualForm = () => { setAmount(''); setCategory(categories[0].label); setSubcategory(''); setNote(''); setDate(new Date()); };

  const handleSave = async () => {
    if (!amount || isNaN(amount)) { showPrompt({ type: 'warning', title: 'Validation Error', message: 'Please enter a valid amount.' }); return; }
    try {
      const ok = await saveExpense({ amount, category, subcategory, note, expenseDate: date });
      if (ok) { resetManualForm(); showPrompt({ type: 'success', title: 'Success', message: 'Expense added successfully!' }); }
    } catch { showPrompt({ type: 'error', title: 'Error', message: 'Failed to save expense.' }); }
  };

  const handleAIResult = (result) => { setParsedExpense(result); setShowModal(true); };

  const handleAIAdd = async () => {
    setSaving(true);
    try {
      const ok = await saveExpense({ amount: parsedExpense.amount, category: parsedExpense.category, subcategory: parsedExpense.subcategory, note: parsedExpense.note, expenseDate: new Date() });
      if (ok) { setShowModal(false); setParsedExpense(null); setAiMode(false); showPrompt({ type: 'success', title: 'Success', message: 'Expense added successfully!' }); }
    } catch { showPrompt({ type: 'error', title: 'Error', message: 'Failed to save expense.' }); }
    finally { setSaving(false); }
  };

  if (aiMode) {
    return (
      <>
        <AIInputView onResult={handleAIResult} onBack={() => setAiMode(false)} onNotify={showPrompt} />
        <AIConfirmModal visible={showModal} parsed={parsedExpense} onAdd={handleAIAdd} onCancel={() => { setShowModal(false); setParsedExpense(null); }} saving={saving} />
        <AppPromptModal {...modalProps} />
      </>
    );
  }

  return (
    <>
      <KeyboardAwareScrollView
        style={{ width: '100%' }}
        contentContainerStyle={[styles.container, { paddingBottom: 40, alignItems: 'center' }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
        enableOnAndroid
        enableAutomaticScroll
        extraScrollHeight={40}
        keyboardOpeningTime={0}
      >
        {/* Header row */}
        <Animated.View entering={FadeInUp.duration(280)} style={styles.addBtn}>
          <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 }}>
            <View style={styles.titleRow}>
              <LottieView source={require('../assets/lottie/sparkle-pulse.json')} autoPlay loop style={styles.titleSparkle} />
              <Text style={[styles.label, { fontSize: RFValue(17), marginTop: 0, marginBottom: 0, color: '#fff' }]}>Cash Out</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View style={aiPulseStyle}>
              <InteractiveCard style={styles.aiToggleBtn} onPress={() => setAiMode(true)} pressScale={0.95}>
                <Icon name="sparkles" size={14} color={ACCENT} />
                <Text style={styles.aiToggleText}>AI</Text>
              </InteractiveCard>
            </Animated.View>
            <Animated.View style={addPulseStyle}>
              <InteractiveCard style={styles.fab} onPress={handleSave} pressScale={0.9}>
                <Icon name="add" size={20} color="#fff" />
              </InteractiveCard>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Form card */}
        <Animated.View entering={FadeInDown.duration(320).delay(50)} style={styles.inputCard}>

          {/* Amount */}
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <Icon name="cash-outline" size={22} color={ACCENT} />
            <TextInput style={styles.input} placeholder="Enter amount" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor="rgba(255,255,255,0.25)" />
          </View>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.label}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryRow}
            contentContainerStyle={styles.categoryRowContent}
            renderItem={({ item: cat, index }) => (
              <Animated.View entering={FadeInUp.duration(250).delay(index * 35)} layout={Layout.springify().damping(16).stiffness(170)}>
                <TouchableOpacity
                  style={[styles.categoryBtn, category === cat.label && styles.categoryBtnActive]}
                  onPress={() => { setCategory(cat.label); setSubcategory(''); }}
                >
                  <Icon name={cat.icon} size={18} color={category === cat.label ? '#fff' : ACCENT} />
                  <Text style={[styles.categoryText, category === cat.label && { color: '#fff' }]}>{cat.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          />

          {/* Subcategory */}
          {(() => {
            const selectedCat = categories.find((cat) => cat.label === category);
            if (!selectedCat?.subcategories) return null;
            return (
              <View style={styles.subcategoryRow}>
                {selectedCat.subcategories.map((sub) => (
                  <Animated.View key={sub} layout={Layout.springify().damping(17).stiffness(180)}>
                    <TouchableOpacity
                      style={[styles.subcategoryBtn, subcategory === sub && styles.subcategoryBtnActive]}
                      onPress={() => setSubcategory(sub)}
                    >
                      <Text style={[styles.subcategoryText, subcategory === sub && { color: '#fff' }]}>{sub}</Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>
            );
          })()}

          {/* Date & Time */}
          <Text style={styles.label}>Date & Time</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <InteractiveCard style={styles.dateBtn} onPress={() => setShowDatePicker(true)} pressScale={0.97}>
              <Icon name="calendar-outline" size={18} color={ACCENT} />
              <Text style={styles.dateText}>{date.toDateString()}</Text>
            </InteractiveCard>
            <InteractiveCard style={[styles.dateBtn, { marginLeft: 8 }]} onPress={() => setShowTimePicker(true)} pressScale={0.97}>
              <Icon name="time-outline" size={18} color={ACCENT} />
              <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </InteractiveCard>
          </View>

          {showDatePicker && (
            <DateTimePicker value={date} mode="date" display="default" onChange={(event, selectedDate) => { setShowDatePicker(false); if (selectedDate) { const nd = new Date(selectedDate); nd.setHours(date.getHours()); nd.setMinutes(date.getMinutes()); setDate(nd); } }} />
          )}
          {showTimePicker && (
            <DateTimePicker value={date} mode="time" display="default" onChange={(event, selectedTime) => { setShowTimePicker(false); if (selectedTime) { const nd = new Date(date); nd.setHours(selectedTime.getHours()); nd.setMinutes(selectedTime.getMinutes()); setDate(nd); } }} />
          )}

          {/* Note */}
          <Text style={styles.label}>Note</Text>
          <TextInput style={[styles.input, { height: 60, flex: 0, marginLeft: 0 }]} placeholder="Add a note (optional)" value={note} onChangeText={setNote} multiline placeholderTextColor="rgba(255,255,255,0.25)" />
        </Animated.View>
      </KeyboardAwareScrollView>
      <AppPromptModal {...modalProps} />
    </>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: 'transparent' },
  inputCard: { width: '100%', borderRadius: 20, padding: 18, paddingTop: 0 },
  label: { fontSize: RFValue(13), color: 'rgba(255,255,255,0.6)', marginTop: 16, marginBottom: 8, fontWeight: '700', letterSpacing: 0.3 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: RFValue(13), color: '#fff', marginLeft: 10, flex: 1,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  categoryRow: { marginVertical: 8 },
  categoryRowContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  categoryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,107,107,0.08)',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginHorizontal: 4,
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
  },
  categoryBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  categoryText: { marginLeft: 6, fontSize: RFValue(12), color: ACCENT, fontWeight: '600' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,107,107,0.08)',
    borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginVertical: 8,
    borderWidth: 1, borderColor: 'rgba(255,107,107,0.3)',
  },
  dateText: { marginLeft: 8, fontSize: RFValue(12), color: ACCENT, fontWeight: '600' },
  fab: {
    backgroundColor: ACCENT, width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', elevation: 4, marginRight: 10,
  },
  subcategoryRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 8, flexWrap: 'wrap' },
  subcategoryBtn: {
    backgroundColor: 'rgba(255,107,107,0.06)', borderRadius: 16, paddingVertical: 7, paddingHorizontal: 14,
    marginHorizontal: 4, marginVertical: 4, borderWidth: 1, borderColor: 'rgba(255,107,107,0.25)',
  },
  subcategoryBtnActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  subcategoryText: { fontSize: RFValue(12), color: ACCENT, fontWeight: '600' },
  addBtn: { width: '100%', justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleSparkle: { width: 22, height: 22, marginRight: 6 },
  aiToggleBtn: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: 'rgba(255,107,107,0.4)',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14, marginRight: 10, backgroundColor: 'rgba(255,107,107,0.08)',
  },
  aiToggleText: { marginLeft: 5, fontSize: RFValue(12), color: ACCENT, fontWeight: '700' },
});

const ai = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent', paddingHorizontal: 18, paddingTop: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { marginLeft: 6, fontSize: RFValue(13), color: ACCENT, fontWeight: '600' },
  card: { backgroundColor: 'rgba(255,107,107,0.07)', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: 'rgba(255,107,107,0.2)' },
  sparkleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sparkleLottie: { width: 22, height: 22, marginRight: 4 },
  cardTitle: { fontSize: RFValue(15), fontWeight: '700', color: '#fff', marginLeft: 8 },
  hint: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.35)', marginBottom: 14 },
  textArea: {
    backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    padding: 14, fontSize: RFValue(13), color: '#fff', minHeight: 80, textAlignVertical: 'top', marginBottom: 16,
  },
  submitBtn: { backgroundColor: ACCENT, borderRadius: 14, paddingVertical: 13, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  submitBtnDisabled: { backgroundColor: 'rgba(255,107,107,0.3)' },
  submitText: { color: '#fff', fontSize: RFValue(13), fontWeight: '700' },
  tipsBox: { marginTop: 20, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)' },
  tipsTitle: { fontSize: RFValue(12), fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 10 },
  tip: { fontSize: RFValue(12), color: ACCENT, marginBottom: 8, fontStyle: 'italic' },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { width: '100%', backgroundColor: '#0D1F2D', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  header: { paddingVertical: 22, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(255,107,107,0.15)' },
  iconCircle: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,107,107,0.1)', borderWidth: 1.5, borderColor: 'rgba(255,107,107,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  iconLottie: { position: 'absolute', width: 60, height: 60, opacity: 0.6 },
  title: { fontSize: RFValue(16), fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.4)', marginTop: 3 },
  detailsBox: { padding: 20 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { marginLeft: 8, fontSize: RFValue(12), color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  rowValue: { fontSize: RFValue(13), color: 'rgba(255,255,255,0.8)', fontWeight: '600' },
  rowValueHighlight: { color: ACCENT, fontSize: RFValue(15), fontWeight: '800' },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  cancelBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', borderRightWidth: 0.5, borderRightColor: 'rgba(255,255,255,0.08)' },
  cancelText: { fontSize: RFValue(13), color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
  addBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', backgroundColor: ACCENT, flexDirection: 'row', justifyContent: 'center' },
  addText: { fontSize: RFValue(13), color: '#fff', fontWeight: '700', marginLeft: 6 },
});

export default CashOutForm;
