import React, { useState } from 'react';
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
import { apiClient } from '../../api/client';

interface ManualEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function formatDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  };
  return date.toLocaleDateString('en-US', options);
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function isBefore(date1: Date, date2: Date): boolean {
  return date1.getTime() < date2.getTime();
}

function isAfter(date1: Date, date2: Date): boolean {
  return date1.getTime() > date2.getTime();
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ManualEntryModal({
  visible,
  onClose,
  onSuccess,
}: ManualEntryModalProps) {
  const [date, setDate] = useState(new Date());
  const [clockInTime, setClockInTime] = useState(new Date());
  const [clockOutTime, setClockOutTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClockInPicker, setShowClockInPicker] = useState(false);
  const [showClockOutPicker, setShowClockOutPicker] = useState(false);

  const resetForm = () => {
    setDate(new Date());
    setClockInTime(new Date());
    setClockOutTime(new Date());
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateTimes = (): string | null => {
    const now = new Date();

    // Combine date with times
    const fullClockIn = new Date(date);
    fullClockIn.setHours(clockInTime.getHours(), clockInTime.getMinutes(), 0, 0);

    const fullClockOut = new Date(date);
    fullClockOut.setHours(clockOutTime.getHours(), clockOutTime.getMinutes(), 0, 0);

    // Check if clock out is after clock in
    if (isBefore(fullClockOut, fullClockIn)) {
      return 'Clock out time must be after clock in time';
    }

    // Check if times are not in the future
    if (isAfter(fullClockIn, now)) {
      return 'Clock in time cannot be in the future';
    }

    if (isAfter(fullClockOut, now)) {
      return 'Clock out time cannot be in the future';
    }

    // Check if date is not more than 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (isBefore(date, startOfDay(sevenDaysAgo))) {
      return 'Cannot add entries more than 7 days in the past';
    }

    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateTimes();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setLoading(true);

    try {
      // Combine date with times
      const fullClockIn = new Date(date);
      fullClockIn.setHours(clockInTime.getHours(), clockInTime.getMinutes(), 0, 0);

      const fullClockOut = new Date(date);
      fullClockOut.setHours(clockOutTime.getHours(), clockOutTime.getMinutes(), 0, 0);

      await apiClient.post('/api/time-tracking/employee-manual-entry', {
        clockInTime: fullClockIn.toISOString(),
        clockOutTime: fullClockOut.toISOString(),
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Manual time entry created successfully', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onSuccess();
          },
        },
      ]);
    } catch (error: any) {
      const message = error.response?.data?.error || error.message || 'Failed to create manual entry';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (): string => {
    const fullClockIn = new Date(date);
    fullClockIn.setHours(clockInTime.getHours(), clockInTime.getMinutes(), 0, 0);

    const fullClockOut = new Date(date);
    fullClockOut.setHours(clockOutTime.getHours(), clockOutTime.getMinutes(), 0, 0);

    if (isBefore(fullClockOut, fullClockIn)) {
      return '0.00';
    }

    const diffMs = fullClockOut.getTime() - fullClockIn.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return hours.toFixed(2);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manual Entry</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Date Picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={styles.pickerText}>{formatDate(date)}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
            />
          )}

          {/* Clock In Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Clock In Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowClockInPicker(true)}
            >
              <Ionicons name="log-in-outline" size={20} color="#22c55e" />
              <Text style={styles.pickerText}>{formatTime(clockInTime)}</Text>
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
              <Text style={styles.pickerText}>{formatTime(clockOutTime)}</Text>
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

          {/* Hours Summary */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Hours</Text>
            <Text style={styles.summaryValue}>{calculateHours()} hrs</Text>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this entry..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
            <Text style={styles.infoText}>
              Manual entries are subject to manager approval and may be reviewed during timesheet reconciliation.
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
  summaryBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6366f1',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4f46e5',
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
    color: '#1f2937',
    minHeight: 100,
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
