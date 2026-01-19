import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { getClockStatus } from '../../api/time-tracking';
import { clockInOffline, clockOutOffline } from '../../services/OfflineClockService';
import { isOnline } from '../../services/OfflineStorage';

interface ClockTileProps {
  onManualEntry?: () => void;
}

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export function ClockTile({ onManualEntry }: ClockTileProps) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [clockInTime, setClockInTime] = useState<Date | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
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
          setActiveEntryId(status.activeEntry.id);
        } else {
          setClockInTime(null);
          setActiveEntryId(null);
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
        if (!activeEntryId) {
          Alert.alert('Error', 'No active clock entry found. Please refresh and try again.');
          setActionLoading(false);
          return;
        }
        const result = await clockOutOffline(activeEntryId);
        if (result.success) {
          setIsClockedIn(false);
          setClockInTime(null);
          setActiveEntryId(null);
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
          setActiveEntryId(result.localId);
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
              Since {formatTime(clockInTime)}
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
    marginHorizontal: 4,
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
