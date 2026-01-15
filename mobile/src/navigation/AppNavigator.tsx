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

import {
  ProfileOverviewScreen,
  PersonalInfoScreen,
  EmploymentDetailsScreen,
  EmergencyContactsScreen,
  BankPayrollScreen,
  LeaveBalancesScreen,
  DocumentsScreen,
} from '../screens/profile';

const Tab = createBottomTabNavigator();
const MoreStack = createNativeStackNavigator();
const TeamStack = createNativeStackNavigator();

const profileScreenOptions = {
  headerStyle: { backgroundColor: '#fff' },
  headerTitleStyle: { fontWeight: '700' as const, fontSize: 18, color: '#0f172a' },
  headerTintColor: '#3b82f6',
  headerShadowVisible: false,
};

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
      {/* Profile Screens */}
      <MoreStack.Screen
        name="MyProfile"
        component={ProfileOverviewScreen}
        options={{ title: 'My Profile', ...profileScreenOptions }}
        initialParams={{ isOwnProfile: true }}
      />
      <MoreStack.Screen
        name="PersonalInfo"
        component={PersonalInfoScreen}
        options={{ title: 'Personal Information', ...profileScreenOptions }}
      />
      <MoreStack.Screen
        name="EmploymentDetails"
        component={EmploymentDetailsScreen}
        options={{ title: 'Employment Details', ...profileScreenOptions }}
      />
      <MoreStack.Screen
        name="EmergencyContacts"
        component={EmergencyContactsScreen}
        options={{ title: 'Emergency Contacts', ...profileScreenOptions }}
      />
      <MoreStack.Screen
        name="BankPayroll"
        component={BankPayrollScreen}
        options={{ title: 'Bank & Payroll', ...profileScreenOptions }}
      />
      <MoreStack.Screen
        name="LeaveBalances"
        component={LeaveBalancesScreen}
        options={{ title: 'Leave Balances', ...profileScreenOptions }}
      />
      <MoreStack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ title: 'Documents', ...profileScreenOptions }}
      />
    </MoreStack.Navigator>
  );
}

function TeamStackNavigator() {
  return (
    <TeamStack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '700', fontSize: 18, color: '#0f172a' },
        headerTintColor: '#3b82f6',
        headerShadowVisible: false,
      }}
    >
      <TeamStack.Screen
        name="TeamMain"
        component={TeamScreen}
        options={{ headerShown: false }}
      />
      {/* Employee Profile Screens (for admins viewing team members) */}
      <TeamStack.Screen
        name="EmployeeProfile"
        component={ProfileOverviewScreen}
        options={{ title: 'Employee Profile' }}
      />
      <TeamStack.Screen
        name="PersonalInfo"
        component={PersonalInfoScreen}
        options={{ title: 'Personal Information' }}
      />
      <TeamStack.Screen
        name="EmploymentDetails"
        component={EmploymentDetailsScreen}
        options={{ title: 'Employment Details' }}
      />
      <TeamStack.Screen
        name="EmergencyContacts"
        component={EmergencyContactsScreen}
        options={{ title: 'Emergency Contacts' }}
      />
      <TeamStack.Screen
        name="BankPayroll"
        component={BankPayrollScreen}
        options={{ title: 'Bank & Payroll' }}
      />
      <TeamStack.Screen
        name="LeaveBalances"
        component={LeaveBalancesScreen}
        options={{ title: 'Leave Balances' }}
      />
      <TeamStack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ title: 'Documents' }}
      />
    </TeamStack.Navigator>
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
          component={TeamStackNavigator}
          options={{ headerShown: false }}
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
