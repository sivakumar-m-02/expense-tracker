import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Modal,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { RFValue } from 'react-native-responsive-fontsize';
import LottieView from 'lottie-react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { getAIParsedExpense } from '../services/aiService';
import InteractiveCard from '../components/InteractiveCard';
import AppPromptModal from '../components/AppPromptModal';
import useAppModal from '../hooks/useAppModal';

const categories = [
  {
    label: 'Food',
    icon: 'fast-food-outline',
    subcategories: ['Breakfast', 'Lunch', 'Dinner', 'Snacks', 'Drinks'],
  },
  {
    label: 'Petrol',
    icon: 'flame-outline',
    subcategories: ['Bike', 'Car', 'Other'],
  },
  { label: 'Travel', icon: 'car-outline' },
  { label: 'Shopping', icon: 'cart-outline' },
  { label: 'Bills', icon: 'receipt-outline' },
  { label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

const DetailRow = ({ icon, label, value, highlight }) => (
  <View style={modal.row}>
    <View style={modal.rowLeft}>
      <Icon name={icon} size={16} color="#ff3333" />
      <Text style={modal.rowLabel}>{label}</Text>
    </View>
    <Text style={[modal.rowValue, highlight && modal.rowValueHighlight]}>{value}</Text>
  </View>
);

const AIConfirmModal = ({ visible, parsed, onAdd, onCancel, saving }) => {
  if (!parsed) return null;

  const categoryIcon =
    categories.find((c) => c.label === parsed.category)?.icon || 'ellipsis-horizontal-outline';

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={modal.overlay}>
        <Animated.View entering={FadeInDown.duration(240)} style={modal.card}>
          <View style={modal.header}>
            <View style={modal.iconCircle}>
              <LottieView
                source={require('../assets/lottie/sparkle-pulse.json')}
                autoPlay
                loop
                style={modal.iconLottie}
              />
              <Icon name="sparkles" size={22} color="#ff3333" />
            </View>
            <Text style={modal.title}>AI Parsed Expense</Text>
            <Text style={modal.subtitle}>Please confirm before adding</Text>
          </View>

          <View style={modal.detailsBox}>
            <DetailRow icon="cash-outline" label="Amount" value={`\u20B9 ${parsed.amount}`} highlight />
            <DetailRow icon={categoryIcon} label="Category" value={parsed.category} />
            {parsed.subcategory ? (
              <DetailRow icon="layers-outline" label="Subcategory" value={parsed.subcategory} />
            ) : null}
            {parsed.note ? <DetailRow icon="create-outline" label="Note" value={parsed.note} /> : null}
          </View>

          <View style={modal.actions}>
            <TouchableOpacity style={modal.cancelBtn} onPress={onCancel} disabled={saving}>
              <Text style={modal.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modal.addBtn} onPress={onAdd} disabled={saving}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="checkmark" size={16} color="#fff" />
                  <Text style={modal.addText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const AIInputView = ({ onResult, onBack, onNotify }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!prompt.trim()) {
      onNotify({
        type: 'warning',
        title: 'Empty Input',
        message: 'Please describe your expense.',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await getAIParsedExpense(prompt.trim());
      if (result && result.amount) {
        onResult(result);
      } else {
        onNotify({
          type: 'warning',
          title: 'Parse Failed',
          message: 'Try something like: spent 150 on bike petrol.',
        });
      }
    } catch (error) {
      onNotify({
        type: 'error',
        title: 'Error',
        message: 'AI parsing failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Animated.View entering={FadeInUp.duration(280)} style={ai.container}>
      <TouchableOpacity style={ai.backBtn} onPress={onBack}>
        <Icon name="arrow-back-outline" size={18} color="#ff3333" />
        <Text style={ai.backText}>Manual</Text>
      </TouchableOpacity>

      <Animated.View entering={FadeInDown.duration(300).delay(40)} style={ai.card}>
        <View style={ai.sparkleRow}>
          <LottieView
            source={require('../assets/lottie/sparkle-pulse.json')}
            autoPlay
            loop
            style={ai.sparkleLottie}
          />
          <Icon name="sparkles" size={20} color="#ff3333" />
          <Text style={ai.cardTitle}>Describe your expense</Text>
        </View>
        <Text style={ai.hint}>Example: had lunch for 120 or bike petrol 500</Text>
        <TextInput
          style={ai.textArea}
          placeholder="Type here..."
          placeholderTextColor="#bbb"
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
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Icon name="send" size={16} color="#fff" style={{ marginRight: 6 }} />
              <Text style={ai.submitText}>Parse with AI</Text>
            </>
          )}
        </TouchableOpacity>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(320).delay(80)} style={ai.tipsBox}>
        <Text style={ai.tipsTitle}>Try saying</Text>
        {[
          'Spent 200 on dinner',
          'Bike petrol 450',
          'Grocery shopping 1200',
          'Electricity bill 800',
        ].map((tip) => (
          <TouchableOpacity key={tip} onPress={() => setPrompt(tip)}>
            <Text style={ai.tip}>"{tip}"</Text>
          </TouchableOpacity>
        ))}
      </Animated.View>
    </Animated.View>
  );
};

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
    aiPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 900, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );

    addPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
  }, [aiPulse, addPulse]);

  const aiPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: aiPulse.value }],
  }));

  const addPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: addPulse.value }],
  }));

  const saveExpense = async ({ amount: amt, category: cat, subcategory: sub, note: userNote, expenseDate }) => {
    const user = auth().currentUser;
    if (!user) {
      showPrompt({
        type: 'error',
        title: 'Error',
        message: 'You must be logged in to add expenses.',
      });
      return false;
    }

    await firestore()
      .collection('users')
      .doc(user.uid)
      .collection('expenses')
      .add({
        amount: parseFloat(amt),
        category: cat,
        subcategory: sub || null,
        note: userNote || null,
        date: expenseDate || new Date(),
        createdAt: new Date(),
      });

    return true;
  };

  const resetManualForm = () => {
    setAmount('');
    setCategory(categories[0].label);
    setSubcategory('');
    setNote('');
    setDate(new Date());
  };

  const handleSave = async () => {
    if (!amount || isNaN(amount)) {
      showPrompt({
        type: 'warning',
        title: 'Validation Error',
        message: 'Please enter a valid amount.',
      });
      return;
    }

    try {
      const ok = await saveExpense({ amount, category, subcategory, note, expenseDate: date });
      if (ok) {
        resetManualForm();
        showPrompt({
          type: 'success',
          title: 'Success',
          message: 'Expense added successfully!',
        });
      }
    } catch (error) {
      showPrompt({
        type: 'error',
        title: 'Error',
        message: 'Failed to save expense. Please try again.',
      });
    }
  };

  const handleAIResult = (result) => {
    setParsedExpense(result);
    setShowModal(true);
  };

  const handleAIAdd = async () => {
    setSaving(true);
    try {
      const ok = await saveExpense({
        amount: parsedExpense.amount,
        category: parsedExpense.category,
        subcategory: parsedExpense.subcategory,
        note: parsedExpense.note,
        expenseDate: new Date(),
      });

      if (ok) {
        setShowModal(false);
        setParsedExpense(null);
        setAiMode(false);
        showPrompt({
          type: 'success',
          title: 'Success',
          message: 'Expense added successfully!',
        });
      }
    } catch (error) {
      showPrompt({
        type: 'error',
        title: 'Error',
        message: 'Failed to save expense. Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleAICancel = () => {
    setShowModal(false);
    setParsedExpense(null);
  };

  if (aiMode) {
    return (
      <>
        <AIInputView onResult={handleAIResult} onBack={() => setAiMode(false)} onNotify={showPrompt} />
        <AIConfirmModal
          visible={showModal}
          parsed={parsedExpense}
          onAdd={handleAIAdd}
          onCancel={handleAICancel}
          saving={saving}
        />
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
        <Animated.View entering={FadeInUp.duration(280)} style={styles.addBtn}>
          <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 }}>
            <View style={styles.titleRow}>
              <LottieView
                source={require('../assets/lottie/sparkle-pulse.json')}
                autoPlay
                loop
                style={styles.titleSparkle}
              />
              <Text style={[styles.label, { fontSize: RFValue(18), marginTop: 0, marginBottom: 0 }]}>Add Expense</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Animated.View style={aiPulseStyle}>
              <InteractiveCard style={styles.aiToggleBtn} onPress={() => setAiMode(true)} pressScale={0.95}>
                <Icon name="sparkles" size={14} color="#ff3333" />
                <Text style={styles.aiToggleText}>Go with AI</Text>
              </InteractiveCard>
            </Animated.View>

            <Animated.View style={addPulseStyle}>
              <InteractiveCard style={styles.fab} onPress={handleSave} pressScale={0.9}>
                <Icon name="add" size={20} color="#fff" />
              </InteractiveCard>
            </Animated.View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(320).delay(50)} style={styles.inputCard}>
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <Icon name="cash-outline" size={22} color="#ff3333" />
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor="#aaa"
            />
          </View>

          <Text style={styles.label}>Category</Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.label}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryRow}
            contentContainerStyle={styles.categoryRowContent}
            renderItem={({ item: cat, index }) => (
              <Animated.View
                entering={FadeInUp.duration(250).delay(index * 35)}
                layout={Layout.springify().damping(16).stiffness(170)}
              >
                <TouchableOpacity
                  style={[styles.categoryBtn, category === cat.label && styles.categoryBtnActive]}
                  onPress={() => {
                    setCategory(cat.label);
                    setSubcategory('');
                  }}
                >
                  <Icon name={cat.icon} size={20} color={category === cat.label ? '#fff' : '#ff3333'} />
                  <Text style={[styles.categoryText, category === cat.label && { color: '#fff' }]}>{cat.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          />

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

          <Text style={styles.label}>Date & Time</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <InteractiveCard style={styles.dateBtn} onPress={() => setShowDatePicker(true)} pressScale={0.97}>
              <Icon name="calendar-outline" size={20} color="#ff3333" />
              <Text style={styles.dateText}>{date.toDateString()}</Text>
            </InteractiveCard>
            <InteractiveCard
              style={[styles.dateBtn, { marginLeft: 8 }]}
              onPress={() => setShowTimePicker(true)}
              pressScale={0.97}
            >
              <Icon name="time-outline" size={20} color="#ff3333" />
              <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </InteractiveCard>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) {
                  const newDate = new Date(selectedDate);
                  newDate.setHours(date.getHours());
                  newDate.setMinutes(date.getMinutes());
                  setDate(newDate);
                }
              }}
            />
          )}

          {showTimePicker && (
            <DateTimePicker
              value={date}
              mode="time"
              display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) {
                  const newDate = new Date(date);
                  newDate.setHours(selectedTime.getHours());
                  newDate.setMinutes(selectedTime.getMinutes());
                  setDate(newDate);
                }
              }}
            />
          )}

          <Text style={styles.label}>Note</Text>
          <TextInput
            style={[styles.input, { height: 60, flex: 0, marginLeft: 0 }]}
            placeholder="Add a note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            placeholderTextColor="#aaa"
          />
        </Animated.View>
      </KeyboardAwareScrollView>

      <AppPromptModal {...modalProps} />
    </>
  );
};

const styles = StyleSheet.create({
  container: { backgroundColor: '#FAFAFA' },
  inputCard: { width: '100%', borderRadius: 16, padding: 18, paddingTop: 0 },
  label: { fontSize: RFValue(13), color: '#444', marginTop: 16, marginBottom: 6, fontWeight: '600' },
  input: {
    backgroundColor: '#fdfdfd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 14,
    fontSize: RFValue(13),
    color: '#333',
    marginLeft: 10,
    flex: 1,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  categoryRow: { marginVertical: 10 },
  categoryRowContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 2 },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#ff3333',
  },
  categoryBtnActive: { backgroundColor: '#ff3333' },
  categoryText: { marginLeft: 6, fontSize: RFValue(12), color: '#ff3333', fontWeight: '500' },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#ff3333',
  },
  dateText: { marginLeft: 8, fontSize: RFValue(13), color: '#ff3333', fontWeight: '500' },
  fab: {
    backgroundColor: '#ff3333',
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    marginRight: 10,
  },
  subcategoryRow: { flexDirection: 'row', justifyContent: 'center', marginVertical: 8, flexWrap: 'wrap' },
  subcategoryBtn: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#ff3333',
  },
  subcategoryBtnActive: { backgroundColor: '#ff3333' },
  subcategoryText: { fontSize: RFValue(12), color: '#ff3333', fontWeight: '500' },
  addBtn: {
    width: '100%',
    justifyContent: 'space-between',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  titleSparkle: { width: 22, height: 22, marginRight: 6 },
  aiToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#ff3333',
    borderRadius: 20,
    paddingVertical: 7,
    paddingHorizontal: 14,
    marginRight: 10,
    backgroundColor: '#fff5f5',
  },
  aiToggleText: { marginLeft: 5, fontSize: RFValue(12), color: '#ff3333', fontWeight: '600' },
});

const ai = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA', paddingHorizontal: 18, paddingTop: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  backText: { marginLeft: 6, fontSize: RFValue(13), color: '#ff3333', fontWeight: '600' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffe0e0',
    shadowColor: '#ff3333',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  sparkleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  sparkleLottie: { width: 22, height: 22, marginRight: 4 },
  cardTitle: { fontSize: RFValue(15), fontWeight: '700', color: '#222', marginLeft: 8 },
  hint: { fontSize: RFValue(11), color: '#aaa', marginBottom: 14 },
  textArea: {
    backgroundColor: '#fafafa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
    fontSize: RFValue(13),
    color: '#333',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  submitBtn: {
    backgroundColor: '#ff3333',
    borderRadius: 14,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitBtnDisabled: { backgroundColor: '#ffaaaa' },
  submitText: { color: '#fff', fontSize: RFValue(13), fontWeight: '700' },
  tipsBox: {
    marginTop: 24,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  tipsTitle: { fontSize: RFValue(12), fontWeight: '700', color: '#555', marginBottom: 10 },
  tip: { fontSize: RFValue(12), color: '#ff3333', marginBottom: 8, fontStyle: 'italic' },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 22,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    backgroundColor: '#fff5f5',
    paddingVertical: 22,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#ffe0e0',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ff3333',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  iconLottie: {
    position: 'absolute',
    width: 60,
    height: 60,
    opacity: 0.8,
  },
  title: { fontSize: RFValue(16), fontWeight: '700', color: '#222' },
  subtitle: { fontSize: RFValue(11), color: '#999', marginTop: 3 },
  detailsBox: { padding: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { marginLeft: 8, fontSize: RFValue(12), color: '#888', fontWeight: '500' },
  rowValue: { fontSize: RFValue(13), color: '#333', fontWeight: '600' },
  rowValueHighlight: { color: '#ff3333', fontSize: RFValue(15), fontWeight: '700' },
  actions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderRightWidth: 0.5,
    borderRightColor: '#eee',
  },
  cancelText: { fontSize: RFValue(13), color: '#999', fontWeight: '600' },
  addBtn: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    backgroundColor: '#ff3333',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addText: { fontSize: RFValue(13), color: '#fff', fontWeight: '700', marginLeft: 6 },
});

export default CashOutForm;
