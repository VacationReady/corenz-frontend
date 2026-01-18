import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BulkApproveBarProps {
  selectedCount: number;
  onApprove: () => void;
  onClearSelection: () => void;
  loading: boolean;
}

export function BulkApproveBar({
  selectedCount,
  onApprove,
  onClearSelection,
  loading,
}: BulkApproveBarProps) {
  if (selectedCount === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.selectionInfo}>
        <TouchableOpacity onPress={onClearSelection} style={styles.clearButton}>
          <Ionicons name="close-circle" size={20} color="#6b7280" />
        </TouchableOpacity>
        <Text style={styles.selectionText}>
          {selectedCount} {selectedCount === 1 ? 'entry' : 'entries'} selected
        </Text>
      </View>

      <TouchableOpacity
        style={styles.approveButton}
        onPress={onApprove}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#ffffff" />
        ) : (
          <>
            <Ionicons name="checkmark-done" size={20} color="#ffffff" />
            <Text style={styles.approveText}>Approve All</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
  },
  selectionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clearButton: {
    padding: 4,
    marginRight: 8,
  },
  selectionText: {
    fontSize: 14,
    color: '#6b7280',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  approveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 8,
  },
});
