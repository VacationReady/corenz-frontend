// mobile/src/screens/ShiftsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  startOfWeek,
  isSameDay,
  parseISO,
} from 'date-fns';
import {
  WeekNavigation,
  WeekView,
  ShiftCard,
  ShiftDetailsModal,
  EmptyShifts,
} from '../components/shifts';
import { shiftService } from '../services/ShiftService';
import { Shift } from '../api/shifts';

export default function ShiftsScreen() {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [weekStartDate, setWeekStartDate] = useState(() =>
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);

  const loadShifts = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const data = await shiftService.getWeekShifts(weekStartDate);
      setShifts(data);
    } catch (error) {
      console.error('[ShiftsScreen] Error loading shifts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [weekStartDate]);

  useFocusEffect(
    useCallback(() => {
      loadShifts();
    }, [loadShifts])
  );

  const handleWeekChange = (newWeekStart: Date) => {
    setWeekStartDate(newWeekStart);
    setSelectedDate(newWeekStart);
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };

  const handleShiftPress = (shift: Shift) => {
    setSelectedShift(shift);
    setDetailsModalVisible(true);
  };

  const handleSwapPress = (shift: Shift) => {
    setDetailsModalVisible(false);
    navigation.navigate('ShiftSwaps', { shiftToSwap: shift });
  };

  const handleRefresh = () => {
    loadShifts(true);
  };

  // Filter shifts for selected date
  const filteredShifts = shifts.filter((shift) =>
    isSameDay(parseISO(shift.startTime), selectedDate)
  );

  const renderShiftCard = ({ item }: { item: Shift }) => (
    <ShiftCard
      shift={item}
      onPress={() => handleShiftPress(item)}
      onSwapPress={() => handleSwapPress(item)}
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
      {/* Week Navigation */}
      <WeekNavigation
        weekStartDate={weekStartDate}
        onWeekChange={handleWeekChange}
      />

      {/* Week Day Selector */}
      <WeekView
        selectedDate={selectedDate}
        onDateSelect={handleDateSelect}
        shifts={shifts}
        weekStartDate={weekStartDate}
      />

      {/* Shifts List */}
      {filteredShifts.length === 0 ? (
        <EmptyShifts selectedDate={selectedDate} />
      ) : (
        <FlatList
          data={filteredShifts}
          keyExtractor={(item) => item.id}
          renderItem={renderShiftCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
        />
      )}

      {/* Shift Details Modal */}
      <ShiftDetailsModal
        visible={detailsModalVisible}
        shift={selectedShift}
        onClose={() => setDetailsModalVisible(false)}
        onSwapPress={() => selectedShift && handleSwapPress(selectedShift)}
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
  },
});
