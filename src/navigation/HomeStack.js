import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen.js";
import ListExpensesScreen from "../screens/ListExpensesScreen.js";

const Stack = createNativeStackNavigator();

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
        options={{
          title: "All Expenses",
          headerBackTitleVisible: false,
          headerTintColor: "#000",
          headerStyle: {
            backgroundColor: "#fff", 
          },
          headerShadowVisible: false,
        }}
      />
    </Stack.Navigator>
  );
}

export default HomeStack;
