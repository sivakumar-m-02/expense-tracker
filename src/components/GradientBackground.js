import React from 'react';
import { View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { COLORS } from '../theme/AppTheme';

export default function GradientBackground({ children }) {
  return (
    <LinearGradient
      colors={[COLORS.bgTop, COLORS.bgBottom]}
      style={styles.container}
    >
      {/* Floating blobs */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  circle1: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 200,
    backgroundColor: 'rgba(0,255,200,0.08)',
    top: -50,
    left: -50,
  },
  circle2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 200,
    backgroundColor: 'rgba(0,200,255,0.08)',
    bottom: -40,
    right: -40,
  },
});