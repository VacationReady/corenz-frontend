import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';

interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  location: string;
  status: string;
  notes?: string;
}

export default function ScheduleScreen() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    loadShifts();
  }, [selectedDate]);

  const loadShifts = async () => {
    try {
      // TODO: Implement shifts API endpoint
      // const response = await apiClient.get('/shifts/my-shifts', {
      //   params: {
      //     startDate: getWeekStart(selectedDate),
      //     endDate: getWeekEnd(selectedDate),
      //   },
      // });
      // setShifts(response.data.shifts);
      
      // Mock data for now
      setShifts([]);
    } catch (error) {
      console.error('Error loading shifts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadShifts();
  };

  const formatShiftTime = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} - ${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return '#10B981';
      case 'SCHEDULED':
        return '#3B82F6';
      case 'COMPLETED':
        return '#6B7280';
      case 'CANCELLED':
        return '#EF4444';
      default:
        return '#94A3B8';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Schedule</Text>
        <Text style={styles.headerSubtitle}>
          {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
      </View>

      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            const prev = new Date(selectedDate);
            prev.setDate(prev.getDate() - 7);
            setSelectedDate(prev);
          }}
        >
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        
        <Text style={styles.weekText}>This Week</Text>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => {
            const next = new Date(selectedDate);
            next.setDate(next.getDate() + 7);
            setSelectedDate(next);
          }}
        >
          <Ionicons name="chevron-forward" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Shifts List */}
      {shifts.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={64} color="#6B7280" />
          <Text style={styles.emptyTitle}>No Shifts Scheduled</Text>
          <Text style={styles.emptySubtitle}>
            You don't have any shifts scheduled for this week
          </Text>
        </View>
      ) : (
        <View style={styles.shiftsList}>
          {shifts.map((shift) => (
            <TouchableOpacity key={shift.id} style={styles.shiftCard}>
              <View style={styles.shiftHeader}>
                <View style={styles.shiftDate}>
                  <Text style={styles.shiftDay}>
                    {new Date(shift.startTime).toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={styles.shiftDayNumber}>
                    {new Date(shift.startTime).getDate()}
                  </Text>
                </View>
                
                <View style={styles.shiftInfo}>
                  <Text style={styles.shiftTime}>
                    {formatShiftTime(shift.startTime, shift.endTime)}
                  </Text>
                  <View style={styles.shiftLocation}>
                    <Ionicons name="location-outline" size={16} color="#94A3B8" />
                    <Text style={styles.shiftLocationText}>{shift.location}</Text>
                  </View>
                </View>
                
                <View
                  style={[styles.statusBadge, { backgroundColor: `${getStatusColor(shift.status)}20` }]}
                >
                  <Text style={[styles.statusText, { color: getStatusColor(shift.status) }]}>
                    {shift.status}
                  </Text>
                </View>
              </View>
              
              {shift.notes && (
                <View style={styles.shiftNotes}>
                  <Ionicons name="information-circle-outline" size={16} color="#94A3B8" />
                  <Text style={styles.notesText}>{shift.notes}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="swap-horizontal-outline" size={24} color="#3B82F6" />
          <Text style={styles.actionButtonText}>Request Shift Swap</Text>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="calendar-outline" size={24} color="#8B5CF6" />
          <Text style={styles.actionButtonText}>Set Availability</Text>
          <Ionicons name="chevron-forward" size={20} color="#6B7280" />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#94A3B8',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  navButton: {
    padding: 8,
  },
  weekText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 20,
  },
  shiftsList: {
    padding: 20,
    gap: 12,
  },
  shiftCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
  },
  shiftHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  shiftDate: {
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderRadius: 8,
    padding: 8,
    minWidth: 60,
  },
  shiftDay: {
    fontSize: 12,
    color: '#3B82F6',
    fontWeight: '600',
  },
  shiftDayNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  shiftInfo: {
    flex: 1,
  },
  shiftTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  shiftLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  shiftLocationText: {
    fontSize: 14,
    color: '#94A3B8',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shiftNotes: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  notesText: {
    flex: 1,
    fontSize: 14,
    color: '#94A3B8',
    lineHeight: 20,
  },
  quickActions: {
    padding: 20,
    paddingTop: 32,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 12,
  },
  actionButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});
