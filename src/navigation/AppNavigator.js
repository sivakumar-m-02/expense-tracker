import React, { useEffect, useState } from "react";
import { SafeAreaView, Platform, StatusBar, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import auth from "@react-native-firebase/auth";

// Screens
import HomeScreen from "../screens/HomeScreen.js";
import AddExpenseScreen from "../screens/AddExpenseScreen.js";
import ProfileScreen from "../screens/ProfileScreen.js";
import ReportScreen from "../screens/ReportScreen.js";
import LoginScreen from "../screens/Auth/LoginScreen.js";
import RegisterScreen from "../screens/Auth/RegisterScreen.js";
import HomeStack from "./HomeStack.js";
import { useTransactions } from "../context/TransactionContext.js";
import { hexToRgba } from "../utils/Utils.js";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function BottomTabs() {
  const { primaryColor } = useTransactions();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
          height: 75 + insets.bottom,
          position: "relative",
          paddingTop: 7,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: primaryColor || "#37474F",
        tabBarInactiveTintColor: "gray",
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === "Home") {
            iconName = "home-outline";
          } else if (route.name === "AddExpense") {
            iconName = "add-circle-outline";
          } else if (route.name === "Reports") {
            iconName = "bar-chart-outline";
          } else if (route.name === "Profile") {
            iconName = "person-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
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
      style={{ flex: 1, backgroundColor: primaryColor || "#fff" }}
      edges={["bottom", "left", "right"]}
    >
      {/* Fake status bar overlay ONLY for Android 15+ AND only when no header */}
      {isAndroid15Plus && (
        <View
          style={{
            height: StatusBar.currentHeight || 0,
            backgroundColor: primaryColor,
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
        backgroundColor={
          isAndroid15Plus ? "transparent" : hexToRgba(primaryColor, 0.96)
        }
        translucent={isAndroid15Plus}
      />

      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLoggedIn ? (
          <Stack.Screen name="MainApp" component={BottomTabs} />
        ) : (
          <Stack.Screen name="Auth" component={AuthStack} />
        )}
      </Stack.Navigator>
    </SafeAreaView>
  );
}

export default AppNavigator;
