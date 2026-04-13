import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen.js';
import HomeScreen  from '../screens/HomeScreen.js';
import LeaveScreen from './LeaveScreen.js';

const Stack = createNativeStackNavigator();

const AppNavigator = () => (
  <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Home"  component={HomeScreen} />
    <Stack.Screen name="Leave" component={LeaveScreen} />
  </Stack.Navigator>
);

export default AppNavigator;
