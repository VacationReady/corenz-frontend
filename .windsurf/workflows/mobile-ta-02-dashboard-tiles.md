---
description: Mobile T&A Phase 2 - Create Dashboard Tiles for Shifts and Clock-In
---

# Phase 2: Dashboard Tiles

## Objective

Create two side-by-side tiles on the HomeScreen that provide quick access to shifts and clock-in functionality. These tiles should be visually appealing, show real-time data, and provide one-tap access to full features.

## Prerequisites

- Complete Phase 1 (API Services)
- Review existing `mobile/src/screens/HomeScreen.tsx` for layout patterns
- Review existing `mobile/src/components/ClockWidget.tsx` for clock patterns

## Design Specification

```
┌─────────────────────────────────────────────────┐
│                  Dashboard                       │
├──────────────────────┬──────────────────────────┤
│   📅 MY SHIFTS       │   ⏱️ CLOCK IN/OUT        │
│   ─────────────────  │   ─────────────────────  │
│   Today: 9am-5pm     │   Status: Clocked Out    │
│   Tomorrow: Off      │   ──────────────────     │
│   ─────────────────  │   [  CLOCK IN  ]         │
│   [View Schedule →]  │   [Manual Entry]         │
└──────────────────────┴──────────────────────────┘
```

## Files to Create

### 1. `mobile/src/components/dashboard/ShiftsTile.tsx`

```typescript
// mobile/src/components/dashboard/ShiftsTile.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { shiftService } from '../../services/ShiftService';
import { Shift } from '../../api/shifts';

interface ShiftsTileProps {
  onPress?: () => void;
}

export function ShiftsTile({ onPress }: ShiftsTileProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [todayShift, setTodayShift] = useState<Shift | null>(null);
  const [tomorrowShift, setTomorrowShift] = useState<Shift | null>(null);
  const [upcomingCount, setUpcomingCount] = useState(0);

  const loadShifts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [today, tomorrow, upcoming] = await Promise.all([
        shiftService.getTodayShift(),
        shiftService.getTomorrowShift(),
        shiftService.getUpcomingShifts(7),
      ]);
      
      setTodayShift(today);
      setTomorrowShift(tomorrow);
      setUpcomingCount(upcoming.length);
    } catch (err) {
      setError('Unable to load shifts');
      console.error('[ShiftsTile] Error loading shifts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadShifts();
    }, [loadShifts])
  );

  const formatShiftTime = (shift: Shift): string => {
    const start = parseISO(shift.startTime);
    const end = parseISO(shift.endTime);
    return `${format(start, 'h:mma')} - ${format(end, 'h:mma')}`;
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('Shifts');
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Ionicons name="calendar-outline" size={20} color="#6366f1" />
        <Text style={styles.title}>My Shifts</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={loadShifts}>
            <Text style={styles.retryText}>Tap to retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Today's Shift */}
          <View style={styles.shiftRow}>
            <Text style={styles.dayLabel}>Today</Text>
            {todayShift ? (
              <Text style={styles.shiftTime}>
                {formatShiftTime(todayShift)}
              </Text>
            ) : (
              <Text style={styles.offText}>No shift</Text>
            )}
          </View>

          {/* Tomorrow's Shift */}
          <View style={styles.shiftRow}>
            <Text style={styles.dayLabel}>Tomorrow</Text>
            {tomorrowShift ? (
              <Text style={styles.shiftTime}>
                {formatShiftTime(tomorrowShift)}
              </Text>
            ) : (
              <Text style={styles.offText}>No shift</Text>
            )}
          </View>

          {/* Upcoming Count */}
          {upcomingCount > 0 && (
            <Text style={styles.upcomingText}>
              {upcomingCount} upcoming shift{upcomingCount !== 1 ? 's' : ''} this week
            </Text>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>View Schedule</Text>
        <Ionicons name="chevron-forward" size={16} color="#6366f1" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 180,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
  },
  retryText: {
    fontSize: 12,
    color: '#6366f1',
    marginTop: 4,
  },
  content: {
    flex: 1,
  },
  shiftRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dayLabel: {
    fontSize: 13,
    color: '#6b7280',
  },
  shiftTime: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1f2937',
  },
  offText: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  upcomingText: {
    fontSize: 11,
    color: '#6366f1',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  footerText: {
    fontSize: 12,
    color: '#6366f1',
    fontWeight: '500',
  },
});
```

### 2. `mobile/src/components/dashboard/ClockTile.tsx`

```typescript
// mobile/src/components/dashboard/ClockTile.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Vibration,
  Alert,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { getClockStatus } from '../../api/time-tracking';
import { clockInOffline, clockOutOffline } from '../../services/OfflineClockService';
import { isOnline } from '../../services/OfflineStorage';

interface ClockTileProps {
  onManualEntry?: () => void;
}

export function ClockTile({ onManualEntry }: ClockTileProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [online, setOnline] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      setLoading(true);
      const networkStatus = await isOnline();
      setOnline(networkStatus);
      
      if (networkStatus) {
        const status = await getClockStatus();
        setIsClockedIn(status.isClockedIn);
        if (status.isClockedIn && status.activeEntry) {
          setClockInTime(new Date(status.activeEntry.clockInTime));
        } else {
          setClockInTime(null);
        }
      }
    } catch (err) {
      console.error('[ClockTile] Error loading status:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );

  // Update elapsed time every second when clocked in
  useEffect(() => {
    if (isClockedIn && clockInTime) {
      const updateElapsed = () => {
        const now = new Date();
        const diff = now.getTime() - clockInTime.getTime();
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setElapsedTime(
          `${hours.toString().padStart(2, '0')}:${minutes
            .toString()
            .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };

      updateElapsed();
      timerRef.current = setInterval(updateElapsed, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    } else {
      setElapsedTime('00:00:00');
    }
  }, [isClockedIn, clockInTime]);

  const handleClockAction = async () => {
    if (actionLoading) return;

    setActionLoading(true);
    Vibration.vibrate(50);

    try {
      if (isClockedIn) {
        const result = await clockOutOffline();
        if (result.success) {
          setIsClockedIn(false);
          setClockInTime(null);
          Alert.alert(
            result.offlineMode ? 'Clocked Out (Offline)' : 'Clocked Out',
            'You have been clocked out successfully!'
          );
        }
      } else {
        const result = await clockInOffline();
        if (result.success) {
          setIsClockedIn(true);
          setClockInTime(new Date());
          Alert.alert(
            result.offlineMode ? 'Clocked In (Offline)' : 'Clocked In',
            'You have been clocked in successfully!'
          );
        }
      }
    } catch (error: any) {
      Alert.alert(
        'Error',
        error.message || `Failed to clock ${isClockedIn ? 'out' : 'in'}`
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleManualEntry = () => {
    if (onManualEntry) {
      onManualEntry();
    } else {
      navigation.navigate('Clock', { openManualEntry: true });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="time-outline" size={20} color="#6366f1" />
        <Text style={styles.title}>Clock In/Out</Text>
        {!online && (
          <View style={styles.offlineBadge}>
            <Ionicons name="cloud-offline-outline" size={12} color="#f59e0b" />
          </View>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#6366f1" />
        </View>
      ) : (
        <View style={styles.content}>
          {/* Status Display */}
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: isClockedIn ? '#22c55e' : '#9ca3af' },
              ]}
            />
            <Text style={styles.statusText}>
              {isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </Text>
          </View>

          {/* Timer Display */}
          {isClockedIn && (
            <Text style={styles.timerText}>{elapsedTime}</Text>
          )}

          {/* Clock In Time */}
          {isClockedIn && clockInTime && (
            <Text style={styles.clockInTimeText}>
              Since {format(clockInTime, 'h:mm a')}
            </Text>
          )}

          {/* Clock Button */}
          <TouchableOpacity
            style={[
              styles.clockButton,
              isClockedIn ? styles.clockOutButton : styles.clockInButton,
            ]}
            onPress={handleClockAction}
            disabled={actionLoading}
            activeOpacity={0.8}
          >
            {actionLoading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons
                  name={isClockedIn ? 'log-out-outline' : 'log-in-outline'}
                  size={18}
                  color="#ffffff"
                />
                <Text style={styles.clockButtonText}>
                  {isClockedIn ? 'Clock Out' : 'Clock In'}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {/* Manual Entry Link */}
          <TouchableOpacity
            style={styles.manualEntryLink}
            onPress={handleManualEntry}
          >
            <Ionicons name="create-outline" size={14} color="#6366f1" />
            <Text style={styles.manualEntryText}>Manual Entry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    minHeight: 180,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
    flex: 1,
  },
  offlineBadge: {
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    color: '#6b7280',
  },
  timerText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    fontVariant: ['tabular-nums'],
    marginBottom: 4,
  },
  clockInTimeText: {
    fontSize: 11,
    color: '#9ca3af',
    marginBottom: 12,
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: '100%',
  },
  clockInButton: {
    backgroundColor: '#22c55e',
  },
  clockOutButton: {
    backgroundColor: '#ef4444',
  },
  clockButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  manualEntryLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingVertical: 4,
  },
  manualEntryText: {
    fontSize: 12,
    color: '#6366f1',
    marginLeft: 4,
  },
});
```

### 3. `mobile/src/components/dashboard/DashboardTiles.tsx`

Create a container component for the tiles:

```typescript
// mobile/src/components/dashboard/DashboardTiles.tsx
import React, { useState } from 'react';
import { View, StyleSheet, Modal } from 'react-native';
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
          // Optionally refresh data
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
```

### 4. `mobile/src/components/dashboard/index.ts`

Create barrel export:

```typescript
// mobile/src/components/dashboard/index.ts
export { ShiftsTile } from './ShiftsTile';
export { ClockTile } from './ClockTile';
export { DashboardTiles } from './DashboardTiles';
```

## Integration into HomeScreen

Update the existing HomeScreen to include the dashboard tiles:

```typescript
// In mobile/src/screens/HomeScreen.tsx
// Add import at top:
import { DashboardTiles } from '../components/dashboard';

// Add in the render, after the header section:
<DashboardTiles />
```

**Location in HomeScreen:** Place the `<DashboardTiles />` component after the welcome/header section and before any existing content lists (like action items).

## Placeholder for ManualEntryModal

Create a placeholder that will be fully implemented in Phase 3:

```typescript
// mobile/src/components/clock/ManualEntryModal.tsx
import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ManualEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ManualEntryModal({
  visible,
  onClose,
  onSuccess,
}: ManualEntryModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Manual Time Entry</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
        </View>
        
        <View style={styles.content}>
          <Text style={styles.placeholder}>
            Manual entry form will be implemented in Phase 3
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  placeholder: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});
```

## Verification Steps

1. **Visual Check**
   - Both tiles render side-by-side
   - Tiles have equal width
   - Proper spacing between tiles
   - Shadow/elevation visible

2. **Shifts Tile**
   - Shows loading state initially
   - Displays today's shift or "No shift"
   - Displays tomorrow's shift or "No shift"
   - Shows upcoming count
   - Tapping navigates to Shifts screen
   - Pull-to-refresh works (if implemented on parent)

3. **Clock Tile**
   - Shows current clock status
   - Timer updates every second when clocked in
   - Clock In button is green
   - Clock Out button is red
   - Haptic feedback on button press
   - Offline indicator shows when offline
   - Manual Entry link opens modal

4. **Error Handling**
   - Tiles show error state with retry option
   - Network errors don't crash the app
   - Offline mode works for clock actions

## Styling Notes

- Use consistent color palette: `#6366f1` (indigo) for primary
- Status colors: `#22c55e` (green), `#ef4444` (red), `#f59e0b` (amber)
- Text colors: `#1f2937` (dark), `#6b7280` (medium), `#9ca3af` (light)
- Border radius: 16px for cards, 10px for buttons
- Shadow: subtle, `shadowOpacity: 0.05`

## Next Step

Proceed to `mobile-ta-03-clock-enhancements.md` to implement the full manual entry modal and clock screen enhancements.
