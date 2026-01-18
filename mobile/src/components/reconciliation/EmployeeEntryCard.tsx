import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ReconciliationEntry } from '../../api/reconciliation';

interface EmployeeEntryCardProps {
  entry: ReconciliationEntry;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onFlag: () => void;
  onApprove: () => void;
}

export function EmployeeEntryCard({
  entry,
  isSelected,
  onSelect,
  onEdit,
  onFlag,
  onApprove,
}: EmployeeEntryCardProps) {
  const getStatusColor = () => {
    switch (entry.status) {
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

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    try {
      return format(parseISO(timeStr), 'h:mm a');
    } catch {
      return '--:--';
    }
  };

  const getVarianceDisplay = () => {
    const { variance } = entry;
    if (!variance.totalVarianceMinutes) return null;
    
    const mins = Math.abs(variance.totalVarianceMinutes);
    const sign = variance.totalVarianceMinutes > 0 ? '+' : '-';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    
    return {
      text: hours > 0 ? `${sign}${hours}h ${minutes}m` : `${sign}${minutes}m`,
      color: variance.totalVarianceMinutes > 0 ? '#22c55e' : '#ef4444',
    };
  };

  const varianceDisplay = getVarianceDisplay();
  const hasFlags = entry.flags && entry.flags.length > 0;

  return (
    <TouchableOpacity
      style={[styles.container, isSelected && styles.selectedContainer]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]} />

      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          {/* Employee Info */}
          <View style={styles.employeeInfo}>
            {entry.profileImageUrl ? (
              <Image
                source={{ uri: entry.profileImageUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {entry.employeeName.split(' ').map(n => n[0]).join('')}
                </Text>
              </View>
            )}
            <View style={styles.nameContainer}>
              <Text style={styles.employeeName}>{entry.employeeName}</Text>
              <Text style={styles.employeeEmail}>{entry.employeeEmail}</Text>
            </View>
          </View>

          {/* Selection Checkbox */}
          <TouchableOpacity onPress={onSelect} style={styles.checkbox}>
            <Ionicons
              name={isSelected ? 'checkbox' : 'square-outline'}
              size={24}
              color={isSelected ? '#6366f1' : '#d1d5db'}
            />
          </TouchableOpacity>
        </View>

        {/* Times Comparison */}
        <View style={styles.timesRow}>
          {/* Scheduled */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>Scheduled</Text>
            <Text style={styles.timeValue}>
              {formatTime(entry.shiftStart)} - {formatTime(entry.shiftEnd)}
            </Text>
          </View>

          <Ionicons name="swap-horizontal" size={20} color="#d1d5db" />

          {/* Actual */}
          <View style={styles.timeColumn}>
            <Text style={styles.timeLabel}>Actual</Text>
            <Text style={styles.timeValue}>
              {formatTime(entry.clockInTime)} - {formatTime(entry.clockOutTime)}
            </Text>
          </View>
        </View>

        {/* Hours & Variance */}
        <View style={styles.hoursRow}>
          <View style={styles.hoursItem}>
            <Text style={styles.hoursLabel}>Hours</Text>
            <Text style={styles.hoursValue}>{entry.hours.toFixed(1)}h</Text>
          </View>
          {varianceDisplay && (
            <View style={styles.hoursItem}>
              <Text style={styles.hoursLabel}>Variance</Text>
              <Text style={[styles.varianceValue, { color: varianceDisplay.color }]}>
                {varianceDisplay.text}
              </Text>
            </View>
          )}
        </View>

        {/* Flags */}
        {hasFlags && (
          <View style={styles.flagsContainer}>
            {entry.flags.map((flag, index) => (
              <View key={index} style={styles.flagBadge}>
                <Ionicons name="warning-outline" size={12} color="#ef4444" />
                <Text style={styles.flagText}>{flag}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Notes */}
        {entry.notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText}>{entry.notes}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
            <Ionicons name="create-outline" size={18} color="#6366f1" />
            <Text style={styles.actionText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={onFlag}>
            <Ionicons
              name={entry.status === 'FLAGGED' ? 'flag' : 'flag-outline'}
              size={18}
              color={entry.status === 'FLAGGED' ? '#ef4444' : '#6366f1'}
            />
            <Text style={[
              styles.actionText,
              entry.status === 'FLAGGED' && { color: '#ef4444' }
            ]}>
              {entry.status === 'FLAGGED' ? 'Unflag' : 'Flag'}
            </Text>
          </TouchableOpacity>

          {entry.status !== 'APPROVED' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.approveButton]}
              onPress={onApprove}
            >
              <Ionicons name="checkmark" size={18} color="#ffffff" />
              <Text style={styles.approveText}>Approve</Text>
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
  selectedContainer: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  statusBar: {
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
    marginBottom: 16,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  employeeEmail: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  checkbox: {
    padding: 4,
  },
  timesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  timeColumn: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timeValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  hoursRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  hoursItem: {
    marginRight: 24,
  },
  hoursLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  hoursValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  varianceValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  flagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  flagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
    marginBottom: 4,
  },
  flagText: {
    fontSize: 11,
    color: '#ef4444',
    marginLeft: 4,
  },
  notesContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  notesText: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
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
    marginRight: 16,
    paddingVertical: 6,
  },
  actionText: {
    fontSize: 13,
    color: '#6366f1',
    fontWeight: '500',
    marginLeft: 4,
  },
  approveButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 'auto',
  },
  approveText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
    marginLeft: 4,
  },
});
