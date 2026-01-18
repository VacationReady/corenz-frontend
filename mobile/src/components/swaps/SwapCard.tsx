// mobile/src/components/swaps/SwapCard.tsx
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ShiftSwapRequest } from '../../api/swaps';

interface SwapCardProps {
  swap: ShiftSwapRequest;
  type: 'incoming' | 'outgoing';
  onAccept?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
  onPress?: () => void;
}

export function SwapCard({
  swap,
  type,
  onAccept,
  onReject,
  onCancel,
  onPress,
}: SwapCardProps) {
  const shiftStart = parseISO(swap.Shift.startTime);
  const shiftEnd = parseISO(swap.Shift.endTime);
  
  const getStatusColor = () => {
    switch (swap.status) {
      case 'PENDING':
        return '#f59e0b';
      case 'ACCEPTED':
      case 'APPROVED':
      case 'COMPLETED':
        return '#22c55e';
      case 'REJECTED':
      case 'CANCELLED':
        return '#ef4444';
      case 'MANAGER_PENDING':
        return '#6366f1';
      default:
        return '#6b7280';
    }
  };

  const getStatusLabel = () => {
    switch (swap.status) {
      case 'PENDING':
        return 'Pending';
      case 'ACCEPTED':
        return 'Accepted';
      case 'APPROVED':
        return 'Approved';
      case 'COMPLETED':
        return 'Completed';
      case 'REJECTED':
        return 'Rejected';
      case 'CANCELLED':
        return 'Cancelled';
      case 'MANAGER_PENDING':
        return 'Awaiting Manager';
      default:
        return swap.status;
    }
  };

  const requesterName = swap.Requester?.User
    ? `${swap.Requester.User.firstName || ''} ${swap.Requester.User.lastName || ''}`.trim()
    : 'Unknown';

  const targetName = swap.TargetEmployee?.User
    ? `${swap.TargetEmployee.User.firstName || ''} ${swap.TargetEmployee.User.lastName || ''}`.trim()
    : null;

  const isPending = swap.status === 'PENDING';
  const canTakeAction = isPending && (
    (type === 'incoming' && onAccept && onReject) ||
    (type === 'outgoing' && onCancel)
  );

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Status Bar */}
      <View style={[styles.statusBar, { backgroundColor: getStatusColor() }]} />

      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.typeContainer}>
            <Ionicons
              name={type === 'incoming' ? 'arrow-down-circle' : 'arrow-up-circle'}
              size={20}
              color={type === 'incoming' ? '#22c55e' : '#6366f1'}
            />
            <Text style={styles.typeText}>
              {type === 'incoming' ? 'Incoming Request' : 'Your Request'}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}20` }]}>
            <Text style={[styles.statusText, { color: getStatusColor() }]}>
              {getStatusLabel()}
            </Text>
          </View>
        </View>

        {/* Person Info */}
        <View style={styles.personRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {type === 'incoming'
                ? requesterName.split(' ').map(n => n[0]).join('')
                : targetName?.split(' ').map(n => n[0]).join('') || '?'}
            </Text>
          </View>
          <View style={styles.personInfo}>
            <Text style={styles.personLabel}>
              {type === 'incoming' ? 'From' : 'To'}
            </Text>
            <Text style={styles.personName}>
              {type === 'incoming' ? requesterName : targetName || 'Open Swap'}
            </Text>
          </View>
        </View>

        {/* Shift Info */}
        <View style={styles.shiftInfo}>
          <Ionicons name="calendar-outline" size={16} color="#6b7280" />
          <Text style={styles.shiftText}>
            {format(shiftStart, 'EEE, MMM d')} • {format(shiftStart, 'h:mm a')} - {format(shiftEnd, 'h:mm a')}
          </Text>
        </View>

        {/* Message */}
        {swap.requestMessage && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText} numberOfLines={2}>
              "{swap.requestMessage}"
            </Text>
          </View>
        )}

        {/* Response Message */}
        {swap.responseMessage && swap.status === 'REJECTED' && (
          <View style={styles.responseContainer}>
            <Text style={styles.responseLabel}>Reason:</Text>
            <Text style={styles.responseText}>{swap.responseMessage}</Text>
          </View>
        )}

        {/* Actions */}
        {canTakeAction && (
          <View style={styles.actionsRow}>
            {type === 'incoming' && (
              <>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={onAccept}
                >
                  <Ionicons name="checkmark" size={18} color="#ffffff" />
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.rejectButton]}
                  onPress={onReject}
                >
                  <Ionicons name="close" size={18} color="#ef4444" />
                  <Text style={styles.rejectText}>Decline</Text>
                </TouchableOpacity>
              </>
            )}
            {type === 'outgoing' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onCancel}
              >
                <Ionicons name="trash-outline" size={18} color="#ef4444" />
                <Text style={styles.cancelText}>Cancel Request</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Manager Approval Notice */}
        {swap.status === 'MANAGER_PENDING' && (
          <View style={styles.managerNotice}>
            <Ionicons name="time-outline" size={16} color="#6366f1" />
            <Text style={styles.managerText}>
              Awaiting manager approval
            </Text>
          </View>
        )}
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
  statusBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  personInfo: {
    flex: 1,
  },
  personLabel: {
    fontSize: 11,
    color: '#9ca3af',
  },
  personName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  shiftInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  shiftText: {
    fontSize: 13,
    color: '#6b7280',
    marginLeft: 8,
  },
  messageContainer: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  messageText: {
    fontSize: 13,
    color: '#4b5563',
    fontStyle: 'italic',
  },
  responseContainer: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  responseLabel: {
    fontSize: 11,
    color: '#ef4444',
    fontWeight: '500',
    marginBottom: 2,
  },
  responseText: {
    fontSize: 13,
    color: '#991b1b',
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
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 12,
  },
  acceptButton: {
    backgroundColor: '#22c55e',
    flex: 1,
  },
  acceptText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  rejectButton: {
    backgroundColor: '#fef2f2',
    flex: 1,
  },
  rejectText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  cancelButton: {
    backgroundColor: '#fef2f2',
  },
  cancelText: {
    color: '#ef4444',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  managerNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 8,
    padding: 10,
  },
  managerText: {
    fontSize: 13,
    color: '#6366f1',
    marginLeft: 8,
  },
});
