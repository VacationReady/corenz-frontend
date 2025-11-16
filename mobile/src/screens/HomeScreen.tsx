import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getSession } from '../api/auth';
import { getEmployeeProfile } from '../api/hr-data';
import { getMyLeaveRequests } from '../api/leave';
import { getMyActionItems } from '../api/action-items';
import { getPendingSurveys } from '../api/surveys';
import { getUpcomingEvents } from '../api/calendar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LoadingState from '../components/LoadingState';
import ClockWidget from '../components/ClockWidget';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [stats, setStats] = useState({
    pendingActions: 0,
    pendingSurveys: 0,
    leaveRequests: 0,
    upcomingEvents: 0,
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
        } catch (err) {
          console.log('No employee profile found');
        }
      }

      // Load stats in parallel
      const [actions, surveys, leave, events] = await Promise.allSettled([
        getMyActionItems(),
        getPendingSurveys(),
        getMyLeaveRequests(),
        getUpcomingEvents(),
      ]);

      setStats({
        pendingActions: actions.status === 'fulfilled' 
          ? actions.value.filter((a: any) => a.status !== 'COMPLETED').length 
          : 0,
        pendingSurveys: surveys.status === 'fulfilled' ? surveys.value.length : 0,
        leaveRequests: leave.status === 'fulfilled' 
          ? leave.value.filter((l: any) => l.status === 'PENDING').length 
          : 0,
        upcomingEvents: events.status === 'fulfilled' ? events.value.length : 0,
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
          <Text style={styles.userName}>{userName}</Text>
          {employee?.jobTitle && (
            <Text style={styles.userRole}>{employee.jobTitle}</Text>
          )}
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.notificationButton}>
            <Ionicons name="notifications-outline" size={24} color="#fff" />
            {stats.pendingActions > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{stats.pendingActions}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.content}>
        {/* Clock In/Out Widget */}
        <ClockWidget />

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <StatCard
            icon="checkmark-done"
            title="Action Items"
            value={stats.pendingActions}
            color="#3b82f6"
          />
          <StatCard
            icon="document-text"
            title="Surveys"
            value={stats.pendingSurveys}
            color="#8b5cf6"
          />
          <StatCard
            icon="calendar"
            title="Leave Requests"
            value={stats.leaveRequests}
            color="#10b981"
          />
          <StatCard
            icon="time"
            title="Events"
            value={stats.upcomingEvents}
            color="#f59e0b"
          />
        </View>

        {/* Quick Actions */}
        <Card>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              icon="calendar-outline"
              title="Book Leave"
              color="#3b82f6"
              onPress={() => navigation.navigate('Leave')}
            />
            <QuickActionButton
              icon="document-text-outline"
              title="Surveys"
              color="#8b5cf6"
              onPress={() => navigation.navigate('More', { screen: 'Surveys' })}
            />
            <QuickActionButton
              icon="bar-chart-outline"
              title="Reviews"
              color="#ef4444"
              onPress={() => navigation.navigate('More', { screen: 'Performance' })}
            />
            <QuickActionButton
              icon="people-outline"
              title="My Team"
              color="#10b981"
              onPress={() => navigation.navigate('Team')}
            />
          </View>
        </Card>

        {/* Pending Items */}
        {stats.pendingActions > 0 && (
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.sectionTitle}>Pending Actions</Text>
              <Badge text={`${stats.pendingActions} pending`} variant="warning" size="small" />
            </View>
            <Text style={styles.cardDescription}>
              You have {stats.pendingActions} action item{stats.pendingActions !== 1 ? 's' : ''} waiting for your attention
            </Text>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={() => navigation.navigate('More', { screen: 'ActionItems' })}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={16} color="#3b82f6" />
            </TouchableOpacity>
          </Card>
        )}

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

function StatCard({ icon, title, value, color }: any) {
  return (
    <View style={[styles.statCard, { borderLeftColor: color }]}>
      <View style={[styles.statIconContainer, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statTitle}>{title}</Text>
    </View>
  );
}

function QuickActionButton({ icon, title, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon} size={24} color={color} />
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
    paddingBottom: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  greeting: {
    fontSize: 16,
    color: '#dbeafe',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 4,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  content: {
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    width: (width - 44) / 2,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  statTitle: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickAction: {
    width: (width - 76) / 4,
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
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
