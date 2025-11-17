import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/LoginScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import { AuthStackParamList } from './types';

interface AuthNavigatorProps {
  onLoginSuccess: () => void;
}

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthNavigator({ onLoginSuccess }: AuthNavigatorProps) {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'fade',
        }}
      >
        <Stack.Screen name="Login">
          {(props) => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
        </Stack.Screen>
        <Stack.Screen
          name="ForgotPassword"
          component={ForgotPasswordScreen}
          options={{
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
