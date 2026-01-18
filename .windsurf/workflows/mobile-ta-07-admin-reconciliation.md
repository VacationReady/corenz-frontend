---
description: Mobile T&A Phase 7 - Admin Reconciliation Screen for Payroll Approval
---

# Phase 7: Admin Reconciliation Screen

## Objective

Implement admin-only reconciliation functionality for reviewing and approving timesheet entries before payroll:
1. Day picker with stats overview
2. Employee entry cards with variance indicators
3. Edit clock entry modal
4. Bulk approve functionality
5. Flag/unflag entries

## Prerequisites

- Complete Phase 1-6
- Review `mobile/src/api/reconciliation.ts` from Phase 1
- Review backend `app/api/reconciliation/` routes
- User must have ADMIN or MANAGER role

## Files to Create

### 1. `mobile/src/components/reconciliation/DayPicker.tsx`

```typescript
// mobile/src/components/reconciliation/DayPicker.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  format,
  addDays,
  subDays,
  isSameDay,
  isToday,
  startOfWeek,
} from 'date-fns';

interface DayPickerProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  stats?: {
    [dateKey: string]: {
      pending: number;
      flagged: number;
      approved: number;
    };
  };
}

export function DayPicker({
  selectedDate,
  onDateSelect,
  stats = {},
}: DayPickerProps) {
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const handlePreviousWeek = () => {
    onDateSelect(subDays(selectedDate, 7));
  };

  const handleNextWeek = () => {
    onDateSelect(addDays(selectedDate, 7));
  };

  const getStatsForDay = (date: Date) => {
    const key = format(date, 'yyyy-MM-dd');
    return stats[key] || { pending: 0, flagged: 0, approved: 0 };
  };

  return (
    <View style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekNav}>
        <TouchableOpacity onPress={handlePreviousWeek} style={styles.navButton}>
          <Ionicons name="chevron-back" size={24} color="#6366f1" />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>
          {format(weekStart, 'MMM d')} - {format(addDays(weekStart, 6), 'MMM d, yyyy')}
        </Text>
        <TouchableOpacity onPress={handleNextWeek} style={styles.navButton}>
          <Ionicons name="chevron-forward" size={24} color="#6366f1" />
        </TouchableOpacity>
      </View>

      {/* Day Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.daysContainer}
      >
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const dayStats = getStatsForDay(day);
          const hasPending = dayStats.pending > 0;
          const hasFlagged = dayStats.flagged > 0;

          return (
            <TouchableOpacity
              key={day.toISOString()}
              style={[
                styles.dayButton,
                isSelected && styles.selectedDay,
                isTodayDate && !isSelected && styles.todayDay,
              ]}
              onPress={() => onDateSelect(day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.selectedText,
                ]}
              >
                {format(day, 'EEE')}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.selectedText,
                ]}
              >
                {format(day, 'd')}
              </Text>
              
              {/* Status Indicators */}
              <View style={styles.indicators}>
                {hasFlagged && (
                  <View style={[styles.indicator, styles.flaggedIndicator]} />
                )}
                {hasPending && !hasFlagged && (
                  <View style={[styles.indicator, styles.pendingIndicator]} />
                )}
                {!hasPending && !hasFlagged && dayStats.approved > 0 && (
                  <View style={[styles.indicator, styles.approvedIndicator]} />
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  navButton: {
    padding: 4,
  },
  weekLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  daysContainer: {
    paddingHorizontal: 12,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 50,
  },
  selectedDay: {
    backgroundColor: '#6366f1',
  },
  todayDay: {
    backgroundColor: '#eef2ff',
  },
  dayName: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginTop: 2,
  },
  selectedText: {
    color: '#ffffff',
  },
  indicators: {
    flexDirection: 'row',
    marginTop: 6,
    height: 6,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginHorizontal: 1,
  },
  pendingIndicator: {
    backgroundColor: '#f59e0b',
  },
  flaggedIndicator: {
    backgroundColor: '#ef4444',
  },
  approvedIndicator: {
    backgroundColor: '#22c55e',
  },
});
```

### 2. `mobile/src/components/reconciliation/StatsOverview.tsx`

```typescript
// mobile/src/components/reconciliation/StatsOverview.tsx
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
```

### 3. `mobile/src/components/reconciliation/EmployeeEntryCard.tsx`

```typescript
// mobile/src/components/reconciliation/EmployeeEntryCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ReconciliationEntry } from '../../api/reconciliation';

interface EmployeeEntryCardProps {
  entry: ReconciliationEntry;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onFlag: () => void;
  onApprove: () => void;
}

export function EmployeeEntryCard({
  entry,
  isSelected,
  onSelect,
  onEdit,
  onFlag,
  onApprove,
}: EmployeeEntryCardProps) {
  const getStatusColor = () => {
    switch (entry.status) {
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

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    return format(parseISO(timeStr), 'h:mm a');
  };

  const getVarianceDisplay = () => {
    const { variance } = entry;
    if (!variance.totalVarianceMinutes) return null;
    
    const mins = Math.abs(variance.totalVarianceMinutes);
    const sign = variance.totalVarianceMinutes > 0 ? '+' : '-';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    
    return {
      text: hours > 0 ? `${sign}${hours}h ${minutes}m` : `${sign}${minutes}m`,
      color: variance.totalVarianceMinutes > 0 ? '#22c55e' : '#ef4444',
    };
  };

  const varianceDisplay = getVarianceDisplay();
  const hasFlags = entry.flags && entry.flags.length > 0;

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selectedContainer]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]} />

      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          {/* Employee Info */}
          <View style={styles.employeeInfo}>
            {entry.profileImageUrl ? (
              <Image
                source={{ uri: entry.profileImageUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {entry.employeeName.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
            )}
            <View style={styles.nameContainer}>
              <Text style={styles.employeeName}>{entry.employeeName}</Text>
              <Text style={styles.employeeEmail}>{entry.employeeEmail}</Text>
            </View>
          </View>

          {/* Selection Checkbox */}
          <TouchableOpacity onPress={onSelect} style={styles.checkbox}>
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={24}
              color={isSelected ? '#6366f1' : '#d1d5db'}
            />
          </TouchableOpacity>
        </View>

        {/* Times Comparison */}
        <View style={styles.timesRow}>
          {/* Scheduled */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>Scheduled</Text>
            <Text style={styles.timeValue}>
              {formatTime(entry.shiftStart)} - {formatTime(entry.shiftEnd)}
            </Text>
          </View>

          <Ionicons name="swap-horizontal" size={20} color="#d1d5db" />

          {/* Actual */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>Actual</Text>
            <Text style={styles.timeValue}>
              {formatTime(entry.clockInTime)} - {formatTime(entry.clockOutTime)}
            </Text>
          </View>
        </View>

        {/* Hours & Variance */}
        <View style={styles.hoursRow}>
          <View style={styles.hoursItem}>
            <Text style={styles.hoursLabel}>Hours</Text>
            <Text style={styles.hoursValue}>{entry.hours.toFixed(1)}h</Text>
          </View>
          {varianceDisplay && (
            <View style={styles.hoursItem}>
              <Text style={styles.hoursLabel}>Variance</Text>
              <Text style={[styles.varianceValue, { color: varianceDisplay.color }]}>
                {varianceDisplay.text}
              </Text>
            </View>
          )}
        </View>

        {/* Flags */}
        {hasFlags && (
          <View style={styles.flagsContainer}>
            {entry.flags.map((flag, index) => (
              <View key={index} style={styles.flagBadge}>
                <Ionicons name="warning-outline" size={12} color="#ef4444" />
                <Text style={styles.flagText}>{flag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {entry.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{entry.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={18} color="#6366f1" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onFlag}>
            <Ionicons
              name={entry.status === 'FLAGGED' ? 'flag' : 'flag-outline'}
              size={18}
              color={entry.status === 'FLAGGED' ? '#ef4444' : '#6366f1'}
            />
            <Text style={[
              styles.actionText,
              entry.status === 'FLAGGED' && { color: '#ef4444' }
            ]}>
              {entry.status === 'FLAGGED' ? 'Unflag' : 'Flag'}
            </Text>
          </TouchableOpacity>

          {entry.status !== 'APPROVED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={onApprove}
            >
              <Ionicons name="checkmark" size={18} color="#ffffff" />
              <Text style={styles.approveText}>Approve</Text>
            </TouchableOpacity>
          )}
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
    marginVertical: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  statusBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  employeeEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  checkbox: {
    padding: 4,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  timeColumn: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  hoursRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  hoursItem: {
    marginRight: 24,
  },
  hoursLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  varianceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  flagText: {
    fontSize: 11,
    color: '#ef4444',
    marginLeft: 4,
  },
  notesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 4,
  },
  approveButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  approveText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 4,
  },
});
```

### 4. `mobile/src/components/reconciliation/EditEntryModal.tsx`

```typescript
// mobile/src/components/reconciliation/EditEntryModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, parseISO } from 'date-fns';
import { ReconciliationEntry } from '../../api/reconciliation';
import * as reconciliationApi from '../../api/reconciliation';

interface EditEntryModalProps {
  visible: boolean;
  entry: ReconciliationEntry | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditEntryModal({
  visible,
  entry,
  onClose,
  onSuccess,
}: EditEntryModalProps) {
  const [loading, setLoading] = useState(false);
  const [clockInTime, setClockInTime] = useState(new Date());
  const [clockOutTime, setClockOutTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  
  const [showClockInPicker, setShowClockInPicker] = useState(false);
  const [showClockOutPicker, setShowClockOutPicker] = useState(false);

  useEffect(() => {
    if (entry) {
      if (entry.clockInTime) {
        setClockInTime(parseISO(entry.clockInTime));
      }
      if (entry.clockOutTime) {
        setClockOutTime(parseISO(entry.clockOutTime));
      }
      setNotes(entry.notes || '');
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry || !entry.clockEntryId) {
      Alert.alert('Error', 'No clock entry to edit');
      return;
    }

    setLoading(true);

    try {
      await reconciliationApi.editClockEntry(entry.clockEntryId, {
        clockInTime: clockInTime.toISOString(),
        clockOutTime: clockOutTime.toISOString(),
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Entry updated successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update entry';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  if (!entry) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Entry</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Employee Info */}
          <View style={styles.employeeCard}>
            <Text style={styles.employeeName}>{entry.employeeName}</Text>
            <Text style={styles.entryDate}>
              {format(parseISO(entry.date), 'EEEE, MMMM d, yyyy')}
            </Text>
          </View>

          {/* Scheduled Times (Read-only) */}
          {entry.shiftStart && entry.shiftEnd && (
            <View style={styles.scheduledCard}>
              <Text style={styles.scheduledLabel}>Scheduled Shift</Text>
              <Text style={styles.scheduledTime}>
                {format(parseISO(entry.shiftStart), 'h:mm a')} - {format(parseISO(entry.shiftEnd), 'h:mm a')}
              </Text>
            </View>
          )}

          {/* Clock In Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Clock In Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowClockInPicker(true)}
            >
              <Ionicons name="log-in-outline" size={20} color="#22c55e" />
              <Text style={styles.pickerText}>{format(clockInTime, 'h:mm a')}</Text>
            </TouchableOpacity>
          </View>

          {showClockInPicker && (
            <DateTimePicker
              value={clockInTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowClockInPicker(Platform.OS === 'ios');
                if (selectedTime) {
                  setClockInTime(selectedTime);
                }
              }}
            />
          )}

          {/* Clock Out Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Clock Out Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowClockOutPicker(true)}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.pickerText}>{format(clockOutTime, 'h:mm a')}</Text>
            </TouchableOpacity>
          </View>

          {showClockOutPicker && (
            <DateTimePicker
              value={clockOutTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowClockOutPicker(Platform.OS === 'ios');
                if (selectedTime) {
                  setClockOutTime(selectedTime);
                }
              }}
            />
          )}

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add adjustment notes..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
            <Text style={styles.infoText}>
              This adjustment will be logged in the audit trail and marked as manager-adjusted.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  employeeCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  entryDate: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  scheduledCard: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  scheduledLabel: {
    fontSize: 12,
    color: '#6366f1',
    marginBottom: 4,
  },
  scheduledTime: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4f46e5',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickerText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 15,
    color: '#1f2937',
    minHeight: 80,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4f46e5',
    marginLeft: 12,
    lineHeight: 18,
  },
});
```

### 5. `mobile/src/components/reconciliation/BulkApproveBar.tsx`

```typescript
// mobile/src/components/reconciliation/BulkApproveBar.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BulkApproveBarProps {
  selectedCount: number;
  onApprove: () => void;
  onClearSelection: () => void;
  loading: boolean;
}

export function BulkApproveBar({
  selectedCount,
  onApprove,
  onClearSelection,
  loading,
}: BulkApproveBarProps) {
  if (selectedCount === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.selectionInfo}>
        <TouchableOpacity onPress={onClearSelection} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.selectionText}>
          {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'} selected
        </Text>
      </View>

      <TouchableOpacity
        style={styles.approveButton}
        onPress={onApprove}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Ionicons name="checkmark-done" size={20} color="#ffffff" />
            <Text style={styles.approveText}>Approve All</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  selectionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  approveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
});
```

### 6. `mobile/src/components/reconciliation/index.ts`

```typescript
// mobile/src/components/reconciliation/index.ts
export { DayPicker } from './DayPicker';
export { StatsOverview } from './StatsOverview';
export { EmployeeEntryCard } from './EmployeeEntryCard';
export { EditEntryModal } from './EditEntryModal';
export { BulkApproveBar } from './BulkApproveBar';
```

### 7. `mobile/src/screens/admin/ReconciliationScreen.tsx`

```typescript
// mobile/src/screens/admin/ReconciliationScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  DayPicker,
  StatsOverview,
  EmployeeEntryCard,
  EditEntryModal,
  BulkApproveBar,
} from '../../components/reconciliation';
import * as reconciliationApi from '../../api/reconciliation';
import { ReconciliationEntry, ReconciliationStats } from '../../api/reconciliation';

export function ReconciliationScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<ReconciliationEntry[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  
  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<ReconciliationEntry | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const dayData = await reconciliationApi.getDayReconciliation(selectedDate);
      setEntries(dayData.entries);
      setStats(dayData.stats);
      setSelectedEntryIds(new Set());
    } catch (error) {
      console.error('[ReconciliationScreen] Error loading data:', error);
      Alert.alert('Error', 'Failed to load reconciliation data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedEntryIds(new Set());
  };

  const handleEditEntry = (entry: ReconciliationEntry) => {
    setEntryToEdit(entry);
    setEditModalVisible(true);
  };

  const handleFlagEntry = async (entry: ReconciliationEntry) => {
    try {
      if (entry.status === 'FLAGGED') {
        // Unflag - approve instead
        await reconciliationApi.bulkApproveEntries([entry.timesheetEntryId!]);
      } else {
        await reconciliationApi.flagEntry(entry.timesheetEntryId!, 'Flagged for review');
      }
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update entry';
      Alert.alert('Error', message);
    }
  };

  const handleApproveEntry = async (entry: ReconciliationEntry) => {
    try {
      await reconciliationApi.bulkApproveEntries([entry.timesheetEntryId!]);
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to approve entry';
      Alert.alert('Error', message);
    }
  };

  const handleBulkApprove = async () => {
    const entryIds = Array.from(selectedEntryIds);
    const entriesToApprove = entries
      .filter(e => entryIds.includes(e.id) && e.timesheetEntryId)
      .map(e => e.timesheetEntryId!);

    if (entriesToApprove.length === 0) {
      Alert.alert('Error', 'No valid entries to approve');
      return;
    }

    Alert.alert(
      'Bulk Approve',
      `Approve ${entriesToApprove.length} entries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setBulkApproving(true);
            try {
              await reconciliationApi.bulkApproveEntries(entriesToApprove);
              Alert.alert('Success', `${entriesToApprove.length} entries approved`);
              loadData();
            } catch (error: any) {
              const message = error.response?.data?.error || 'Failed to approve entries';
              Alert.alert('Error', message);
            } finally {
              setBulkApproving(false);
            }
          },
        },
      ]
    );
  };

  const handleEditSuccess = () => {
    setEditModalVisible(false);
    setEntryToEdit(null);
    loadData();
  };

  const renderEntry = ({ item }: { item: ReconciliationEntry }) => (
    <EmployeeEntryCard
      entry={item}
      isSelected={selectedEntryIds.has(item.id)}
      onSelect={() => handleSelectEntry(item.id)}
      onEdit={() => handleEditEntry(item)}
      onFlag={() => handleFlagEntry(item)}
      onApprove={() => handleApproveEntry(item)}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Day Picker */}
      <DayPicker
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
      />

      {/* Stats Overview */}
      {stats && <StatsOverview stats={stats} />}

      {/* Entries List */}
      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="checkmark-done-outline" size={48} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No Entries</Text>
          <Text style={styles.emptySubtitle}>
            No time entries to reconcile for this day
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item) => item.id}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
        />
      )}

      {/* Bulk Approve Bar */}
      <BulkApproveBar
        selectedCount={selectedEntryIds.size}
        onApprove={handleBulkApprove}
        onClearSelection={handleClearSelection}
        loading={bulkApproving}
      />

      {/* Edit Modal */}
      <EditEntryModal
        visible={editModalVisible}
        entry={entryToEdit}
        onClose={() => {
          setEditModalVisible(false);
          setEntryToEdit(null);
        }}
        onSuccess={handleEditSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
```

## Navigation Update

Add ReconciliationScreen to navigation (admin-only):

```typescript
// In mobile/src/navigation/AppNavigator.tsx
import { ReconciliationScreen } from '../screens/admin/ReconciliationScreen';

// Add to Stack.Navigator (conditionally for admin/manager):
<Stack.Screen
  name="Reconciliation"
  component={ReconciliationScreen}
  options={{
    title: 'Reconciliation',
    headerBackTitle: 'Back',
  }}
/>
```

Add a link in the "More" tab or settings for admin users:

```typescript
// In mobile/src/screens/MoreScreen.tsx or similar
{isAdminOrManager && (
  <TouchableOpacity
    style={styles.menuItem}
    onPress={() => navigation.navigate('Reconciliation')}
  >
    <Ionicons name="checkmark-done-outline" size={24} color="#6366f1" />
    <Text style={styles.menuText}>Reconciliation</Text>
    <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
  </TouchableOpacity>
)}
```

## Verification Steps

1. **Day Picker**
   - Week navigation works
   - Day selection works
   - Status indicators show correctly
   - Today is highlighted

2. **Stats Overview**
   - All counts display correctly
   - Hours and variance display correctly
   - Colors match status

3. **Employee Entry Cards**
   - Employee info displays correctly
   - Times comparison shows scheduled vs actual
   - Variance calculates correctly
   - Flags display when present
   - Selection checkbox works
   - Edit, Flag, Approve buttons work

4. **Edit Entry Modal**
   - Pre-fills current times
   - Time pickers work
   - Notes input works
   - Save updates entry
   - Audit trail is created

5. **Bulk Approve**
   - Selection count updates
   - Clear selection works
   - Bulk approve confirmation works
   - Success message shows

6. **Flag/Unflag**
   - Flag entry works
   - Unflag (approve) works
   - Status updates correctly

## Next Step

Proceed to `mobile-ta-08-backend-enhancements.md` to implement any missing backend API endpoints.
