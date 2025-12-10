import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { apiClient } from '../api/client';
import { requestLocationPermission, getCurrentLocationWithRetry } from '../services/LocationService';
import { clockInOffline, clockOutOffline, autoSync } from '../services/OfflineClockService';
import { isOnline } from '../services/OfflineStorage';

interface ClockStatus {
  isClockedIn: boolean;
  activeEntry: any;
  duration?: {
    hours: number;
    minutes: number;
    totalMinutes: number;
  };
}

export default function ClockScreen() {
  const [status, setStatus] = useState<ClockStatus>({ isClockedIn: false, activeEntry: null });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [online, setOnline] = useState(true);

  useEffect(() => {
    loadStatus();
    checkLocationPermission();
    checkOnlineStatus();

    // Update time every second
    const timeInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Refresh status every 30 seconds
    const statusInterval = setInterval(loadStatus, 30000);

    // Auto-sync every minute
    const syncInterval = setInterval(autoSync, 60000);

    return () => {
      clearInterval(timeInterval);
      clearInterval(statusInterval);
      clearInterval(syncInterval);
    };
  }, []);

  const checkOnlineStatus = async () => {
    const connected = await isOnline();
    setOnline(connected);
  };

  const checkLocationPermission = async () => {
    const granted = await requestLocationPermission();
    setLocationStatus(granted ? 'available' : 'unavailable');
  };

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
      // Request location permission if not granted, but don't block on failure
      // HRIS Best Practice: Never block clock-in due to GPS failure
      if (locationStatus !== 'available') {
        const granted = await requestLocationPermission();
        if (granted) {
          setLocationStatus('available');
        }
        // Continue even if permission not granted - backend will flag for review
      }

      // Attempt clock in (handles offline mode automatically)
      const result = await clockInOffline();

      if (result.success) {
        if (result.offlineMode) {
          Alert.alert(
            'Clocked In (Offline)',
            'You have been clocked in offline. Your entry will be synced when you are back online.',
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', 'You have been clocked in successfully!', [{ text: 'OK' }]);
        }
        
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
      // Attempt clock out (handles offline mode automatically)
      const result = await clockOutOffline(status.activeEntry.id);

      if (result.success) {
        if (result.offlineMode) {
          Alert.alert(
            'Clocked Out (Offline)',
            'You have been clocked out offline. Your entry will be synced when you are back online.',
            [{ text: 'OK' }]
          );
        } else {
          const hoursWorked = status.duration
            ? `${status.duration.hours}h ${status.duration.minutes}m`
            : 'N/A';
          
          Alert.alert(
            'Success',
            `You have been clocked out successfully!\n\nTime worked: ${hoursWorked}`,
            [{ text: 'OK' }]
          );
        }
        
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

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header with date and time */}
      <View style={styles.header}>
        <Text style={styles.dateText}>{formatDate(currentTime)}</Text>
        <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
        
        {/* Status Indicators */}
        <View style={styles.statusRow}>
          <View style={styles.statusBadge}>
            <Ionicons
              name={online ? 'wifi' : 'wifi-outline'}
              size={16}
              color={online ? '#10B981' : '#F59E0B'}
            />
            <Text style={[styles.statusText, { color: online ? '#10B981' : '#F59E0B' }]}>
              {online ? 'Online' : 'Offline'}
            </Text>
          </View>
          
          <View style={styles.statusBadge}>
            <Ionicons
              name={locationStatus === 'available' ? 'location' : 'location-outline'}
              size={16}
              color={locationStatus === 'available' ? '#10B981' : '#EF4444'}
            />
            <Text
              style={[
                styles.statusText,
                { color: locationStatus === 'available' ? '#10B981' : '#EF4444' },
              ]}
            >
              {locationStatus === 'available' ? 'GPS Ready' : 'GPS Off'}
            </Text>
          </View>
        </View>
      </View>

      {/* Status Card */}
      <View style={styles.statusCard}>
        <View style={styles.statusHeader}>
          <Ionicons
            name={status.isClockedIn ? 'checkmark-circle' : 'time-outline'}
            size={32}
            color={status.isClockedIn ? '#10B981' : '#6B7280'}
          />
          <View style={styles.statusInfo}>
            <Text style={styles.statusLabel}>Current Status</Text>
            <Text
              style={[
                styles.statusValue,
                { color: status.isClockedIn ? '#10B981' : '#EF4444' },
              ]}
            >
              {status.isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </Text>
          </View>
        </View>

        {status.isClockedIn && status.duration && (
          <View style={styles.durationContainer}>
            <Text style={styles.durationLabel}>Time Worked Today</Text>
            <Text style={styles.durationValue}>
              {status.duration.hours}h {status.duration.minutes}m
            </Text>
          </View>
        )}
      </View>

      {/* Clock In/Out Button */}
      <TouchableOpacity
        style={styles.buttonContainer}
        onPress={status.isClockedIn ? handleClockOut : handleClockIn}
        disabled={actionLoading}
      >
        <LinearGradient
          colors={
            status.isClockedIn
              ? ['#EF4444', '#DC2626']
              : ['#3B82F6', '#8B5CF6']
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}
        >
          {actionLoading ? (
            <ActivityIndicator size="large" color="#FFFFFF" />
          ) : (
            <>
              <Ionicons
                name={status.isClockedIn ? 'exit-outline' : 'enter-outline'}
                size={48}
                color="#FFFFFF"
              />
              <Text style={styles.buttonText}>
                {status.isClockedIn ? 'Clock Out' : 'Clock In'}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Info Text */}
      {!online && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle-outline" size={20} color="#F59E0B" />
          <Text style={styles.infoText}>
            You're offline. Your clock entries will sync automatically when you're back online.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  contentContainer: {
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  dateText: {
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 30,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statusInfo: {
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  durationContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  durationLabel: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 4,
  },
  durationValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  buttonContainer: {
    marginBottom: 20,
  },
  button: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  buttonText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderRadius: 12,
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#F59E0B',
    lineHeight: 20,
  },
});
