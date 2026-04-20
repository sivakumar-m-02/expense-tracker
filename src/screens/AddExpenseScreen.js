import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import LottieView from 'lottie-react-native';
import Animated, {
  Easing,
  FadeInUp,
  Layout,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
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
    { key: 'cashIn', title: 'Cash In' },
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

      if (!user) {
        showModal({
          type: 'error',
          title: 'Error',
          message: 'You must be logged in to add expenses.',
        });
        return;
      }

      const now = new Date();

      await firestore()
        .collection('users')
        .doc(user.uid)
        .collection('expenses')
        .add({
          amount: 40,
          category: 'Food',
          subcategory: 'Breakfast',
          note: 'Auto-added breakfast expense',
          date: now,
          createdAt: now,
        });

      showModal({
        type: 'success',
        title: 'Success',
        message: 'Breakfast expense (\u20B940) added successfully!',
      });
    } catch (error) {
      console.log('Error adding breakfast expense:', error);
      showModal({
        type: 'error',
        title: 'Error',
        message: 'Failed to add breakfast expense. Please try again.',
      });
    }
  };

  const checkBreakfastReminder = async () => {
    try {
      const now = new Date();
      const day = now.getDay();
      const hour = now.getHours();
      const minute = now.getMinutes();

      const isTuesdayToFriday = day >= 2 && day <= 5;
      const isMorningTime = (hour === 8 || hour === 9) || (hour === 10 && minute === 0);

      if (isTuesdayToFriday && isMorningTime) {
        const dateString = now.toISOString().split('T')[0];
        const storageKey = `breakfast_reminder_dismissed_${dateString}`;
        const dismissed = await AsyncStorage.getItem(storageKey);

        if (!dismissed) {
          showModal({
            type: 'warning',
            title: 'Breakfast Reminder',
            message: 'Can I add \u20B940 for Breakfast?',
            buttons: [
              {
                text: 'Cancel',
                style: 'secondary',
                onPress: async () => {
                  await AsyncStorage.setItem(storageKey, 'true');
                },
              },
              {
                text: 'Add',
                style: 'primary',
                onPress: async () => {
                  await addBreakfastExpense();
                  await AsyncStorage.setItem(storageKey, 'true');
                },
              },
            ],
          });
        }
      }
    } catch (error) {
      console.log('Error checking breakfast reminder:', error);
    }
  };

  useEffect(() => {
    setIndex(initialTab === 1 ? 1 : 0);
  }, [initialTab]);

  useEffect(() => {
    checkBreakfastReminder();
  }, []);

  useEffect(() => {
    indicatorX.value = withTiming(index * tabWidth, {
      duration: 260,
      easing: Easing.out(Easing.cubic),
    });
  }, [index, tabWidth, indicatorX]);

  const renderScene = SceneMap({
    cashOut: CashOutForm,
    cashIn: CashInForm,
  });

  return (
    <>
      <SafeAreaView style={styles.safeArea} edges={["top", "right", "left"]}>
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
                <Animated.View layout={Layout.springify().damping(16)} style={styles.tabBarContainer}>
                  <Animated.View style={[styles.tabIndicator, { width: tabWidth }, indicatorStyle]} />
                  {tabRoutes.map((route, i) => {
                    const isActive = activeIndex === i;
                    const activeColor = route.title === 'Cash In' ? '#388E3C' : '#ff3333';

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
                              autoPlay
                              loop
                              style={styles.tabSparkle}
                            />
                          ) : null}
                          <Text
                            style={
                              isActive
                                ? [styles.activeTabLabel, { color: activeColor }]
                                : [styles.tabLabel]
                            }
                          >
                            {route.title}
                          </Text>
                        </View>
                      </InteractiveCard>
                    );
                  })}
                </Animated.View>
              );
            }}
          />
        </Animated.View>
      </SafeAreaView>

      <AppPromptModal {...modalProps} />
    </>
  );
};

export default AddExpenseScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FAFAFA' },
  tabViewWrap: { flex: 1 },
  tabBarContainer: {
    backgroundColor: '#EBEBED',
    flexDirection: 'row',
    height: 56,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    height: 3,
    borderRadius: 999,
    backgroundColor: '#37474F',
  },
  tabBtn: {
    width: Dimensions.get('window').width / 2,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  tabSparkle: {
    width: 24,
    height: 24,
    position: 'absolute',
    top: 3,
    opacity: 0.8,
  },
  tabLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#999',
  },
  activeTabLabel: {
    fontSize: 16,
    fontWeight: '800',
    color: '#37474F',
  },
});
