import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  WeeklySummary,
  EntryCard,
  AddNoteModal,
} from '../components/timesheets';
import { timesheetService } from '../services/TimesheetService';
import { Timesheet, TimesheetEntry } from '../api/timesheets';

export default function TimesheetDetailScreen() {
  const route = useRoute<any>();
  const timesheetId = route.params?.timesheetId;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timesheet, setTimesheet] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    if (!timesheetId) return;

    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { timesheet: ts, entries: ent } = await timesheetService.getTimesheetWithEntries(timesheetId);
      setTimesheet(ts);
      setEntries(ent);
    } catch (error) {
      console.error('[TimesheetDetailScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [timesheetId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleEntryPress = (entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setNoteModalVisible(true);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadData(true)}
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      >
        {timesheet && <WeeklySummary timesheet={timesheet} />}

        <View style={styles.entriesSection}>
          {entries.map((entry) => (
            <EntryCard
              key={entry.id}
              entry={entry}
              onPress={() => handleEntryPress(entry)}
            />
          ))}
        </View>
      </ScrollView>

      <AddNoteModal
        visible={noteModalVisible}
        entry={selectedEntry}
        onClose={() => {
          setNoteModalVisible(false);
          setSelectedEntry(null);
        }}
        onSuccess={() => {
          setNoteModalVisible(false);
          setSelectedEntry(null);
          loadData();
        }}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  entriesSection: {
    marginTop: 16,
  },
});
