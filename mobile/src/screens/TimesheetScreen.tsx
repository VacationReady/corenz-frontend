import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';

interface TimesheetEntry {
  id: string;
  date: string;
  hours: number;
  status: string;
}

interface TimesheetSummary {
  totalHours: number;
  regularHours: number;
  overtimeHours: number;
  status: string;
}

export default function TimesheetScreen() {
  const [summary, setSummary] = useState<TimesheetSummary | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadTimesheet();
  }, []);

  const loadTimesheet = async () => {
    try {
      // TODO: Implement timesheet API endpoint for mobile
      // const response = await apiClient.get('/time-tracking/my-timesheet');
      // setSummary(response.data.summary);
      // setEntries(response.data.entries);
      
      // Mock data for now
      setSummary({
        totalHours: 40.5,
        regularHours: 40,
        overtimeHours: 0.5,
        status: 'PENDING',
      });
      setEntries([]);
    } catch (error) {
      console.error('Error loading timesheet:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTimesheet();
  };

  const handleSubmitTimesheet = () => {
    Alert.alert(
      'Submit Timesheet',
      'Are you sure you want to submit this timesheet for approval?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            try {
              // await apiClient.post('/time-tracking/submit-timesheet');
              Alert.alert('Success', 'Timesheet submitted for approval');
              loadTimesheet();
            } catch (error) {
              Alert.alert('Error', 'Failed to submit timesheet');
            }
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '#10B981';
      case 'PENDING':
        return '#F59E0B';
      case 'DECLINED':
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
        <Text style={styles.headerTitle}>Timesheet</Text>
        <Text style={styles.headerSubtitle}>Current Week</Text>
      </View>

      {/* Summary Card */}
      {summary && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Text style={styles.summaryTitle}>This Week's Summary</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: `${getStatusColor(summary.status)}20` },
              ]}
            >
              <Text style={[styles.statusText, { color: getStatusColor(summary.status) }]}>
                {summary.status}
              </Text>
            </View>
          </View>

          <View style={styles.hoursGrid}>
            <View style={styles.hoursItem}>
              <Text style={styles.hoursLabel}>Total Hours</Text>
              <Text style={styles.hoursValue}>{summary.totalHours.toFixed(1)}</Text>
            </View>
            
            <View style={styles.hoursItem}>
              <Text style={styles.hoursLabel}>Regular</Text>
              <Text style={styles.hoursValue}>{summary.regularHours.toFixed(1)}</Text>
            </View>
            
            <View style={styles.hoursItem}>
              <Text style={styles.hoursLabel}>Overtime</Text>
              <Text style={[styles.hoursValue, { color: summary.overtimeHours > 0 ? '#F59E0B' : '#FFFFFF' }]}>
                {summary.overtimeHours.toFixed(1)}
              </Text>
            </View>
          </View>

          {summary.status === 'PENDING' && (
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmitTimesheet}>
              <Text style={styles.submitButtonText}>Submit for Approval</Text>
              <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Entries List */}
      <View style={styles.entriesSection}>
        <Text style={styles.sectionTitle}>Time Entries</Text>
        
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="document-text-outline" size={48} color="#6B7280" />
            <Text style={styles.emptyTitle}>No Entries Yet</Text>
            <Text style={styles.emptySubtitle}>
              Clock in and out during your shifts to see entries here
            </Text>
          </View>
        ) : (
          <View style={styles.entriesList}>
            {entries.map((entry) => (
              <View key={entry.id} style={styles.entryCard}>
                <View style={styles.entryHeader}>
                  <Text style={styles.entryDate}>
                    {new Date(entry.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </Text>
                  <Text style={styles.entryHours}>{entry.hours.toFixed(1)}h</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* History */}
      <View style={styles.historySection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Previous Timesheets</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color="#6B7280" />
          <Text style={styles.emptySubtitle}>No previous timesheets</Text>
        </View>
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
  summaryCard: {
    margin: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
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
  hoursGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  hoursItem: {
    flex: 1,
    alignItems: 'center',
  },
  hoursLabel: {
    fontSize: 12,
    color: '#94A3B8',
    marginBottom: 8,
  },
  hoursValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  entriesSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
  entriesList: {
    gap: 8,
  },
  entryCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
  },
  entryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  entryDate: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  entryHours: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3B82F6',
  },
  historySection: {
    padding: 20,
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  viewAllText: {
    fontSize: 14,
    color: '#3B82F6',
    fontWeight: '600',
  },
});
