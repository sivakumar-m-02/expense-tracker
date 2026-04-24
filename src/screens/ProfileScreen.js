import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, TouchableOpacity, StyleSheet,
  TextInput, Modal, FlatList, StatusBar, Dimensions, Platform,
  TouchableWithoutFeedback,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { RFValue } from 'react-native-responsive-fontsize';
import firestore from '@react-native-firebase/firestore';
import { useTransactions } from '../context/TransactionContext';
import AppPromptModal from '../components/AppPromptModal';
import useAppModal from '../hooks/useAppModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, {
  FadeInDown, FadeInUp,
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay, Easing, interpolate,
} from 'react-native-reanimated';
import { Image } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import axios from 'axios';

const { width } = Dimensions.get('window');

const COLOR_OPTIONS = [
  { name: 'Teal',       value: '#00897B' },
  { name: 'Blue',       value: '#1976D2' },
  { name: 'Green',      value: '#388E3C' },
  { name: 'Coral',      value: '#FF7043' },
  { name: 'Purple',     value: '#8E24AA' },
  { name: 'Cyan',       value: '#26C6DA' },
  { name: 'Charcoal',   value: '#37474F' },
  { name: 'Steel Blue', value: '#4682B4' },
];

// ── Info Row card ─────────────────────────────────────────────────────────────
const InfoCard = ({ icon, children, delay = 0 }) => (
  <Animated.View entering={FadeInDown.delay(delay).springify()}>
    <View style={styles.infoCard}>
      <View style={styles.infoIconWrap}>
        <Icon name={icon} size={18} color="#00C9A7" />
      </View>
      {children}
    </View>
  </Animated.View>
);

const ProfileScreen = () => {
  const user = auth().currentUser;
  const { budget, setBudget, primaryColor, setPrimaryColor } = useTransactions();
  const { showModal, modalProps } = useAppModal();

  const [editMode, setEditMode] = useState(false);
  const [budgetInput, setBudgetInput] = useState(budget ? String(budget) : '');
  const [saving, setSaving] = useState(false);
  const [colorModalVisible, setColorModalVisible] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiInput, setApiInput] = useState('');
  const [adminModalVisible, setAdminModalVisible] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [apiModalVisible, setApiModalVisible] = useState(false);
  const [profileImage, setProfileImage] = useState(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Avatar pulse
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1.06, { duration: 2000, easing: Easing.inOut(Easing.sin) }), -1, true);
  }, []);
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
  
      const doc = await firestore().collection('users').doc(user.uid).get();
      if (doc.exists && doc.data()?.profileImage) {
        setProfileImage(doc.data().profileImage);
      }
    };
  
    fetchProfile();
  }, []);

  const uploadImageToCloudinary = async (uri) => {
    if (!user) return;
  
    try {
      setSaving(true);
  
      const cleanUri = uri.startsWith('file://') ? uri : `file://${uri}`;
  
      const formData = new FormData();
  
      formData.append('file', {
        uri: cleanUri,
        type: 'image/jpeg',
        name: 'profile.jpg',
      });
  
      formData.append('upload_preset', 'profile_upload'); // 🔴 CHANGE THIS
      // NO API SECRET HERE ❌
  
      const response = await axios.post(
        'https://api.cloudinary.com/v1_1/dnenbkpqg/image/upload', // 🔴 CHANGE THIS
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );

      console.log("response---", response);
  
      const imageUrl = response.data.secure_url;
  
      // Save in Firestore (same as your existing logic)
      await firestore().collection('users').doc(user.uid).set(
        { profileImage: imageUrl },
        { merge: true }
      );
  
      setProfileImage(imageUrl);
  
      showModal({
        type: 'success',
        title: 'Updated',
        message: 'Profile image updated successfully',
      });
  
    } catch (error) {
      console.log('CLOUDINARY ERROR:', error?.response?.data || error);
  
      showModal({
        type: 'error',
        title: 'Upload Failed',
        message: 'Cloudinary upload failed',
      });
    }
  
    setSaving(false);
  };

  const handlePickImage = async () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.5 },
      async (response) => {
        if (response.didCancel) return;
  
        if (response.errorCode) {
          showModal({
            type: 'error',
            title: 'Error',
            message: 'Image picker failed',
          });
          return;
        }
  
        const asset = response.assets[0];
        const uri = asset.uri;
  
        await uploadImageToCloudinary(uri);
      }
    );
  };

  useEffect(() => {
    const loadKey = async () => {
      const savedKey = await AsyncStorage.getItem('GEMINI_API_KEY');
      if (savedKey) { setApiKey(savedKey); setApiInput(savedKey); }
    };
    loadKey();
  }, []);

  const handleSaveApiKey = async () => {
    if (adminPassword !== 'sk') {
      showModal({ type: 'error', title: 'Access Denied', message: 'Invalid admin password' });
      return;
    }
    await AsyncStorage.setItem('GEMINI_API_KEY', apiInput);
    setApiKey(apiInput); setApiInput(''); setAdminPassword('');
    setAdminModalVisible(false);
    showModal({ type: 'success', title: 'API Key Saved', message: 'Your API key is stored securely.' });
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const handleSaveBudget = async () => {
    if (!user) return;
    const val = Number(budgetInput);
    if (!budgetInput || isNaN(val) || val <= 0) {
      showModal({ type: 'warning', title: 'Invalid Budget', message: 'Please enter a valid positive number.' });
      return;
    }
    setSaving(true);
    try {
      await firestore().collection('users').doc(user.uid).set({ budget: val }, { merge: true });
      setBudget(val); setEditMode(false);
      showModal({ type: 'success', title: 'Budget Updated', message: 'Your monthly budget has been saved.' });
    } catch {
      showModal({ type: 'error', title: 'Error', message: 'Failed to save budget.' });
    }
    setSaving(false);
  };

  const handleSelectColor = async (color) => {
    if (!user) return;
    setColorModalVisible(false);
    try {
      await firestore().collection('users').doc(user.uid).set({ primaryColor: color }, { merge: true });
      setPrimaryColor(color);
      showModal({ type: 'success', title: 'Theme Updated', message: 'Theme color updated.' });
    } catch {
      showModal({ type: 'error', title: 'Error', message: 'Failed to save color.' });
    }
  };

  return (
    <>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={['#050D1A', '#071828', '#0A2535', '#062520']} locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />

        <SafeAreaView style={styles.safe} edges={['top', 'right', 'left']}>

          {/* ── Header hero ── */}
          <Animated.View entering={FadeInUp.springify()} style={styles.hero}>
            <LinearGradient colors={['rgba(0,201,167,0.15)', 'rgba(0,201,167,0.03)']} style={styles.heroBg}>
              <TouchableOpacity
                onPress={handlePickImage}
                onLongPress={() => {
                  if (profileImage) setPreviewVisible(true);
                }}
                activeOpacity={0.9}
              >
                <Animated.View style={[styles.avatarRing, pulseStyle]}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={styles.avatar} />
                  ) : (
                    <LinearGradient colors={['#00C9A7', '#00695C']} style={styles.avatar}>
                      <Text style={styles.avatarText}>
                        {getInitials(user?.displayName || user?.email)}
                      </Text>
                    </LinearGradient>
                  )}
                </Animated.View>
              </TouchableOpacity>
              <Text style={styles.userName}>{user?.displayName || 'No Name'}</Text>
              <Text style={styles.userEmail}>{user?.email || 'No email'}</Text>

              <View style={styles.statRow}>
                <View style={styles.statPill}>
                  <Text style={styles.statValue}>{RUPEE} {budget || 0}</Text>
                  <Text style={styles.statLabel}>Budget</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Info Cards ── */}
          <View style={styles.cardsWrap}>
          <TouchableOpacity onLongPress={() => setApiModalVisible(true)}>
            <InfoCard icon="person-outline" delay={80}>
              <Text style={styles.infoText}>{user?.displayName || 'Not set'}</Text>
            </InfoCard>
            </TouchableOpacity>

            <InfoCard icon="mail-outline" delay={140}>
              <Text style={styles.infoText} numberOfLines={1}>{user?.email || 'Not available'}</Text>
            </InfoCard>

            <InfoCard icon="wallet-outline" delay={200}>
              {!editMode ? (
                <View style={styles.budgetRow}>
                  <Text style={styles.infoText}>Budget: <Text style={{ color: '#00C9A7', fontWeight: '800' }}>{RUPEE} {budget || 0}</Text></Text>
                  <TouchableOpacity style={styles.editIconBtn} onPress={() => { setEditMode(true); setBudgetInput(String(budget || '')); }}>
                    <Icon name="create-outline" size={16} color="#00C9A7" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.budgetEditRow}>
                  <TextInput
                    style={styles.budgetInputInline}
                    value={budgetInput}
                    onChangeText={setBudgetInput}
                    keyboardType="numeric"
                    placeholder="Enter budget"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                  />
                  <TouchableOpacity style={[styles.iconCircle, { backgroundColor: '#00897B' }]} onPress={handleSaveBudget} disabled={saving}>
                    <Icon name="checkmark" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.iconCircle, { backgroundColor: '#E53935' }]} onPress={() => setEditMode(false)}>
                    <Icon name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </InfoCard>

            <InfoCard icon="color-palette-outline" delay={260}>
              <TouchableOpacity style={styles.colorRow} onPress={() => setColorModalVisible(true)}>
                <Text style={styles.infoText}>Theme Color</Text>
                <View style={styles.colorPreviewWrap}>
                  <View style={[styles.colorPreview, { backgroundColor: primaryColor }]} />
                  <Icon name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" style={{ marginLeft: 6 }} />
                </View>
              </TouchableOpacity>
            </InfoCard>

          </View>

          {/* ── Logout ── */}
          <Animated.View entering={FadeInDown.delay(320).springify()} style={styles.logoutWrap}>
            <TouchableOpacity onPress={() => auth().signOut()} activeOpacity={0.85}>
              <LinearGradient colors={['rgba(229,57,53,0.2)', 'rgba(229,57,53,0.08)']} style={styles.logoutButton}>
                <Icon name="log-out-outline" size={18} color="#FF6B6B" />
                <Text style={styles.logoutButtonText}>Sign Out</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </SafeAreaView>

        {/* ── Color Modal ── */}
        {colorModalVisible && (
          <Modal visible transparent animationType="slide">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Choose Theme</Text>
                <FlatList
                  data={COLOR_OPTIONS}
                  keyExtractor={(item) => item.value}
                  numColumns={2}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={styles.colorOption} onPress={() => handleSelectColor(item.value)}>
                      <View style={[styles.colorCircle, { backgroundColor: item.value }]}>
                        {primaryColor === item.value && <Icon name="checkmark" size={14} color="#fff" />}
                      </View>
                      <Text style={styles.colorName}>{item.name}</Text>
                    </TouchableOpacity>
                  )}
                />
                <TouchableOpacity style={styles.modalClose} onPress={() => setColorModalVisible(false)}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {/* ── Admin Modal ── */}
        {adminModalVisible && (
          <Modal visible transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Admin Verification</Text>
                <TextInput value={adminPassword} onChangeText={setAdminPassword} placeholder="Enter Admin Password" secureTextEntry style={styles.modalInput} placeholderTextColor="rgba(255,255,255,0.3)" />
                <TouchableOpacity onPress={handleSaveApiKey} style={styles.modalPrimaryBtn}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: RFValue(14) }}>Verify & Save</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => { setAdminModalVisible(false); setAdminPassword(''); }} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#FF6B6B', fontWeight: '600' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}

        {previewVisible && (
          <Modal transparent animationType="fade">
            <TouchableWithoutFeedback onPress={() => setPreviewVisible(false)}>
              <View style={styles.previewContainer}>
                <Image
                  source={{ uri: profileImage }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              </View>
            </TouchableWithoutFeedback>
          </Modal>
        )}

        {/* ── API Key Modal ── */}
        {apiModalVisible && (
          <Modal transparent animationType="fade">
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <Text style={styles.modalTitle}>Enter API Key</Text>
                <TextInput value={apiInput} onChangeText={setApiInput} placeholder="Paste API Key" placeholderTextColor="rgba(255,255,255,0.3)" style={styles.modalInput} />
                <TouchableOpacity onPress={() => { if (!apiInput) return; setApiModalVisible(false); setAdminModalVisible(true); }} style={styles.modalPrimaryBtn}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: RFValue(14) }}>Continue</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setApiModalVisible(false)} style={{ marginTop: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#FF6B6B' }}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
      </View>

      <AppPromptModal {...modalProps} />
    </>
  );
};

const RUPEE = '\u20B9';

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050D1A' },
  safe: { flex: 1 },

  // Hero
  hero: { paddingHorizontal: 16, paddingTop: 10 },
  heroBg: {
    borderRadius: 24, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: 16,
  },
  avatarRing: {
    width: 90, height: 90, borderRadius: 45,
    borderWidth: 2, borderColor: 'rgba(0,201,167,0.4)',
    padding: 3, marginBottom: 12,
  },
  avatar: { width: '100%', height: '100%', borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: RFValue(28), fontWeight: '800', color: '#fff' },
  userName: { fontSize: RFValue(20), fontWeight: '800', color: '#fff', marginBottom: 4 },
  userEmail: { fontSize: RFValue(12), color: 'rgba(255,255,255,0.4)', marginBottom: 16 },
  statRow: { flexDirection: 'row', gap: 16 },
  statPill: { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 14, paddingHorizontal: 18, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  statValue: { color: '#00C9A7', fontSize: RFValue(15), fontWeight: '800' },
  statLabel: { color: 'rgba(255,255,255,0.4)', fontSize: RFValue(10), marginTop: 2, letterSpacing: 0.5 },

  // Info cards
  cardsWrap: { paddingHorizontal: 16 },
  infoCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 18, padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)',
  },
  infoIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,201,167,0.12)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  infoText: { fontSize: RFValue(14), color: 'rgba(255,255,255,0.8)', fontWeight: '500', flex: 1 },

  budgetRow: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  editIconBtn: { backgroundColor: 'rgba(0,201,167,0.15)', borderRadius: 8, padding: 7 },
  budgetEditRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  budgetInputInline: {
    flex: 1, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10, paddingVertical: 7, paddingHorizontal: 12,
    fontSize: RFValue(13), color: '#fff', backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconCircle: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },

  colorRow: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colorPreviewWrap: { flexDirection: 'row', alignItems: 'center' },
  colorPreview: { width: 24, height: 24, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },

  // Logout
  logoutWrap: { paddingHorizontal: 16, marginTop: 8 },
  logoutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 15, borderRadius: 18, gap: 10,
    borderWidth: 1, borderColor: 'rgba(229,57,53,0.25)',
  },
  logoutButtonText: { color: '#FF6B6B', fontSize: RFValue(15), fontWeight: '700' },

  // Modals
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modalContainer: { backgroundColor: '#0D1F2D', width: '100%', borderRadius: 24, padding: 22, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  modalTitle: { fontSize: RFValue(17), fontWeight: '800', marginBottom: 18, textAlign: 'center', color: '#fff' },
  modalInput: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 14,
    padding: 12, marginBottom: 12, color: '#fff',
    backgroundColor: 'rgba(255,255,255,0.05)', fontSize: RFValue(13),
  },
  modalPrimaryBtn: { backgroundColor: '#00897B', padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  colorOption: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 10, margin: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  colorCircle: { width: 30, height: 30, borderRadius: 10, marginRight: 10, alignItems: 'center', justifyContent: 'center' },
  colorName: { fontSize: RFValue(12), fontWeight: '600', color: 'rgba(255,255,255,0.7)' },
  modalClose: { marginTop: 16, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  previewContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  previewImage: {
    width: '100%',
    height: '80%',
  },
});

export default ProfileScreen;
