import { NativeModules, NativeEventEmitter, Platform, PermissionsAndroid } from 'react-native';

const { RNSpeechRecognizer } = NativeModules;

const speechEvents =
  Platform.OS === 'android' && RNSpeechRecognizer
    ? new NativeEventEmitter(RNSpeechRecognizer)
    : null;

export const requestMicPermission = async () => {
  if (Platform.OS !== 'android') return false;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: 'Microphone Permission',
      message: 'Allow microphone access to add expenses by voice.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    }
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export const isSpeechAvailable = () =>
  new Promise((resolve) => {
    if (!RNSpeechRecognizer) return resolve(false);
    RNSpeechRecognizer.isAvailable().then(resolve).catch(() => resolve(false));
  });

// Was: export const startListening = (locale = 'en-IN') => RNSpeechRecognizer?.startListening(locale);
export const startListening = (locale) => RNSpeechRecognizer?.startListening(locale ?? null);
export const stopListening = () => RNSpeechRecognizer?.stopListening();
export const destroyRecognizer = () => RNSpeechRecognizer?.destroyRecognizer();

export const addSpeechListener = (event, callback) => {
  if (!speechEvents) return { remove: () => {} };
  return speechEvents.addListener(event, callback);
};

export default {
  requestMicPermission,
  isSpeechAvailable,
  startListening,
  stopListening,
  destroyRecognizer,
  addSpeechListener,
};