import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Dimensions,
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
import InteractiveCard from '../components/InteractiveCard';
import AppPromptModal from '../components/AppPromptModal';
import useAppModal from '../hooks/useAppModal';

const ACCENT = '#1DE9B6';
const ACCENT_DARK = '#00897B';
const { width } = Dimensions.get('window');

const incomeCategories = [
  { label: 'Friends',  icon: 'person-sharp' },
  { label: 'Salary',   icon: 'wallet-outline' },
  { label: 'Business', icon: 'briefcase-outline' },
  { label: 'Other',    icon: 'ellipsis-horizontal-outline' },
];

const GlassInput = ({ icon, placeholder, value, onChangeText, keyboardType, multiline, height }) => {
  const borderAnim = useSharedValue(0);
  const containerStyle = useAnimatedStyle(() => ({
    borderColor: borderAnim.value === 1 ? ACCENT : 'rgba(255,255,255,0.1)',
    shadowColor: ACCENT,
    shadowOpacity: borderAnim.value * 0.3,
    shadowRadius: 8,
    elevation: borderAnim.value > 0 ? 2 : 0,
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
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState(incomeCategories[0].label);
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [note, setNote] = useState('');
  const { showModal, modalProps } = useAppModal();

  const ctaPulse = useSharedValue(1);

  useEffect(() => {
    ctaPulse.value = withRepeat(
      withSequence(
        withTiming(1.04, { duration: 1100, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.cubic) })
      ),
      -1, false
    );
  }, []);

  const handleSave = async () => {
    if (!amount || isNaN(amount)) {
      showModal({ type: 'warning', title: 'Validation Error', message: 'Please enter a valid amount.' });
      return;
    }
    try {
      const user = auth().currentUser;
      if (!user) { showModal({ type: 'error', title: 'Error', message: 'You must be logged in.' }); return; }
      await firestore().collection('users').doc(user.uid).collection('income').add({
        amount: parseFloat(amount), category, date, note,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
      showModal({ type: 'success', title: 'Success', message: 'Income added successfully!' });
      setAmount(''); setNote(''); setCategory(incomeCategories[0].label); setDate(new Date());
    } catch (error) {
      console.error(error);
      showModal({ type: 'error', title: 'Error', message: 'Something went wrong while saving income.' });
    }
  };

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
            <View>
              <Text style={styles.sectionTitle}>Cash In</Text>
              <Text style={styles.sectionSubtitle}>Record your income</Text>
            </View>
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
            data={incomeCategories}
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
                  onPress={() => setCategory(item.label)}
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
          />

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
        </Animated.View>

        <Animated.View entering={FadeInUp.duration(320).delay(180)}>
          <ShimmerSaveButton onPress={handleSave} pulse={ctaPulse} />
        </Animated.View>
      </KeyboardAwareScrollView>

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
