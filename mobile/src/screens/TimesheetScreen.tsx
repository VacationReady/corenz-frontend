import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  WeeklySummary,
  EntryCard,
  AddNoteModal,
  TimesheetHistory,
  SubmitButton,
} from '../components/timesheets';
import { timesheetService } from '../services/TimesheetService';
import { Timesheet, TimesheetEntry } from '../api/timesheets';

export default function TimesheetScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentTimesheet, setCurrentTimesheet] = useState<Timesheet | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [previousTimesheets, setPreviousTimesheets] = useState<Timesheet[]>([]);
  
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<TimesheetEntry | null>(null);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const current = await timesheetService.getCurrentWeekTimesheet();
      setCurrentTimesheet(current);

      if (current) {
        const { entries: timesheetEntries } = await timesheetService.getTimesheetWithEntries(current.id);
        setEntries(timesheetEntries);
      } else {
        setEntries([]);
      }

      const allTimesheets = await timesheetService.getMyTimesheets();
      const previous = allTimesheets.filter(t => t.id !== current?.id).slice(0, 5);
      setPreviousTimesheets(previous);
    } catch (error) {
      console.error('[TimesheetScreen] Error loading data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSubmit = async () => {
    if (!currentTimesheet) return;

    Alert.alert(
      'Submit Timesheet',
      'Are you sure you want to submit this timesheet for approval?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
              await timesheetService.submitTimesheet(currentTimesheet.id);
              Alert.alert('Success', 'Timesheet submitted for approval');
              loadData();
            } catch (error: any) {
              const message = error.response?.data?.error || 'Failed to submit timesheet';
              Alert.alert('Error', message);
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const handleEntryPress = (entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setNoteModalVisible(true);
  };

  const handleAddNote = (entry: TimesheetEntry) => {
    setSelectedEntry(entry);
    setNoteModalVisible(true);
  };

  const handleNoteSuccess = () => {
    setNoteModalVisible(false);
    setSelectedEntry(null);
    loadData();
  };

  const handleTimesheetPress = (timesheet: Timesheet) => {
    navigation.navigate('TimesheetDetail', { timesheetId: timesheet.id });
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
        {/* Current Week Summary */}
        {currentTimesheet && (
          <WeeklySummary timesheet={currentTimesheet} />
        )}

        {/* Entries List */}
        {entries.length > 0 && (
          <View style={styles.entriesSection}>
            {entries.map((entry) => (
              <EntryCard
                key={entry.id}
                entry={entry}
                onPress={() => handleEntryPress(entry)}
                onAddNote={() => handleAddNote(entry)}
              />
            ))}
          </View>
        )}

        {/* No Entries State */}
        {currentTimesheet && entries.length === 0 && (
          <View style={styles.emptyEntries}>
            <Text style={styles.emptyText}>No time entries this week</Text>
            <Text style={styles.emptyHint}>
              Clock in to start tracking your time
            </Text>
          </View>
        )}

        {/* No Timesheet State */}
        {!currentTimesheet && (
          <View style={styles.noTimesheet}>
            <Text style={styles.noTimesheetText}>
              No timesheet for this week yet
            </Text>
            <Text style={styles.noTimesheetHint}>
              A timesheet will be created when you clock in
            </Text>
          </View>
        )}

        {/* Previous Timesheets */}
        <TimesheetHistory
          timesheets={previousTimesheets}
          onTimesheetPress={handleTimesheetPress}
        />
      </ScrollView>

      {/* Submit Button */}
      {currentTimesheet && (
        <SubmitButton
          timesheet={currentTimesheet}
          loading={submitting}
          onSubmit={handleSubmit}
        />
      )}

      {/* Add Note Modal */}
      <AddNoteModal
        visible={noteModalVisible}
        entry={selectedEntry}
        onClose={() => {
          setNoteModalVisible(false);
          setSelectedEntry(null);
        }}
        onSuccess={handleNoteSuccess}
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
  emptyEntries: {
    alignItems: 'center',
    padding: 32,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  emptyHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  noTimesheet: {
    alignItems: 'center',
    padding: 48,
    marginTop: 32,
  },
  noTimesheetText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6b7280',
  },
  noTimesheetHint: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
});
