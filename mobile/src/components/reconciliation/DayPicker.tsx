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
