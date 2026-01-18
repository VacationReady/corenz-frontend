---
description: Mobile T&A Phase 5 - Shift Swap Request and Management
---

# Phase 5: Shift Swap Functionality

## Objective

Implement full shift swap functionality including:
1. Request swap modal (select target employee or open swap)
2. Incoming swap requests list with accept/reject
3. Outgoing swap requests with cancel option
4. Swap status tracking
5. Push notification integration (optional)

## Prerequisites

- Complete Phase 1-4
- Review `mobile/src/api/swaps.ts` from Phase 1
- Review `mobile/src/services/SwapService.ts` from Phase 1
- Review backend `app/api/shift-swaps/route.ts`

## Files to Create

### 1. `mobile/src/components/swaps/SwapRequestModal.tsx`

```typescript
// mobile/src/components/swaps/SwapRequestModal.tsx
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
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { Shift } from '../../api/shifts';
import { swapService } from '../../services/SwapService';

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl: string | null;
  department?: string;
}

interface SwapRequestModalProps {
  visible: boolean;
  shift: Shift | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SwapRequestModal({
  visible,
  shift,
  onClose,
  onSuccess,
}: SwapRequestModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isOpenSwap, setIsOpenSwap] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (visible && shift) {
      loadEligibleEmployees();
    }
  }, [visible, shift]);

  const loadEligibleEmployees = async () => {
    if (!shift) return;
    
    try {
      setLoadingEmployees(true);
      const data = await swapService.getEligibleTargets(shift.id);
      setEmployees(data);
    } catch (error) {
      console.error('[SwapRequestModal] Error loading employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const resetForm = () => {
    setSelectedEmployee(null);
    setIsOpenSwap(false);
    setMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!shift) return;
    
    if (!isOpenSwap && !selectedEmployee) {
      Alert.alert('Selection Required', 'Please select an employee or choose "Open Swap"');
      return;
    }

    setLoading(true);

    try {
      await swapService.requestSwap(
        shift.id,
        isOpenSwap ? undefined : selectedEmployee?.id,
        message.trim() || undefined
      );

      Alert.alert(
        'Swap Requested',
        isOpenSwap
          ? 'Your open swap request has been posted. Any eligible colleague can accept it.'
          : `Your swap request has been sent to ${selectedEmployee?.firstName}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              resetForm();
              onSuccess();
            },
          },
        ]
      );
    } catch (error: any) {
      const errorMessage = error.response?.data?.error || 'Failed to create swap request';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const renderEmployeeItem = ({ item }: { item: Employee }) => {
    const isSelected = selectedEmployee?.id === item.id;
    
    return (
      <TouchableOpacity
        style={[styles.employeeItem, isSelected && styles.employeeItemSelected]}
        onPress={() => {
          setSelectedEmployee(item);
          setIsOpenSwap(false);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.employeeAvatar}>
          <Text style={styles.avatarText}>
            {item.firstName?.[0]}{item.lastName?.[0]}
          </Text>
        </View>
        <View style={styles.employeeInfo}>
          <Text style={styles.employeeName}>
            {item.firstName} {item.lastName}
          </Text>
          {item.department && (
            <Text style={styles.employeeDept}>{item.department}</Text>
          )}
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={24} color="#6366f1" />
        )}
      </TouchableOpacity>
    );
  };

  if (!shift) return null;

  const startTime = parseISO(shift.startTime);
  const endTime = parseISO(shift.endTime);

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
          <Text style={styles.title}>Request Swap</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Shift Info */}
          <View style={styles.shiftCard}>
            <Text style={styles.shiftLabel}>Shift to Swap</Text>
            <Text style={styles.shiftDate}>
              {format(startTime, 'EEEE, MMMM d, yyyy')}
            </Text>
            <Text style={styles.shiftTime}>
              {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
            </Text>
            {shift.role && (
              <Text style={styles.shiftRole}>{shift.role}</Text>
            )}
          </View>

          {/* Open Swap Option */}
          <TouchableOpacity
            style={[styles.openSwapOption, isOpenSwap && styles.openSwapSelected]}
            onPress={() => {
              setIsOpenSwap(true);
              setSelectedEmployee(null);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.openSwapIcon}>
              <Ionicons
                name="globe-outline"
                size={24}
                color={isOpenSwap ? '#6366f1' : '#6b7280'}
              />
            </View>
            <View style={styles.openSwapInfo}>
              <Text style={[styles.openSwapTitle, isOpenSwap && styles.openSwapTitleSelected]}>
                Open Swap
              </Text>
              <Text style={styles.openSwapDesc}>
                Post to all eligible colleagues
              </Text>
            </View>
            {isOpenSwap && (
              <Ionicons name="checkmark-circle" size={24} color="#6366f1" />
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or select a colleague</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Employee List */}
          {loadingEmployees ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#6366f1" />
              <Text style={styles.loadingText}>Loading colleagues...</Text>
            </View>
          ) : employees.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people-outline" size={32} color="#d1d5db" />
              <Text style={styles.emptyText}>
                No eligible colleagues found for this shift
              </Text>
            </View>
          ) : (
            <FlatList
              data={employees}
              keyExtractor={(item) => item.id}
              renderItem={renderEmployeeItem}
              scrollEnabled={false}
              style={styles.employeeList}
            />
          )}

          {/* Message Input */}
          <View style={styles.messageSection}>
            <Text style={styles.messageLabel}>Message (Optional)</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Add a note about why you need to swap..."
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
              {isOpenSwap
                ? 'Anyone who is eligible and available can accept your open swap request.'
                : 'The selected colleague will receive a notification and can accept or decline your request.'}
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
  sendText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  shiftCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  shiftLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shiftDate: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  shiftTime: {
    fontSize: 14,
    color: '#4b5563',
  },
  shiftRole: {
    fontSize: 13,
    color: '#6366f1',
    marginTop: 8,
  },
  openSwapOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  openSwapSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  openSwapIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  openSwapInfo: {
    flex: 1,
  },
  openSwapTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  openSwapTitleSelected: {
    color: '#6366f1',
  },
  openSwapDesc: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    fontSize: 12,
    color: '#9ca3af',
    marginHorizontal: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    textAlign: 'center',
  },
  employeeList: {
    marginBottom: 16,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  employeeItemSelected: {
    borderColor: '#6366f1',
    backgroundColor: '#eef2ff',
  },
  employeeAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1f2937',
  },
  employeeDept: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  messageSection: {
    marginBottom: 16,
  },
  messageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  messageInput: {
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
    marginBottom: 32,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4f46e5',
    marginLeft: 12,
    lineHeight: 18,
  },
});
```

### 2. `mobile/src/components/swaps/SwapCard.tsx`

```typescript
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
```

### 3. `mobile/src/components/swaps/SwapDecisionModal.tsx`

```typescript
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
```

### 4. `mobile/src/components/swaps/index.ts`

```typescript
// mobile/src/components/swaps/index.ts
export { SwapRequestModal } from './SwapRequestModal';
export { SwapCard } from './SwapCard';
export { SwapDecisionModal } from './SwapDecisionModal';
```

### 5. `mobile/src/screens/ShiftSwapsScreen.tsx`

```typescript
// mobile/src/screens/ShiftSwapsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SwapCard, SwapRequestModal, SwapDecisionModal } from '../components/swaps';
import { swapService } from '../services/SwapService';
import { ShiftSwapRequest } from '../api/swaps';
import { Shift } from '../api/shifts';

type TabType = 'incoming' | 'outgoing';

export function ShiftSwapsScreen() {
  const route = useRoute<any>();
  const shiftToSwap = route.params?.shiftToSwap as Shift | undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [incomingSwaps, setIncomingSwaps] = useState<ShiftSwapRequest[]>([]);
  const [outgoingSwaps, setOutgoingSwaps] = useState<ShiftSwapRequest[]>([]);
  
  // Modals
  const [requestModalVisible, setRequestModalVisible] = useState(!!shiftToSwap);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(shiftToSwap || null);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<ShiftSwapRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'accept' | 'reject' | 'cancel' | null>(null);

  const loadSwaps = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { incoming, outgoing } = await swapService.getMySwaps();
      setIncomingSwaps(incoming);
      setOutgoingSwaps(outgoing);
    } catch (error) {
      console.error('[ShiftSwapsScreen] Error loading swaps:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSwaps();
    }, [loadSwaps])
  );

  const handleAccept = (swap: ShiftSwapRequest) => {
    setSelectedSwap(swap);
    setDecisionAction('accept');
    setDecisionModalVisible(true);
  };

  const handleReject = (swap: ShiftSwapRequest) => {
    setSelectedSwap(swap);
    setDecisionAction('reject');
    setDecisionModalVisible(true);
  };

  const handleCancel = (swap: ShiftSwapRequest) => {
    setSelectedSwap(swap);
    setDecisionAction('cancel');
    setDecisionModalVisible(true);
  };

  const handleDecisionSuccess = () => {
    setDecisionModalVisible(false);
    setSelectedSwap(null);
    setDecisionAction(null);
    loadSwaps();
  };

  const handleRequestSuccess = () => {
    setRequestModalVisible(false);
    setSelectedShift(null);
    setActiveTab('outgoing');
    loadSwaps();
  };

  const currentSwaps = activeTab === 'incoming' ? incomingSwaps : outgoingSwaps;
  const pendingIncoming = incomingSwaps.filter(s => s.status === 'PENDING').length;

  const renderSwapCard = ({ item }: { item: ShiftSwapRequest }) => (
    <SwapCard
      swap={item}
      type={activeTab}
      onAccept={activeTab === 'incoming' ? () => handleAccept(item) : undefined}
      onReject={activeTab === 'incoming' ? () => handleReject(item) : undefined}
      onCancel={activeTab === 'outgoing' && item.status === 'PENDING' ? () => handleCancel(item) : undefined}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
          onPress={() => setActiveTab('incoming')}
        >
          <Text style={[styles.tabText, activeTab === 'incoming' && styles.activeTabText]}>
            Incoming
          </Text>
          {pendingIncoming > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingIncoming}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outgoing' && styles.activeTab]}
          onPress={() => setActiveTab('outgoing')}
        >
          <Text style={[styles.tabText, activeTab === 'outgoing' && styles.activeTabText]}>
            Outgoing
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swaps List */}
      {currentSwaps.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="swap-horizontal-outline" size={48} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No Swap Requests</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'incoming'
              ? "You don't have any incoming swap requests"
              : "You haven't requested any swaps yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentSwaps}
          keyExtractor={(item) => item.id}
          renderItem={renderSwapCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadSwaps(true)}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
        />
      )}

      {/* Swap Request Modal */}
      <SwapRequestModal
        visible={requestModalVisible}
        shift={selectedShift}
        onClose={() => {
          setRequestModalVisible(false);
          setSelectedShift(null);
        }}
        onSuccess={handleRequestSuccess}
      />

      {/* Decision Modal */}
      <SwapDecisionModal
        visible={decisionModalVisible}
        swap={selectedSwap}
        action={decisionAction}
        onClose={() => {
          setDecisionModalVisible(false);
          setSelectedSwap(null);
          setDecisionAction(null);
        }}
        onSuccess={handleDecisionSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#eef2ff',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
```

## Navigation Update

Add the ShiftSwapsScreen to navigation:

```typescript
// In mobile/src/navigation/AppNavigator.tsx
import { ShiftSwapsScreen } from '../screens/ShiftSwapsScreen';

// Add to Stack.Navigator:
<Stack.Screen
  name="ShiftSwaps"
  component={ShiftSwapsScreen}
  options={{
    title: 'Shift Swaps',
    headerBackTitle: 'Back',
  }}
/>
```

## Verification Steps

1. **Swap Request Modal**
   - Opens from shift details
   - Shows shift info correctly
   - Open swap option works
   - Employee list loads
   - Employee selection works
   - Message input works
   - Submit creates request
   - Error handling works

2. **Swap Cards**
   - Incoming/outgoing display correctly
   - Status badges show correct colors
   - Person info displays correctly
   - Shift info displays correctly
   - Messages display when present
   - Action buttons show for pending swaps

3. **Decision Modal**
   - Accept flow works
   - Reject flow with reason works
   - Cancel flow works
   - Manager approval notice shows when applicable

4. **Swaps Screen**
   - Tab switching works
   - Badge shows pending count
   - Pull to refresh works
   - Empty states display correctly
   - Navigation from shifts works

## Next Step

Proceed to `mobile-ta-06-timesheets.md` to implement the timesheet review and submission functionality.
