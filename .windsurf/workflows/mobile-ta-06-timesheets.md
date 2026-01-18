---
description: Mobile T&A Phase 6 - Timesheet Review and Submission
status: COMPLETED
completed_date: 2026-01-18
---

# Phase 6: Timesheet Review and Submission

## ✅ IMPLEMENTATION COMPLETE

All components and screens have been implemented:

### Files Created:
- `mobile/src/components/timesheets/WeeklySummary.tsx` - Weekly summary card with hours breakdown
- `mobile/src/components/timesheets/EntryCard.tsx` - Individual time entry card
- `mobile/src/components/timesheets/AddNoteModal.tsx` - Modal for adding/editing entry notes
- `mobile/src/components/timesheets/TimesheetHistory.tsx` - Previous timesheets list
- `mobile/src/components/timesheets/SubmitButton.tsx` - Submit/status button component
- `mobile/src/components/timesheets/index.ts` - Barrel export file
- `mobile/src/screens/TimesheetDetailScreen.tsx` - Detail view for historical timesheets

### Files Updated:
- `mobile/src/screens/TimesheetScreen.tsx` - Full replacement with new implementation
- `mobile/src/screens/MoreScreen.tsx` - Added "My Timesheets" menu item
- `mobile/src/navigation/AppNavigator.tsx` - Added Timesheets and TimesheetDetail routes

---

## Objective

Implement comprehensive timesheet functionality including:
1. Weekly summary view with hours breakdown
2. Daily entry list with details
3. Add/edit notes on entries
4. Submit timesheet for approval
5. Timesheet history with status tracking

## Prerequisites

- Complete Phase 1-5
- Review `mobile/src/api/timesheets.ts` from Phase 1
- Review `mobile/src/services/TimesheetService.ts` from Phase 1
- Review existing `mobile/src/screens/TimesheetScreen.tsx`

## Files to Create

### 1. `mobile/src/components/timesheets/WeeklySummary.tsx`

```typescript
// mobile/src/components/timesheets/WeeklySummary.tsx
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
```

### 2. `mobile/src/components/timesheets/EntryCard.tsx`

```typescript
// mobile/src/components/timesheets/EntryCard.tsx
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

  const getEntryTypeIcon = () => {
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
```

### 3. `mobile/src/components/timesheets/AddNoteModal.tsx`

```typescript
// mobile/src/components/timesheets/AddNoteModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { TimesheetEntry } from '../../api/timesheets';
import { timesheetService } from '../../services/TimesheetService';

interface AddNoteModalProps {
  visible: boolean;
  entry: TimesheetEntry | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddNoteModal({
  visible,
  entry,
  onClose,
  onSuccess,
}: AddNoteModalProps) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (entry) {
      setNotes(entry.notes || '');
    }
  }, [entry]);

  const handleSave = async () => {
    if (!entry) return;

    setLoading(true);

    try {
      await timesheetService.updateEntryNotes(entry.id, notes.trim());
      Alert.alert('Success', 'Notes updated successfully', [
        { text: 'OK', onPress: onSuccess },
      ]);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update notes';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setNotes('');
    onClose();
  };

  if (!entry) return null;

  const date = parseISO(entry.date);
  const startTime = parseISO(entry.startTime);
  const endTime = parseISO(entry.endTime);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Notes</Text>
          <TouchableOpacity onPress={handleSave} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {/* Entry Info */}
          <View style={styles.entryInfo}>
            <Text style={styles.entryDate}>
              {format(date, 'EEEE, MMMM d, yyyy')}
            </Text>
            <Text style={styles.entryTime}>
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')} ({entry.hours.toFixed(1)} hours)
            </Text>
          </View>

          {/* Notes Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this time entry..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </View>

          {/* Info */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={18} color="#6366f1" />
            <Text style={styles.infoText}>
              Notes are visible to your manager during timesheet review and reconciliation.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
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
  entryInfo: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  entryDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  entryTime: {
    fontSize: 14,
    color: '#6b7280',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 15,
    color: '#1f2937',
    minHeight: 150,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
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

### 4. `mobile/src/components/timesheets/TimesheetHistory.tsx`

```typescript
// mobile/src/components/timesheets/TimesheetHistory.tsx
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

  const getStatusIcon = (status: string) => {
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
```

### 5. `mobile/src/components/timesheets/SubmitButton.tsx`

```typescript
// mobile/src/components/timesheets/SubmitButton.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Timesheet } from '../../api/timesheets';

interface SubmitButtonProps {
  timesheet: Timesheet;
  loading: boolean;
  onSubmit: () => void;
}

export function SubmitButton({ timesheet, loading, onSubmit }: SubmitButtonProps) {
  const canSubmit = timesheet.approvalStatus === 'DRAFT';
  const isSubmitted = ['SUBMITTED', 'PENDING_APPROVAL'].includes(timesheet.approvalStatus);
  const isApproved = timesheet.approvalStatus === 'APPROVED';
  const isRejected = timesheet.approvalStatus === 'REJECTED';

  if (isApproved) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBar, styles.approvedBar]}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.approvedText}>Timesheet Approved</Text>
        </View>
      </View>
    );
  }

  if (isRejected) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBar, styles.rejectedBar]}>
          <Ionicons name="close-circle" size={20} color="#ef4444" />
          <View style={styles.rejectedContent}>
            <Text style={styles.rejectedText}>Timesheet Rejected</Text>
            <Text style={styles.rejectedHint}>Please review and resubmit</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color="#ffffff" />
              <Text style={styles.submitText}>Resubmit for Approval</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  if (isSubmitted) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBar, styles.pendingBar]}>
          <Ionicons name="time-outline" size={20} color="#f59e0b" />
          <Text style={styles.pendingText}>Awaiting Approval</Text>
        </View>
      </View>
    );
  }

  if (canSubmit) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#ffffff" />
              <Text style={styles.submitText}>Submit for Approval</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.submitHint}>
          Once submitted, your manager will review your timesheet
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  approvedBar: {
    backgroundColor: '#dcfce7',
  },
  approvedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22c55e',
    marginLeft: 8,
  },
  rejectedBar: {
    backgroundColor: '#fef2f2',
    marginBottom: 12,
  },
  rejectedContent: {
    marginLeft: 8,
  },
  rejectedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  rejectedHint: {
    fontSize: 12,
    color: '#ef4444',
  },
  pendingBar: {
    backgroundColor: '#fef3c7',
  },
  pendingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f59e0b',
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  submitHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
});
```

### 6. `mobile/src/components/timesheets/index.ts`

```typescript
// mobile/src/components/timesheets/index.ts
export { WeeklySummary } from './WeeklySummary';
export { EntryCard } from './EntryCard';
export { AddNoteModal } from './AddNoteModal';
export { TimesheetHistory } from './TimesheetHistory';
export { SubmitButton } from './SubmitButton';
```

### 7. `mobile/src/screens/TimesheetsScreen.tsx` (Full Replacement)

```typescript
// mobile/src/screens/TimesheetsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  WeeklySummary,
  EntryCard,
  AddNoteModal,
  TimesheetHistory,
  SubmitButton,
} from '../components/timesheets';
import { timesheetService } from '../services/TimesheetService';
import { Timesheet, TimesheetEntry } from '../api/timesheets';

export function TimesheetsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [previousTimesheets, setPreviousTimesheets] = useState<Timesheet[]>([]);
  
  // Note Modal
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      // Load current week timesheet
      const current = await timesheetService.getCurrentWeekTimesheet();
      setCurrentTimesheet(current);

      // Load entries if we have a current timesheet
      if (current) {
        const { entries: timesheetEntries } = await timesheetService.getTimesheetWithEntries(current.id);
        setEntries(timesheetEntries);
      } else {
        setEntries([]);
      }

      // Load previous timesheets
      const allTimesheets = await timesheetService.getMyTimesheets();
      // Filter out current week
      const previous = allTimesheets.filter(t => t.id !== current?.id).slice(0, 5);
      setPreviousTimesheets(previous);
    } catch (error) {
      console.error('[TimesheetsScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSubmit = async () => {
    if (!currentTimesheet) return;

    Alert.alert(
      'Submit Timesheet',
      'Are you sure you want to submit this timesheet for approval?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await timesheetService.submitTimesheet(currentTimesheet.id);
              Alert.alert('Success', 'Timesheet submitted for approval');
              loadData();
            } catch (error: any) {
              const message = error.response?.data?.error || 'Failed to submit timesheet';
              Alert.alert('Error', message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleEntryPress = (entry: TimesheetEntry) => {
    // Could navigate to entry detail screen
    setSelectedEntry(entry);
    setNoteModalVisible(true);
  };

  const handleAddNote = (entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setNoteModalVisible(true);
  };

  const handleNoteSuccess = () => {
    setNoteModalVisible(false);
    setSelectedEntry(null);
    loadData();
  };

  const handleTimesheetPress = (timesheet: Timesheet) => {
    navigation.navigate('TimesheetDetail', { timesheetId: timesheet.id });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      >
        {/* Current Week Summary */}
        {currentTimesheet && (
          <WeeklySummary timesheet={currentTimesheet} />
        )}

        {/* Entries List */}
        {entries.length > 0 && (
          <View style={styles.entriesSection}>
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onPress={() => handleEntryPress(entry)}
                onAddNote={() => handleAddNote(entry)}
              />
            ))}
          </View>
        )}

        {/* No Entries State */}
        {currentTimesheet && entries.length === 0 && (
          <View style={styles.emptyEntries}>
            <Text style={styles.emptyText}>No time entries this week</Text>
            <Text style={styles.emptyHint}>
              Clock in to start tracking your time
            </Text>
          </View>
        )}

        {/* No Timesheet State */}
        {!currentTimesheet && (
          <View style={styles.noTimesheet}>
            <Text style={styles.noTimesheetText}>
              No timesheet for this week yet
            </Text>
            <Text style={styles.noTimesheetHint}>
              A timesheet will be created when you clock in
            </Text>
          </View>
        )}

        {/* Previous Timesheets */}
        <TimesheetHistory
          timesheets={previousTimesheets}
          onTimesheetPress={handleTimesheetPress}
        />
      </ScrollView>

      {/* Submit Button */}
      {currentTimesheet && (
        <SubmitButton
          timesheet={currentTimesheet}
          loading={submitting}
          onSubmit={handleSubmit}
        />
      )}

      {/* Add Note Modal */}
      <AddNoteModal
        visible={noteModalVisible}
        entry={selectedEntry}
        onClose={() => {
          setNoteModalVisible(false);
          setSelectedEntry(null);
        }}
        onSuccess={handleNoteSuccess}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  entriesSection: {
    marginTop: 16,
  },
  emptyEntries: {
    alignItems: 'center',
    padding: 32,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  noTimesheet: {
    alignItems: 'center',
    padding: 48,
    marginTop: 32,
  },
  noTimesheetText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  noTimesheetHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
});
```

### 8. `mobile/src/screens/TimesheetDetailScreen.tsx`

```typescript
// mobile/src/screens/TimesheetDetailScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  WeeklySummary,
  EntryCard,
  AddNoteModal,
} from '../components/timesheets';
import { timesheetService } from '../services/TimesheetService';
import { Timesheet, TimesheetEntry } from '../api/timesheets';

export function TimesheetDetailScreen() {
  const route = useRoute<any>();
  const timesheetId = route.params?.timesheetId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!timesheetId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { timesheet: ts, entries: ent } = await timesheetService.getTimesheetWithEntries(timesheetId);
      setTimesheet(ts);
      setEntries(ent);
    } catch (error) {
      console.error('[TimesheetDetailScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timesheetId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleEntryPress = (entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setNoteModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      >
        {timesheet && <WeeklySummary timesheet={timesheet} />}

        <View style={styles.entriesSection}>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onPress={() => handleEntryPress(entry)}
            />
          ))}
        </View>
      </ScrollView>

      <AddNoteModal
        visible={noteModalVisible}
        entry={selectedEntry}
        onClose={() => {
          setNoteModalVisible(false);
          setSelectedEntry(null);
        }}
        onSuccess={() => {
          setNoteModalVisible(false);
          setSelectedEntry(null);
          loadData();
        }}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  entriesSection: {
    marginTop: 16,
  },
});
```

## Navigation Update

Add TimesheetDetailScreen to navigation:

```typescript
// In mobile/src/navigation/AppNavigator.tsx
import { TimesheetDetailScreen } from '../screens/TimesheetDetailScreen';

// Add to Stack.Navigator:
<Stack.Screen
  name="TimesheetDetail"
  component={TimesheetDetailScreen}
  options={{
    title: 'Timesheet Details',
    headerBackTitle: 'Back',
  }}
/>
```

## Verification Steps

1. **Weekly Summary**
   - Shows correct period dates
   - Status badge displays correctly
   - Hours breakdown is accurate
   - Entry count shows

2. **Entry Cards**
   - Date displays correctly
   - Times display correctly
   - Hours calculation is correct
   - Overtime badge shows when applicable
   - Break info shows when > 0
   - Public holiday badge shows when applicable
   - Notes display when present
   - Entry type icon is correct

3. **Add Note Modal**
   - Opens from entry card
   - Shows entry info
   - Pre-fills existing notes
   - Save updates notes
   - Cancel closes without saving

4. **Submit Button**
   - Shows "Submit" for draft timesheets
   - Shows "Awaiting Approval" for submitted
   - Shows "Approved" for approved
   - Shows "Rejected" with resubmit option
   - Submit confirmation dialog works

5. **Timesheet History**
   - Shows previous timesheets
   - Status icons are correct
   - Tapping navigates to detail

6. **Pull to Refresh**
   - Refreshes all data
   - Loading indicator shows

## Next Step

~~Proceed to `mobile-ta-07-admin-reconciliation.md` to implement the admin reconciliation screen.~~

**✅ Phase 7 (Admin Reconciliation) has been completed!**

Files created in Phase 7:
- `mobile/src/components/reconciliation/DayPicker.tsx` - Week/day picker with status indicators
- `mobile/src/components/reconciliation/StatsOverview.tsx` - Stats summary card
- `mobile/src/components/reconciliation/EmployeeEntryCard.tsx` - Entry card with edit/flag/approve actions
- `mobile/src/components/reconciliation/EditEntryModal.tsx` - Modal for editing clock times
- `mobile/src/components/reconciliation/BulkApproveBar.tsx` - Bulk approve selection bar
- `mobile/src/components/reconciliation/index.ts` - Barrel export
- `mobile/src/screens/admin/ReconciliationScreen.tsx` - Main reconciliation screen

Files updated:
- `mobile/src/navigation/AppNavigator.tsx` - Added Reconciliation route to MoreStack
- `mobile/src/screens/MoreScreen.tsx` - Added Admin section with Reconciliation menu (admin/manager only)

Proceed to `mobile-ta-08-backend-enhancements.md` for any remaining backend API work.
