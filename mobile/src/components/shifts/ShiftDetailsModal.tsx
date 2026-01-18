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
