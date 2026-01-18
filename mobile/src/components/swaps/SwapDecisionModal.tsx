// mobile/src/components/swaps/SwapDecisionModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { ShiftSwapRequest } from '../../api/swaps';
import { swapService } from '../../services/SwapService';

interface SwapDecisionModalProps {
  visible: boolean;
  swap: ShiftSwapRequest | null;
  action: 'accept' | 'reject' | 'cancel' | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SwapDecisionModal({
  visible,
  swap,
  action,
  onClose,
  onSuccess,
}: SwapDecisionModalProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!swap || !action) return;

    setLoading(true);

    try {
      switch (action) {
        case 'accept':
          await swapService.acceptSwap(swap.id);
          Alert.alert(
            'Swap Accepted',
            swap.managerApprovalRequired
              ? 'The swap has been accepted and is now awaiting manager approval.'
              : 'The swap has been completed successfully.',
            [{ text: 'OK', onPress: onSuccess }]
          );
          break;
        case 'reject':
          await swapService.rejectSwap(swap.id, reason.trim() || undefined);
          Alert.alert(
            'Swap Declined',
            'The swap request has been declined.',
            [{ text: 'OK', onPress: onSuccess }]
          );
          break;
        case 'cancel':
          await swapService.cancelSwap(swap.id);
          Alert.alert(
            'Request Cancelled',
            'Your swap request has been cancelled.',
            [{ text: 'OK', onPress: onSuccess }]
          );
          break;
      }
    } catch (error: any) {
      const message = error.response?.data?.error || `Failed to ${action} swap`;
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
      setReason('');
    }
  };

  if (!swap || !action) return null;

  const shiftStart = parseISO(swap.Shift.startTime);
  const shiftEnd = parseISO(swap.Shift.endTime);
  const requesterName = swap.Requester?.User
    ? `${swap.Requester.User.firstName || ''} ${swap.Requester.User.lastName || ''}`.trim()
    : 'Unknown';

  const getTitle = () => {
    switch (action) {
      case 'accept':
        return 'Accept Swap?';
      case 'reject':
        return 'Decline Swap?';
      case 'cancel':
        return 'Cancel Request?';
      default:
        return '';
    }
  };

  const getDescription = () => {
    switch (action) {
      case 'accept':
        return `You will take over ${requesterName}'s shift on ${format(shiftStart, 'EEEE, MMMM d')}.`;
      case 'reject':
        return `You are declining ${requesterName}'s swap request.`;
      case 'cancel':
        return 'This will cancel your swap request.';
      default:
        return '';
    }
  };

  const getButtonColor = () => {
    switch (action) {
      case 'accept':
        return '#22c55e';
      case 'reject':
      case 'cancel':
        return '#ef4444';
      default:
        return '#6366f1';
    }
  };

  const getButtonText = () => {
    switch (action) {
      case 'accept':
        return 'Accept Swap';
      case 'reject':
        return 'Decline Swap';
      case 'cancel':
        return 'Cancel Request';
      default:
        return '';
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Ionicons
              name={action === 'accept' ? 'checkmark-circle' : 'alert-circle'}
              size={48}
              color={getButtonColor()}
            />
            <Text style={styles.title}>{getTitle()}</Text>
            <Text style={styles.description}>{getDescription()}</Text>
          </View>

          {/* Shift Info */}
          <View style={styles.shiftCard}>
            <Text style={styles.shiftDate}>
              {format(shiftStart, 'EEEE, MMMM d, yyyy')}
            </Text>
            <Text style={styles.shiftTime}>
              {format(shiftStart, 'h:mm a')} - {format(shiftEnd, 'h:mm a')}
            </Text>
          </View>

          {/* Reason Input (for reject) */}
          {action === 'reject' && (
            <View style={styles.reasonSection}>
              <Text style={styles.reasonLabel}>Reason (Optional)</Text>
              <TextInput
                style={styles.reasonInput}
                value={reason}
                onChangeText={setReason}
                placeholder="Let them know why..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={2}
              />
            </View>
          )}

          {/* Manager Approval Notice */}
          {action === 'accept' && swap.managerApprovalRequired && (
            <View style={styles.noticeBox}>
              <Ionicons name="information-circle-outline" size={18} color="#6366f1" />
              <Text style={styles.noticeText}>
                This swap requires manager approval before it's finalized.
              </Text>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Go Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: getButtonColor() }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.confirmText}>{getButtonText()}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    marginTop: 12,
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  shiftCard: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  shiftDate: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  shiftTime: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  reasonSection: {
    marginBottom: 16,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1f2937',
    minHeight: 60,
  },
  noticeBox: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: '#4f46e5',
    marginLeft: 10,
    lineHeight: 18,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    marginRight: 8,
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginLeft: 8,
  },
  confirmText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
