import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { shiftService } from '../../services/ShiftService';
import { Shift } from '../../api/shifts';

interface ShiftsTileProps {
  onPress?: () => void;
}

function formatShiftTime(shift: Shift): string {
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);
  
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes > 0 ? `:${minutes.toString().padStart(2, '0')}` : '';
    return `${displayHours}${displayMinutes}${ampm}`;
  };
  
  return `${formatTime(start)} - ${formatTime(end)}`;
}

export function ShiftsTile({ onPress }: ShiftsTileProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [tomorrowShift, setTomorrowShift] = useState<Shift | null>(null);
  const [upcomingCount, setUpcomingCount] = useState(0);

  const loadShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [today, tomorrow, upcoming] = await Promise.all([
        shiftService.getTodayShift(),
        shiftService.getTomorrowShift(),
        shiftService.getUpcomingShifts(7),
      ]);

      console.log('[ShiftsTile] Loaded shifts:', {
        today: today ? {
          id: today.id,
          employeeId: today.employeeId,
          startTime: today.startTime,
          endTime: today.endTime,
        } : null,
        tomorrow: tomorrow ? {
          id: tomorrow.id,
          employeeId: tomorrow.employeeId,
          startTime: tomorrow.startTime,
          endTime: tomorrow.endTime,
        } : null,
        upcomingCount: upcoming.length,
      });

      setTodayShift(today);
      setTomorrowShift(tomorrow);
      setUpcomingCount(upcoming.length);
    } catch (err) {
      setError('Unable to load shifts');
      console.error('[ShiftsTile] Error loading shifts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShifts();
    }, [loadShifts])
  );

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('More', { screen: 'Shifts', params: { screen: 'ShiftsMain' } });
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={20} color="#6366f1" />
        <Text style={styles.title}>My Shifts</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadShifts}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Today's Shift */}
          <View style={styles.shiftRow}>
            <Text style={styles.dayLabel}>Today</Text>
            {todayShift ? (
              <Text style={styles.shiftTime}>
                {formatShiftTime(todayShift)}
              </Text>
            ) : (
              <Text style={styles.offText}>No shift</Text>
            )}
          </View>

          {/* Tomorrow's Shift */}
          <View style={styles.shiftRow}>
            <Text style={styles.dayLabel}>Tomorrow</Text>
            {tomorrowShift ? (
              <Text style={styles.shiftTime}>
                {formatShiftTime(tomorrowShift)}
              </Text>
            ) : (
              <Text style={styles.offText}>No shift</Text>
            )}
          </View>

          {/* Upcoming Count */}
          {upcomingCount > 0 && (
            <Text style={styles.upcomingText}>
              {upcomingCount} upcoming shift{upcomingCount !== 1 ? 's' : ''} this week
            </Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>View Schedule</Text>
        <Ionicons name="chevron-forward" size={16} color="#6366f1" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 180,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  shiftTime: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  offText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  upcomingText: {
    fontSize: 11,
    color: '#6366f1',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
});
