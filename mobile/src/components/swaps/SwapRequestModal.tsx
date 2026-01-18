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
import { EligibleSwapTarget } from '../../api/swaps';

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
  const [employees, setEmployees] = useState<EligibleSwapTarget[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<EligibleSwapTarget | null>(null);
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
        isOpenSwap ? undefined : selectedEmployee?.employeeId,
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

  const renderEmployeeItem = ({ item }: { item: EligibleSwapTarget }) => {
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
