import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../../api/client';

interface ClockEntry {
  id: string;
  clockInTime: string;
  clockOutTime: string | null;
  status: 'ACTIVE' | 'COMPLETED';
  notes: string | null;
}

function parseISO(dateString: string): Date {
  return new Date(dateString);
}

function isToday(date: Date): boolean {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

export function TodayEntries() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ClockEntry[]>([]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      // Get today's date range
      const today = new Date();
      const startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);

      const response = await apiClient.get(
        `/api/time-tracking/entries?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );

      // Filter to today's entries only
      const todayEntries = (response.data.entries || []).filter((entry: any) => {
        const entryDate = parseISO(entry.clockInTime || entry.date);
        return isToday(entryDate);
      });
      setEntries(todayEntries);
    } catch (error) {
      console.error('[TodayEntries] Error loading entries:', error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const formatDuration = (clockIn: string, clockOut: string | null): string => {
    if (!clockOut) return 'In progress';

    const start = parseISO(clockIn);
    const end = parseISO(clockOut);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="list-outline" size={18} color="#94A3B8" />
        <Text style={styles.headerText}>Today's Entries</Text>
      </View>

      {entries.map((entry) => (
        <View key={entry.id} style={styles.entryRow}>
          <View style={styles.entryTimes}>
            <Text style={styles.timeText}>
              {formatTime(parseISO(entry.clockInTime))}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#64748B" />
            <Text style={styles.timeText}>
              {entry.clockOutTime
                ? formatTime(parseISO(entry.clockOutTime))
                : 'Now'}
            </Text>
          </View>
          <Text
            style={[
              styles.durationText,
              !entry.clockOutTime && styles.activeDuration,
            ]}
          >
            {formatDuration(entry.clockInTime, entry.clockOutTime)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#94A3B8',
    marginLeft: 8,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  entryTimes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#FFFFFF',
    marginHorizontal: 4,
  },
  durationText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  activeDuration: {
    color: '#22c55e',
  },
});
