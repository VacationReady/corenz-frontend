import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Timesheet } from '../../api/timesheets';

interface TimesheetHistoryProps {
  timesheets: Timesheet[];
  onTimesheetPress: (timesheet: Timesheet) => void;
}

export function TimesheetHistory({
  timesheets,
  onTimesheetPress,
}: TimesheetHistoryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
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

  const getStatusIcon = (status: string): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'APPROVED':
        return 'checkmark-circle';
      case 'REJECTED':
        return 'close-circle';
      case 'PENDING_APPROVAL':
      case 'SUBMITTED':
        return 'time';
      default:
        return 'document-outline';
    }
  };

  const renderItem = ({ item }: { item: Timesheet }) => {
    const periodStart = parseISO(item.periodStart);
    const periodEnd = parseISO(item.periodEnd);
    const statusColor = getStatusColor(item.approvalStatus);

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() => onTimesheetPress(item)}
        activeOpacity={0.7}
      >
        <View style={[styles.statusIcon, { backgroundColor: `${statusColor}20` }]}>
          <Ionicons
            name={getStatusIcon(item.approvalStatus)}
            size={20}
            color={statusColor}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemPeriod}>
            {format(periodStart, 'MMM d')} - {format(periodEnd, 'MMM d, yyyy')}
          </Text>
          <Text style={styles.itemHours}>
            {item.totalHours?.toFixed(1) || '0.0'} hours
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
      </TouchableOpacity>
    );
  };

  if (timesheets.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No previous timesheets</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Previous Timesheets</Text>
      <FlatList
        data={timesheets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemPeriod: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  itemHours: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
  },
});
