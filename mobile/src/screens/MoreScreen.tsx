import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getSession } from '../api/auth';
import { getEmployeeProfile } from '../api/hr-data';
import { getUserRole } from '../api/profile';
import Card from '../components/Card';
import Button from '../components/Button';
import { signOut } from '../api/auth';

interface MoreScreenProps {
  navigation?: any;
  onLogout: () => void;
}

export default function MoreScreen({ navigation, onLogout }: MoreScreenProps) {
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [userRole, setUserRole] = useState({ role: 'EMPLOYEE', isAdmin: false, isManager: false });

  useEffect(() => {
    loadUserData();
    getUserRole().then(setUserRole).catch(console.error);
  }, []);

  const loadUserData = async () => {
    try {
      const sessionData = await getSession();
      setUser(sessionData?.user);

      if (sessionData?.user?.id) {
        try {
          const employeeData = await getEmployeeProfile(sessionData.user.id);
          setEmployee(employeeData);
        } catch (err) {
          console.log('No employee profile');
        }
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          onLogout();
        },
      },
    ]);
  };

  const userName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : user?.name || 'User';

  return (
    <ScrollView style={styles.container}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName
                .split(' ')
                .map((n: string) => n[0])
                .join('')
                .toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={styles.userName}>{userName}</Text>
        {employee?.jobTitle && <Text style={styles.userTitle}>{employee.jobTitle}</Text>}
        {employee?.department && (
          <View style={styles.userDepartment}>
            <Ionicons name="briefcase-outline" size={16} color="#64748b" />
            <Text style={styles.userDepartmentText}>{employee.department}</Text>
          </View>
        )}
      </View>

      {/* Menu Sections */}
      <View style={styles.content}>
        {/* Work Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Work</Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="checkmark-done-outline"
              title="Action Items"
              onPress={() => navigation?.navigate('ActionItems')}
            />
            <MenuItem
              icon="newspaper-outline"
              title="Company News"
              onPress={() => navigation?.navigate('NewsHub')}
            />
            <MenuItem
              icon="document-text-outline"
              title="Surveys"
              onPress={() => navigation?.navigate('Surveys')}
            />
            <MenuItem
              icon="bar-chart-outline"
              title="Performance Reviews"
              onPress={() => navigation?.navigate('Performance')}
            />
            <MenuItem
              icon="calendar-outline"
              title="Calendar & Events"
              onPress={() => navigation?.navigate('CalendarEvents')}
            />
            <MenuItem
              icon="calendar-number-outline"
              title="My Shifts"
              onPress={() => navigation?.navigate('Shifts')}
              showBorder={false}
            />
          </Card>
        </View>

        {/* Admin Section - Only visible to admins */}
        {userRole.isAdmin && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin</Text>
            <Card style={styles.menuCard}>
              <MenuItem
                icon="checkmark-done-outline"
                title="Reconciliation"
                onPress={() => navigation?.navigate('Reconciliation')}
                showBorder={false}
              />
            </Card>
          </View>
        )}

        {/* Personal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Personal</Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="time-outline"
              title="My Timesheets"
              onPress={() => navigation?.navigate('Timesheets')}
            />
            <MenuItem
              icon="airplane-outline"
              title="My Leave Requests"
              onPress={() => navigation?.navigate('MyLeave')}
            />
            <MenuItem
              icon="person-outline"
              title="My Profile"
              onPress={() => navigation?.navigate('MyProfile', { isOwnProfile: true })}
            />
            <MenuItem
              icon="document-outline"
              title="My Documents"
              onPress={() => navigation?.navigate('Documents', { employeeId: employee?.id })}
            />
            <MenuItem
              icon="card-outline"
              title="Payroll & Benefits"
              onPress={() => navigation?.navigate('BankPayroll', { employeeId: employee?.id, canEdit: false })}
              showBorder={false}
            />
          </Card>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <Card style={styles.menuCard}>
            <MenuItem
              icon="notifications-outline"
              title="Notifications"
              onPress={() => {}}
            />
            <MenuItem
              icon="lock-closed-outline"
              title="Privacy & Security"
              onPress={() => {}}
            />
            <MenuItem
              icon="help-circle-outline"
              title="Help & Support"
              onPress={() => {}}
            />
            <MenuItem
              icon="information-circle-outline"
              title="About"
              onPress={() => {}}
              showBorder={false}
            />
          </Card>
        </View>

        {/* Logout */}
        <View style={styles.section}>
          <Button
            title="Sign Out"
            onPress={handleLogout}
            variant="danger"
            size="large"
          />
        </View>

        {/* Version Info */}
        <View style={styles.versionContainer}>
          <Text style={styles.versionText}>Version 1.0.0</Text>
          <Text style={styles.versionSubtext}>
            Connected to: {process.env.EXPO_PUBLIC_API_BASE_URL}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

function MenuItem({
  icon,
  title,
  onPress,
  showBorder = true,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  onPress: () => void;
  showBorder?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, !showBorder && styles.menuItemNoBorder]}
      onPress={onPress}
    >
      <View style={styles.menuItemLeft}>
        <View style={styles.menuItemIcon}>
          <Ionicons name={icon} size={24} color="#3b82f6" />
        </View>
        <Text style={styles.menuItemText}>{title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  userTitle: {
    fontSize: 16,
    color: '#475569',
    marginBottom: 8,
  },
  userDepartment: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userDepartmentText: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 6,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  menuCard: {
    padding: 0,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  menuItemNoBorder: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 4,
  },
  versionSubtext: {
    fontSize: 12,
    color: '#cbd5e1',
  },
});
