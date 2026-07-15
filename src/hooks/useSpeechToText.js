import { useEffect, useRef, useState, useCallback } from 'react';
import { Platform } from 'react-native';
import SpeechRecognizer, { requestMicPermission } from '../services/SpeechRecognizer';

export const useSpeechToText = ({ onResult, onPartialResult, onError } = {}) => {
  const [listening, setListening] = useState(false);
  const [starting, setStarting] = useState(false); // brief gap between tap and mic actually opening
  const busyRef = useRef(false); // blocks double-taps from stacking start calls

  const onResultRef = useRef(onResult);
  const onPartialResultRef = useRef(onPartialResult);
  const onErrorRef = useRef(onError);

  useEffect(() => { onResultRef.current = onResult; }, [onResult]);
  useEffect(() => { onPartialResultRef.current = onPartialResult; }, [onPartialResult]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    const subscriptions = [
      SpeechRecognizer.addSpeechListener('onSpeechStart', () => {
        setStarting(false);
        setListening(true);
      }),
      SpeechRecognizer.addSpeechListener('onSpeechEnd', () => {
        setListening(false);
      }),
      SpeechRecognizer.addSpeechListener('onSpeechPartialResults', (e) => {
        const text = e?.value?.[0];
        if (text) onPartialResultRef.current?.(text);
      }),
      SpeechRecognizer.addSpeechListener('onSpeechResults', (e) => {
        busyRef.current = false;
        setStarting(false);
        setListening(false);
        const text = e?.value?.[0];
        if (text) onResultRef.current?.(text);
      }),
      SpeechRecognizer.addSpeechListener('onSpeechError', (e) => {
        // Native side already retried internally for language/disconnect/busy issues —
        // this only fires once it's genuinely given up.
        busyRef.current = false;
        setStarting(false);
        setListening(false);
        onErrorRef.current?.(e);
      }),
    ];

    return () => {
      subscriptions.forEach((l) => l.remove());
      SpeechRecognizer.destroyRecognizer();
      busyRef.current = false;
    };
  }, []);

  const start = useCallback(async (locale) => {
    if (Platform.OS !== 'android') return;
    if (busyRef.current) return; // ignore rapid re-taps
    busyRef.current = true;
    setStarting(true);

    const granted = await requestMicPermission();
    if (!granted) {
      busyRef.current = false;
      setStarting(false);
      onErrorRef.current?.({ code: -1, message: 'Microphone permission denied' });
      return;
    }
    SpeechRecognizer.startListening(locale);
  }, []);

  const stop = useCallback(() => {
    SpeechRecognizer.stopListening();
  }, []);

  return { listening, starting, start, stop };
};