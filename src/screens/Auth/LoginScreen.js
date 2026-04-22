import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StatusBar,
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
import InteractiveCard from '../../components/InteractiveCard';
import AppPromptModal from '../../components/AppPromptModal';
import Ionicons from 'react-native-vector-icons/FontAwesome6';
import useAppModal from '../../hooks/useAppModal';

const { width, height } = Dimensions.get('window');

// ─── Floating Orb Component ──────────────────────────────────────────────────
const FloatingOrb = ({ size, color, delay, startX, startY }) => {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0.6);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withTiming(-20, { duration: 2800 + delay * 0.3, easing: Easing.inOut(Easing.sin) }),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withTiming(0.2, { duration: 2200, easing: Easing.inOut(Easing.quad) }),
        -1,
        true
      )
    );
  }, []);

  const orbStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        orbStyle,
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          left: startX,
          top: startY,
        },
      ]}
    />
  );
};

// ─── Shimmer Button ───────────────────────────────────────────────────────────
const ShimmerButton = ({ onPress, onPressIn, onPressOut, loading, children, pressStyle }) => {
  const shimmer = useSharedValue(-1);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(shimmer.value, [-1, 1], [-width, width]) }],
  }));

  return (
    <Animated.View style={[pressStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={loading}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={['#00C9A7', '#00897B', '#00695C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.loginButton}
        >
          {/* Shimmer overlay */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none" overflow="hidden">
            <Animated.View
              style={[
                shimmerStyle,
                {
                  width: 80,
                  height: '100%',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  transform: [{ skewX: '-20deg' }],
                },
              ]}
            />
          </View>

          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            children
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Animated Input ───────────────────────────────────────────────────────────
const AnimatedInput = ({ placeholder, value, onChangeText, secureTextEntry, keyboardType }) => {
  const borderAnim = useSharedValue(0);
  const labelAnim = useSharedValue(value ? 1 : 0);

  const containerStyle = useAnimatedStyle(() => ({
    borderColor: borderAnim.value === 1 ? '#00C9A7' : 'rgba(255,255,255,0.12)',
    shadowColor: '#00C9A7',
    shadowOpacity: borderAnim.value * 0.35,
    shadowRadius: 10,
    elevation: borderAnim.value - 1,
  }));

  return (
    <Animated.View style={[styles.inputWrapper, containerStyle]}>
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => (borderAnim.value = withTiming(1, { duration: 20 }))}
        onBlur={() => (borderAnim.value = withTiming(0, { duration: 20 }))}
        autoCapitalize="none"
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        placeholderTextColor="rgba(255,255,255,0.35)"
        style={styles.inputText}
      />
    </Animated.View>
  );
};

// ─── Main Screen ─────────────────────────────────────────────────────────────
const LoginScreen = (props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showModal, modalProps } = useAppModal();

  // Hero float
  const float = useSharedValue(0);
  const rotate = useSharedValue(0);

  useEffect(() => {
    float.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true
    );
    rotate.value = withRepeat(
      withTiming(1, { duration: 8000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(float.value, [0, 1], [0, -16]) },
    ],
  }));

  const ringRotate = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value * 360}deg` }],
  }));

  const ringRotateReverse = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-rotate.value * 360}deg` }],
  }));

  // Button
  const press = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.value }] }));
  const handlePressIn = () => { press.value = withTiming(0.96, { duration: 100 }); };
  const handlePressOut = () => {
    press.value = withSequence(withSpring(1.04), withSpring(1));
  };

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

      {/* ── Deep gradient background ── */}
      <LinearGradient
        colors={['#050D1A', '#071828', '#0A2535', '#062520']}
        locations={[0, 0.35, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Radial glow blobs ── */}
      <View style={[styles.glow, { top: height * 0.05, left: -60, backgroundColor: '#00695C', width: 260, height: 260, opacity: 0.18 }]} />
      <View style={[styles.glow, { top: height * 0.18, right: -80, backgroundColor: '#1565C0', width: 220, height: 220, opacity: 0.14 }]} />
      <View style={[styles.glow, { top: height * 0.35, left: width * 0.3, backgroundColor: '#00897B', width: 160, height: 160, opacity: 0.1 }]} />

      {/* ── Floating orbs ── */}
      <FloatingOrb size={14} color="#00C9A7" delay={0}    startX={width * 0.1} startY={height * 0.08} />
      <FloatingOrb size={8}  color="#80CBC4" delay={400}  startX={width * 0.8} startY={height * 0.14} />
      <FloatingOrb size={18} color="#1DE9B6" delay={800}  startX={width * 0.65}startY={height * 0.25} />
      <FloatingOrb size={10} color="#00BFA5" delay={1200} startX={width * 0.2} startY={height * 0.3} />
      <FloatingOrb size={6}  color="#B2DFDB" delay={600}  startX={width * 0.5} startY={height * 0.06} />

      {/* ─────────────── TOP HERO AREA (3/4 of screen) ─────────────── */}
      <View style={styles.heroSection}>

        {/* Outer spinning ring */}
        <Animated.View style={[styles.ring, styles.ringOuter, ringRotate]} />

        {/* Inner spinning ring (reverse) */}
        <Animated.View style={[styles.ring, styles.ringInner, ringRotateReverse]} />

        {/* Floating Lottie */}
        <Animated.View style={[styles.lottieWrap, floatStyle]}>
          <LottieView
            source={require('../../assets/lottie/coin.json')}
            autoPlay
            loop
            style={styles.heroLottie}
          />
        </Animated.View>

        {/* Title block */}
        <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.titleBlock}>
          <Text style={styles.appTag}>EXPENSE TRACKER</Text>
          <Text style={styles.heroTitle}>Smart Money,{'\n'}Smarter You.</Text>
          <Text style={styles.heroSub}>Track. Analyse. Grow.</Text>
        </Animated.View>

        {/* Floating stat pills */}
        <Animated.View entering={FadeInUp.delay(500).springify()} style={styles.pillRow}>
          {[
            { label: 'Saved',   value: '₹1.2L', color: '#00C9A7' },
            { label: 'Budget',  value: '92%',   color: '#FFB74D' },
            { label: 'Streak',  value: '14d',   color: '#80CBC4' },
          ].map((p) => (
            <LinearGradient
              key={p.label}
              colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']}
              style={styles.pill}
            >
              <Text style={[styles.pillValue, { color: p.color }]}>{p.value}</Text>
              <Text style={styles.pillLabel}>{p.label}</Text>
            </LinearGradient>
          ))}
        </Animated.View>

      </View>

      {/* ─────────────── BOTTOM FORM SHEET ─────────────── */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.formSheetWrap}
      >
        <Animated.View entering={FadeInUp.delay(100).springify().damping(18)} style={styles.formSheet}>

          {/* Handle bar */}
          <View style={styles.handleBar} />

          <Text style={styles.formTitle}>Sign In</Text>
          <Text style={styles.formSub}>Welcome back, let's get started</Text>

          {/* Inputs */}
          <AnimatedInput
            placeholder="Email address"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <AnimatedInput
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {/* Forgot password */}
          <TouchableOpacity style={styles.forgotWrap}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <ShimmerButton
            onPress={handleLogin}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            loading={loading}
            pressStyle={pressStyle}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.loginButtonText}>Continue</Text>
              <Ionicons name={'angles-right'} style={{marginLeft:10, top:2}} size={20} color={"#fff"} />
            </View>
          </ShimmerButton>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Register */}
          <TouchableOpacity
            onPress={() => props?.navigation?.navigate('Register')}
            style={styles.registerBtn}
          >
            <Text style={styles.registerText}>
              New here?{' '}
              <Text style={styles.registerLink}>Create Account</Text>
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </KeyboardAvoidingView>

      <AppPromptModal {...modalProps} />
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#050D1A',
  },

  // ── Glow blobs ──
  glow: {
    position: 'absolute',
    borderRadius: 999,
    filter: 'blur(60px)', // Note: use a blur library like @react-native-community/blur for real blur
  },

  // ── Hero section ──
  heroSection: {
    height: height * 0.58,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  // Spinning rings
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderStyle: 'dashed',
  },
  ringOuter: {
    width: 220,
    height: 220,
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.2)',
  },
  ringInner: {
    width: 160,
    height: 160,
    borderWidth: 1,
    borderColor: 'rgba(0,201,167,0.12)',
  },

  lottieWrap: {
    marginBottom: 0,
  },
  heroLottie: {
    width: 130,
    height: 130,
  },

  titleBlock: {
    alignItems: 'center',
    marginTop: 18,
  },
  appTag: {
    fontSize: RFValue(9),
    letterSpacing: 4,
    color: '#00C9A7',
    fontWeight: '700',
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
  },
  heroTitle: {
    fontSize: RFValue(28),
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: RFValue(34),
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: RFValue(12),
    color: 'rgba(255,255,255,0.4)',
    marginTop: 6,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // Stat pills
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 22,
  },
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  pillValue: {
    fontSize: RFValue(15),
    fontWeight: '800',
  },
  pillLabel: {
    fontSize: RFValue(9),
    color: 'rgba(255,255,255,0.4)',
    marginTop: 2,
    letterSpacing: 0.8,
  },

  // ── Form bottom sheet ──
  formSheetWrap: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  formSheet: {
    backgroundColor: '#0D1F2D',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: Platform.OS === 'ios' ? 40 : 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderBottomWidth: 0,
    // Glassmorphism-like shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 20,
  },
  handleBar: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginBottom: 20,
  },
  formTitle: {
    fontSize: RFValue(22),
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  formSub: {
    fontSize: RFValue(12),
    color: 'rgba(255,255,255,0.4)',
    marginBottom: 20,
  },

  // ── Input ──
  inputWrapper: {
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 18,
    justifyContent: 'center',
    marginBottom: 14,
  },
  inputText: {
    color: '#FFFFFF',
    fontSize: RFValue(14),
  },

  // ── Forgot ──
  forgotWrap: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -4,
  },
  forgotText: {
    fontSize: RFValue(12),
    color: '#00C9A7',
    fontWeight: '600',
  },

  // ── Login button ──
  loginButton: {
    height: 54,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: RFValue(15),
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // ── Divider ──
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  dividerText: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: RFValue(12),
  },

  // ── Register ──
  registerBtn: {
    alignItems: 'center',
  },
  registerText: {
    fontSize: RFValue(13),
    color: 'rgba(255,255,255,0.4)',
    paddingBottom:10
  },
  registerLink: {
    color: '#00C9A7',
    fontWeight: '800',
  },
});

export default LoginScreen;