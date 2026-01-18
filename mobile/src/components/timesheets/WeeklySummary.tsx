import React from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Timesheet } from '../../api/timesheets';

interface WeeklySummaryProps {
  timesheet: Timesheet;
}

export function WeeklySummary({ timesheet }: WeeklySummaryProps) {
  const periodStart = parseISO(timesheet.periodStart);
  const periodEnd = parseISO(timesheet.periodEnd);

  const getStatusColor = () => {
    switch (timesheet.approvalStatus) {
      case 'APPROVED':
        return '#22c55e';
      case 'REJECTED':
        return '#ef4444';
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = () => {
    switch (timesheet.approvalStatus) {
      case 'APPROVED':
        return 'Approved';
      case 'REJECTED':
        return 'Rejected';
      case 'PENDING_APPROVAL':
        return 'Pending Approval';
      case 'SUBMITTED':
        return 'Submitted';
      case 'DRAFT':
        return 'Draft';
      default:
        return timesheet.approvalStatus;
    }
  };

  const formatHours = (hours: number | null | undefined): string => {
    if (hours === null || hours === undefined) return '0.0';
    return hours.toFixed(1);
  };

  return (
    <View style={styles.container}>
      {/* Period Header */}
      <View style={styles.periodHeader}>
        <View>
          <Text style={styles.periodLabel}>Week of</Text>
          <Text style={styles.periodDates}>
            {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d, yyyy')}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
          <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
          <Text style={[styles.statusText, { color: getStatusColor() }]}>
            {getStatusLabel()}
          </Text>
        </View>
      </View>

      {/* Hours Grid */}
      <View style={styles.hoursGrid}>
        {/* Total Hours */}
        <View style={styles.hoursCard}>
          <View style={styles.hoursIconContainer}>
            <Ionicons name="time-outline" size={24} color="#6366f1" />
          </View>
          <Text style={styles.hoursValue}>{formatHours(timesheet.totalHours)}</Text>
          <Text style={styles.hoursLabel}>Total Hours</Text>
        </View>

        {/* Regular Hours */}
        <View style={styles.hoursCard}>
          <View style={[styles.hoursIconContainer, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="checkmark-circle-outline" size={24} color="#22c55e" />
          </View>
          <Text style={styles.hoursValue}>{formatHours(timesheet.regularHours)}</Text>
          <Text style={styles.hoursLabel}>Regular</Text>
        </View>

        {/* Overtime Hours */}
        <View style={styles.hoursCard}>
          <View style={[styles.hoursIconContainer, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="flash-outline" size={24} color="#f59e0b" />
          </View>
          <Text style={styles.hoursValue}>{formatHours(timesheet.overtimeHours)}</Text>
          <Text style={styles.hoursLabel}>Overtime</Text>
        </View>
      </View>

      {/* Entry Count */}
      {timesheet._count?.TimesheetEntries !== undefined && (
        <View style={styles.entryCountRow}>
          <Ionicons name="list-outline" size={16} color="#6b7280" />
          <Text style={styles.entryCountText}>
            {timesheet._count.TimesheetEntries} time entries
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  periodHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  periodLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  periodDates: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  hoursGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  hoursCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  hoursIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  hoursValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
  },
  hoursLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  entryCountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  entryCountText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 6,
  },
});
