import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Timesheet } from '../../api/timesheets';

interface SubmitButtonProps {
  timesheet: Timesheet;
  loading: boolean;
  onSubmit: () => void;
}

export function SubmitButton({ timesheet, loading, onSubmit }: SubmitButtonProps) {
  const canSubmit = timesheet.approvalStatus === 'DRAFT';
  const isSubmitted = ['SUBMITTED', 'PENDING_APPROVAL'].includes(timesheet.approvalStatus);
  const isApproved = timesheet.approvalStatus === 'APPROVED';
  const isRejected = timesheet.approvalStatus === 'REJECTED';

  if (isApproved) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBar, styles.approvedBar]}>
          <Ionicons name="checkmark-circle" size={20} color="#22c55e" />
          <Text style={styles.approvedText}>Timesheet Approved</Text>
        </View>
      </View>
    );
  }

  if (isRejected) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBar, styles.rejectedBar]}>
          <Ionicons name="close-circle" size={20} color="#ef4444" />
          <View style={styles.rejectedContent}>
            <Text style={styles.rejectedText}>Timesheet Rejected</Text>
            <Text style={styles.rejectedHint}>Please review and resubmit</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={20} color="#ffffff" />
              <Text style={styles.submitText}>Resubmit for Approval</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  if (isSubmitted) {
    return (
      <View style={styles.container}>
        <View style={[styles.statusBar, styles.pendingBar]}>
          <Ionicons name="time-outline" size={20} color="#f59e0b" />
          <Text style={styles.pendingText}>Awaiting Approval</Text>
        </View>
      </View>
    );
  }

  if (canSubmit) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={onSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={20} color="#ffffff" />
              <Text style={styles.submitText}>Submit for Approval</Text>
            </>
          )}
        </TouchableOpacity>
        <Text style={styles.submitHint}>
          Once submitted, your manager will review your timesheet
        </Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
  },
  approvedBar: {
    backgroundColor: '#dcfce7',
  },
  approvedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#22c55e',
    marginLeft: 8,
  },
  rejectedBar: {
    backgroundColor: '#fef2f2',
    marginBottom: 12,
  },
  rejectedContent: {
    marginLeft: 8,
  },
  rejectedText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ef4444',
  },
  rejectedHint: {
    fontSize: 12,
    color: '#ef4444',
  },
  pendingBar: {
    backgroundColor: '#fef3c7',
  },
  pendingText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#f59e0b',
    marginLeft: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6366f1',
    paddingVertical: 16,
    borderRadius: 12,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
  submitHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
});
