/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */


import React from 'react';
import 'react-native-reanimated';
import { NavigationContainer } from '@react-navigation/native';
import { TransactionProvider } from './src/context/TransactionContext';
import AppNavigator from './src/navigation/AppNavigator';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const App = () => {
  return (
    <TransactionProvider>
      <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
      </GestureHandlerRootView>
    </TransactionProvider>
  );
};

export default App;
