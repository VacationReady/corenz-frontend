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
