---
description: Mobile T&A Phase 4 - Full Shifts/Schedule Screen with Week and Day Views
---

# Phase 4: Shifts/Schedule Screen

## Objective

Create a comprehensive shifts screen that replaces the existing ScheduleScreen with:
1. Week view with horizontal day navigation
2. Day view with detailed shift cards
3. Shift details modal
4. Quick actions (swap, view details)
5. Pull-to-refresh and loading states

## Prerequisites

- Complete Phase 1 (API Services)
- Complete Phase 2 (Dashboard Tiles)
- Complete Phase 3 (Clock Enhancements)
- Review existing `mobile/src/screens/ScheduleScreen.tsx`
- Review `mobile/src/api/shifts.ts` from Phase 1

## Files to Create

### 1. `mobile/src/components/shifts/WeekView.tsx`

```typescript
// mobile/src/components/shifts/WeekView.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday,
  parseISO,
} from 'date-fns';
import { Shift } from '../../api/shifts';

interface WeekViewProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  shifts: Shift[];
  weekStartDate: Date;
}

export function WeekView({
  selectedDate,
  onDateSelect,
  shifts,
  weekStartDate,
}: WeekViewProps) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStartDate, i));

  const getShiftCountForDay = (date: Date): number => {
    return shifts.filter((shift) =>
      isSameDay(parseISO(shift.startTime), date)
    ).length;
  };

  const hasShiftOnDay = (date: Date): boolean => {
    return getShiftCountForDay(date) > 0;
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);
          const hasShift = hasShiftOnDay(day);
          const shiftCount = getShiftCountForDay(day);

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
                  isTodayDate && !isSelected && styles.todayText,
                ]}
              >
                {format(day, 'EEE')}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.selectedText,
                  isTodayDate && !isSelected && styles.todayText,
                ]}
              >
                {format(day, 'd')}
              </Text>
              {hasShift && (
                <View
                  style={[
                    styles.shiftIndicator,
                    isSelected && styles.selectedIndicator,
                  ]}
                >
                  {shiftCount > 1 && (
                    <Text style={styles.shiftCount}>{shiftCount}</Text>
                  )}
                </View>
              )}
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
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  scrollContent: {
    paddingHorizontal: 12,
  },
  dayButton: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 4,
    borderRadius: 12,
    minWidth: 48,
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
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  selectedText: {
    color: '#ffffff',
  },
  todayText: {
    color: '#6366f1',
  },
  shiftIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e',
    marginTop: 6,
  },
  selectedIndicator: {
    backgroundColor: '#ffffff',
  },
  shiftCount: {
    fontSize: 8,
    color: '#ffffff',
    fontWeight: '600',
  },
});
```

### 2. `mobile/src/components/shifts/ShiftCard.tsx`

```typescript
// mobile/src/components/shifts/ShiftCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Shift } from '../../api/shifts';

interface ShiftCardProps {
  shift: Shift;
  onPress: () => void;
  onSwapPress?: () => void;
}

export function ShiftCard({ shift, onPress, onSwapPress }: ShiftCardProps) {
  const startTime = parseISO(shift.startTime);
  const endTime = parseISO(shift.endTime);
  const durationMinutes = differenceInMinutes(endTime, startTime) - (shift.breakDuration || 0);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

  const getStatusColor = () => {
    switch (shift.attendanceStatus) {
      case 'CONFIRMED':
        return '#22c55e';
      case 'LATE':
        return '#f59e0b';
      case 'NO_SHOW':
        return '#ef4444';
      case 'EARLY_LEAVE':
        return '#f97316';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = () => {
    switch (shift.attendanceStatus) {
      case 'CONFIRMED':
        return 'Confirmed';
      case 'LATE':
        return 'Late';
      case 'NO_SHOW':
        return 'No Show';
      case 'EARLY_LEAVE':
        return 'Left Early';
      default:
        return 'Scheduled';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Time Bar */}
      <View style={[styles.timeBar, { backgroundColor: getStatusColor() }]} />

      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </Text>
            <Text style={styles.durationText}>
              {hours > 0 ? `${hours}h ` : ''}{minutes > 0 ? `${minutes}m` : ''}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusLabel()}
            </Text>
          </View>
        </View>

        {/* Details Row */}
        <View style={styles.detailsRow}>
          {shift.role && (
            <View style={styles.detailItem}>
              <Ionicons name="briefcase-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>{shift.role}</Text>
            </View>
          )}
          {shift.department?.name && (
            <View style={styles.detailItem}>
              <Ionicons name="business-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>{shift.department.name}</Text>
            </View>
          )}
          {shift.location?.name && (
            <View style={styles.detailItem}>
              <Ionicons name="location-outline" size={14} color="#6b7280" />
              <Text style={styles.detailText}>{shift.location.name}</Text>
            </View>
          )}
        </View>

        {/* Break Info */}
        {shift.breakDuration > 0 && (
          <View style={styles.breakInfo}>
            <Ionicons name="cafe-outline" size={12} color="#9ca3af" />
            <Text style={styles.breakText}>{shift.breakDuration} min break</Text>
          </View>
        )}

        {/* Notes */}
        {shift.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText} numberOfLines={2}>
              {shift.notes}
            </Text>
          </View>
        )}

        {/* Virtual Shift Indicator */}
        {shift.isVirtualShift && (
          <View style={styles.virtualBadge}>
            <Ionicons name="repeat-outline" size={12} color="#6366f1" />
            <Text style={styles.virtualText}>From Working Pattern</Text>
          </View>
        )}

        {/* Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onPress}
          >
            <Ionicons name="eye-outline" size={16} color="#6366f1" />
            <Text style={styles.actionText}>Details</Text>
          </TouchableOpacity>
          
          {onSwapPress && !shift.isVirtualShift && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={onSwapPress}
            >
              <Ionicons name="swap-horizontal-outline" size={16} color="#6366f1" />
              <Text style={styles.actionText}>Swap</Text>
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
  timeBar: {
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
    marginBottom: 12,
  },
  timeContainer: {
    flex: 1,
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  durationText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    marginBottom: 4,
  },
  detailText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 4,
  },
  breakInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  breakText: {
    fontSize: 12,
    color: '#9ca3af',
    marginLeft: 4,
  },
  notesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 13,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  virtualBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  virtualText: {
    fontSize: 11,
    color: '#6366f1',
    marginLeft: 4,
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
    marginRight: 20,
  },
  actionText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 4,
  },
});
```

### 3. `mobile/src/components/shifts/ShiftDetailsModal.tsx`

```typescript
// mobile/src/components/shifts/ShiftDetailsModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { Shift } from '../../api/shifts';

interface ShiftDetailsModalProps {
  visible: boolean;
  shift: Shift | null;
  onClose: () => void;
  onSwapPress: () => void;
}

export function ShiftDetailsModal({
  visible,
  shift,
  onClose,
  onSwapPress,
}: ShiftDetailsModalProps) {
  if (!shift) return null;

  const startTime = parseISO(shift.startTime);
  const endTime = parseISO(shift.endTime);
  const durationMinutes = differenceInMinutes(endTime, startTime) - (shift.breakDuration || 0);
  const hours = Math.floor(durationMinutes / 60);
  const minutes = durationMinutes % 60;

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
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.title}>Shift Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Date & Time Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="calendar-outline" size={20} color="#6366f1" />
              <Text style={styles.cardTitle}>Date & Time</Text>
            </View>
            
            <View style={styles.dateTimeRow}>
              <Text style={styles.dateText}>
                {format(startTime, 'EEEE, MMMM d, yyyy')}
              </Text>
            </View>
            
            <View style={styles.timeRow}>
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>Start</Text>
                <Text style={styles.timeValue}>{format(startTime, 'h:mm a')}</Text>
              </View>
              <Ionicons name="arrow-forward" size={20} color="#d1d5db" />
              <View style={styles.timeBlock}>
                <Text style={styles.timeLabel}>End</Text>
                <Text style={styles.timeValue}>{format(endTime, 'h:mm a')}</Text>
              </View>
            </View>

            <View style={styles.durationRow}>
              <Text style={styles.durationLabel}>Duration</Text>
              <Text style={styles.durationValue}>
                {hours > 0 ? `${hours} hours ` : ''}{minutes > 0 ? `${minutes} minutes` : ''}
              </Text>
            </View>

            {shift.breakDuration > 0 && (
              <View style={styles.breakRow}>
                <Ionicons name="cafe-outline" size={16} color="#6b7280" />
                <Text style={styles.breakText}>
                  {shift.breakDuration} minute break included
                </Text>
              </View>
            )}
          </View>

          {/* Location & Role Card */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Ionicons name="business-outline" size={20} color="#6366f1" />
              <Text style={styles.cardTitle}>Assignment</Text>
            </View>

            {shift.role && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Role</Text>
                <Text style={styles.infoValue}>{shift.role}</Text>
              </View>
            )}

            {shift.department?.name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Department</Text>
                <Text style={styles.infoValue}>{shift.department.name}</Text>
              </View>
            )}

            {shift.location?.name && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Location</Text>
                <Text style={styles.infoValue}>{shift.location.name}</Text>
              </View>
            )}
          </View>

          {/* Notes Card */}
          {shift.notes && (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Ionicons name="document-text-outline" size={20} color="#6366f1" />
                <Text style={styles.cardTitle}>Notes</Text>
              </View>
              <Text style={styles.notesText}>{shift.notes}</Text>
            </View>
          )}

          {/* Virtual Shift Info */}
          {shift.isVirtualShift && (
            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
              <Text style={styles.infoCardText}>
                This shift is generated from your working pattern. It may be replaced by a specific shift assignment.
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        {!shift.isVirtualShift && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.swapButton}
              onPress={onSwapPress}
              activeOpacity={0.8}
            >
              <Ionicons name="swap-horizontal-outline" size={20} color="#ffffff" />
              <Text style={styles.swapButtonText}>Request Swap</Text>
            </TouchableOpacity>
          </View>
        )}
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
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  dateTimeRow: {
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  timeBlock: {
    flex: 1,
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1f2937',
  },
  durationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  durationLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  durationValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  breakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  breakText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
  },
  notesText: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  infoCardText: {
    flex: 1,
    fontSize: 13,
    color: '#4f46e5',
    marginLeft: 12,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  swapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    borderRadius: 12,
  },
  swapButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
```

### 4. `mobile/src/components/shifts/WeekNavigation.tsx`

```typescript
// mobile/src/components/shifts/WeekNavigation.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addWeeks, subWeeks, isSameWeek } from 'date-fns';

interface WeekNavigationProps {
  weekStartDate: Date;
  onWeekChange: (newWeekStart: Date) => void;
}

export function WeekNavigation({
  weekStartDate,
  onWeekChange,
}: WeekNavigationProps) {
  const isCurrentWeek = isSameWeek(weekStartDate, new Date(), { weekStartsOn: 1 });
  const weekEnd = addWeeks(weekStartDate, 1);

  const handlePreviousWeek = () => {
    onWeekChange(subWeeks(weekStartDate, 1));
  };

  const handleNextWeek = () => {
    onWeekChange(addWeeks(weekStartDate, 1));
  };

  const handleToday = () => {
    const today = new Date();
    const mondayOfThisWeek = new Date(today);
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    mondayOfThisWeek.setDate(diff);
    mondayOfThisWeek.setHours(0, 0, 0, 0);
    onWeekChange(mondayOfThisWeek);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.navButton}
        onPress={handlePreviousWeek}
      >
        <Ionicons name="chevron-back" size={24} color="#6366f1" />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.weekLabel}
        onPress={handleToday}
        disabled={isCurrentWeek}
      >
        <Text style={styles.weekText}>
          {format(weekStartDate, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
        </Text>
        {isCurrentWeek && (
          <View style={styles.currentBadge}>
            <Text style={styles.currentText}>This Week</Text>
          </View>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navButton}
        onPress={handleNextWeek}
      >
        <Ionicons name="chevron-forward" size={24} color="#6366f1" />
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
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  navButton: {
    padding: 8,
  },
  weekLabel: {
    alignItems: 'center',
  },
  weekText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  currentBadge: {
    backgroundColor: '#eef2ff',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  currentText: {
    fontSize: 11,
    color: '#6366f1',
    fontWeight: '500',
  },
});
```

### 5. `mobile/src/components/shifts/EmptyShifts.tsx`

```typescript
// mobile/src/components/shifts/EmptyShifts.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface EmptyShiftsProps {
  selectedDate: Date;
  isWeekView?: boolean;
}

export function EmptyShifts({ selectedDate, isWeekView = false }: EmptyShiftsProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
      </View>
      <Text style={styles.title}>No Shifts</Text>
      <Text style={styles.subtitle}>
        {isWeekView
          ? 'You have no shifts scheduled this week'
          : `No shifts on ${format(selectedDate, 'EEEE, MMMM d')}`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
```

### 6. `mobile/src/components/shifts/index.ts`

```typescript
// mobile/src/components/shifts/index.ts
export { WeekView } from './WeekView';
export { ShiftCard } from './ShiftCard';
export { ShiftDetailsModal } from './ShiftDetailsModal';
export { WeekNavigation } from './WeekNavigation';
export { EmptyShifts } from './EmptyShifts';
```

### 7. `mobile/src/screens/ShiftsScreen.tsx`

Replace or create the main shifts screen:

```typescript
// mobile/src/screens/ShiftsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  startOfWeek,
  isSameDay,
  parseISO,
} from 'date-fns';
import {
  WeekNavigation,
  WeekView,
  ShiftCard,
  ShiftDetailsModal,
  EmptyShifts,
} from '../components/shifts';
import { shiftService } from '../services/ShiftService';
import { Shift } from '../api/shifts';

export function ShiftsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [weekStartDate, setWeekStartDate] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const loadShifts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await shiftService.getWeekShifts(weekStartDate);
      setShifts(data);
    } catch (error) {
      console.error('[ShiftsScreen] Error loading shifts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekStartDate]);

  useFocusEffect(
    useCallback(() => {
      loadShifts();
    }, [loadShifts])
  );

  const handleWeekChange = (newWeekStart: Date) => {
    setWeekStartDate(newWeekStart);
    setSelectedDate(newWeekStart);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleShiftPress = (shift: Shift) => {
    setSelectedShift(shift);
    setDetailsModalVisible(true);
  };

  const handleSwapPress = (shift: Shift) => {
    setDetailsModalVisible(false);
    navigation.navigate('ShiftSwaps', { shiftToSwap: shift });
  };

  const handleRefresh = () => {
    loadShifts(true);
  };

  // Filter shifts for selected date
  const filteredShifts = shifts.filter((shift) =>
    isSameDay(parseISO(shift.startTime), selectedDate)
  );

  const renderShiftCard = ({ item }: { item: Shift }) => (
    <ShiftCard
      shift={item}
      onPress={() => handleShiftPress(item)}
      onSwapPress={() => handleSwapPress(item)}
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
      {/* Week Navigation */}
      <WeekNavigation
        weekStartDate={weekStartDate}
        onWeekChange={handleWeekChange}
      />

      {/* Week Day Selector */}
      <WeekView
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        shifts={shifts}
        weekStartDate={weekStartDate}
      />

      {/* Shifts List */}
      {filteredShifts.length === 0 ? (
        <EmptyShifts selectedDate={selectedDate} />
      ) : (
        <FlatList
          data={filteredShifts}
          keyExtractor={(item) => item.id}
          renderItem={renderShiftCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
        />
      )}

      {/* Shift Details Modal */}
      <ShiftDetailsModal
        visible={detailsModalVisible}
        shift={selectedShift}
        onClose={() => setDetailsModalVisible(false)}
        onSwapPress={() => selectedShift && handleSwapPress(selectedShift)}
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
  },
});
```

## Navigation Update

Update the navigation to use the new ShiftsScreen:

In `mobile/src/navigation/AppNavigator.tsx`:

```typescript
// Replace ScheduleScreen import with:
import { ShiftsScreen } from '../screens/ShiftsScreen';

// In the Tab.Navigator, update the Schedule tab:
<Tab.Screen
  name="Shifts"
  component={ShiftsScreen}
  options={{
    tabBarLabel: 'Shifts',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="calendar-outline" size={size} color={color} />
    ),
  }}
/>
```

## Verification Steps

1. **Week Navigation**
   - Previous/next week buttons work
   - Week label shows correct date range
   - "This Week" badge shows for current week
   - Tapping week label returns to current week

2. **Week View**
   - All 7 days display correctly
   - Selected day is highlighted
   - Today has special styling
   - Days with shifts show indicator dot
   - Multiple shifts show count

3. **Shift Cards**
   - Time displays correctly
   - Duration calculates correctly (minus break)
   - Status badge shows correct color
   - Role, department, location display when present
   - Break duration shows when > 0
   - Notes display when present
   - Virtual shift badge shows for pattern-based shifts
   - Details and Swap buttons work

4. **Shift Details Modal**
   - Opens when tapping shift card
   - All shift info displays correctly
   - Close button works
   - Swap button navigates to swap screen

5. **Empty State**
   - Shows when no shifts for selected day
   - Message is contextual to date

6. **Pull to Refresh**
   - Refreshes shift data
   - Shows loading indicator

## Next Step

Proceed to `mobile-ta-05-shift-swaps.md` to implement the shift swap functionality.
