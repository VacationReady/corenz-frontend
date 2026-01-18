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
