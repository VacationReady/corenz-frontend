import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import HomeScreen from '../screens/HomeScreen';
import LeaveScreen from '../screens/LeaveScreen';
import TeamScreen from '../screens/TeamScreen';
import MoreScreen from '../screens/MoreScreen';
import ClockScreen from '../screens/ClockScreen';
import ActionItemsScreen from '../screens/ActionItemsScreen';
import SurveysScreen from '../screens/SurveysScreen';
import PerformanceScreen from '../screens/PerformanceScreen';
import CalendarScreen from '../screens/CalendarScreen';
import CompanyCalendarScreen from '../screens/CompanyCalendarScreen';

const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();

function MoreStackNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <MoreStack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 18,
          color: '#0f172a',
        },
        headerTintColor: '#3b82f6',
      }}
    >
      <MoreStack.Screen
        name="MoreMain"
        options={{ headerShown: false }}
      >
        {(props) => <MoreScreen {...props} onLogout={onLogout} />}
      </MoreStack.Screen>
      <MoreStack.Screen
        name="ActionItems"
        component={ActionItemsScreen}
        options={{ title: 'Action Items' }}
      />
      <MoreStack.Screen
        name="Surveys"
        component={SurveysScreen}
        options={{ title: 'Surveys' }}
      />
      <MoreStack.Screen
        name="Performance"
        component={PerformanceScreen}
        options={{ title: 'Performance Reviews' }}
      />
      <MoreStack.Screen
        name="CalendarEvents"
        component={CalendarScreen}
        options={{ title: 'Calendar & Events' }}
      />
      <MoreStack.Screen
        name="MyLeave"
        component={LeaveScreen}
        options={{ title: 'My Leave Requests' }}
      />
    </MoreStack.Navigator>
  );
}

export default function AppNavigator({ onLogout }: { onLogout: () => void }) {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: keyof typeof Ionicons.glyphMap;

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline';
            } else if (route.name === 'Clock') {
              iconName = focused ? 'time' : 'time-outline';
            } else if (route.name === 'Calendar') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } else if (route.name === 'Team') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'More') {
              iconName = focused ? 'menu' : 'menu-outline';
            } else {
              iconName = 'ellipse-outline';
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: '#3b82f6',
          tabBarInactiveTintColor: '#94a3b8',
          tabBarStyle: {
            backgroundColor: '#fff',
            borderTopColor: '#e2e8f0',
            borderTopWidth: 1,
            paddingBottom: 5,
            paddingTop: 5,
            height: 60,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
          },
          headerStyle: {
            backgroundColor: '#fff',
            elevation: 0,
            shadowOpacity: 0,
            borderBottomWidth: 1,
            borderBottomColor: '#e2e8f0',
          },
          headerTitleStyle: {
            fontWeight: '700',
            fontSize: 18,
            color: '#0f172a',
          },
        })}
      >
        <Tab.Screen 
          name="Home" 
          component={HomeScreen}
          options={{ headerShown: false }}
        />
        <Tab.Screen 
          name="Clock" 
          component={ClockScreen}
          options={{ 
            title: 'Clock In/Out',
            headerStyle: {
              backgroundColor: '#0F172A',
            },
            headerTitleStyle: {
              color: '#FFFFFF',
            },
          }}
        />
        <Tab.Screen 
          name="Calendar" 
          component={CompanyCalendarScreen}
          options={{ headerShown: false, title: 'Calendar' }}
        />
        <Tab.Screen 
          name="Team" 
          component={TeamScreen}
        />
        <Tab.Screen 
          name="More" 
          options={{ headerShown: false }}
        >
          {() => <MoreStackNavigator onLogout={onLogout} />}
        </Tab.Screen>
      </Tab.Navigator>
    </NavigationContainer>
  );
}
