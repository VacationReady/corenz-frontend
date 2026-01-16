import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  getLeaveBalances,
  getMyLeaveRequests,
  submitLeaveRequest,
  getEventCategories,
  LeaveBalance,
  LeaveRequest,
} from '../api/leave';
import { getMyFullProfile } from '../api/profile';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function LeaveScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState<string>('');
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedPolicy, setSelectedPolicy] = useState<string>('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [reason, setReason] = useState('');
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const loadData = async () => {
    try {
      const [profileData, balancesData, requestsData, categoriesData] = await Promise.allSettled([
        getMyFullProfile(),
        getLeaveBalances(),
        getMyLeaveRequests(),
        getEventCategories(),
      ]);

      if (profileData.status === 'fulfilled' && profileData.value) {
        setCurrentEmployeeId(profileData.value.id);
      }

      if (balancesData.status === 'fulfilled') {
        const allBalances = balancesData.value;
        // Filter to show only annual leave, or if not found, show non-zero balances
        const annualLeave = allBalances.filter(b => 
          b.policyName.toLowerCase().includes('annual')
        );
        const filteredBalances = annualLeave.length > 0 
          ? annualLeave 
          : allBalances.filter(b => b.remaining > 0);
        setBalances(filteredBalances);
      }
      if (requestsData.status === 'fulfilled') setRequests(requestsData.value);
      if (categoriesData.status === 'fulfilled') {
        // Filter to only show TIME_OFF categories that are not admin-only
        const timeOffCategories = categoriesData.value.filter((cat: any) => 
          cat.categoryType === 'TIME_OFF' && !cat.adminOnly && cat.isActive
        );
        setCategories(timeOffCategories);
      }
    } catch (error) {
      console.error('Failed to load leave data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const handleSubmitRequest = async () => {
    if (!currentEmployeeId) {
      Alert.alert('Error', 'Unable to identify your employee profile');
      return;
    }

    if (!selectedPolicy) {
      Alert.alert('Error', 'Please select a leave type');
      return;
    }

    if (!reason.trim()) {
      Alert.alert('Error', 'Please provide a reason for your leave request');
      return;
    }

    if (endDate < startDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setSubmitting(true);
    try {
      await submitLeaveRequest({
        employeeId: currentEmployeeId,
        eventCategoryId: selectedPolicy,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        reason: reason.trim(),
      });

      Alert.alert('Success', 'Your leave request has been submitted for approval');
      setShowRequestModal(false);
      setReason('');
      setSelectedPolicy('');
      loadData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit leave request');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading your leave information..." />;
  }

  const statusVariant = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'success';
      case 'REJECTED':
        return 'danger';
      case 'PENDING':
        return 'warning';
      default:
        return 'neutral';
    }
  };

  return (
    <>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Leave Balances */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Leave Balance</Text>
          {balances.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title="No leave balances"
              description="Your leave balances will appear here"
            />
          ) : (
            balances.map((balance) => (
              <Card key={balance.id}>
                <View style={styles.balanceHeader}>
                  <Text style={styles.balanceName}>{balance.policyName}</Text>
                  <Badge
                    text={`${balance.remaining} days left`}
                    variant={balance.remaining > 5 ? 'success' : 'warning'}
                  />
                </View>
                <View style={styles.balanceDetails}>
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceLabel}>Total</Text>
                    <Text style={styles.balanceValue}>{balance.totalAllowance}</Text>
                  </View>
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceLabel}>Used</Text>
                    <Text style={styles.balanceValue}>{balance.used}</Text>
                  </View>
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceLabel}>Pending</Text>
                    <Text style={styles.balanceValue}>{balance.pending}</Text>
                  </View>
                  <View style={styles.balanceItem}>
                    <Text style={styles.balanceLabel}>Available</Text>
                    <Text style={[styles.balanceValue, styles.balanceValuePrimary]}>
                      {balance.remaining}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        {/* Quick Request Button */}
        <View style={styles.section}>
          <Button
            title="Request Time Off"
            onPress={() => setShowRequestModal(true)}
            variant="primary"
            size="large"
          />
        </View>

        {/* Leave Requests */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Requests</Text>
          {requests.length === 0 ? (
            <EmptyState
              icon="document-text-outline"
              title="No leave requests"
              description="Your leave requests will appear here"
            />
          ) : (
            requests
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((request) => (
                <Card key={request.id}>
                  <View style={styles.requestHeader}>
                    <Text style={styles.requestTitle}>{request.policy?.name || 'Leave'}</Text>
                    <Badge text={request.status} variant={statusVariant(request.status)} />
                  </View>
                  <View style={styles.requestDetails}>
                    <View style={styles.requestRow}>
                      <Ionicons name="calendar-outline" size={16} color="#64748b" />
                      <Text style={styles.requestText}>
                        {new Date(request.startDate).toLocaleDateString()} -{' '}
                        {new Date(request.endDate).toLocaleDateString()}
                      </Text>
                    </View>
                    <View style={styles.requestRow}>
                      <Ionicons name="time-outline" size={16} color="#64748b" />
                      <Text style={styles.requestText}>{request.days} day(s)</Text>
                    </View>
                    {request.reason && (
                      <View style={styles.requestRow}>
                        <Ionicons name="document-text-outline" size={16} color="#64748b" />
                        <Text style={styles.requestText}>{request.reason}</Text>
                      </View>
                    )}
                  </View>
                </Card>
              ))
          )}
        </View>
      </ScrollView>

      {/* Request Modal */}
      <Modal
        visible={showRequestModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowRequestModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRequestModal(false)}>
              <Ionicons name="close" size={28} color="#0f172a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Request Time Off</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Leave Type */}
            <Text style={styles.inputLabel}>Leave Type</Text>
            <View style={styles.pickerContainer}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.policyOption,
                    selectedPolicy === category.id && styles.policyOptionSelected,
                  ]}
                  onPress={() => setSelectedPolicy(category.id)}
                >
                  <View style={styles.categoryOptionContent}>
                    {category.iconKey && (
                      <Ionicons 
                        name={category.iconKey as any} 
                        size={20} 
                        color={selectedPolicy === category.id ? '#3b82f6' : '#64748b'} 
                        style={styles.categoryIcon}
                      />
                    )}
                    <Text
                      style={[
                        styles.policyOptionText,
                        selectedPolicy === category.id && styles.policyOptionTextSelected,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Start Date */}
            <Text style={styles.inputLabel}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowStartPicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text style={styles.dateText}>{startDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showStartPicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={startDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      setShowStartPicker(false);
                    }
                    if (date) setStartDate(date);
                  }}
                  minimumDate={new Date()}
                  textColor="#0f172a"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerDone}
                    onPress={() => setShowStartPicker(false)}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* End Date */}
            <Text style={styles.inputLabel}>End Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowEndPicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <Text style={styles.dateText}>{endDate.toLocaleDateString()}</Text>
            </TouchableOpacity>
            {showEndPicker && (
              <View style={styles.datePickerContainer}>
                <DateTimePicker
                  value={endDate}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(event, date) => {
                    if (Platform.OS === 'android') {
                      setShowEndPicker(false);
                    }
                    if (date) setEndDate(date);
                  }}
                  minimumDate={startDate}
                  textColor="#0f172a"
                />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity
                    style={styles.datePickerDone}
                    onPress={() => setShowEndPicker(false)}
                  >
                    <Text style={styles.datePickerDoneText}>Done</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Reason */}
            <Text style={styles.inputLabel}>Reason</Text>
            <TextInput
              style={styles.textArea}
              value={reason}
              onChangeText={setReason}
              placeholder="Please provide a reason for your time off request"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                onPress={() => setShowRequestModal(false)}
                variant="outline"
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Submit Request"
                onPress={handleSubmitRequest}
                variant="primary"
                loading={submitting}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  section: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 12,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  balanceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  balanceItem: {
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0f172a',
  },
  balanceValuePrimary: {
    color: '#3b82f6',
  },
  requestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  requestDetails: {
    gap: 8,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  requestText: {
    fontSize: 14,
    color: '#475569',
    marginLeft: 8,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
    marginTop: 16,
  },
  pickerContainer: {
    gap: 8,
  },
  policyOption: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  policyOptionSelected: {
    borderColor: '#3b82f6',
    backgroundColor: '#eff6ff',
  },
  policyOptionText: {
    fontSize: 16,
    color: '#475569',
    fontWeight: '600',
  },
  policyOptionTextSelected: {
    color: '#3b82f6',
  },
  categoryOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    marginRight: 12,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
  },
  dateText: {
    fontSize: 16,
    color: '#0f172a',
    marginLeft: 12,
  },
  textArea: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff',
    fontSize: 16,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: 32,
    marginBottom: 16,
  },
  datePickerContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  datePickerDone: {
    backgroundColor: '#3b82f6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
  },
  datePickerDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
