import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import LottieView from 'lottie-react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

const TYPE_META = {
  success: {
    color: '#2E7D32',
    bg: '#E8F5E9',
    icon: 'checkmark-circle',
  },
  error: {
    color: '#C62828',
    bg: '#FFEBEE',
    icon: 'close-circle',
  },
  warning: {
    color: '#EF6C00',
    bg: '#FFF3E0',
    icon: 'warning',
  },
  info: {
    color: '#1565C0',
    bg: '#E3F2FD',
    icon: 'information-circle',
  },
};

const AppPromptModal = ({
  visible,
  type = 'info',
  title,
  message,
  buttons = [{ text: 'OK', style: 'primary' }],
  onClose,
}) => {
  const meta = TYPE_META[type] || TYPE_META.info;
  const safeButtons = buttons.length ? buttons : [{ text: 'OK', style: 'primary' }];

  const handlePress = (button) => {
    onClose?.();
    if (button?.onPress) {
      setTimeout(() => {
        button.onPress();
      }, 120);
    }
  };

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(180)} style={styles.overlay}>
        <Animated.View entering={FadeInDown.duration(240)} style={styles.card}>
          <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
            <LottieView
              source={require('../assets/lottie/sparkle-pulse.json')}
              autoPlay
              loop
              style={styles.iconLottie}
            />
            <Ionicons name={meta.icon} size={30} color={meta.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}

          <View style={styles.buttonRow}>
            {safeButtons.map((button, index) => {
              const kind = button.style || (index === safeButtons.length - 1 ? 'primary' : 'secondary');
              const primary = kind === 'primary';
              const danger = kind === 'danger';

              return (
                <TouchableOpacity
                  key={`${button.text}-${index}`}
                  style={[
                    styles.button,
                    primary && { backgroundColor: meta.color, borderColor: meta.color },
                    danger && { backgroundColor: '#C62828', borderColor: '#C62828' },
                    !primary && !danger && styles.buttonSecondary,
                  ]}
                  onPress={() => handlePress(button)}
                  activeOpacity={0.85}
                >
                  <Text
                    style={[
                      styles.buttonText,
                      primary && styles.buttonTextPrimary,
                      danger && styles.buttonTextPrimary,
                    ]}
                  >
                    {button.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconLottie: {
    position: 'absolute',
    width: 76,
    height: 76,
    opacity: 0.75,
  },
  title: {
    textAlign: 'center',
    fontSize: 19,
    fontWeight: '800',
    color: '#1F2933',
  },
  message: {
    textAlign: 'center',
    marginTop: 8,
    color: '#52606D',
    fontSize: 14,
    lineHeight: 20,
  },
  buttonRow: {
    marginTop: 18,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  button: {
    minWidth: 96,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    marginLeft: 10,
  },
  buttonSecondary: {
    backgroundColor: '#F6F7F9',
    borderColor: '#E4E7EB',
  },
  buttonText: {
    color: '#334E68',
    fontWeight: '700',
    fontSize: 14,
  },
  buttonTextPrimary: {
    color: '#fff',
  },
});

export default AppPromptModal;
