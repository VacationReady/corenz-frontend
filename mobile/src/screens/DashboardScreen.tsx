import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getSession, signOut } from '../api/auth';
import { getEmployeeProfile, getOnboardingProgress } from '../api/hr-data';

interface DashboardScreenProps {
  onLogout: () => void;
}

export default function DashboardScreen({ onLogout }: DashboardScreenProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [onboarding, setOnboarding] = useState<any>(null);

  const loadData = async () => {
    try {
      // Fetch session
      const sessionData = await getSession();
      setSession(sessionData);

      // Fetch employee profile
      if (sessionData?.user?.id) {
        try {
          const employeeData = await getEmployeeProfile(sessionData.user.id);
          setEmployee(employeeData);

          // Fetch onboarding if employee exists
          if (employeeData?.id) {
            try {
              const onboardingData = await getOnboardingProgress(employeeData.id);
              setOnboarding(Array.isArray(onboardingData) ? onboardingData[0] : null);
            } catch (err) {
              console.log('No onboarding data');
            }
          }
        } catch (err) {
          console.log('No employee data');
        }
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      // Session expired, log out
      handleLogout();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleLogout = async () => {
    await signOut();
    onLogout();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const userName = session?.user?.name || 
    `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() || 
    session?.user?.email || 
    'User';

  const userRole = session?.user?.role || 'EMPLOYEE';

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{userName}</Text>
          <Text style={styles.userRole}>{userRole}</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {/* Session Info Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Session Info</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{session?.user?.email || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Company ID:</Text>
            <Text style={styles.infoValue}>{session?.user?.companyId || 'N/A'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>User ID:</Text>
            <Text style={styles.infoValue}>{session?.user?.id || 'N/A'}</Text>
          </View>
        </View>

        {/* Employee Profile Card */}
        {employee && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Employee Profile</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Name:</Text>
              <Text style={styles.infoValue}>
                {employee.firstName} {employee.lastName}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department:</Text>
              <Text style={styles.infoValue}>{employee.department || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Position:</Text>
              <Text style={styles.infoValue}>{employee.jobTitle || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>{employee.status || 'N/A'}</Text>
            </View>
          </View>
        )}

        {/* Onboarding Card */}
        {onboarding && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Onboarding Progress</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Template:</Text>
              <Text style={styles.infoValue}>
                {onboarding.OnboardingTemplate?.title || 'N/A'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Status:</Text>
              <Text style={styles.infoValue}>{onboarding.status || 'N/A'}</Text>
            </View>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>View Team</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>Request Leave</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>View Documents</Text>
          </TouchableOpacity>
        </View>

        {/* API Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusText}>
            ✅ Connected to API: {process.env.EXPO_PUBLIC_API_BASE_URL || 'Not configured'}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: '#e0e7ff',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#e0e7ff',
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#fff',
    fontWeight: '600',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
  },
  actionButton: {
    backgroundColor: '#f0f9ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#3b82f6',
    fontWeight: '600',
    textAlign: 'center',
  },
  statusCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  statusText: {
    fontSize: 12,
    color: '#15803d',
  },
});
