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
