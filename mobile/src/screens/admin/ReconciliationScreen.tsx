import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Text,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import {
  DayPicker,
  StatsOverview,
  EmployeeEntryCard,
  EditEntryModal,
  BulkApproveBar,
} from '../../components/reconciliation';
import * as reconciliationApi from '../../api/reconciliation';
import { ReconciliationEntry, ReconciliationStats } from '../../api/reconciliation';

export function ReconciliationScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bulkApproving, setBulkApproving] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<ReconciliationEntry[]>([]);
  const [stats, setStats] = useState<ReconciliationStats | null>(null);
  const [selectedEntryIds, setSelectedEntryIds] = useState<Set<string>>(new Set());
  
  // Edit Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [entryToEdit, setEntryToEdit] = useState<ReconciliationEntry | null>(null);

  const loadData = useCallback(async (isRefresh = false, dateOverride?: Date) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const dateToUse = dateOverride || selectedDate;
      const dayData = await reconciliationApi.getDayReconciliation(dateToUse);
      setEntries(dayData.entries || []);
      setStats(dayData.stats || null);
      setSelectedEntryIds(new Set());
    } catch (error) {
      console.error('[ReconciliationScreen] Error loading data:', error);
      Alert.alert('Error', 'Failed to load reconciliation data');
      // Ensure entries is always an array even on error
      setEntries([]);
      setStats(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    loadData(false, date);
  };

  const handleSelectEntry = (entryId: string) => {
    setSelectedEntryIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(entryId)) {
        newSet.delete(entryId);
      } else {
        newSet.add(entryId);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedEntryIds(new Set());
  };

  const handleEditEntry = (entry: ReconciliationEntry) => {
    setEntryToEdit(entry);
    setEditModalVisible(true);
  };

  const handleFlagEntry = async (entry: ReconciliationEntry) => {
    try {
      if (entry.status === 'FLAGGED') {
        // Unflag - approve instead
        if (entry.timesheetEntryId) {
          await reconciliationApi.bulkApproveEntries([entry.timesheetEntryId]);
        }
      } else {
        if (entry.timesheetEntryId) {
          await reconciliationApi.flagEntry(entry.timesheetEntryId, 'Flagged for review');
        }
      }
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to update entry';
      Alert.alert('Error', message);
    }
  };

  const handleApproveEntry = async (entry: ReconciliationEntry) => {
    try {
      if (entry.timesheetEntryId) {
        await reconciliationApi.bulkApproveEntries([entry.timesheetEntryId]);
      }
      loadData();
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to approve entry';
      Alert.alert('Error', message);
    }
  };

  const handleBulkApprove = async () => {
    const entryIds = Array.from(selectedEntryIds);
    const entriesToApprove = entries
      .filter(e => entryIds.includes(e.id) && e.timesheetEntryId)
      .map(e => e.timesheetEntryId!);

    if (entriesToApprove.length === 0) {
      Alert.alert('Error', 'No valid entries to approve');
      return;
    }

    Alert.alert(
      'Bulk Approve',
      `Approve ${entriesToApprove.length} entries?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            setBulkApproving(true);
            try {
              await reconciliationApi.bulkApproveEntries(entriesToApprove);
              Alert.alert('Success', `${entriesToApprove.length} entries approved`);
              loadData();
            } catch (error: any) {
              const message = error.response?.data?.error || 'Failed to approve entries';
              Alert.alert('Error', message);
            } finally {
              setBulkApproving(false);
            }
          },
        },
      ]
    );
  };

  const handleEditSuccess = () => {
    setEditModalVisible(false);
    setEntryToEdit(null);
    loadData();
  };

  const renderEntry = ({ item }: { item: ReconciliationEntry }) => (
    <EmployeeEntryCard
      entry={item}
      isSelected={selectedEntryIds.has(item.id)}
      onSelect={() => handleSelectEntry(item.id)}
      onEdit={() => handleEditEntry(item)}
      onFlag={() => handleFlagEntry(item)}
      onApprove={() => handleApproveEntry(item)}
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
      {/* Day Picker */}
      <DayPicker
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
      />

      {/* Stats Overview */}
      {stats && <StatsOverview stats={stats} />}

      {/* Entries List */}
      {entries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No Shifts Scheduled</Text>
          <Text style={styles.emptySubtitle}>
            There are no published shifts for this day.{'\n'}
            Check another date or publish shifts in the roster.
          </Text>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={(item, index) => item.id || `entry-${index}`}
          renderItem={renderEntry}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews={false}
          initialNumToRender={10}
          showsVerticalScrollIndicator={true}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadData(true)}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
        />
      )}

      {/* Bulk Approve Bar */}
      <BulkApproveBar
        selectedCount={selectedEntryIds.size}
        onApprove={handleBulkApprove}
        onClearSelection={handleClearSelection}
        loading={bulkApproving}
      />

      {/* Edit Modal */}
      <EditEntryModal
        visible={editModalVisible}
        entry={entryToEdit}
        onClose={() => {
          setEditModalVisible(false);
          setEntryToEdit(null);
        }}
        onSuccess={handleEditSuccess}
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
  listContent: {
    paddingVertical: 8,
    paddingBottom: 100,
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
