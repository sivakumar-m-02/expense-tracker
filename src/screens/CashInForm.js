import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Icon from 'react-native-vector-icons/Ionicons';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import DateTimePicker from '@react-native-community/datetimepicker';
import { RFValue } from 'react-native-responsive-fontsize';
import LottieView from 'lottie-react-native';
import Animated, {
  Easing, FadeInDown, FadeInUp, Layout,
  useAnimatedStyle, useSharedValue, withRepeat, withSequence, withTiming,
} from 'react-native-reanimated';
import InteractiveCard from '../components/InteractiveCard';
import AppPromptModal from '../components/AppPromptModal';
import useAppModal from '../hooks/useAppModal';

const ACCENT = '#1DE9B6';
const ACCENT_DARK = '#00897B';

const incomeCategories = [
  { label: 'Friends',  icon: 'person-sharp' },
  { label: 'Salary',   icon: 'wallet-outline' },
  { label: 'Business', icon: 'briefcase-outline' },
  { label: 'Other',    icon: 'ellipsis-horizontal-outline' },
];

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
        withTiming(1.06, { duration: 950, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 950, easing: Easing.inOut(Easing.cubic) })
      ),
      -1, false
    );
  }, [ctaPulse]);

  const ctaAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ctaPulse.value }],
  }));

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
        contentContainerStyle={[styles.container, { paddingBottom: 40, alignItems: 'center' }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={40}
      >
        {/* Header row */}
        <Animated.View entering={FadeInUp.duration(280)} style={styles.addBtn}>
          <View style={{ justifyContent: 'center', alignItems: 'center', paddingHorizontal: 18 }}>
            <View style={styles.headerRow}>
              <LottieView source={require('../assets/lottie/sparkle-pulse.json')} autoPlay loop style={styles.headerSparkle} />
              <Text style={[styles.label, { fontSize: RFValue(17), marginTop: 0, marginBottom: 0, color: '#fff' }]}>Cash In</Text>
            </View>
          </View>
          <Animated.View style={ctaAnimatedStyle}>
            <InteractiveCard style={styles.fab} onPress={handleSave} pressScale={0.92}>
              <Icon name="add" size={20} color="#fff" />
            </InteractiveCard>
          </Animated.View>
        </Animated.View>

        {/* Form */}
        <Animated.View entering={FadeInDown.duration(320).delay(50)} style={styles.inputCard}>

          {/* Amount */}
          <Text style={styles.label}>Amount</Text>
          <View style={styles.amountRow}>
            <Icon name="cash-outline" size={22} color={ACCENT} />
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholderTextColor="rgba(255,255,255,0.25)"
            />
          </View>

          {/* Category */}
          <Text style={styles.label}>Category</Text>
          <FlatList
            data={incomeCategories}
            keyExtractor={(item) => item.label}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginVertical: 8 }}
            renderItem={({ item, index }) => (
              <Animated.View entering={FadeInUp.duration(250).delay(index * 40)} layout={Layout.springify().damping(16).stiffness(170)}>
                <TouchableOpacity
                  style={[styles.categoryBtn, category === item.label && styles.activeCategory, { margin: 4 }]}
                  onPress={() => setCategory(item.label)}
                >
                  <Icon name={item.icon} size={18} color={category === item.label ? '#fff' : ACCENT} />
                  <Text style={[styles.catText, category === item.label && { color: '#fff' }]}>{item.label}</Text>
                </TouchableOpacity>
              </Animated.View>
            )}
          />

          {/* Date & Time */}
          <Text style={styles.label}>Date & Time</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <InteractiveCard onPress={() => setShowDatePicker(true)} style={styles.dateBtn} pressScale={0.97}>
              <Icon name="calendar-outline" size={18} color={ACCENT} />
              <Text style={styles.dateText}>{date.toDateString()}</Text>
            </InteractiveCard>
            <InteractiveCard onPress={() => setShowTimePicker(true)} style={[styles.dateBtn, { marginLeft: 8 }]} pressScale={0.97}>
              <Icon name="time-outline" size={18} color={ACCENT} />
              <Text style={styles.dateText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </InteractiveCard>
          </View>

          {showDatePicker && (
            <DateTimePicker value={date} mode="date" display="default"
              onChange={(event, selectedDate) => {
                setShowDatePicker(false);
                if (selectedDate) { const nd = new Date(selectedDate); nd.setHours(date.getHours()); nd.setMinutes(date.getMinutes()); setDate(nd); }
              }}
            />
          )}
          {showTimePicker && (
            <DateTimePicker value={date} mode="time" display="default"
              onChange={(event, selectedTime) => {
                setShowTimePicker(false);
                if (selectedTime) { const nd = new Date(date); nd.setHours(selectedTime.getHours()); nd.setMinutes(selectedTime.getMinutes()); setDate(nd); }
              }}
            />
          )}

          {/* Note */}
          <Text style={styles.label}>Note</Text>
          <TextInput
            style={[styles.input, { height: 60, flex: 0, marginLeft: 0 }]}
            placeholder="Add a note (optional)"
            value={note}
            onChangeText={setNote}
            multiline
            placeholderTextColor="rgba(255,255,255,0.25)"
          />
        </Animated.View>
      </KeyboardAwareScrollView>
      <AppPromptModal {...modalProps} />
    </>
  );
};

export default CashInForm;

const styles = StyleSheet.create({
  container: { backgroundColor: 'transparent' },
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  headerSparkle: { width: 22, height: 22, marginRight: 6 },
  inputCard: { width: '100%', borderRadius: 20, padding: 18, paddingTop: 0 },
  label: { fontSize: RFValue(13), color: 'rgba(255,255,255,0.6)', marginTop: 16, marginBottom: 8, fontWeight: '700', letterSpacing: 0.3 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 14, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 12,
    fontSize: RFValue(13), color: '#fff', marginLeft: 10, flex: 1,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  categoryBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(29,233,182,0.08)',
    borderRadius: 20, paddingVertical: 8, paddingHorizontal: 14,
    borderWidth: 1, borderColor: 'rgba(29,233,182,0.3)',
  },
  activeCategory: { backgroundColor: ACCENT_DARK, borderColor: ACCENT },
  catText: { marginLeft: 6, fontSize: RFValue(12), color: ACCENT, fontWeight: '600' },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(29,233,182,0.08)',
    borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginVertical: 8,
    borderWidth: 1, borderColor: 'rgba(29,233,182,0.3)',
  },
  dateText: { marginLeft: 8, fontSize: RFValue(12), color: ACCENT, fontWeight: '600' },
  fab: {
    backgroundColor: ACCENT_DARK, width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center', elevation: 4, marginRight: 18,
  },
  addBtn: { width: '100%', justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center', marginTop: 10 },
});
