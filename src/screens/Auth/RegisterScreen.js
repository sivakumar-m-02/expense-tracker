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

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showModal, modalProps } = useAppModal();
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 850, easing: Easing.out(Easing.cubic) }),
        withTiming(1, { duration: 850, easing: Easing.inOut(Easing.cubic) })
      ),
      -1,
      false
    );
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      showModal({
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please fill name, email and password.',
      });
      return;
    }

    setLoading(true);
    try {
      const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
      await userCredential.user.updateProfile({ displayName: name.trim() });

      showModal({
        type: 'success',
        title: 'Registration Successful',
        message: 'Your account is ready. Continue to login.',
        buttons: [{ text: 'Go to Login', style: 'primary', onPress: () => navigation.navigate('Login') }],
      });
    } catch (error) {
      showModal({
        type: 'error',
        title: 'Registration Failed',
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
          source={require('../../assets/lottie/sparkle-pulse.json')}
          autoPlay
          loop
          style={styles.heroLottie}
        />
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Sign up to start tracking your expenses</Text>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(380).delay(70)} style={styles.formCard}>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            placeholderTextColor="#9b9b9b"
          />
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
          style={[styles.registerButton, loading && styles.registerButtonDisabled]}
          onPress={handleRegister}
          enabled={!loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.registerButtonText}>Register</Text>
          )}
        </InteractiveCard>
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(360).delay(120)}>
        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginLink}>Login</Text>
          </Text>
        </TouchableOpacity>
      </Animated.View>

      <AppPromptModal {...modalProps} />
    </KeyboardAvoidingView>
  );
}

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
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(55, 71, 79, 0.08)',
    top: -14,
  },
  heroLottie: { width: 110, height: 110 },
  title: {
    fontSize: RFValue(28),
    fontWeight: '800',
    color: '#37474F',
    marginBottom: 7,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: RFValue(14),
    color: '#555',
    marginBottom: 14,
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
    marginBottom: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FCFCFC',
    fontSize: RFValue(15),
    color: '#333',
  },
  registerButton: {
    backgroundColor: '#37474F',
    paddingVertical: 13,
    borderRadius: 14,
    marginBottom: 2,
    elevation: 2,
    alignItems: 'center',
  },
  registerButtonDisabled: { opacity: 0.75 },
  registerButtonText: {
    color: '#fff',
    fontSize: RFValue(16),
    fontWeight: '800',
    textAlign: 'center',
  },
  loginText: {
    fontSize: RFValue(14),
    color: '#555',
    textAlign: 'center',
  },
  loginLink: {
    color: '#37474F',
    fontWeight: '800',
  },
});
