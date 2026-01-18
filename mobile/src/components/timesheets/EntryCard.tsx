import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { TimesheetEntry } from '../../api/timesheets';

interface EntryCardProps {
  entry: TimesheetEntry;
  onPress: () => void;
  onAddNote?: () => void;
}

export function EntryCard({ entry, onPress, onAddNote }: EntryCardProps) {
  const date = parseISO(entry.date);
  const startTime = parseISO(entry.startTime);
  const endTime = parseISO(entry.endTime);

  const getEntryTypeIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (entry.entryType) {
      case 'CLOCK':
        return 'time-outline';
      case 'MANUAL':
        return 'create-outline';
      case 'SHIFT':
        return 'calendar-outline';
      default:
        return 'document-outline';
    }
  };

  const getEntryTypeLabel = () => {
    switch (entry.entryType) {
      case 'CLOCK':
        return 'Clock Entry';
      case 'MANUAL':
        return 'Manual Entry';
      case 'SHIFT':
        return 'From Shift';
      default:
        return entry.entryType;
    }
  };

  const getReconciliationColor = () => {
    switch (entry.reconciliationStatus) {
      case 'APPROVED':
        return '#22c55e';
      case 'FLAGGED':
        return '#ef4444';
      case 'ADJUSTED':
        return '#f59e0b';
      case 'MATCHED':
        return '#6366f1';
      default:
        return '#9ca3af';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Date Header */}
      <View style={styles.dateHeader}>
        <Text style={styles.dayName}>{format(date, 'EEEE')}</Text>
        <Text style={styles.dateText}>{format(date, 'MMM d')}</Text>
      </View>

      {/* Entry Content */}
      <View style={styles.content}>
        {/* Time Row */}
        <View style={styles.timeRow}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>In</Text>
            <Text style={styles.timeValue}>{format(startTime, 'h:mm a')}</Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color="#d1d5db" />
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Out</Text>
            <Text style={styles.timeValue}>{format(endTime, 'h:mm a')}</Text>
          </View>
          <View style={styles.hoursBlock}>
            <Text style={styles.hoursValue}>{entry.hours.toFixed(1)}h</Text>
            {entry.isOvertime && (
              <View style={styles.overtimeBadge}>
                <Text style={styles.overtimeText}>OT</Text>
              </View>
            )}
          </View>
        </View>

        {/* Break Info */}
        {entry.breakMinutes > 0 && (
          <View style={styles.breakRow}>
            <Ionicons name="cafe-outline" size={14} color="#9ca3af" />
            <Text style={styles.breakText}>{entry.breakMinutes} min break</Text>
          </View>
        )}

        {/* Public Holiday */}
        {entry.isPublicHoliday && entry.publicHolidayName && (
          <View style={styles.holidayBadge}>
            <Ionicons name="star-outline" size={14} color="#6366f1" />
            <Text style={styles.holidayText}>{entry.publicHolidayName}</Text>
          </View>
        )}

        {/* Notes */}
        {entry.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText} numberOfLines={2}>
              {entry.notes}
            </Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.typeContainer}>
            <Ionicons name={getEntryTypeIcon()} size={14} color="#6b7280" />
            <Text style={styles.typeText}>{getEntryTypeLabel()}</Text>
          </View>
          
          <View style={styles.footerActions}>
            {/* Reconciliation Status */}
            <View style={[styles.reconciliationDot, { backgroundColor: getReconciliationColor() }]} />
            
            {/* Add Note Button */}
            {onAddNote && (
              <TouchableOpacity
                style={styles.addNoteButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onAddNote();
                }}
              >
                <Ionicons name="chatbubble-outline" size={16} color="#6366f1" />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  dateHeader: {
    width: 60,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 12,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  timeBlock: {
    marginHorizontal: 8,
  },
  timeLabel: {
    fontSize: 10,
    color: '#9ca3af',
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  hoursBlock: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  overtimeBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  overtimeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#f59e0b',
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  holidayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  holidayText: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 4,
  },
  notesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
  },
  notesText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 11,
    color: '#6b7280',
    marginLeft: 4,
  },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  reconciliationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  addNoteButton: {
    padding: 4,
  },
});
