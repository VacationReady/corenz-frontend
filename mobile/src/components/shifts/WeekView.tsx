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
