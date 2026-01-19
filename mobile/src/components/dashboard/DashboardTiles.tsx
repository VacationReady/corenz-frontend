import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ShiftsTile } from './ShiftsTile';
import { ClockTile } from './ClockTile';

export function DashboardTiles() {
  return (
    <View style={styles.container}>
      <View style={styles.tilesRow}>
        <ShiftsTile />
        <ClockTile onManualEntry={() => {
          // Navigate to Clock screen for manual entry
          // The modal is handled by ClockScreen to avoid duplication
        }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tilesRow: {
    flexDirection: 'row',
  },
});
