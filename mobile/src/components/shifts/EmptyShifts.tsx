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
