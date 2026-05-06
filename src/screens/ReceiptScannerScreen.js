import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
} from 'react-native';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import MlkitOcr from 'react-native-mlkit-ocr';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import LottieView from 'lottie-react-native';
import { getAIParsedExpense } from '../services/aiService';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');


// ─── Source Picker Modal ────────────────────────────────────────────────────
const SourcePickerModal = ({ visible, onCamera, onGallery, onCancel }) => {
  const modalY = useRef(new Animated.Value(300)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const cameraCardY = useRef(new Animated.Value(40)).current;
  const cameraCardOpacity = useRef(new Animated.Value(0)).current;
  const galleryCardY = useRef(new Animated.Value(40)).current;
  const galleryCardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(modalY, { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }).start();
      Animated.spring(modalOpacity, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }).start();

      // Stagger the two option cards
      Animated.spring(cameraCardY, { toValue: 0, tension: 80, friction: 7, useNativeDriver: true, delay: 200 }).start();
      Animated.spring(cameraCardOpacity, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true, delay: 200 }).start();

      Animated.spring(galleryCardY, { toValue: 0, tension: 80, friction: 7, useNativeDriver: true, delay: 350 }).start();
      Animated.spring(galleryCardOpacity, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true, delay: 350 }).start();
    } else {
      modalY.setValue(300);
      modalOpacity.setValue(0);
      cameraCardY.setValue(40);
      cameraCardOpacity.setValue(0);
      galleryCardY.setValue(40);
      galleryCardOpacity.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <TouchableOpacity style={pickerStyles.overlay} activeOpacity={1} onPress={onCancel}>
        <Animated.View
          style={[pickerStyles.sheet, { transform: [{ translateY: modalY }], opacity: modalOpacity }]}
        >
          {/* Handle bar */}
          <View style={pickerStyles.handle} />

          <Text style={pickerStyles.sheetTitle}>Add Receipt</Text>
          <Text style={pickerStyles.sheetSubtitle}>Choose how to import your receipt</Text>

          {/* Camera option */}
          <Animated.View style={{ transform: [{ translateY: cameraCardY }], opacity: cameraCardOpacity }}>
            <TouchableOpacity style={pickerStyles.optionCard} onPress={onCamera} activeOpacity={0.85}>
              <LinearGradient
                colors={['rgba(255,107,107,0.18)', 'rgba(255,107,107,0.06)']}
                style={pickerStyles.optionGradient}
              >
                <View style={[pickerStyles.optionIcon, { borderColor: 'rgba(255,107,107,0.5)' }]}>
                  <Icon name="camera-outline" size={26} color="#FF6B6B" />
                </View>
                <View style={pickerStyles.optionText}>
                  <Text style={pickerStyles.optionTitle}>Take Photo</Text>
                  <Text style={pickerStyles.optionDesc}>Open camera to snap the receipt</Text>
                </View>
                <Icon name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Gallery option */}
          <Animated.View style={{ transform: [{ translateY: galleryCardY }], opacity: galleryCardOpacity }}>
            <TouchableOpacity style={pickerStyles.optionCard} onPress={onGallery} activeOpacity={0.85}>
              <LinearGradient
                colors={['rgba(66,165,245,0.18)', 'rgba(66,165,245,0.06)']}
                style={pickerStyles.optionGradient}
              >
                <View style={[pickerStyles.optionIcon, { borderColor: 'rgba(66,165,245,0.5)' }]}>
                  <Icon name="images-outline" size={26} color="#42A5F5" />
                </View>
                <View style={pickerStyles.optionText}>
                  <Text style={pickerStyles.optionTitle}>Upload from Gallery</Text>
                  <Text style={pickerStyles.optionDesc}>Pick an existing receipt photo</Text>
                </View>
                <Icon name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* Cancel */}
          <TouchableOpacity style={pickerStyles.cancelRow} onPress={onCancel} activeOpacity={0.7}>
            <Text style={pickerStyles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

// ─── AI Confirm Modal ───────────────────────────────────────────────────────
const AIConfirmModal = ({ visible, parsed, onAdd, onCancel, saving }) => {
  const modalY = useRef(new Animated.Value(300)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const detailsY = useRef(new Animated.Value(30)).current;
  const detailsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(modalY, { toValue: 0, tension: 70, friction: 8, useNativeDriver: true }).start();
      Animated.spring(modalOpacity, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }).start();
      Animated.spring(iconScale, { toValue: 1, tension: 150, friction: 8, useNativeDriver: true, delay: 200 }).start();
      Animated.spring(detailsY, { toValue: 0, tension: 80, friction: 7, useNativeDriver: true, delay: 400 }).start();
      Animated.spring(detailsOpacity, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true, delay: 400 }).start();
    } else {
      modalY.setValue(300);
      modalOpacity.setValue(0);
      iconScale.setValue(0);
      detailsY.setValue(30);
      detailsOpacity.setValue(0);
    }
  }, [visible]);

  if (!parsed) return null;

  const categories = [
    { label: 'Food', icon: 'fast-food-outline' },
    { label: 'Petrol', icon: 'flame-outline' },
    { label: 'Travel', icon: 'car-outline' },
    { label: 'Shopping', icon: 'cart-outline' },
    { label: 'Bills', icon: 'receipt-outline' },
    { label: 'Other', icon: 'ellipsis-horizontal-outline' },
  ];

  const categoryIcon = categories.find((c) => c.label === parsed.category)?.icon || 'ellipsis-horizontal-outline';

  const DetailRow = ({ icon, label, value, highlight }) => (
    <View style={modalStyles.row}>
      <View style={modalStyles.rowLeft}>
        <Icon name={icon} size={16} color="#FF6B6B" />
        <Text style={modalStyles.rowLabel}>{label}</Text>
      </View>
      <Text style={[modalStyles.rowValue, highlight && modalStyles.rowValueHighlight]}>{value}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={modalStyles.overlay}>
        <Animated.View
          style={[modalStyles.card, { transform: [{ translateY: modalY }], opacity: modalOpacity }]}
        >
          <LinearGradient
            colors={['rgba(255,107,107,0.2)', 'rgba(255,107,107,0.05)']}
            style={modalStyles.header}
          >
            <Animated.View style={[modalStyles.iconCircle, { transform: [{ scale: iconScale }] }]}>
              <LottieView source={require('../assets/lottie/sparkle-pulse.json')} autoPlay loop style={modalStyles.iconLottie} />
              <Icon name="sparkles" size={24} color="#FF6B6B" />
            </Animated.View>
            <Text style={modalStyles.title}>AI Parsed Expense</Text>
            <Text style={modalStyles.subtitle}>Please confirm before adding</Text>
          </LinearGradient>

          <Animated.View
            style={[modalStyles.detailsBox, { transform: [{ translateY: detailsY }], opacity: detailsOpacity }]}
          >
            <DetailRow icon="cash-outline" label="Amount" value={`₹ ${parsed.amount}`} highlight />
            <DetailRow icon={categoryIcon} label="Category" value={parsed.category} />
            {parsed.subcategory && <DetailRow icon="layers-outline" label="Subcategory" value={parsed.subcategory} />}
            {parsed.note && <DetailRow icon="create-outline" label="Note" value={parsed.note} />}
          </Animated.View>

          <View style={modalStyles.actions}>
            <TouchableOpacity style={modalStyles.cancelBtn} onPress={onCancel} disabled={saving} activeOpacity={0.8}>
              <Text style={modalStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={modalStyles.addBtn} onPress={onAdd} disabled={saving} activeOpacity={0.8}>
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="checkmark" size={16} color="#fff" />
                  <Text style={modalStyles.addText}>Add</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────
const ReceiptScannerScreen = ({ navigation }) => {
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [aiParsing, setAiParsing] = useState(false);
  const [parsedExpense, setParsedExpense] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '', type: 'error' });

  // Entrance animations
  const cardY = useRef(new Animated.Value(100)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconRotate = useRef(new Animated.Value(0)).current;
  const buttonY = useRef(new Animated.Value(50)).current;
  const buttonOpacity = useRef(new Animated.Value(0)).current;
  const scanFrameScale = useRef(new Animated.Value(0.8)).current;
  const scanFrameRotate = useRef(new Animated.Value(0)).current;
  const titleX = useRef(new Animated.Value(-30)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(20)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const backgroundScale = useRef(new Animated.Value(1.2)).current;
  const buttonPressScale = useRef(new Animated.Value(1)).current;
  const floatingParticles = useRef(new Animated.Value(0)).current;
  const backButtonX = useRef(new Animated.Value(-24)).current;
  const backButtonOpacity = useRef(new Animated.Value(0)).current;
  // Second button (gallery shortcut) stagger
  const galleryBtnY = useRef(new Animated.Value(50)).current;
  const galleryBtnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(backgroundScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }).start();
    Animated.spring(backButtonX, { toValue: 0, tension: 90, friction: 8, useNativeDriver: true, delay: 80 }).start();
    Animated.spring(backButtonOpacity, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true, delay: 80 }).start();
    Animated.spring(cardY, { toValue: 0, tension: 65, friction: 7, useNativeDriver: true, delay: 100 }).start();
    Animated.spring(cardOpacity, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true, delay: 100 }).start();
    Animated.spring(iconScale, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true, delay: 300 }).start();
    Animated.spring(iconRotate, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true, delay: 300 }).start();
    Animated.spring(scanFrameScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true, delay: 500 }).start();
    Animated.spring(scanFrameRotate, { toValue: 1, tension: 70, friction: 6, useNativeDriver: true, delay: 500 }).start();
    Animated.spring(titleX, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true, delay: 700 }).start();
    Animated.spring(titleOpacity, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true, delay: 700 }).start();
    Animated.spring(subtitleY, { toValue: 0, tension: 70, friction: 7, useNativeDriver: true, delay: 900 }).start();
    Animated.spring(subtitleOpacity, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true, delay: 900 }).start();
    Animated.spring(buttonY, { toValue: 0, tension: 100, friction: 10, useNativeDriver: true, delay: 1100 }).start();
    Animated.spring(buttonOpacity, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true, delay: 1100 }).start();
    Animated.spring(galleryBtnY, { toValue: 0, tension: 100, friction: 10, useNativeDriver: true, delay: 1250 }).start();
    Animated.spring(galleryBtnOpacity, { toValue: 1, tension: 60, friction: 8, useNativeDriver: true, delay: 1250 }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(floatingParticles, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(floatingParticles, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleButtonPress = () => {
    Animated.spring(buttonPressScale, { toValue: 0.92, tension: 300, friction: 10, useNativeDriver: true }).start();
    setTimeout(() => {
      Animated.spring(buttonPressScale, { toValue: 1, tension: 200, friction: 8, useNativeDriver: true }).start();
    }, 150);
    // Open source picker so user can choose camera or gallery
    setShowSourcePicker(true);
  };

  const showErrorModal = (title, message, type = 'error') => {
    setErrorModal({ visible: true, title, message, type });
  };

  // ── Permissions ─────────────────────────────────────────────────────────
  const ensureCameraPermission = async () => {
    try {
      if (Platform.OS !== 'android') return true;
      const alreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (alreadyGranted) return true;
      const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.CAMERA, {
        title: 'Camera Permission',
        message: 'Camera access is required to scan receipts.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Camera permission error:', error);
      showErrorModal('Permission Error', 'Unable to request camera permission. Please check your settings.');
      return false;
    }
  };

  const ensureStoragePermission = async () => {
    try {
      if (Platform.OS !== 'android') return true;
      // Android 13+ uses READ_MEDIA_IMAGES; older versions use READ_EXTERNAL_STORAGE
      const permission =
        Platform.Version >= 33
          ? PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES
          : PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE;

      const alreadyGranted = await PermissionsAndroid.check(permission);
      if (alreadyGranted) return true;

      const result = await PermissionsAndroid.request(permission, {
        title: 'Gallery Permission',
        message: 'Gallery access is required to upload receipt images.',
        buttonPositive: 'Allow',
        buttonNegative: 'Deny',
      });
      return result === PermissionsAndroid.RESULTS.GRANTED;
    } catch (error) {
      console.error('Storage permission error:', error);
      showErrorModal('Permission Error', 'Unable to request gallery permission. Please check your settings.');
      return false;
    }
  };

  // ── Shared OCR + AI flow ─────────────────────────────────────────────────
  const processImageUri = async (uri) => {
    // OCR
    let blocks;
    try {
      blocks = await MlkitOcr.detectFromUri(uri);
    } catch (ocrError) {
      console.error('OCR error:', ocrError);
      showErrorModal('OCR Error', 'Unable to extract text from image. Please ensure the receipt is clear and well-lit.');
      return;
    }

    const text = (blocks || [])
      .map((block) => block?.text || '')
      .filter(Boolean)
      .join(' ');

    if (!text.trim()) {
      showErrorModal(
        'No Text Found',
        'Could not detect readable text from the receipt. Please ensure the receipt is clear and try again.',
        'warning'
      );
      return;
    }

    // AI parse
    let result;
    try {
      setAiParsing(true);
      result = await getAIParsedExpense(text);
    } catch (aiError) {
      console.error('AI parsing error:', aiError);
      showErrorModal('AI Parse Error', 'Unable to process the receipt with AI. Please try again or check your internet connection.');
      return;
    } finally {
      setAiParsing(false);
    }

    if (result && result.amount) {
      setParsedExpense(result);
      setShowModal(true);
    } else {
      showErrorModal('Parse Failed', 'Could not extract expense information from the receipt. Please try with a clearer image.', 'warning');
    }
  };

  // ── Camera handler ───────────────────────────────────────────────────────
  const handleScanWithCamera = async () => {
    setShowSourcePicker(false);
    setScanning(true);
    try {
      const hasPermission = await ensureCameraPermission();
      if (!hasPermission) {
        showErrorModal('Permission Required', 'Please allow camera permission to scan receipts.', 'warning');
        return;
      }

      let imageResponse;
      try {
        imageResponse = await launchCamera({
          mediaType: 'photo',
          cameraType: 'back',
          quality: 0.8,
          saveToPhotos: false,
        });
      } catch (cameraError) {
        console.error('Camera launch error:', cameraError);
        showErrorModal('Camera Error', 'Unable to open camera. Please try again or check camera permissions.');
        return;
      }

      if (imageResponse?.didCancel) return;
      if (imageResponse?.errorCode) {
        showErrorModal('Camera Error', imageResponse.errorMessage || 'Unable to open camera.');
        return;
      }

      const imagePath = imageResponse?.assets?.[0]?.uri;
      if (!imagePath) {
        showErrorModal('Image Error', 'No image captured for scanning. Please try again.');
        return;
      }

      await processImageUri(imagePath);
    } catch (error) {
      console.error('Unexpected camera scan error:', error);
      showErrorModal('Scan Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  // ── Gallery handler ──────────────────────────────────────────────────────
  const handleUploadFromGallery = async () => {
    setShowSourcePicker(false);
    setScanning(true);
    try {
      const hasPermission = await ensureStoragePermission();
      if (!hasPermission) {
        showErrorModal('Permission Required', 'Please allow gallery permission to upload receipts.', 'warning');
        return;
      }

      let imageResponse;
      try {
        imageResponse = await launchImageLibrary({
          mediaType: 'photo',
          quality: 0.8,
          selectionLimit: 1,   // only one receipt at a time
        });
      } catch (galleryError) {
        console.error('Gallery launch error:', galleryError);
        showErrorModal('Gallery Error', 'Unable to open gallery. Please try again or check gallery permissions.');
        return;
      }

      if (imageResponse?.didCancel) return;
      if (imageResponse?.errorCode) {
        showErrorModal('Gallery Error', imageResponse.errorMessage || 'Unable to open gallery.');
        return;
      }

      const imagePath = imageResponse?.assets?.[0]?.uri;
      if (!imagePath) {
        showErrorModal('Image Error', 'No image selected. Please try again.');
        return;
      }

      await processImageUri(imagePath);
    } catch (error) {
      console.error('Unexpected gallery error:', error);
      showErrorModal('Upload Failed', 'An unexpected error occurred. Please try again.');
    } finally {
      setScanning(false);
    }
  };

  // ── Firestore save ───────────────────────────────────────────────────────
  const saveExpense = async ({ amount, category, subcategory, note, expenseDate }) => {
    try {
      const user = auth().currentUser;
      if (!user) {
        showErrorModal('Authentication Error', 'You must be logged in to save expenses.', 'warning');
        return false;
      }
      await firestore().collection('users').doc(user.uid).collection('expenses').add({
        amount: parseFloat(amount),
        category,
        subcategory: subcategory || null,
        note: note || null,
        date: expenseDate || new Date(),
        createdAt: new Date(),
      });
      return true;
    } catch (firestoreError) {
      console.error('Firestore save error:', firestoreError);
      showErrorModal('Save Error', 'Failed to save expense. Please check your internet connection and try again.');
      return false;
    }
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
        showErrorModal('Success', 'Expense added successfully!', 'success');
      }
    } catch (error) {
      console.error('Handle AI Add error:', error);
      showErrorModal('Save Failed', 'An unexpected error occurred while saving the expense.');
    } finally {
      setSaving(false);
    }
  };

  // ── Error / Success Modal ────────────────────────────────────────────────
  const ErrorModal = ({ visible, title, message, type, onClose }) => {
    const modalY = useRef(new Animated.Value(200)).current;
    const modalOpacity = useRef(new Animated.Value(0)).current;
    const iconScale = useRef(new Animated.Value(0)).current;
    const contentY = useRef(new Animated.Value(20)).current;
    const contentOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
      if (visible) {
        Animated.spring(modalY, { toValue: 0, tension: 80, friction: 8, useNativeDriver: true }).start();
        Animated.spring(modalOpacity, { toValue: 1, tension: 40, friction: 8, useNativeDriver: true }).start();
        Animated.spring(iconScale, { toValue: 1, tension: 120, friction: 8, useNativeDriver: true, delay: 150 }).start();
        Animated.spring(contentY, { toValue: 0, tension: 70, friction: 7, useNativeDriver: true, delay: 300 }).start();
        Animated.spring(contentOpacity, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true, delay: 300 }).start();
      } else {
        modalY.setValue(200);
        modalOpacity.setValue(0);
        iconScale.setValue(0);
        contentY.setValue(20);
        contentOpacity.setValue(0);
      }
    }, [visible]);

    const getIconAndColor = () => {
      switch (type) {
        case 'success': return { icon: 'checkmark-circle', color: '#1DE9B6', gradient: ['#1DE9B6', '#00897B'] };
        case 'warning': return { icon: 'warning', color: '#FFA726', gradient: ['#FFA726', '#FB8C00'] };
        case 'info': return { icon: 'information-circle', color: '#42A5F5', gradient: ['#42A5F5', '#1E88E5'] };
        default: return { icon: 'close-circle', color: '#FF6B6B', gradient: ['#FF6B6B', '#E53935'] };
      }
    };

    const { icon, color, gradient } = getIconAndColor();

    return (
      <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
        <View style={errorStyles.overlay}>
          <Animated.View style={[errorStyles.card, { transform: [{ translateY: modalY }], opacity: modalOpacity }]}>
            <LinearGradient colors={[`${color}20`, `${color}08`]} style={errorStyles.header}>
              <Animated.View style={[errorStyles.iconContainer, { transform: [{ scale: iconScale }] }]}>
                <Icon name={icon} size={28} color={color} />
              </Animated.View>
              <Text style={errorStyles.title}>{title}</Text>
            </LinearGradient>
            <Animated.View style={[errorStyles.content, { transform: [{ translateY: contentY }], opacity: contentOpacity }]}>
              <Text style={errorStyles.message}>{message}</Text>
            </Animated.View>
            <View style={errorStyles.actions}>
              <TouchableOpacity style={errorStyles.okBtn} onPress={onClose} activeOpacity={0.8}>
                <LinearGradient colors={gradient} style={errorStyles.okBtnGradient}>
                  <Text style={errorStyles.okBtnText}>OK</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={{flex:1}}>
    <View style={styles.container}>
      {/* Animated gradient background */}
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ scale: backgroundScale }] }]}>
        <LinearGradient
          colors={['#0A0E27', '#1A1F3A', '#2D1B69', '#1A1F3A', '#0A0E27']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.backButtonWrap,
          { opacity: backButtonOpacity, transform: [{ translateX: backButtonX }] },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.8}>
          <LinearGradient
            colors={['rgba(255,107,107,0.24)', 'rgba(255,107,107,0.08)']}
            style={styles.backButton}
          >
            <Icon name="chevron-back" size={18} color="#FF6B6B" />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Morphing background shapes */}
      <Animated.View
        style={[
          styles.morphingShape1,
          {
            transform: [
              { translateY: floatingParticles.interpolate({ inputRange: [0, 1], outputRange: [0, -100] }) },
              { rotate: floatingParticles.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(255,107,107,0.1)', 'rgba(255,107,107,0.05)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={[
          styles.morphingShape2,
          {
            transform: [
              { translateY: floatingParticles.interpolate({ inputRange: [0, 1], outputRange: [0, 80] }) },
              { rotate: floatingParticles.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-180deg'] }) },
            ],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(66,165,245,0.08)', 'rgba(66,165,245,0.03)', 'transparent']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      {/* Main card */}
      <Animated.View style={[styles.mainContent, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}>
        <View style={styles.glassCard}>
          {/* Scan frame */}
          <Animated.View
            style={[
              styles.scanFrame,
              {
                transform: [
                  { scale: scanFrameScale },
                  { rotate: scanFrameRotate.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
                ],
              },
            ]}
          >
            <LinearGradient
              colors={['rgba(255,107,107,0.6)', 'rgba(255,107,107,0.2)', 'rgba(255,107,107,0.6)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanFrameGradient}
            />
            <View style={styles.scanFrameBorder} />
          </Animated.View>

          {/* Icon */}
          <Animated.View
            style={[
              styles.iconContainer,
              {
                transform: [
                  { scale: iconScale },
                  { rotate: iconRotate.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) },
                ],
              },
            ]}
          >
            <LinearGradient colors={['rgba(255,107,107,0.2)', 'rgba(255,107,107,0.05)']} style={styles.iconBackground} />
            <Icon name="scan-outline" size={48} color="#FF6B6B" />
            <View style={styles.iconGlow} />
          </Animated.View>

          {/* Title */}
          <Animated.View style={{ transform: [{ translateX: titleX }], opacity: titleOpacity }}>
            <Text style={styles.title}>Receipt Scanner</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.View style={{ transform: [{ translateY: subtitleY }], opacity: subtitleOpacity }}>
            <Text style={styles.subtitle}>
              Capture or upload a receipt to auto-fill amount, date, and category with AI
            </Text>
          </Animated.View>

          {/* ── Primary CTA: opens source picker ── */}
          <Animated.View
            style={{ transform: [{ translateY: buttonY }, { scale: buttonPressScale }], opacity: buttonOpacity }}
          >
            <TouchableOpacity
              style={[styles.premiumButton, (scanning || aiParsing) && styles.premiumButtonDisabled]}
              onPress={handleButtonPress}
              disabled={scanning || aiParsing}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['#FF6B6B', '#E53935', '#C62828']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.buttonGradient}
              >
                {scanning || aiParsing ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={styles.loadingText}>
                      {scanning ? 'Scanning receipt...' : 'AI parsing...'}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.buttonContent}>
                    <Icon name="camera-outline" size={20} color="#fff" />
                    <Text style={styles.buttonText}>Scan Receipt</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          {/* ── Secondary CTA: go straight to gallery ── */}
          {/* <Animated.View
            style={[
              styles.galleryButtonWrapper,
              { transform: [{ translateY: galleryBtnY }], opacity: galleryBtnOpacity },
            ]}
          >
            <TouchableOpacity
              style={[styles.galleryButton, (scanning || aiParsing) && styles.premiumButtonDisabled]}
              onPress={() => {
                if (!scanning && !aiParsing) handleUploadFromGallery();
              }}
              disabled={scanning || aiParsing}
              activeOpacity={0.85}
            >
              <View style={styles.galleryButtonInner}>
                <Icon name="images-outline" size={18} color="#42A5F5" />
                <Text style={styles.galleryButtonText}>Upload from Gallery</Text>
              </View>
            </TouchableOpacity>
          </Animated.View> */}
        </View>
      </Animated.View>

      {/* Source picker bottom sheet */}
      <SourcePickerModal
        visible={showSourcePicker}
        onCamera={handleScanWithCamera}
        onGallery={handleUploadFromGallery}
        onCancel={() => setShowSourcePicker(false)}
      />

      {/* AI confirm modal */}
      <AIConfirmModal
        visible={showModal}
        parsed={parsedExpense}
        onAdd={handleAIAdd}
        onCancel={() => { setShowModal(false); setParsedExpense(null); }}
        saving={saving}
      />

      {/* Error / success modal */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        type={errorModal.type}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
      />
    </View>
    </SafeAreaView>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  backButtonWrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 58 : 28,
    left: 24,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,107,107,0.35)',
  },
  morphingShape1: {
    position: 'absolute',
    width: width * 0.6,
    height: width * 0.6,
    borderRadius: width * 0.3,
    top: '10%',
    left: '-20%',
  },
  morphingShape2: {
    position: 'absolute',
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: width * 0.2,
    bottom: '20%',
    right: '-15%',
  },
  mainContent: { flex: 1, justifyContent: 'center' },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
    elevation: 20,
  },
  scanFrame: {
    width: 120,
    height: 120,
    borderRadius: 24,
    marginBottom: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrameGradient: { position: 'absolute', width: '100%', height: '100%', borderRadius: 24 },
  scanFrameBorder: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 107, 0.6)',
    backgroundColor: 'transparent',
  },
  iconContainer: { position: 'relative', marginBottom: 24 },
  iconBackground: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    top: -16,
    left: -16,
  },
  iconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    top: -26,
    left: -26,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  premiumButton: {
    borderRadius: 20,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 12,
    width: width - 96,
  },
  premiumButtonDisabled: { opacity: 0.6, shadowOpacity: 0.2 },
  buttonGradient: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loadingText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  buttonContent: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Gallery secondary button
  galleryButtonWrapper: { marginTop: 14, width: width - 96 },
  galleryButton: {
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(66,165,245,0.45)',
    backgroundColor: 'rgba(66,165,245,0.08)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  galleryButtonInner: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  galleryButtonText: { color: '#42A5F5', fontSize: 15, fontWeight: '600', letterSpacing: 0.3 },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'rgba(13, 31, 45, 0.98)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    borderBottomWidth: 0,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.4,
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.45)',
    marginBottom: 20,
    letterSpacing: 0.1,
  },
  optionCard: {
    borderRadius: 18,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  optionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
    gap: 14,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 0.1 },
  optionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 3 },
  cancelRow: {
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, color: 'rgba(255,255,255,0.4)', fontWeight: '600' },
});

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(13, 31, 45, 0.95)',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,107,107,0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255,107,107,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  iconLottie: { position: 'absolute', width: 72, height: 72, opacity: 0.6 },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', letterSpacing: -0.3 },
  subtitle: { fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 4, letterSpacing: 0.2 },
  detailsBox: { padding: 24, backgroundColor: 'rgba(255,255,255,0.02)' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { marginLeft: 10, fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '500', letterSpacing: 0.1 },
  rowValue: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600', letterSpacing: 0.1 },
  rowValueHighlight: { color: '#FF6B6B', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  actions: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  cancelBtn: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cancelText: { fontSize: 14, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.3 },
  addBtn: {
    flex: 1,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: 'rgba(229, 57, 53, 0.9)',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  addText: { fontSize: 14, color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
});

const errorStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: 'rgba(13, 31, 45, 0.95)',
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 24,
  },
  header: {
    paddingVertical: 24,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    elevation: 6,
  },
  title: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 8, letterSpacing: -0.3 },
  content: { padding: 24, backgroundColor: 'rgba(255,255,255,0.02)' },
  message: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22, letterSpacing: 0.1 },
  actions: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  okBtn: {
    flex: 1,
    paddingVertical: 4,
    margin: 16,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 8,
  },
  okBtnGradient: { paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
  okBtnText: { fontSize: 14, color: '#fff', fontWeight: '700', letterSpacing: 0.3 },
});

export default ReceiptScannerScreen;
