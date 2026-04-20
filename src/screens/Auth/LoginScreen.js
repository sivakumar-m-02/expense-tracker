import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import auth from '@react-native-firebase/auth';
import { RFValue } from 'react-native-responsive-fontsize';
import LottieView from 'lottie-react-native';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import InteractiveCard from '../../components/InteractiveCard';
import AppPromptModal from '../../components/AppPromptModal';
import useAppModal from '../../hooks/useAppModal';

const LoginScreen = (props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showModal, modalProps } = useAppModal();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 900, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 900, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showModal({
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please enter email and password.',
      });
      return;
    }

    setLoading(true);
    try {
      await auth().signInWithEmailAndPassword(email.trim(), password);
      showModal({
        type: 'success',
        title: 'Login Successful',
        message: 'Welcome back. Syncing your latest data now.',
      });
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Login Failed',
        message: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View entering={FadeInUp.duration(350)} style={styles.heroWrap}>
        <Animated.View style={[styles.heroOrb, pulseStyle]} />
        <LottieView
          source={require('../../assets/lottie/finance-loader.json')}
          autoPlay
          loop
          style={styles.heroLottie}
        />
        <Text style={styles.title}>Expense Tracker</Text>
        <Text style={styles.subtitle}>Sign in to continue</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(360).delay(80)} style={styles.formCard}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholderTextColor="#9b9b9b"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor="#9b9b9b"
          />
        </View>

        <InteractiveCard
          style={[styles.loginButton, loading && styles.loginButtonDisabled]}
          onPress={handleLogin}
          enabled={!loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.loginButtonText}>Login</Text>
          )}
        </InteractiveCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(360).delay(120)}>
        <TouchableOpacity onPress={() => props?.navigation?.navigate('Register')}>
          <Text style={styles.registerText}>
            Don&apos;t have an account? <Text style={styles.registerLink}>Register</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <AppPromptModal {...modalProps} />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f3f5f7',
  },
  heroWrap: {
    alignItems: 'center',
    marginBottom: 14,
  },
  heroOrb: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(55, 71, 79, 0.08)',
    top: -18,
  },
  heroLottie: { width: 120, height: 120 },
  title: {
    fontSize: RFValue(32),
    fontWeight: '800',
    color: '#37474F',
    marginBottom: 6,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: RFValue(14),
    color: '#555',
    marginBottom: 16,
    textAlign: 'center',
  },
  formCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 8,
  },
  input: {
    height: 52,
    borderColor: '#D0D7DC',
    borderWidth: 1,
    borderRadius: 12,
    marginBottom: 16,
    paddingHorizontal: 16,
    backgroundColor: '#FCFCFC',
    fontSize: RFValue(15),
    color: '#333',
  },
  loginButton: {
    backgroundColor: '#37474F',
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 2,
    elevation: 2,
    alignItems: 'center',
  },
  loginButtonDisabled: { opacity: 0.75 },
  loginButtonText: {
    color: '#fff',
    fontSize: RFValue(16),
    fontWeight: '800',
    textAlign: 'center',
  },
  registerText: {
    fontSize: RFValue(14),
    color: '#555',
    textAlign: 'center',
  },
  registerLink: {
    color: '#37474F',
    fontWeight: '800',
  },
});

export default LoginScreen;
