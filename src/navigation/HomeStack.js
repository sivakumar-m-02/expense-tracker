import React from "react";
import { TouchableOpacity, View, Platform } from "react-native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Ionicons from "react-native-vector-icons/Ionicons";
import LinearGradient from "react-native-linear-gradient";
import HomeScreen from "../screens/HomeScreen.js";
import ListExpensesScreen from "../screens/ListExpensesScreen.js";

const Stack = createNativeStackNavigator();

const DarkBackButton = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={{ marginLeft: -4 }}>
    <LinearGradient
      colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
      style={{
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.12)",
      }}
    >
      <Ionicons name="chevron-back" size={18} color="#fff" />
    </LinearGradient>
  </TouchableOpacity>
);

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeMain"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ListExpenses"
        component={ListExpensesScreen}
        options={({ navigation }) => ({
          title: "All Expenses",
          headerBackVisible: false,
          headerLeft: () => <DarkBackButton onPress={() => navigation.goBack()} />,
          headerTintColor: "#fff",
          headerTitleStyle: {
            color: "#fff",
            fontSize: 17,
            fontWeight: "700",
            letterSpacing: 0.2,
          },
          headerStyle: {
            backgroundColor: "#050D1A",
          },
          headerShadowVisible: false,
          headerBackground: () => (
            <LinearGradient
              colors={["#071828", "#050D1A"]}
              style={{ flex: 1, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" }}
            />
          ),
        })}
      />
    </Stack.Navigator>
  );
}

export default HomeStack;
