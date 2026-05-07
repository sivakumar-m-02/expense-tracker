import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
  StatusBar,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  Animated as RNAnimated,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { RFValue } from 'react-native-responsive-fontsize';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withSpring,
  withRepeat,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import AppPromptModal from '../../components/AppPromptModal';
import Ionicons from 'react-native-vector-icons/FontAwesome6';
import useAppModal from '../../hooks/useAppModal';

const { width, height } = Dimensions.get('window');

// ─── useKeyboardLift ──────────────────────────────────────────────────────────
/**
 * Reusable hook — returns an RNAnimated.Value that automatically animates
 * to -(keyboardHeight) when the keyboard appears and back to 0 when it hides.
 * Works both inside normal screens AND inside <Modal>.
 *
 * @param {boolean} active  Pass false to skip listeners (e.g. sheet not mounted)
 */
const useKeyboardLift = (active = true) => {
  const keyboardY = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const onShow = (e) => {
      const kbHeight = e.endCoordinates.height;
      // iOS: subtract safe-area bottom (~34pt) + 8pt buffer to avoid overshoot
      const shift = Platform.OS === 'ios' ? -(kbHeight - 34 + 8) : -kbHeight;
      RNAnimated.timing(keyboardY, {
        toValue: shift,
        duration: Platform.OS === 'ios' ? e.duration || 250 : 220,
        useNativeDriver: true,
      }).start();
    };

    const onHide = (e) => {
      RNAnimated.timing(keyboardY, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? e.duration || 200 : 180,
        useNativeDriver: true,
      }).start();
    };

    const showSub = Keyboard.addListener(showEvent, onShow);
    const hideSub = Keyboard.addListener(hideEvent, onHide);

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [active]);

  return keyboardY;
};

// ─── Floating Orb ─────────────────────────────────────────────────────────────
const FloatingOrb = ({ size, color, delay, startX, startY }) => {
  const y       = useSharedValue(0);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    y.value = withDelay(delay, withRepeat(
      withTiming(-20, { duration: 2800 + delay * 0.3, easing: Easing.inOut(Easing.sin) }),
      -1, true
    ));
    opacity.value = withDelay(delay, withRepeat(
      withTiming(0.2, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
      -1, true
    ));
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[orbStyle, {
      position: 'absolute', width: size, height: size,
      borderRadius: size / 2, backgroundColor: color,
      left: startX, top: startY,
    }]} />
  );
};

// ─── Shimmer Button ───────────────────────────────────────────────────────────
const ShimmerButton = ({ onPress, onPressIn, onPressOut, loading, children, pressStyle }) => {
  const shimmer = useSharedValue(-1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [-1, 1], [-width, width]) }],
  }));

  return (
    <Animated.View style={pressStyle}>
      <TouchableOpacity onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}
        disabled={loading} activeOpacity={0.9}>
        <LinearGradient colors={['#00C9A7', '#00897B', '#00695C']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginButton}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none" overflow="hidden">
            <Animated.View style={[shimmerStyle, {
              width: 80, height: '100%',
              backgroundColor: 'rgba(255,255,255,0.18)',
              transform: [{ skewX: '-20deg' }],
            }]} />
          </View>
          {loading ? <ActivityIndicator color="#fff" /> : children}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Animated Input ───────────────────────────────────────────────────────────
const AnimatedInput = ({ placeholder, value, onChangeText, secureTextEntry, keyboardType, autoFocus }) => {
  const borderAnim = useSharedValue(0);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor:   borderAnim.value === 1 ? '#00C9A7' : 'rgba(255,255,255,0.12)',
    shadowColor:   '#00C9A7',
    shadowOpacity: borderAnim.value * 0.35,
    shadowRadius:  10,
    elevation:     borderAnim.value - 1,
  }));

  return (
    <Animated.View style={[styles.inputWrapper, containerStyle]}>
      <TextInput
        placeholder={placeholder} value={value} onChangeText={onChangeText}
        onFocus={() => (borderAnim.value = withTiming(1, { duration: 200 }))}
        onBlur={() => (borderAnim.value = withTiming(0, { duration: 200 }))}
        autoCapitalize="none" keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="rgba(255,255,255,0.35)"
        style={styles.inputText}
        autoFocus={autoFocus}
      />
    </Animated.View>
  );
};

// ─── Forgot Password Sheet ────────────────────────────────────────────────────
const ForgotPasswordSheet = ({ visible, onClose, showModal }) => {
  const [resetEmail,   setResetEmail]   = useState('');
  const [loading,      setLoading]      = useState(false);
  const [modalMounted, setModalMounted] = useState(false);

  const slideY    = useRef(new RNAnimated.Value(500)).current;
  const backdropO = useRef(new RNAnimated.Value(0)).current;

  // Keyboard lift — only active when modal is mounted
  const keyboardY = useKeyboardLift(modalMounted);
  const combinedY = useRef(RNAnimated.add(slideY, keyboardY)).current;

  const borderAnim = useSharedValue(0);
  const shimmer    = useSharedValue(-1);
  const press      = useSharedValue(1);

  const inputBorderStyle = useAnimatedStyle(() => ({
    borderColor:   borderAnim.value === 1 ? '#00C9A7' : 'rgba(255,255,255,0.12)',
    shadowColor:   '#00C9A7',
    shadowOpacity: borderAnim.value * 0.35,
    shadowRadius:  10,
    elevation:     borderAnim.value - 1,
  }));
  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [-1, 1], [-width, width]) }],
  }));
  const pressStyle = useAnimatedStyle(() => ({
    transform: [{ scale: press.value }],
  }));

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.linear }), -1, false
    );
  }, []);

  useEffect(() => {
    if (visible) {
      setResetEmail('');
      keyboardY.setValue(0);
      setModalMounted(true);
    }
  }, [visible]);

  useEffect(() => {
    if (modalMounted && visible) {
      slideY.setValue(500);
      backdropO.setValue(0);
      RNAnimated.parallel([
        RNAnimated.spring(slideY, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }),
        RNAnimated.timing(backdropO, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [modalMounted, visible]);

  const closeSheet = () => {
    Keyboard.dismiss();
    RNAnimated.parallel([
      RNAnimated.timing(slideY,    { toValue: 500, duration: 250, useNativeDriver: true }),
      RNAnimated.timing(backdropO, { toValue: 0,   duration: 200, useNativeDriver: true }),
    ]).start(() => { setModalMounted(false); onClose(); });
  };

  const handleReset = async () => {
    if (!resetEmail.trim()) {
      showModal({ type: 'warning', title: 'Email Required', message: 'Please enter your registered email address.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resetEmail.trim())) {
      showModal({ type: 'warning', title: 'Invalid Email', message: 'Please enter a valid email address.' });
      return;
    }
    setLoading(true);
    try {
      await auth().sendPasswordResetEmail(resetEmail.trim());
      closeSheet();
      setTimeout(() => {
        showModal({ type: 'success', title: 'Reset Link Sent!',
          message: `A password reset link has been sent to ${resetEmail.trim()}. Check your inbox.` });
      }, 400);
    } catch (error) {
      let msg = error.message;
      if      (error.code === 'auth/user-not-found')    msg = 'No account found with this email address.';
      else if (error.code === 'auth/invalid-email')     msg = 'The email address is not valid.';
      else if (error.code === 'auth/too-many-requests') msg = 'Too many attempts. Please try again later.';
      showModal({ type: 'error', title: 'Reset Failed', message: msg });
    } finally {
      setLoading(false);
    }
  };

  if (!modalMounted && !visible) return null;

  return (
    <Modal transparent visible={modalMounted} animationType="none"
      statusBarTranslucent onRequestClose={closeSheet}>
      <TouchableWithoutFeedback onPress={closeSheet}>
        <RNAnimated.View style={[styles.backdropOverlay, { opacity: backdropO }]} />
      </TouchableWithoutFeedback>

      <View style={styles.forgotSheetWrap} pointerEvents="box-none">
        <RNAnimated.View style={[styles.forgotSheet, { transform: [{ translateY: combinedY }] }]}>
          <View style={styles.handleBar} />

          <View style={styles.forgotHeaderRow}>
            <View>
              <Text style={styles.formTitle}>Reset Password</Text>
              <Text style={styles.formSub}>We'll send a link to your inbox</Text>
            </View>
            <TouchableOpacity onPress={closeSheet} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="xmark" size={18} color="rgba(255,255,255,0.5)" />
            </TouchableOpacity>
          </View>

          <View style={[styles.dividerLine, { marginBottom: 20 }]} />

          <View style={styles.forgotIconStrip}>
            <LinearGradient colors={['rgba(0,201,167,0.18)', 'rgba(0,201,167,0.06)']} style={styles.forgotIconBg}>
              <Ionicons name="envelope" size={22} color="#00C9A7" />
            </LinearGradient>
            <Text style={styles.forgotHint}>
              Enter the email associated with your account and we'll send you a reset link.
            </Text>
          </View>

          <Animated.View style={[styles.inputWrapper, inputBorderStyle, { marginBottom: 20 }]}>
            <TextInput
              placeholder="Enter your email address"
              value={resetEmail} onChangeText={setResetEmail}
              onFocus={() => (borderAnim.value = withTiming(1, { duration: 200 }))}
              onBlur={()  => (borderAnim.value = withTiming(0, { duration: 200 }))}
              autoCapitalize="none" keyboardType="email-address"
              placeholderTextColor="rgba(255,255,255,0.35)"
              style={styles.inputText} autoFocus
            />
          </Animated.View>

          <Animated.View style={pressStyle}>
            <TouchableOpacity
              onPress={handleReset}
              onPressIn={() => { press.value = withTiming(0.96, { duration: 100 }); }}
              onPressOut={() => { press.value = withSequence(withSpring(1.04), withSpring(1)); }}
              disabled={loading} activeOpacity={0.9}
            >
              <LinearGradient colors={['#00C9A7', '#00897B', '#00695C']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.loginButton}>
                <View style={StyleSheet.absoluteFill} pointerEvents="none" overflow="hidden">
                  <Animated.View style={[shimmerStyle, {
                    width: 80, height: '100%',
                    backgroundColor: 'rgba(255,255,255,0.18)',
                    transform: [{ skewX: '-20deg' }],
                  }]} />
                </View>
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.loginButtonText}>Send Reset Link</Text>
                    <Ionicons name="paper-plane" style={{ marginLeft: 10, top: 1 }} size={16} color="#fff" />
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>

          <TouchableOpacity onPress={closeSheet} style={styles.backToLoginBtn} activeOpacity={0.7}>
            <Ionicons name="arrow-left" size={12} color="#00C9A7" style={{ marginRight: 6, top: 1 }} />
            <Text style={styles.backToLoginText}>Back to Sign In</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    </Modal>
  );
};

// ─── Login Screen ─────────────────────────────────────────────────────────────
const LoginScreen = (props) => {
  const [email,         setEmail]         = useState('');
  const [password,      setPassword]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const { showModal, modalProps } = useAppModal();

  // ── Keyboard lift for the login form sheet ──
  // Always active since the sheet is always mounted on this screen
  const loginKeyboardY = useKeyboardLift(true);

  const float  = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }), -1, true
    );
    rotate.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }), -1, false
    );
  }, []);

  const floatStyle        = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(float.value, [0, 1], [0, -16]) }],
  }));
  const ringRotate        = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 360}deg` }],
  }));
  const ringRotateReverse = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotate.value * 360}deg` }],
  }));

  const press      = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const handlePressIn  = () => { press.value = withTiming(0.96, { duration: 100 }); };
  const handlePressOut = () => { press.value = withSequence(withSpring(1.04), withSpring(1)); };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showModal({ type: 'warning', title: 'Missing Fields', message: 'Please enter email and password.' });
      return;
    }
    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
      showModal({ type: 'success', title: 'Welcome Back!', message: 'Syncing your latest data now.' });
    } catch (error) {
      showModal({ type: 'error', title: 'Login Failed', message: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <LinearGradient colors={['#050D1A', '#071828', '#0A2535', '#062520']}
        locations={[0, 0.35, 0.7, 1]} style={StyleSheet.absoluteFill} />

      <View style={[styles.glow, { top: height * 0.05,  left: -60,         backgroundColor: '#00695C', width: 260, height: 260, opacity: 0.18 }]} />
      <View style={[styles.glow, { top: height * 0.18,  right: -80,        backgroundColor: '#1565C0', width: 220, height: 220, opacity: 0.14 }]} />
      <View style={[styles.glow, { top: height * 0.35,  left: width * 0.3, backgroundColor: '#00897B', width: 160, height: 160, opacity: 0.1  }]} />

      <FloatingOrb size={14} color="#00C9A7" delay={0}    startX={width * 0.1}  startY={height * 0.08} />
      <FloatingOrb size={8}  color="#80CBC4" delay={400}  startX={width * 0.8}  startY={height * 0.14} />
      <FloatingOrb size={18} color="#1DE9B6" delay={800}  startX={width * 0.65} startY={height * 0.25} />
      <FloatingOrb size={10} color="#00BFA5" delay={1200} startX={width * 0.2}  startY={height * 0.3}  />
      <FloatingOrb size={6}  color="#B2DFDB" delay={600}  startX={width * 0.5}  startY={height * 0.06} />

      {/* ── Hero ── */}
      <View style={styles.heroSection}>
        <Animated.View style={[styles.ring, styles.ringOuter, ringRotate]} />
        <Animated.View style={[styles.ring, styles.ringInner, ringRotateReverse]} />
        <Animated.View style={[styles.lottieWrap, floatStyle]}>
          <LottieView source={require('../../assets/lottie/coin.json')} autoPlay loop style={styles.heroLottie} />
        </Animated.View>
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.titleBlock}>
          <Text style={styles.appTag}>EXPENSE TRACKER</Text>
          <Text style={styles.heroTitle}>Smart Money,{'\n'}Smarter You.</Text>
          <Text style={styles.heroSub}>Track. Analyse. Grow.</Text>
        </Animated.View>
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.pillRow}>
          {[
            { label: 'Saved',  value: '₹1.2L', color: '#00C9A7' },
            { label: 'Budget', value: '92%',   color: '#FFB74D' },
            { label: 'Streak', value: '14d',   color: '#80CBC4' },
          ].map((p) => (
            <LinearGradient key={p.label}
              colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']} style={styles.pill}>
              <Text style={[styles.pillValue, { color: p.color }]}>{p.value}</Text>
              <Text style={styles.pillLabel}>{p.label}</Text>
            </LinearGradient>
          ))}
        </Animated.View>
      </View>

      {/* ── Login form sheet — lifted by keyboard ── */}
      <RNAnimated.View
        style={[styles.formSheetWrap, { transform: [{ translateY: loginKeyboardY }] }]}
      >
        <Animated.View entering={FadeInUp.delay(100).springify().damping(18)} style={styles.formSheet}>
          <View style={styles.handleBar} />
          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSub}>Welcome back, let's get started</Text>

          <AnimatedInput placeholder="Email address" value={email}
            onChangeText={setEmail} keyboardType="email-address" />
          <AnimatedInput placeholder="Password" value={password}
            onChangeText={setPassword} secureTextEntry />

          <TouchableOpacity style={styles.forgotWrap}
            onPress={() => setForgotVisible(true)} activeOpacity={0.7}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <ShimmerButton onPress={handleLogin} onPressIn={handlePressIn}
            onPressOut={handlePressOut} loading={loading} pressStyle={pressStyle}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.loginButtonText}>Continue</Text>
              <Ionicons name="angles-right" style={{ marginLeft: 10, top: 2 }} size={20} color="#fff" />
            </View>
          </ShimmerButton>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity onPress={() => props?.navigation?.navigate('Register')} style={styles.registerBtn}>
            <Text style={styles.registerText}>
              New here?{' '}<Text style={styles.registerLink}>Create Account</Text>
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </RNAnimated.View>

      <ForgotPasswordSheet visible={forgotVisible}
        onClose={() => setForgotVisible(false)} showModal={showModal} />

      <AppPromptModal {...modalProps} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050D1A' },
  glow: { position: 'absolute', borderRadius: 999 },

  heroSection: { height: height * 0.58, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ring:        { position: 'absolute', borderRadius: 999, borderStyle: 'dashed' },
  ringOuter:   { width: 220, height: 220, borderWidth: 1, borderColor: 'rgba(0,201,167,0.2)'  },
  ringInner:   { width: 160, height: 160, borderWidth: 1, borderColor: 'rgba(0,201,167,0.12)' },
  lottieWrap:  { marginBottom: 0 },
  heroLottie:  { width: 130, height: 130 },

  titleBlock: { alignItems: 'center', marginTop: 18 },
  appTag: {
    fontSize: RFValue(9), letterSpacing: 4, color: '#00C9A7', fontWeight: '700', marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  heroTitle: {
    fontSize: RFValue(28), fontWeight: '800', color: '#FFFFFF',
    textAlign: 'center', lineHeight: RFValue(34), letterSpacing: -0.5,
  },
  heroSub: { fontSize: RFValue(12), color: 'rgba(255,255,255,0.4)', marginTop: 6, letterSpacing: 1.5, textTransform: 'uppercase' },

  pillRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  pillValue: { fontSize: RFValue(15), fontWeight: '800' },
  pillLabel: { fontSize: RFValue(9), color: 'rgba(255,255,255,0.4)', marginTop: 2, letterSpacing: 0.8 },

  formSheetWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  formSheet: {
    backgroundColor: '#0D1F2D', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderBottomWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.5, shadowRadius: 24, elevation: 20,
  },
  handleBar: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', marginBottom: 20 },
  formTitle: { fontSize: RFValue(22), fontWeight: '800', color: '#FFFFFF', marginBottom: 4 },
  formSub:   { fontSize: RFValue(12), color: 'rgba(255,255,255,0.4)', marginBottom: 20 },

  inputWrapper: {
    height: 54, borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 18, justifyContent: 'center', marginBottom: 14,
  },
  inputText: { color: '#FFFFFF', fontSize: RFValue(14) },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: RFValue(12), color: '#00C9A7', fontWeight: '600' },

  loginButton: { height: 54, borderRadius: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 20 },
  loginButtonText: { color: '#fff', fontSize: RFValue(15), fontWeight: '800', letterSpacing: 0.5 },

  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: 'rgba(255,255,255,0.25)', fontSize: RFValue(12) },

  registerBtn: { alignItems: 'center' },
  registerText: { fontSize: RFValue(13), color: 'rgba(255,255,255,0.4)', paddingBottom: 10 },
  registerLink: { color: '#00C9A7', fontWeight: '800' },

  // ── Forgot sheet ──
  backdropOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.65)' },
  forgotSheetWrap: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  forgotSheet: {
    backgroundColor: '#0D1F2D', borderTopLeftRadius: 32, borderTopRightRadius: 32,
    paddingHorizontal: 24, paddingTop: 16, paddingBottom: Platform.OS === 'ios' ? 44 : 32,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.07)', borderBottomWidth: 0,
    shadowColor: '#000', shadowOffset: { width: 0, height: -8 }, shadowOpacity: 0.6, shadowRadius: 28, elevation: 24,
  },
  forgotHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  forgotIconStrip: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, marginBottom: 20,
    backgroundColor: 'rgba(0,201,167,0.05)', borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: 'rgba(0,201,167,0.12)',
  },
  forgotIconBg: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  forgotHint:   { flex: 1, fontSize: RFValue(11.5), color: 'rgba(255,255,255,0.45)', lineHeight: RFValue(17) },
  backToLoginBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  backToLoginText: { fontSize: RFValue(13), color: '#00C9A7', fontWeight: '700' },
});

export default LoginScreen;