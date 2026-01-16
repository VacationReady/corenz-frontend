import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getSession } from '../api/auth';
import { getEmployeeProfile } from '../api/hr-data';
import { getUnifiedActionItems } from '../api/action-items';
import { getPendingSurveys } from '../api/surveys';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LoadingState from '../components/LoadingState';
import ClockWidget from '../components/ClockWidget';

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [stats, setStats] = useState({
    pendingActions: 0,
    pendingSurveys: 0,
  });

  const loadData = async () => {
    try {
      // Get session and profile
      const sessionData = await getSession();
      setUser(sessionData?.user);

      if (sessionData?.user?.id) {
        try {
          const employeeData = await getEmployeeProfile(sessionData.user.id);
          setEmployee(employeeData);
          console.log('Employee data loaded:', employeeData?.firstName);
        } catch (err) {
          console.log('No employee profile found, using session user data');
        }
      }

      // Load stats in parallel
      const [actions, surveys] = await Promise.allSettled([
        getUnifiedActionItems(),
        getPendingSurveys(),
      ]);

      if (actions.status === 'rejected') {
        console.error('Failed to load action items:', actions.reason);
      }
      if (surveys.status === 'rejected') {
        console.error('Failed to load surveys:', surveys.reason);
      }

      setStats({
        pendingActions: actions.status === 'fulfilled' 
          ? actions.value.counts.total
          : 0,
        pendingSurveys: surveys.status === 'fulfilled' ? surveys.value.length : 0,
      });
    } catch (error) {
      console.error('Failed to load home data:', error);
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

  if (loading) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  const userName = employee
    ? `${employee.firstName} ${employee.lastName}`
    : user?.name || 'User';

  const firstName = employee?.firstName || user?.name?.split(' ')[0] || 'User';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{getGreeting()},</Text>
          <Text style={styles.userName}>{firstName}</Text>
          {employee?.jobTitle && (
            <Text style={styles.userRole}>{employee.jobTitle}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <View style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="rgba(255, 255, 255, 0.5)" />
          </View>
        </View>
      </View>

      <View style={styles.content}>
        {/* Clock In/Out Widget */}
        <ClockWidget />

        {/* Quick Actions */}
        <Card>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              icon="calendar-outline"
              title="Book Leave"
              color="#3b82f6"
              onPress={() => navigation.navigate('More', { screen: 'MyLeave' })}
            />
            <QuickActionButton
              icon="document-text-outline"
              title="Surveys"
              color="#8b5cf6"
              onPress={() => navigation.navigate('More', { screen: 'Surveys' })}
            />
            <QuickActionButton
              icon="folder-outline"
              title="Documents"
              color="#ef4444"
              onPress={() => navigation.navigate('More', { screen: 'Documents' })}
            />
            <QuickActionButton
              icon="people-outline"
              title="My Team"
              color="#10b981"
              onPress={() => navigation.navigate('Team')}
            />
          </View>
        </Card>

        {/* Pending Items - Always show to provide access to action items */}
        <Card>
          <View style={styles.cardHeader}>
            <Text style={styles.sectionTitle}>Pending Actions</Text>
            {stats.pendingActions > 0 && (
              <Badge text={`${stats.pendingActions} pending`} variant="warning" size="small" />
            )}
          </View>
          <Text style={styles.cardDescription}>
            {stats.pendingActions > 0 
              ? `You have ${stats.pendingActions} action item${stats.pendingActions !== 1 ? 's' : ''} waiting for your attention`
              : 'View and manage your action items, approvals, and tasks'}
          </Text>
          <TouchableOpacity
            style={styles.viewAllButton}
            onPress={() => navigation.navigate('More', { screen: 'ActionItems' })}
          >
            <Text style={styles.viewAllText}>
              {stats.pendingActions > 0 ? 'View All' : 'View Action Items'}
            </Text>
            <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
          </TouchableOpacity>
        </Card>

        {/* Pending Surveys */}
        {stats.pendingSurveys > 0 && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Pending Surveys</Text>
              <Badge text={`${stats.pendingSurveys} new`} variant="info" size="small" />
            </View>
            <Text style={styles.cardDescription}>
              Complete {stats.pendingSurveys} survey{stats.pendingSurveys !== 1 ? 's' : ''} to share your feedback
            </Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('More', { screen: 'Surveys' })}
            >
              <Text style={styles.viewAllText}>Complete Surveys</Text>
              <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
            </TouchableOpacity>
          </Card>
        )}

        {/* Employee Info */}
        {employee && (
          <Card>
            <Text style={styles.sectionTitle}>Your Info</Text>
            <View style={styles.infoRow}>
              <Ionicons name="briefcase-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>{employee.department || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#64748b" />
              <Text style={styles.infoText}>{employee.email || user?.email || 'N/A'}</Text>
            </View>
            {employee.manager && (
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color="#64748b" />
                <Text style={styles.infoText}>
                  Reports to {employee.manager.firstName} {employee.manager.lastName}
                </Text>
              </View>
            )}
          </Card>
        )}
      </View>
    </ScrollView>
  );
}

function QuickActionButton({ icon, title, color, onPress }: any) {
  return (
    <TouchableOpacity 
      style={styles.quickAction} 
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={32} color={color} />
      </View>
      <Text style={styles.quickActionText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#3b82f6',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  greeting: {
    fontSize: 16,
    color: '#dbeafe',
    fontWeight: '500',
  },
  userName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  userRole: {
    fontSize: 14,
    color: '#dbeafe',
    marginTop: 4,
  },
  headerRight: {
    flexDirection: 'row',
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.6,
  },
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 16,
    letterSpacing: -0.3,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
  },
  quickAction: {
    width: '46%',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    margin: '2%',
  },
  quickActionIcon: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '700',
    textAlign: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 12,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
    marginRight: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 12,
    flex: 1,
  },
});
