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
        try {
          setClockInTime(parseISO(entry.clockInTime));
        } catch {
          setClockInTime(new Date());
        }
      }
      if (entry.clockOutTime) {
        try {
          setClockOutTime(parseISO(entry.clockOutTime));
        } catch {
          setClockOutTime(new Date());
        }
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
