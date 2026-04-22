import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import GradientBackground from './GradientBackground';

export default function ScreenWrapper({ children }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <GradientBackground>
      <Animated.View style={{ flex: 1, opacity: fade }}>
        {children}
      </Animated.View>
    </GradientBackground>
  );
}