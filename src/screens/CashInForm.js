import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, Modal, ActivityIndicator, Dimensions,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RFValue } from 'react-native-responsive-fontsize';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing, FadeInDown, FadeInUp, Layout,
  useAnimatedStyle, useSharedValue, withRepeat, withSequence,
  withTiming, withSpring, withDelay,
} from 'react-native-reanimated';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTransactions } from '../context/TransactionContext';
import { getAIParsedExpense } from '../services/aiService';
import InteractiveCard from '../components/InteractiveCard';
import AppPromptModal from '../components/AppPromptModal';
import useAppModal from '../hooks/useAppModal';
import TagInput from '../components/TagInput';
import { useSpeechToText } from '../hooks/useSpeechToText';
import SpeechRecognizer from '../services/SpeechRecognizer';

const ACCENT = '#1DE9B6';
const ACCENT_DARK = '#00897B';
const { width } = Dimensions.get('window');

const DEFAULT_INCOME_CATEGORIES = [
  { label: 'Friends',  icon: 'person-sharp',        subcategories: [] },
  { label: 'Salary',   icon: 'wallet-outline',      subcategories: [] },
  { label: 'Business', icon: 'briefcase-outline',   subcategories: [] },
  { label: 'Other',    icon: 'ellipsis-horizontal-outline', subcategories: [] },
];

// Same icon set offered when creating a custom category in Cash Out, kept
// identical here so both forms feel consistent.
const ICON_OPTIONS = [
  'pricetag-outline', 'home-outline', 'medkit-outline', 'school-outline',
  'gift-outline', 'airplane-outline', 'shirt-outline', 'game-controller-outline',
  'paw-outline', 'book-outline', 'wifi-outline', 'fitness-outline',
  'musical-notes-outline', 'cafe-outline', 'card-outline', 'ellipsis-horizontal-outline',
];

const GlassInput = ({ icon, placeholder, value, onChangeText, keyboardType, multiline, height }) => {
  const borderAnim = useSharedValue(0);
  const containerStyle = useAnimatedStyle(() => ({
    borderColor: borderAnim.value === 1 ? ACCENT : 'rgba(255,255,255,0.1)',
    shadowColor: ACCENT,
    shadowOpacity: borderAnim.value * 0.28,
    shadowRadius: 8,
  }));

  return (
    <Animated.View style={[styles.inputWrapper, containerStyle, height ? { height, alignItems: 'flex-start' } : {}]}>
      {icon && (
        <Icon name={icon} size={18} color={borderAnim.value === 1 ? ACCENT : 'rgba(255,255,255,0.35)'} style={styles.inputIcon} />
      )}
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        onFocus={() => { borderAnim.value = withTiming(1, { duration: 200 }); }}
        onBlur={() => { borderAnim.value = withTiming(0, { duration: 200 }); }}
        placeholderTextColor="rgba(255,255,255,0.28)"
        style={[styles.inputText, height ? { textAlignVertical: 'top', paddingTop: 4 } : {}]}
      />
    </Animated.View>
  );
};

const DetailRow = ({ icon, label, value, highlight }) => (
  <View style={modal.row}>
    <View style={modal.rowLeft}>
      <Icon name={icon} size={16} color={ACCENT} />
      <Text style={modal.rowLabel}>{label}</Text>
    </View>
    <Text style={[modal.rowValue, highlight && modal.rowValueHighlight]}>{value}</Text>
  </View>
);

// Mirrors CashOutForm's AIConfirmModal — same confirmation UX for a parsed
// income entry before it's saved.
const AIConfirmModal = ({ visible, parsed, onAdd, onCancel, saving }) => {
  if (!parsed) return null;
  const categoryIcon = DEFAULT_INCOME_CATEGORIES.find((c) => c.label === parsed.category)?.icon || 'ellipsis-horizontal-outline';
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={modal.overlay}>
        <Animated.View entering={FadeInDown.duration(240)} style={modal.card}>
          <LinearGradient colors={['rgba(29,233,182,0.15)', 'rgba(29,233,182,0.05)']} style={modal.header}>
            <View style={modal.iconCircle}>
              <LottieView source={require('../assets/lottie/sparkle-pulse.json')} autoPlay loop style={modal.iconLottie} />
              <Icon name="sparkles" size={22} color={ACCENT} />
            </View>
            <Text style={modal.title}>AI Parsed Income</Text>
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

// Mirrors CashOutForm's AIInputView (prompt box, mic, quick tries) so both
// forms provide the same AI experience. Reuses the same getAIParsedExpense
// service — since its categories are expense-oriented, any category that
// doesn't match one of the income categories falls back to "Other".
const AIInputView = ({ onResult, onBack, onNotify }) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);

  const micPulse = useSharedValue(1);

  const { listening, starting, start, stop } = useSpeechToText({
    onPartialResult: (text) => setPrompt(text),
    onResult: (text) => setPrompt(text),
    onError: (e) => {
      console.log('SPEECH ERROR', e);
      if (e.code !== 6 && e.code !== 7) {
        onNotify({ type: 'error', title: 'Speech Error', message: e.message || 'Could not recognize speech.' });
      }
    },
  });

  useEffect(() => {
    const sub = SpeechRecognizer.addSpeechListener('onSpeechVolumeChanged', (e) => {
      console.log('mic rms:', e.value?.toFixed?.(2));
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (listening || starting) {
      micPulse.value = withRepeat(
        withSequence(
          withTiming(1.15, { duration: 500, easing: Easing.out(Easing.cubic) }),
          withTiming(1, { duration: 500, easing: Easing.inOut(Easing.cubic) })
        ),
        -1,
        false
      );
    } else {
      micPulse.value = withTiming(1, { duration: 150 });
    }
  }, [listening, starting]);

  const handleMicPress = () => {
    if (listening) {
      stop();
    } else if (!starting) {
      start();
    }
  };

  const micPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: micPulse.value }] }));

  const handleSubmit = async () => {
    if (!prompt.trim()) { onNotify({ type: 'warning', title: 'Empty Input', message: 'Please describe your income.' }); return; }
    setLoading(true);
    try {
      const result = await getAIParsedExpense(prompt.trim());
      if (result && result.amount) {
        const matchedCategory = DEFAULT_INCOME_CATEGORIES.find(
          (c) => c.label.toLowerCase() === String(result.category).toLowerCase()
        );
        onResult({ ...result, category: matchedCategory ? matchedCategory.label : 'Other' });
      } else {
        onNotify({ type: 'warning', title: 'Parse Failed', message: 'Try something like: got 500 from a friend.' });
      }
    } catch { onNotify({ type: 'error', title: 'Error', message: 'AI parsing failed. Please try again.' }); }
    finally { setLoading(false); }
  };

  return (
    <Animated.View entering={FadeInUp.duration(280)} style={ai.container}>
      <TouchableOpacity style={ai.backBtn} onPress={onBack}>
        <LinearGradient
          colors={['rgba(29,233,182,0.15)', 'rgba(29,233,182,0.05)']}
          style={ai.backBtnGrad}
        >
          <Icon name="arrow-back-outline" size={16} color={ACCENT} />
        </LinearGradient>
        <Text style={ai.backText}>Manual Entry</Text>
      </TouchableOpacity>

      <Animated.View entering={FadeInDown.duration(300).delay(40)} style={ai.card}>
        <LinearGradient colors={['rgba(29,233,182,0.14)', 'rgba(29,233,182,0.04)']} style={ai.cardHeader}>
          <View style={ai.sparkleRow}>
            <View style={ai.iconBadge}>
              <Icon name="sparkles" size={18} color={ACCENT} />
            </View>
            <View>
              <Text style={ai.cardTitle}>AI Income Parser</Text>
              <Text style={ai.hint}>Describe your income in plain language</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ padding: 16 }}>
          <View style={{ position: 'relative' }}>
            <GlassInput
              placeholder="e.g. got 500 from a friend, salary credited 20000..."
              value={prompt}
              onChangeText={setPrompt}
              multiline
              height={90}
            />
            <Animated.View style={[ai.micButtonWrap, micPulseStyle]}>
              <TouchableOpacity
                style={[ai.micButton, (listening || starting) && ai.micButtonActive]}
                onPress={handleMicPress}
                activeOpacity={0.8}
                disabled={starting}
              >
                {starting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon name={listening ? 'stop' : 'mic-outline'} size={17} color="#fff" />
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>

          {(listening || starting) && (
            <Animated.View entering={FadeInDown.duration(180)} style={ai.listeningRow}>
              <View style={ai.listeningDot} />
              <Text style={ai.listeningText}>{starting ? 'Starting mic…' : 'Listening… speak now'}</Text>
            </Animated.View>
          )}

          <TouchableOpacity
            style={[ai.submitBtn, (!prompt.trim() || loading) && ai.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={!prompt.trim() || loading}
            activeOpacity={0.82}
          >
            {loading ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Icon name="send" size={16} color="#fff" style={{ marginRight: 7 }} />
                <Text style={ai.submitText}>Parse with AI</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(320).delay(80)} style={ai.tipsBox}>
        <Text style={ai.tipsTitle}>Quick Tries</Text>
        <View style={ai.tipsGrid}>
          {['Got 500 from a friend', 'Salary credited 20000', 'Business payment 3000', 'Freelance 1200'].map((tip) => (
            <TouchableOpacity key={tip} onPress={() => setPrompt(tip)} style={ai.tipChip}>
              <Icon name="flash-outline" size={11} color={ACCENT} style={{ marginRight: 4 }} />
              <Text style={ai.tipText}>{tip}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </Animated.View>
  );
};

const ShimmerSaveButton = ({ onPress, pulse }) => {
  const shimmer = useSharedValue(-1);
  useEffect(() => {
    shimmer.value = withRepeat(withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false);
  }, []);
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (shimmer.value + 1) * width * 0.5 - 80 }],
  }));
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.saveButtonWrap, pulseStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.88}>
        <LinearGradient
          colors={[ACCENT, ACCENT_DARK, '#005A4A']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          style={styles.saveButton}
        >
          <View style={StyleSheet.absoluteFill} pointerEvents="none" overflow="hidden">
            <Animated.View style={[shimmerStyle, styles.shimmerBar]} />
          </View>
          <Icon name="checkmark-circle" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.saveButtonText}>Save Income</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const CashInForm = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { statisticsCashbookIds, isStatisticsSelectionActive } = useTransactions();
  const routeCashbookId = route.params?.cashbookId || null;
  const cashbookId = routeCashbookId || (isStatisticsSelectionActive && statisticsCashbookIds.length === 1 ? statisticsCashbookIds[0] : null);
  const isCashbookSelectionInvalid = !routeCashbookId && isStatisticsSelectionActive && statisticsCashbookIds.length !== 1;

  const showSaveSuccess = () => {
    showPrompt({
      type: 'success',
      title: 'Success',
      message: 'Income added successfully!',
      buttons: [
        { text: 'Save & Stay', style: 'secondary' },
        { text: 'Save', style: 'primary', onPress: () => navigation.goBack() },
      ],
    });
  };

  const [amount, setAmount] = useState('');
  const [categories, setCategories] = useState(DEFAULT_INCOME_CATEGORIES);
  const [category, setCategory] = useState(DEFAULT_INCOME_CATEGORIES[0].label);
  const [subcategory, setSubcategory] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [note, setNote] = useState('');
  const [tags, setTags] = useState([]);
  const [aiMode, setAiMode] = useState(false);
  const [parsedIncome, setParsedIncome] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showModal: showPrompt, modalProps } = useAppModal();

  // ── Custom category / subcategory creation (mirrors Cash Out) ─────────────
  const [addCategoryModalVisible, setAddCategoryModalVisible] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState(ICON_OPTIONS[0]);
  const [addSubcategoryModalVisible, setAddSubcategoryModalVisible] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  const aiPulse = useSharedValue(1);
  const addPulse = useSharedValue(1);

  useEffect(() => {
    aiPulse.value = withRepeat(withSequence(
      withTiming(1.04, { duration: 1000, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.cubic) })
    ), -1, false);
    addPulse.value = withRepeat(withSequence(
      withTiming(1.04, { duration: 1000, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.cubic) })
    ), -1, false);
  }, []);

  const aiPulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: aiPulse.value }] }));

  // Load the user's saved income category list (defaults + anything they've
  // added before). Stored under its own field so it never clobbers the
  // expense side's `customCategoryData`.
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const user = auth().currentUser;
        if (!user) { setCategories(DEFAULT_INCOME_CATEGORIES); return; }
        const doc = await firestore().collection('users').doc(user.uid).get();
        const saved = doc.data()?.customIncomeCategoryData;
        if (Array.isArray(saved) && saved.length > 0) {
          setCategories(saved);
        } else {
          setCategories(DEFAULT_INCOME_CATEGORIES);
        }
      } catch (error) {
        console.log('Error loading income categories:', error);
        setCategories(DEFAULT_INCOME_CATEGORIES);
      }
    };
    loadCategories();
  }, []);

  const persistCategories = async (updatedCategories) => {
    try {
      const user = auth().currentUser;
      if (!user) return;
      await firestore().collection('users').doc(user.uid).set(
        { customIncomeCategoryData: updatedCategories },
        { merge: true }
      );
    } catch (error) {
      console.log('Error saving income categories:', error);
      showPrompt({ type: 'error', title: 'Save Failed', message: 'Could not save your category. Please try again.' });
    }
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) {
      showPrompt({ type: 'warning', title: 'Name Required', message: 'Please enter a category name.' });
      return;
    }
    const alreadyExists = categories.some((c) => c.label.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) {
      showPrompt({ type: 'warning', title: 'Already Exists', message: 'A category with this name already exists.' });
      return;
    }
    const newCategory = { label: trimmed, icon: newCategoryIcon, subcategories: [] };
    const updated = [...categories, newCategory];
    setCategories(updated);
    setCategory(trimmed);
    setSubcategory('');
    persistCategories(updated);
    setAddCategoryModalVisible(false);
    setNewCategoryName('');
    setNewCategoryIcon(ICON_OPTIONS[0]);
  };

  const handleAddSubcategory = () => {
    const trimmed = newSubcategoryName.trim();
    if (!trimmed) {
      showPrompt({ type: 'warning', title: 'Name Required', message: 'Please enter a subcategory name.' });
      return;
    }
    const current = categories.find((c) => c.label === category);
    const existingSubs = current?.subcategories || [];
    const alreadyExists = existingSubs.some((s) => s.toLowerCase() === trimmed.toLowerCase());
    if (alreadyExists) {
      showPrompt({ type: 'warning', title: 'Already Exists', message: 'This subcategory already exists.' });
      return;
    }
    const updated = categories.map((c) =>
      c.label === category ? { ...c, subcategories: [...existingSubs, trimmed] } : c
    );
    setCategories(updated);
    setSubcategory(trimmed);
    persistCategories(updated);
    setAddSubcategoryModalVisible(false);
    setNewSubcategoryName('');
  };

  const isDefaultCategory = (label) =>
    DEFAULT_INCOME_CATEGORIES.some((c) => c.label === label);

  const handleDeleteCategory = (selectedCategory) => {
    if (isDefaultCategory(selectedCategory.label)) {
      showPrompt({
        type: 'warning',
        title: 'Cannot Delete',
        message: 'Default categories cannot be deleted.',
      });
      return;
    }

    showPrompt({
      type: 'warning',
      title: 'Delete Category',
      message: `Are you sure you want to delete "${selectedCategory.label}"?`,
      buttons: [
        { text: 'Cancel', style: 'secondary' },
        {
          text: 'Delete',
          style: 'danger',
          onPress: async () => {
            const updated = categories.filter((c) => c.label !== selectedCategory.label);
            setCategories(updated);
            await persistCategories(updated);
            if (category === selectedCategory.label) {
              setCategory(DEFAULT_INCOME_CATEGORIES[0].label);
              setSubcategory('');
            }
          },
        },
      ],
    });
  };

  const isDefaultSubcategory = (label) =>
    DEFAULT_INCOME_CATEGORIES.some((c) => c.label === category && (c.subcategories || []).includes(label));

  const handleDeleteSubcategory = (sub) => {
    if (isDefaultSubcategory(sub)) {
      showPrompt({
        type: 'warning',
        title: 'Cannot Delete',
        message: 'Default subcategories cannot be deleted.',
      });
      return;
    }
    showPrompt({
      type: 'warning',
      title: 'Delete Subcategory',
      message: `Delete "${sub}"?`,
      buttons: [
        { text: 'Cancel', style: 'secondary' },
        {
          text: 'Delete',
          style: 'danger',
          onPress: async () => {
            const updated = categories.map((cat) => {
              if (cat.label !== category) return cat;
              return { ...cat, subcategories: (cat.subcategories || []).filter((item) => item !== sub) };
            });
            setCategories(updated);
            persistCategories(updated);
            if (subcategory === sub) setSubcategory('');
          },
        },
      ],
    });
  };

  // Mirrors CashOutForm's saveExpense — handles both cashbook-scoped and
  // global income saves, including custom tags.
  const saveIncome = async ({ amount: amt, category: cat, subcategory: sub, note: userNote, incomeDate, tags: txTags }) => {
    if (isCashbookSelectionInvalid) {
      showPrompt({ type: 'warning', title: 'Select One CashBook', message: 'Choose a single CashBook in Statistics before adding a transaction.' });
      return false;
    }
    const user = auth().currentUser;
    if (!user) { showPrompt({ type: 'error', title: 'Error', message: 'You must be logged in.' }); return false; }

    const incomePayload = {
      amount: parseFloat(amt),
      category: cat,
      subcategory: sub || null,
      note: userNote || null,
      tags: Array.isArray(txTags) ? txTags.slice(0, 2) : [],
      date: incomeDate || new Date(),
    };

    if (cashbookId) {
      // CashBook-scoped income is written to that cashbook's own transactions
      // subcollection so it never mixes with another cashbook's data.
      try {
        const cashbookRef = firestore().collection('users').doc(user.uid).collection('cashbooks').doc(cashbookId);
        await cashbookRef.collection('transactions').add({
          ...incomePayload,
          type: 'income',
          cashbookId,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        cashbookRef.set({ updatedAt: firestore.FieldValue.serverTimestamp() }, { merge: true }).catch(() => {});
        return true;
      } catch (error) {
        console.log('CashInForm saveIncome (cashbook) error:', error);
        showPrompt({ type: 'error', title: 'Save Failed', message: 'Unable to save the income. Please try again later.' });
        return false;
      }
    }

    try {
      await firestore().collection('users').doc(user.uid).collection('income').add({
        ...incomePayload,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      return true;
    } catch (error) {
      console.error(error);
      showPrompt({ type: 'error', title: 'Error', message: 'Something went wrong while saving income.' });
      return false;
    }
  };

  const resetManualForm = () => {
    setAmount(''); setCategory(categories[0]?.label || DEFAULT_INCOME_CATEGORIES[0].label);
    setSubcategory(''); setNote(''); setTags([]); setDate(new Date());
  };

  const handleSave = async () => {
    if (!amount || isNaN(amount)) {
      showPrompt({ type: 'warning', title: 'Validation Error', message: 'Please enter a valid amount.' });
      return;
    }
    const ok = await saveIncome({ amount, category, subcategory, note, incomeDate: date, tags });
    if (ok) {
      resetManualForm();
      showSaveSuccess();
    }
  };

  const handleAIResult = (result) => { setParsedIncome(result); setShowModal(true); };

  const handleAIAdd = async () => {
    setSaving(true);
    try {
      const ok = await saveIncome({
        amount: parsedIncome.amount, category: parsedIncome.category,
        subcategory: parsedIncome.subcategory, note: parsedIncome.note, incomeDate: new Date(),
      });
      if (ok) {
        setShowModal(false); setParsedIncome(null); setAiMode(false);
        showSaveSuccess();
      }
    } catch { showPrompt({ type: 'error', title: 'Error', message: 'Failed to save income.' }); }
    finally { setSaving(false); }
  };

  if (aiMode) {
    return (
      <>
        <AIInputView onResult={handleAIResult} onBack={() => setAiMode(false)} onNotify={showPrompt} />
        <AIConfirmModal
          visible={showModal}
          parsed={parsedIncome}
          onAdd={handleAIAdd}
          onCancel={() => { setShowModal(false); setParsedIncome(null); }}
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
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120, paddingTop: 8 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={40}
      >
        <Animated.View entering={FadeInUp.duration(280)} style={styles.sectionHeader}>
          <LinearGradient
            colors={['rgba(29,233,182,0.12)', 'rgba(29,233,182,0.04)']}
            style={styles.sectionHeaderGrad}
          >
            <LottieView
              source={require('../assets/lottie/sparkle-pulse.json')}
              autoPlay loop
              style={styles.headerLottie}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.sectionTitle}>Cash In</Text>
              <Text style={styles.sectionSubtitle}>Record your income</Text>
            </View>
            <Animated.View style={aiPulseStyle}>
              <InteractiveCard
                style={styles.aiToggleBtn}
                onPress={() => setAiMode(true)}
                pressScale={0.94}
              >
                <LinearGradient
                  colors={['rgba(29,233,182,0.25)', 'rgba(29,233,182,0.08)']}
                  style={styles.aiToggleGrad}
                >
                  <Icon name="sparkles" size={14} color={ACCENT} />
                  <Text style={styles.aiToggleText}>AI</Text>
                </LinearGradient>
              </InteractiveCard>
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(300).delay(60)} style={styles.card}>
          <View style={styles.cardTopBar} />
          <Text style={styles.fieldLabel}>
            <Icon name="cash-outline" size={13} color={ACCENT} />{'  '}Amount
          </Text>
          <GlassInput
            icon="logo-usd"
            placeholder="0.00"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
          />

          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
            <Icon name="grid-outline" size={13} color={ACCENT} />{'  '}Category
          </Text>
          <FlatList
            data={categories}
            keyExtractor={(item) => item.label}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: 8 }}
            renderItem={({ item, index }) => (
              <Animated.View
                entering={FadeInUp.duration(240).delay(index * 50)}
                layout={Layout.springify().damping(16).stiffness(170)}
              >
                <TouchableOpacity
                  style={[
                    styles.categoryBtn,
                    category === item.label && styles.categoryBtnActive,
                  ]}
                  onPress={() => { setCategory(item.label); setSubcategory(''); }}
                  onLongPress={() => handleDeleteCategory(item)}
                  delayLongPress={500}
                  activeOpacity={0.78}
                >
                  <Icon
                    name={item.icon}
                    size={16}
                    color={category === item.label ? '#fff' : ACCENT}
                  />
                  <Text style={[styles.catText, category === item.label && { color: '#fff' }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            )}
            ListFooterComponent={
              <TouchableOpacity
                style={styles.addChip}
                onPress={() => setAddCategoryModalVisible(true)}
                activeOpacity={0.78}
              >
                <Icon name="add" size={15} color="rgba(255,255,255,0.6)" />
                <Text style={styles.addChipText}>New</Text>
              </TouchableOpacity>
            }
          />

          {(() => {
            const selectedCat = categories.find((c) => c.label === category);
            const subs = selectedCat?.subcategories || [];
            if (subs.length === 0) {
              return (
                <View style={styles.subcategoryWrap}>
                  <TouchableOpacity
                    style={styles.addChip}
                    onPress={() => setAddSubcategoryModalVisible(true)}
                    activeOpacity={0.78}
                  >
                    <Icon name="add" size={13} color="rgba(255,255,255,0.6)" />
                    <Text style={styles.addChipText}>Add subcategory</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            return (
              <View style={styles.subcategoryWrap}>
                {subs.map((sub) => (
                  <Animated.View key={sub} layout={Layout.springify().damping(17).stiffness(180)}>
                    <TouchableOpacity
                      style={[styles.subcategoryBtn, subcategory === sub && styles.subcategoryBtnActive]}
                      onPress={() => setSubcategory(sub)}
                      onLongPress={() => handleDeleteSubcategory(sub)}
                      delayLongPress={500}
                      activeOpacity={0.78}
                    >
                      <Text style={[styles.subcategoryText, subcategory === sub && { color: '#fff' }]}>
                        {sub}
                      </Text>
                    </TouchableOpacity>
                  </Animated.View>
                ))}
                <TouchableOpacity
                  style={styles.addChip}
                  onPress={() => setAddSubcategoryModalVisible(true)}
                  activeOpacity={0.78}
                >
                  <Icon name="add" size={13} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.addChipText}>Add</Text>
                </TouchableOpacity>
              </View>
            );
          })()}

          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
            <Icon name="calendar-outline" size={13} color={ACCENT} />{'  '}Date & Time
          </Text>
          <View style={styles.dateTimeRow}>
            <InteractiveCard
              onPress={() => setShowDatePicker(true)}
              style={styles.dateBtn}
              pressScale={0.97}
            >
              <Icon name="calendar-outline" size={16} color={ACCENT} />
              <Text style={styles.dateText}>{date.toDateString()}</Text>
            </InteractiveCard>
            <InteractiveCard
              onPress={() => setShowTimePicker(true)}
              style={styles.dateBtn}
              pressScale={0.97}
            >
              <Icon name="time-outline" size={16} color={ACCENT} />
              <Text style={styles.dateText}>
                {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Text>
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
                  const nd = new Date(selectedDate);
                  nd.setHours(date.getHours()); nd.setMinutes(date.getMinutes());
                  setDate(nd);
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
                  const nd = new Date(date);
                  nd.setHours(selectedTime.getHours()); nd.setMinutes(selectedTime.getMinutes());
                  setDate(nd);
                }
              }}
            />
          )}

          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
            <Icon name="create-outline" size={13} color={ACCENT} />{'  '}Note
          </Text>
          <GlassInput
            placeholder="Add a note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            height={64}
          />

          <Text style={[styles.fieldLabel, { marginTop: 18 }]}>
            <Icon name="pricetags-outline" size={13} color={ACCENT} />{'  '}Tags
          </Text>
          <TagInput tags={tags} onChange={setTags} accentColor={ACCENT} maxTags={2} />
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(320).delay(180)}>
          <ShimmerSaveButton onPress={handleSave} pulse={addPulse} />
        </Animated.View>
      </KeyboardAwareScrollView>

      {/* Add Category Modal */}
      <Modal
        visible={addCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddCategoryModalVisible(false)}
      >
        <View style={catModal.overlay}>
          <Animated.View entering={FadeInDown.duration(220)} style={catModal.card}>
            <Text style={catModal.title}>New Category</Text>
            <Text style={catModal.subtitle}>Create a category for income that doesn't fit the defaults</Text>
            <TextInput
              style={catModal.input}
              placeholder="e.g. Refunds"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              autoFocus
            />
            <Text style={catModal.iconLabel}>Choose an icon</Text>
            <View style={catModal.iconGrid}>
              {ICON_OPTIONS.map((iconName) => (
                <TouchableOpacity
                  key={iconName}
                  style={[catModal.iconChip, newCategoryIcon === iconName && catModal.iconChipActive]}
                  onPress={() => setNewCategoryIcon(iconName)}
                  activeOpacity={0.8}
                >
                  <Icon name={iconName} size={18} color={newCategoryIcon === iconName ? '#fff' : ACCENT} />
                </TouchableOpacity>
              ))}
            </View>
            <View style={catModal.actions}>
              <TouchableOpacity
                style={catModal.cancelBtn}
                onPress={() => { setAddCategoryModalVisible(false); setNewCategoryName(''); setNewCategoryIcon(ICON_OPTIONS[0]); }}
              >
                <Text style={catModal.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={catModal.saveBtn} onPress={handleAddCategory}>
                <Text style={catModal.saveText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Add Subcategory Modal */}
      <Modal
        visible={addSubcategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddSubcategoryModalVisible(false)}
      >
        <View style={catModal.overlay}>
          <Animated.View entering={FadeInDown.duration(220)} style={catModal.card}>
            <Text style={catModal.title}>New Subcategory</Text>
            <Text style={catModal.subtitle}>Add a subcategory under "{category}"</Text>
            <TextInput
              style={catModal.input}
              placeholder="e.g. Bonus"
              placeholderTextColor="rgba(255,255,255,0.3)"
              value={newSubcategoryName}
              onChangeText={setNewSubcategoryName}
              autoFocus
            />
            <View style={catModal.actions}>
              <TouchableOpacity
                style={catModal.cancelBtn}
                onPress={() => { setAddSubcategoryModalVisible(false); setNewSubcategoryName(''); }}
              >
                <Text style={catModal.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={catModal.saveBtn} onPress={handleAddSubcategory}>
                <Text style={catModal.saveText}>Add Subcategory</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      <AppPromptModal {...modalProps} />
    </>
  );
};

export default CashInForm;

const styles = StyleSheet.create({
  sectionHeader: { marginBottom: 14 },
  sectionHeaderGrad: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(29,233,182,0.2)',
  },
  headerLottie: { width: 40, height: 40, marginRight: 12 },
  sectionTitle: { fontSize: RFValue(17), fontWeight: '800', color: '#fff' },
  sectionSubtitle: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.4)', marginTop: 2 },

  aiToggleBtn: { borderRadius: 14, overflow: 'hidden' },
  aiToggleGrad: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 9, paddingHorizontal: 13,
    borderWidth: 1.5, borderColor: 'rgba(29,233,182,0.35)',
    borderRadius: 14,
    gap: 5,
  },
  aiToggleText: { fontSize: RFValue(12), color: ACCENT, fontWeight: '800' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    padding: 18,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 1,
    backgroundColor: 'rgba(29,233,182,0.18)',
  },

  fieldLabel: {
    fontSize: RFValue(12),
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '700',
    letterSpacing: 0.4,
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 14, paddingHorizontal: 14, paddingVertical: 13,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  inputIcon: { marginRight: 10 },
  inputText: { flex: 1, fontSize: RFValue(14), color: '#fff', padding: 0 },

  categoryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(29,233,182,0.07)',
    borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14, marginRight: 8,
    borderWidth: 1.5, borderColor: 'rgba(29,233,182,0.25)',
  },
  categoryBtnActive: { backgroundColor: ACCENT_DARK, borderColor: ACCENT },
  catText: { marginLeft: 7, fontSize: RFValue(12), color: ACCENT, fontWeight: '600' },

  subcategoryWrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 10, gap: 8 },
  subcategoryBtn: {
    backgroundColor: 'rgba(29,233,182,0.06)',
    borderRadius: 16, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: 'rgba(29,233,182,0.22)',
  },
  subcategoryBtnActive: { backgroundColor: ACCENT_DARK, borderColor: ACCENT },
  subcategoryText: { fontSize: RFValue(12), color: ACCENT, fontWeight: '600' },

  addChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20, paddingVertical: 9, paddingHorizontal: 14,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.18)', borderStyle: 'dashed',
  },
  addChipText: { marginLeft: 6, fontSize: RFValue(12), color: 'rgba(255,255,255,0.55)', fontWeight: '700' },

  dateTimeRow: { flexDirection: 'row', gap: 10, marginTop: 4 },
  dateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(29,233,182,0.07)',
    borderRadius: 14, paddingVertical: 12, paddingHorizontal: 12,
    borderWidth: 1.5, borderColor: 'rgba(29,233,182,0.22)',
    gap: 8,
  },
  dateText: { fontSize: RFValue(12), color: ACCENT, fontWeight: '600', flex: 1 },

  saveButtonWrap: { marginBottom: 8 },
  saveButton: {
    height: 56, borderRadius: 16, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  saveButtonText: { color: '#fff', fontSize: RFValue(15), fontWeight: '800', letterSpacing: 0.4 },
  shimmerBar: {
    position: 'absolute', width: 70, height: '100%',
    backgroundColor: 'rgba(255,255,255,0.16)',
    transform: [{ skewX: '-20deg' }],
  },
});

const ai = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  backBtn: { flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 10 },
  backBtnGrad: {
    width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(29,233,182,0.3)',
  },
  backText: { fontSize: RFValue(14), color: ACCENT, fontWeight: '700' },

  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 22, borderWidth: 1,
    borderColor: 'rgba(29,233,182,0.2)',
    overflow: 'hidden', marginBottom: 16,
  },
  cardHeader: { padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(29,233,182,0.12)' },
  sparkleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBadge: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(29,233,182,0.12)',
    borderWidth: 1.5, borderColor: 'rgba(29,233,182,0.28)',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: RFValue(15), fontWeight: '800', color: '#fff' },
  hint: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.38)', marginTop: 3 },

  submitBtn: {
    backgroundColor: ACCENT_DARK, borderRadius: 14,
    paddingVertical: 14, alignItems: 'center',
    flexDirection: 'row', justifyContent: 'center', marginTop: 14,
  },
  submitBtnDisabled: { backgroundColor: 'rgba(29,233,182,0.25)' },
  submitText: { color: '#fff', fontSize: RFValue(13), fontWeight: '700' },

  tipsBox: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  tipsTitle: {
    fontSize: RFValue(11), fontWeight: '800',
    color: 'rgba(255,255,255,0.4)', marginBottom: 12,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  tipsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tipChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(29,233,182,0.08)',
    borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12,
    borderWidth: 1, borderColor: 'rgba(29,233,182,0.2)',
  },
  tipText: { fontSize: RFValue(12), color: ACCENT, fontWeight: '600' },
  micButtonWrap: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  micButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(29,233,182,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(29,233,182,0.3)',
  },
  micButtonActive: {
    backgroundColor: ACCENT_DARK,
    borderColor: ACCENT,
  },
  listeningRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  listeningDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ACCENT,
  },
  listeningText: {
    fontSize: RFValue(11),
    color: ACCENT,
    fontWeight: '600',
  },
});

const modal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  card: { width: '100%', backgroundColor: '#0D1F2D', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  header: { paddingVertical: 22, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: 'rgba(29,233,182,0.15)' },
  iconCircle: { width: 52, height: 52, borderRadius: 16, backgroundColor: 'rgba(29,233,182,0.1)', borderWidth: 1.5, borderColor: 'rgba(29,233,182,0.3)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  iconLottie: { position: 'absolute', width: 64, height: 64, opacity: 0.55 },
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
  addBtn: { flex: 1, paddingVertical: 16, alignItems: 'center', backgroundColor: ACCENT_DARK, flexDirection: 'row', justifyContent: 'center' },
  addText: { fontSize: RFValue(13), color: '#fff', fontWeight: '700', marginLeft: 6 },
});

const catModal = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 22 },
  card: { width: '100%', maxWidth: 380, backgroundColor: '#0D1F2D', borderRadius: 22, padding: 20, borderWidth: 1, borderColor: 'rgba(29,233,182,0.2)' },
  title: { fontSize: RFValue(16), fontWeight: '800', color: '#fff', marginBottom: 4 },
  subtitle: { fontSize: RFValue(11), color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  input: {
    borderWidth: 1.5, borderColor: 'rgba(29,233,182,0.25)', borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: RFValue(14),
    color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)', marginBottom: 14,
  },
  iconLabel: { fontSize: RFValue(11), fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.4 },
  iconGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 18 },
  iconChip: {
    width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(29,233,182,0.06)', borderWidth: 1.5, borderColor: 'rgba(29,233,182,0.18)',
  },
  iconChipActive: { backgroundColor: ACCENT_DARK, borderColor: ACCENT },
  actions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  cancelText: { fontSize: RFValue(13), fontWeight: '700', color: 'rgba(255,255,255,0.5)' },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: 14, alignItems: 'center', backgroundColor: ACCENT_DARK },
  saveText: { fontSize: RFValue(13), fontWeight: '700', color: '#fff' },
});
