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
  // Calculate no-show count (total - matched)
  const noShowCount = Math.max(0, stats.totalEntries - stats.matchedCount - stats.approvedCount);
  
  return (
    <View style={styles.container}>
      {/* Main Stats Header */}
      <View style={styles.headerRow}>
        <View style={styles.totalShifts}>
          <Text style={styles.totalValue}>{stats.totalEntries}</Text>
          <Text style={styles.totalLabel}>Total Shifts</Text>
        </View>
        <View style={styles.hoursDisplay}>
          <Ionicons name="time" size={16} color="#6366f1" />
          <Text style={styles.hoursText}>{stats.totalHours.toFixed(1)}h scheduled</Text>
        </View>
      </View>
      
      {/* Status Breakdown */}
      <View style={styles.statusRow}>
        {/* Needs Review */}
        <View style={styles.statusItem}>
          <View style={[styles.statusDot, { backgroundColor: '#f59e0b' }]} />
          <Text style={styles.statusValue}>{stats.pendingCount}</Text>
          <Text style={styles.statusLabel}>Review</Text>
        </View>

        {/* Flagged */}
        {stats.flaggedCount > 0 && (
          <View style={styles.statusItem}>
            <View style={[styles.statusDot, { backgroundColor: '#ef4444' }]} />
            <Text style={styles.statusValue}>{stats.flaggedCount}</Text>
            <Text style={styles.statusLabel}>Flagged</Text>
          </View>
        )}

        {/* Matched/Clocked */}
        <View style={styles.statusItem}>
          <View style={[styles.statusDot, { backgroundColor: '#6366f1' }]} />
          <Text style={styles.statusValue}>{stats.matchedCount}</Text>
          <Text style={styles.statusLabel}>Clocked</Text>
        </View>

        {/* Approved */}
        <View style={styles.statusItem}>
          <View style={[styles.statusDot, { backgroundColor: '#22c55e' }]} />
          <Text style={styles.statusValue}>{stats.approvedCount}</Text>
          <Text style={styles.statusLabel}>Approved</Text>
        </View>
      </View>

      {/* Variance indicator if significant */}
      {stats.varianceHours > 0.5 && (
        <View style={styles.varianceRow}>
          <Ionicons name="analytics-outline" size={14} color="#6b7280" />
          <Text style={styles.varianceText}>
            {stats.varianceHours.toFixed(1)}h total variance from scheduled
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalShifts: {
    alignItems: 'flex-start',
  },
  totalValue: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1f2937',
  },
  totalLabel: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  hoursDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  hoursText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '600',
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  statusItem: {
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  statusLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  varianceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    gap: 6,
  },
  varianceText: {
    fontSize: 12,
    color: '#6b7280',
  },
});
