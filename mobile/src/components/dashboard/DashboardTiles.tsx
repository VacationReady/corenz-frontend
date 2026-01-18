import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { ShiftsTile } from './ShiftsTile';
import { ClockTile } from './ClockTile';
import { ManualEntryModal } from '../clock/ManualEntryModal';

export function DashboardTiles() {
  const [manualEntryVisible, setManualEntryVisible] = useState(false);

  return (
    <View style={styles.container}>
      <View style={styles.tilesRow}>
        <ShiftsTile />
        <ClockTile onManualEntry={() => setManualEntryVisible(true)} />
      </View>

      <ManualEntryModal
        visible={manualEntryVisible}
        onClose={() => setManualEntryVisible(false)}
        onSuccess={() => {
          setManualEntryVisible(false);
        }}
      />
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
