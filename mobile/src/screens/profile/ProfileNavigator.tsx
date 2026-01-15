import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ProfileOverviewScreen from './ProfileOverviewScreen';
import PersonalInfoScreen from './PersonalInfoScreen';
import EmploymentDetailsScreen from './EmploymentDetailsScreen';
import EmergencyContactsScreen from './EmergencyContactsScreen';
import BankPayrollScreen from './BankPayrollScreen';
import DocumentsScreen from './DocumentsScreen';
import LeaveBalancesScreen from './LeaveBalancesScreen';

export type ProfileStackParamList = {
  ProfileOverview: { employeeId?: string; isOwnProfile?: boolean };
  PersonalInfo: { employeeId: string; canEdit: boolean };
  EmploymentDetails: { employeeId: string; canEdit: boolean };
  EmergencyContacts: { employeeId: string; canEdit: boolean };
  BankPayroll: { employeeId: string; canEdit: boolean };
  Documents: { employeeId: string };
  LeaveBalances: { employeeId: string };
};

const Stack = createNativeStackNavigator<ProfileStackParamList>();

interface ProfileNavigatorProps {
  employeeId?: string;
  isOwnProfile?: boolean;
}

export default function ProfileNavigator({ employeeId, isOwnProfile = true }: ProfileNavigatorProps) {
  return (
    <Stack.Navigator
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
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: '#f8fafc',
        },
      }}
    >
      <Stack.Screen
        name="ProfileOverview"
        component={ProfileOverviewScreen}
        initialParams={{ employeeId, isOwnProfile }}
        options={{ 
          title: isOwnProfile ? 'My Profile' : 'Employee Profile',
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="PersonalInfo"
        component={PersonalInfoScreen}
        options={{ title: 'Personal Information' }}
      />
      <Stack.Screen
        name="EmploymentDetails"
        component={EmploymentDetailsScreen}
        options={{ title: 'Employment Details' }}
      />
      <Stack.Screen
        name="EmergencyContacts"
        component={EmergencyContactsScreen}
        options={{ title: 'Emergency Contacts' }}
      />
      <Stack.Screen
        name="BankPayroll"
        component={BankPayrollScreen}
        options={{ title: 'Bank & Payroll' }}
      />
      <Stack.Screen
        name="Documents"
        component={DocumentsScreen}
        options={{ title: 'Documents' }}
      />
      <Stack.Screen
        name="LeaveBalances"
        component={LeaveBalancesScreen}
        options={{ title: 'Leave Balances' }}
      />
    </Stack.Navigator>
  );
}
