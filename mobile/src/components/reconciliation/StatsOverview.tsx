import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ReconciliationStats } from '../../api/reconciliation';

interface StatsOverviewProps {
  stats: ReconciliationStats;
}

export function StatsOverview({ stats }: StatsOverviewProps) {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* Pending */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="time-outline" size={20} color="#f59e0b" />
          </View>
          <Text style={styles.statValue}>{stats.pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>

        {/* Flagged */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#fef2f2' }]}>
            <Ionicons name="flag-outline" size={20} color="#ef4444" />
          </View>
          <Text style={styles.statValue}>{stats.flaggedCount}</Text>
          <Text style={styles.statLabel}>Flagged</Text>
        </View>

        {/* Matched */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#eef2ff' }]}>
            <Ionicons name="link-outline" size={20} color="#6366f1" />
          </View>
          <Text style={styles.statValue}>{stats.matchedCount}</Text>
          <Text style={styles.statLabel}>Matched</Text>
        </View>

        {/* Approved */}
        <View style={styles.statCard}>
          <View style={[styles.iconContainer, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#22c55e" />
          </View>
          <Text style={styles.statValue}>{stats.approvedCount}</Text>
          <Text style={styles.statLabel}>Approved</Text>
        </View>
      </View>

      {/* Hours Summary */}
      <View style={styles.hoursRow}>
        <View style={styles.hoursItem}>
          <Text style={styles.hoursLabel}>Total Hours</Text>
          <Text style={styles.hoursValue}>{stats.totalHours.toFixed(1)}h</Text>
        </View>
        {stats.varianceHours !== 0 && (
          <View style={styles.hoursItem}>
            <Text style={styles.hoursLabel}>Variance</Text>
            <Text style={[
              styles.hoursValue,
              { color: stats.varianceHours > 0 ? '#22c55e' : '#ef4444' }
            ]}>
              {stats.varianceHours > 0 ? '+' : ''}{stats.varianceHours.toFixed(1)}h
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  statLabel: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  hoursItem: {
    alignItems: 'center',
    marginHorizontal: 24,
  },
  hoursLabel: {
    fontSize: 12,
    color: '#6b7280',
  },
  hoursValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
});
