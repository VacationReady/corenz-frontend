import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';
import { clockInOffline, clockOutOffline } from '../services/OfflineClockService';
import { requestLocationPermission } from '../services/LocationService';

interface ClockStatus {
  isClockedIn: boolean;
  activeEntry: any;
  duration?: {
    hours: number;
    minutes: number;
    seconds?: number;
  };
}

export default function ClockWidget() {
  const [status, setStatus] = useState<ClockStatus>({ isClockedIn: false, activeEntry: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [liveTime, setLiveTime] = useState<string>('00:00:00');

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  // Live timer for clocked-in duration
  useEffect(() => {
    if (!status.isClockedIn || !status.activeEntry) {
      setLiveTime('00:00:00');
      return;
    }

    const updateLiveTime = () => {
      const now = new Date();
      const clockInTime = new Date(status.activeEntry.clockInTime);
      const diff = now.getTime() - clockInTime.getTime();
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setLiveTime(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateLiveTime();
    const interval = setInterval(updateLiveTime, 1000);
    return () => clearInterval(interval);
  }, [status.isClockedIn, status.activeEntry]);

  const loadStatus = async () => {
    try {
      const response = await apiClient.get('/api/time-tracking/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error loading status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    if (actionLoading) return;
    setActionLoading(true);

    try {
      const granted = await requestLocationPermission();
      if (!granted) {
        Alert.alert(
          'Location Required',
          'Location permission is required to clock in. Please enable it in settings.',
          [{ text: 'OK' }]
        );
        setActionLoading(false);
        return;
      }

      const result = await clockInOffline();

      if (result.success) {
        Alert.alert('Success', 'You have been clocked in successfully!', [{ text: 'OK' }]);
        await loadStatus();
      }
    } catch (error: any) {
      console.error('Clock in error:', error);
      Alert.alert(
        'Clock In Failed',
        error.message || 'Failed to clock in. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (actionLoading || !status.activeEntry) return;
    setActionLoading(true);

    try {
      const result = await clockOutOffline(status.activeEntry.id);

      if (result.success) {
        Alert.alert(
          'Success',
          `You have been clocked out successfully!\n\nTime worked: ${liveTime}`,
          [{ text: 'OK' }]
        );
        await loadStatus();
      }
    } catch (error: any) {
      console.error('Clock out error:', error);
      Alert.alert(
        'Clock Out Failed',
        error.message || 'Failed to clock out. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#3b82f6" />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={status.isClockedIn ? handleClockOut : handleClockIn}
      disabled={actionLoading}
      activeOpacity={0.9}
    >
      <LinearGradient
        colors={
          status.isClockedIn
            ? ['#10b981', '#059669']
            : ['#3b82f6', '#2563eb']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {actionLoading ? (
          <ActivityIndicator size="large" color="#FFFFFF" />
        ) : (
          <>
            <View style={styles.iconContainer}>
              <Ionicons
                name={status.isClockedIn ? 'checkmark-circle' : 'time-outline'}
                size={48}
                color="#FFFFFF"
              />
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.statusText}>
                {status.isClockedIn ? 'Clocked In' : 'Clock In'}
              </Text>
              
              {status.isClockedIn && (
                <View style={styles.timerContainer}>
                  <Ionicons name="timer-outline" size={16} color="#FFFFFF" />
                  <Text style={styles.timerText}>{liveTime}</Text>
                </View>
              )}
              
              <Text style={styles.actionText}>
                {status.isClockedIn ? 'Tap to Clock Out' : 'Tap to Start Your Shift'}
              </Text>
            </View>

            <View style={styles.arrowContainer}>
              <Ionicons
                name={status.isClockedIn ? 'exit-outline' : 'enter-outline'}
                size={32}
                color="#FFFFFF"
              />
            </View>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  loadingContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    marginBottom: 16,
  },
  gradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 24,
    minHeight: 140,
  },
  iconContainer: {
    marginRight: 20,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  timerText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    fontVariant: ['tabular-nums'],
  },
  actionText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  arrowContainer: {
    marginLeft: 12,
  },
});
