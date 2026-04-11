import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen.js';
import HomeScreen from '../screens/HomeScreen.js';
import AttendanceScreen from './AttendanceScreen.js'; // attendance screen
import LeaveScreen from './LeaveScreen.js'; // leave screen
import ApplyLeaveScreen from './ApplyLeaveScreen.js';
import PunchInScreen from './PunchInScreen.js';
import PunchOutScreen from './PunchOutScreen.js';
import LocationScreen from './LocationScreen.js';
import LocationScreenPO from './LocationScreenpo.js';
import SelfieScreen from './SelfieScreen.js';
import CDR from '../screens/CDR.js';
import SelfieScreenpo from './SelfieScreenpo.js';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Attendance" component={AttendanceScreen} />
      <Stack.Screen name="Leave" component={LeaveScreen} />
      <Stack.Screen name="ApplyLeave" component={ApplyLeaveScreen} />
       <Stack.Screen name="Location" component={LocationScreen} />
          <Stack.Screen name="Locationpo" component={LocationScreenPO} />
        <Stack.Screen name="Selfie" component={SelfieScreen} />
        <Stack.Screen name="Selfiepo" component={SelfieScreenpo} />
        <Stack.Screen name="CDR" component={CDR} />
        
         
        <Stack.Screen name="PunchIn" component={PunchInScreen} />
        <Stack.Screen name="PunchOut" component={PunchOutScreen} />
    </Stack.Navigator>
  );
};

export default AppNavigator;
