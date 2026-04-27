import React, { useEffect, useState } from "react";
import { SafeAreaView, Platform, StatusBar, View, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import auth from "@react-native-firebase/auth";
import LinearGradient from "react-native-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import HomeScreen from "../screens/HomeScreen.js";
import AddExpenseScreen from "../screens/AddExpenseScreen.js";
import ProfileScreen from "../screens/ProfileScreen.js";
import ReportScreen from "../screens/ReportScreen.js";
import LoginScreen from "../screens/Auth/LoginScreen.js";
import RegisterScreen from "../screens/Auth/RegisterScreen.js";
import ReceiptScannerScreen from "../screens/ReceiptScannerScreen.js";
import HomeStack from "./HomeStack.js";
import { useTransactions } from "../context/TransactionContext.js";
import { hexToRgba } from "../utils/Utils.js";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabIcon = ({ routeName, focused }) => {
  const scale = useSharedValue(1);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (focused) {
      scale.value = withSpring(1.18, { damping: 10, stiffness: 220 });
      translateY.value = withSpring(-3, { damping: 10, stiffness: 220 });
    } else {
      scale.value = withTiming(1, { duration: 200 });
      translateY.value = withTiming(0, { duration: 200 });
    }
  }, [focused]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateY: translateY.value }],
  }));

  const iconMap = {
    Home: focused ? "home" : "home-outline",
    AddExpense: focused ? "add-circle" : "add-circle-outline",
    Reports: focused ? "bar-chart" : "bar-chart-outline",
    Profile: focused ? "person" : "person-outline",
  };

  return (
    <Animated.View style={animStyle}>
      {focused ? (
        <LinearGradient
          colors={["rgba(0,201,167,0.22)", "rgba(0,201,167,0.05)"]}
          style={{
            width: 40,
            height: 40,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: "rgba(0,201,167,0.28)",
          }}
        >
          <Ionicons name={iconMap[routeName]} size={21} color="#00C9A7" />
        </LinearGradient>
      ) : (
        <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name={iconMap[routeName]} size={21} color="rgba(255,255,255,0.32)" />
        </View>
      )}
    </Animated.View>
  );
};

function BottomTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "transparent",
          borderTopWidth: 0,
          elevation: 0,
          shadowOpacity: 0,
          height: 83 + insets.bottom,
          position: "absolute",
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={["rgba(8,18,32,0.98)", "#050D1A"]}
            style={{
              flex: 1,
              borderTopWidth: 1,
              borderTopColor: "rgba(255,255,255,0.08)",
            }}
          />
        ),
        tabBarActiveTintColor: "#00C9A7",
        tabBarInactiveTintColor: "rgba(255,255,255,0.32)",
        tabBarIcon: ({ focused }) => (
          <TabIcon routeName={route.name} focused={focused} />
        ),
        tabBarLabel: ({ focused, children }) => (
          <Text
            style={{
              fontSize: 11,
              fontWeight: focused ? "700" : "500",
              color: focused ? "#00C9A7" : "rgba(255,255,255,0.32)",
              marginTop: 5,
              letterSpacing: 0.2,
            }}
          >
            {children}
          </Text>
        ),
        tabBarItemStyle: {
          paddingTop: 22,
          paddingBottom: insets.bottom > 0 ? 0 : 6,
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} />
      <Tab.Screen
        name="AddExpense"
        component={AddExpenseScreen}
        options={{ title: "Add" }}
      />
      <Tab.Screen name="Reports" component={ReportScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AppNavigator() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const { primaryColor } = useTransactions();

  useEffect(() => {
    const unsubscribe = auth().onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return unsubscribe;
  }, []);

  const isAndroid15Plus = Platform.OS === "android" && Platform.Version >= 35;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "#050D1A" }}
      edges={["bottom", "left", "right"]}
    >
      {isAndroid15Plus && (
        <View
          style={{
            height: StatusBar.currentHeight || 0,
            backgroundColor: "#050D1A",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1,
          }}
        />
      )}

      <StatusBar
        barStyle="light-content"
        backgroundColor={isAndroid15Plus ? "transparent" : "#050D1A"}
        translucent={isAndroid15Plus}
      />

      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <>
            <Stack.Screen name="MainApp" component={BottomTabs} />
            <Stack.Screen name="ReceiptScanner" component={ReceiptScannerScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </SafeAreaView>
  );
}

export default AppNavigator;
