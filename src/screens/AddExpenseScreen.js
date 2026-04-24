import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Dimensions, StatusBar } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import LottieView from 'lottie-react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, {
  Easing, FadeInUp, Layout,
  useAnimatedStyle, useSharedValue, withTiming,
} from 'react-native-reanimated';
import CashOutForm from './CashOutForm';
import CashInForm from './CashInForm';
import InteractiveCard from '../components/InteractiveCard';
import AppPromptModal from '../components/AppPromptModal';
import useAppModal from '../hooks/useAppModal';

const initialLayout = { width: Dimensions.get('window').width };

const AddExpenseScreen = (screenProps) => {
  const [index, setIndex] = useState(0);
  const [routes] = useState([
    { key: 'cashOut', title: 'Cash Out' },
    { key: 'cashIn',  title: 'Cash In'  },
  ]);
  const { showModal, modalProps } = useAppModal();

  const initialTab = screenProps.route?.params?.initialTab || 0;
  const tabWidth = initialLayout.width / routes.length;
  const indicatorX = useSharedValue(initialTab * tabWidth);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: indicatorX.value }],
  }));

  const addBreakfastExpense = async () => {
    try {
      const user = auth().currentUser;
      if (!user) { showModal({ type: 'error', title: 'Error', message: 'You must be logged in to add expenses.' }); return; }
      const now = new Date();
      await firestore().collection('users').doc(user.uid).collection('expenses').add({
        amount: 40, category: 'Food', subcategory: 'Breakfast',
        note: 'Auto-added breakfast expense', date: now, createdAt: now,
      });
      showModal({ type: 'success', title: 'Success', message: 'Breakfast expense (\u20B940) added successfully!' });
    } catch (error) {
      console.log('Error adding breakfast expense:', error);
      showModal({ type: 'error', title: 'Error', message: 'Failed to add breakfast expense.' });
    }
  };

  const checkBreakfastReminder = async () => {
    try {
      const now = new Date();
      const day = now.getDay(); const hour = now.getHours(); const minute = now.getMinutes();
      const isTuesdayToFriday = day >= 2 && day <= 5;
      const isMorningTime = (hour === 8 || hour === 9) || (hour === 10 && minute === 0);
      if (isTuesdayToFriday && isMorningTime) {
        const dateString = now.toISOString().split('T')[0];
        const storageKey = `breakfast_reminder_dismissed_${dateString}`;
        const dismissed = await AsyncStorage.getItem(storageKey);
        if (!dismissed) {
          showModal({
            type: 'warning', title: 'Breakfast Reminder', message: 'Can I add \u20B940 for Breakfast?',
            buttons: [
              { text: 'Cancel', style: 'secondary', onPress: async () => { await AsyncStorage.setItem(storageKey, 'true'); } },
              { text: 'Add', style: 'primary', onPress: async () => { await addBreakfastExpense(); await AsyncStorage.setItem(storageKey, 'true'); } },
            ],
          });
        }
      }
    } catch (error) { console.log('Error checking breakfast reminder:', error); }
  };

  useEffect(() => { setIndex(initialTab === 1 ? 1 : 0); }, [initialTab]);
  useEffect(() => { checkBreakfastReminder(); }, []);
  useEffect(() => {
    indicatorX.value = withTiming(index * tabWidth, { duration: 260, easing: Easing.out(Easing.cubic) });
  }, [index, tabWidth, indicatorX]);

  const renderScene = SceneMap({ cashOut: CashOutForm, cashIn: CashInForm });

  return (
    <>
      <View style={styles.root}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        <LinearGradient colors={['#050D1A', '#071828', '#0A2535']} style={StyleSheet.absoluteFill} />

        <SafeAreaView style={styles.safeArea} edges={['top', 'right', 'left']}>
          <Animated.View entering={FadeInUp.duration(260)} style={styles.tabViewWrap}>
            <TabView
              navigationState={{ index, routes }}
              renderScene={renderScene}
              onIndexChange={setIndex}
              swipeEnabled={false}
              initialLayout={initialLayout}
              renderTabBar={(tabBarProps) => {
                const { index: activeIndex, routes: tabRoutes } = tabBarProps.navigationState;
                return (
                  <View style={styles.tabBarOuter}>
                    <LinearGradient colors={['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.03)']} style={styles.tabBarContainer}>
                      {/* Sliding indicator */}
                      <Animated.View style={[styles.tabIndicator, { width: tabWidth }, indicatorStyle]}>
                        <LinearGradient
                          colors={activeIndex === 0 ? ['#FF6B6B', '#E53935'] : ['#1DE9B6', '#00897B']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={StyleSheet.absoluteFill}
                        />
                      </Animated.View>

                      {tabRoutes.map((route, i) => {
                        const isActive = activeIndex === i;
                        const activeColor = route.title === 'Cash In' ? '#1DE9B6' : '#FF6B6B';
                        return (
                          <InteractiveCard
                            key={route.key}
                            onPress={() => tabBarProps.jumpTo(route.key)}
                            style={styles.tabBtn}
                            pressScale={0.96}
                          >
                            <View style={styles.tabInner}>
                              {isActive ? (
                                <LottieView
                                  source={require('../assets/lottie/sparkle-pulse.json')}
                                  autoPlay loop
                                  style={styles.tabSparkle}
                                />
                              ) : null}
                              <Text style={isActive ? [styles.activeTabLabel, { color: '#fff' }] : styles.tabLabel}>
                                {route.title}
                              </Text>
                            </View>
                          </InteractiveCard>
                        );
                      })}
                    </LinearGradient>
                  </View>
                );
              }}
            />
          </Animated.View>
        </SafeAreaView>
      </View>
      <AppPromptModal {...modalProps} />
    </>
  );
};

export default AddExpenseScreen;

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#050D1A' },
  safeArea: { flex: 1 },
  tabViewWrap: { flex: 1 },

  tabBarOuter: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  tabBarContainer: {
    flexDirection: 'row', height: 56, position: 'relative',
    borderRadius: 18, overflow: 'hidden',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  tabIndicator: {
    position: 'absolute', top: 0, bottom: 0,
    borderRadius: 16, overflow: 'hidden',
  },
  tabBtn: {
    width: Dimensions.get('window').width / 2 - 16,
    height: 56, alignItems: 'center', justifyContent: 'center',
  },
  tabInner: { alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' },
  tabSparkle: { width: 24, height: 24, position: 'absolute', top: 3, opacity: 0.8 },
  tabLabel: { fontSize: 15, fontWeight: '700', color: 'rgba(255,255,255,0.35)' },
  activeTabLabel: { fontSize: 15, fontWeight: '800' },
});
