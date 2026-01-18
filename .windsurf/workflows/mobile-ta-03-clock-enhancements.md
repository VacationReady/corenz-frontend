---
description: Mobile T&A Phase 3 - Enhanced Clock Screen with Manual Entry and Break Tracking
---

# Phase 3: Clock Screen Enhancements

## Objective

Enhance the existing ClockScreen with:
1. Full manual time entry modal
2. Break tracking (start/end break)
3. Photo capture option
4. Improved location status display
5. Entry history for today

## Prerequisites

- Complete Phase 1 (API Services)
- Complete Phase 2 (Dashboard Tiles)
- Review existing `mobile/src/screens/ClockScreen.tsx`
- Review backend `app/api/time-tracking/employee-manual-entry/route.ts`

## Files to Create/Modify

### 1. `mobile/src/components/clock/ManualEntryModal.tsx` (Full Implementation)

Replace the placeholder with full implementation:

```typescript
// mobile/src/components/clock/ManualEntryModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { format, isBefore, isAfter, startOfDay, endOfDay } from 'date-fns';
import apiClient from '../../api/client';

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
  const [date, setDate] = useState(new Date());
  const [clockInTime, setClockInTime] = useState(new Date());
  const [clockOutTime, setClockOutTime] = useState(new Date());
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showClockInPicker, setShowClockInPicker] = useState(false);
  const [showClockOutPicker, setShowClockOutPicker] = useState(false);

  const resetForm = () => {
    setDate(new Date());
    setClockInTime(new Date());
    setClockOutTime(new Date());
    setNotes('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const validateTimes = (): string | null => {
    const now = new Date();
    
    // Combine date with times
    const fullClockIn = new Date(date);
    fullClockIn.setHours(clockInTime.getHours(), clockInTime.getMinutes(), 0, 0);
    
    const fullClockOut = new Date(date);
    fullClockOut.setHours(clockOutTime.getHours(), clockOutTime.getMinutes(), 0, 0);
    
    // Check if clock out is after clock in
    if (isBefore(fullClockOut, fullClockIn)) {
      return 'Clock out time must be after clock in time';
    }
    
    // Check if times are not in the future
    if (isAfter(fullClockIn, now)) {
      return 'Clock in time cannot be in the future';
    }
    
    if (isAfter(fullClockOut, now)) {
      return 'Clock out time cannot be in the future';
    }
    
    // Check if date is not more than 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    if (isBefore(date, startOfDay(sevenDaysAgo))) {
      return 'Cannot add entries more than 7 days in the past';
    }
    
    return null;
  };

  const handleSubmit = async () => {
    const validationError = validateTimes();
    if (validationError) {
      Alert.alert('Validation Error', validationError);
      return;
    }

    setLoading(true);

    try {
      // Combine date with times
      const fullClockIn = new Date(date);
      fullClockIn.setHours(clockInTime.getHours(), clockInTime.getMinutes(), 0, 0);
      
      const fullClockOut = new Date(date);
      fullClockOut.setHours(clockOutTime.getHours(), clockOutTime.getMinutes(), 0, 0);

      await apiClient.post('/api/time-tracking/employee-manual-entry', {
        clockInTime: fullClockIn.toISOString(),
        clockOutTime: fullClockOut.toISOString(),
        notes: notes.trim() || undefined,
      });

      Alert.alert('Success', 'Manual time entry created successfully', [
        {
          text: 'OK',
          onPress: () => {
            resetForm();
            onSuccess();
          },
        },
      ]);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Failed to create manual entry';
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  const calculateHours = (): string => {
    const fullClockIn = new Date(date);
    fullClockIn.setHours(clockInTime.getHours(), clockInTime.getMinutes(), 0, 0);
    
    const fullClockOut = new Date(date);
    fullClockOut.setHours(clockOutTime.getHours(), clockOutTime.getMinutes(), 0, 0);
    
    if (isBefore(fullClockOut, fullClockIn)) {
      return '0.00';
    }
    
    const diffMs = fullClockOut.getTime() - fullClockIn.getTime();
    const hours = diffMs / (1000 * 60 * 60);
    return hours.toFixed(2);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} disabled={loading}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Manual Entry</Text>
          <TouchableOpacity onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator size="small" color="#6366f1" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Date Picker */}
          <View style={styles.field}>
            <Text style={styles.label}>Date</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={20} color="#6b7280" />
              <Text style={styles.pickerText}>{format(date, 'EEEE, MMMM d, yyyy')}</Text>
            </TouchableOpacity>
          </View>

          {showDatePicker && (
            <DateTimePicker
              value={date}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              maximumDate={new Date()}
              onChange={(event, selectedDate) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (selectedDate) {
                  setDate(selectedDate);
                }
              }}
            />
          )}

          {/* Clock In Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Clock In Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowClockInPicker(true)}
            >
              <Ionicons name="log-in-outline" size={20} color="#22c55e" />
              <Text style={styles.pickerText}>{format(clockInTime, 'h:mm a')}</Text>
            </TouchableOpacity>
          </View>

          {showClockInPicker && (
            <DateTimePicker
              value={clockInTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowClockInPicker(Platform.OS === 'ios');
                if (selectedTime) {
                  setClockInTime(selectedTime);
                }
              }}
            />
          )}

          {/* Clock Out Time */}
          <View style={styles.field}>
            <Text style={styles.label}>Clock Out Time</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowClockOutPicker(true)}
            >
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text style={styles.pickerText}>{format(clockOutTime, 'h:mm a')}</Text>
            </TouchableOpacity>
          </View>

          {showClockOutPicker && (
            <DateTimePicker
              value={clockOutTime}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, selectedTime) => {
                setShowClockOutPicker(Platform.OS === 'ios');
                if (selectedTime) {
                  setClockOutTime(selectedTime);
                }
              }}
            />
          )}

          {/* Hours Summary */}
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Hours</Text>
            <Text style={styles.summaryValue}>{calculateHours()} hrs</Text>
          </View>

          {/* Notes */}
          <View style={styles.field}>
            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any notes about this entry..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle-outline" size={20} color="#6366f1" />
            <Text style={styles.infoText}>
              Manual entries are subject to manager approval and may be reviewed during timesheet reconciliation.
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  cancelText: {
    fontSize: 16,
    color: '#6b7280',
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  saveText: {
    fontSize: 16,
    color: '#6366f1',
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  pickerText: {
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  summaryBox: {
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 12,
    color: '#6366f1',
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#4f46e5',
  },
  notesInput: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    fontSize: 16,
    color: '#1f2937',
    minHeight: 100,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#eef2ff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#4f46e5',
    marginLeft: 12,
    lineHeight: 18,
  },
});
```

### 2. `mobile/src/components/clock/BreakControls.tsx`

```typescript
// mobile/src/components/clock/BreakControls.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';

interface BreakControlsProps {
  isClockedIn: boolean;
  onBreakStart: () => void;
  onBreakEnd: () => void;
}

export function BreakControls({
  isClockedIn,
  onBreakStart,
  onBreakEnd,
}: BreakControlsProps) {
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [breakStartTime, setBreakStartTime] = useState<Date | null>(null);
  const [breakDuration, setBreakDuration] = useState('00:00');
  const [totalBreakMinutes, setTotalBreakMinutes] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset when clocked out
  useEffect(() => {
    if (!isClockedIn) {
      setIsOnBreak(false);
      setBreakStartTime(null);
      setBreakDuration('00:00');
      setTotalBreakMinutes(0);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, [isClockedIn]);

  // Update break timer
  useEffect(() => {
    if (isOnBreak && breakStartTime) {
      const updateDuration = () => {
        const now = new Date();
        const diff = now.getTime() - breakStartTime.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setBreakDuration(
          `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
        );
      };

      updateDuration();
      timerRef.current = setInterval(updateDuration, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [isOnBreak, breakStartTime]);

  const handleBreakToggle = () => {
    Vibration.vibrate(50);
    
    if (isOnBreak) {
      // End break
      if (breakStartTime) {
        const breakMinutes = Math.floor(
          (new Date().getTime() - breakStartTime.getTime()) / (1000 * 60)
        );
        setTotalBreakMinutes(prev => prev + breakMinutes);
      }
      setIsOnBreak(false);
      setBreakStartTime(null);
      setBreakDuration('00:00');
      onBreakEnd();
    } else {
      // Start break
      setIsOnBreak(true);
      setBreakStartTime(new Date());
      onBreakStart();
    }
  };

  if (!isClockedIn) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="cafe-outline" size={18} color="#6b7280" />
        <Text style={styles.headerText}>Break</Text>
      </View>

      {isOnBreak ? (
        <View style={styles.onBreakContainer}>
          <View style={styles.breakTimerContainer}>
            <Text style={styles.breakLabel}>On Break</Text>
            <Text style={styles.breakTimer}>{breakDuration}</Text>
            <Text style={styles.breakStartText}>
              Started at {breakStartTime ? format(breakStartTime, 'h:mm a') : ''}
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.endBreakButton}
            onPress={handleBreakToggle}
            activeOpacity={0.8}
          >
            <Ionicons name="play" size={16} color="#ffffff" />
            <Text style={styles.endBreakText}>End Break</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.notOnBreakContainer}>
          {totalBreakMinutes > 0 && (
            <Text style={styles.totalBreakText}>
              Total break today: {totalBreakMinutes} min
            </Text>
          )}
          
          <TouchableOpacity
            style={styles.startBreakButton}
            onPress={handleBreakToggle}
            activeOpacity={0.8}
          >
            <Ionicons name="pause" size={16} color="#6366f1" />
            <Text style={styles.startBreakText}>Start Break</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 8,
  },
  onBreakContainer: {
    alignItems: 'center',
  },
  breakTimerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  breakLabel: {
    fontSize: 12,
    color: '#f59e0b',
    fontWeight: '500',
    marginBottom: 4,
  },
  breakTimer: {
    fontSize: 32,
    fontWeight: '700',
    color: '#f59e0b',
    fontVariant: ['tabular-nums'],
  },
  breakStartText: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  endBreakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#22c55e',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
  },
  endBreakText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  notOnBreakContainer: {
    alignItems: 'center',
  },
  totalBreakText: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 12,
  },
  startBreakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
  },
  startBreakText: {
    color: '#6366f1',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
```

### 3. `mobile/src/components/clock/PhotoCapture.tsx`

```typescript
// mobile/src/components/clock/PhotoCapture.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Camera, CameraType } from 'expo-camera';
import * as ImageManipulator from 'expo-image-manipulator';

interface PhotoCaptureProps {
  onPhotoCapture: (base64: string) => void;
  onPhotoClear: () => void;
  capturedPhoto: string | null;
  required?: boolean;
}

export function PhotoCapture({
  onPhotoCapture,
  onPhotoClear,
  capturedPhoto,
  required = false,
}: PhotoCaptureProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<Camera>(null);

  const requestPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasPermission(status === 'granted');
    return status === 'granted';
  };

  const openCamera = async () => {
    if (hasPermission === null) {
      const granted = await requestPermission();
      if (!granted) {
        Alert.alert(
          'Camera Permission',
          'Camera access is required to take a photo for clock-in verification.'
        );
        return;
      }
    } else if (!hasPermission) {
      Alert.alert(
        'Camera Permission',
        'Camera access was denied. Please enable it in settings.'
      );
      return;
    }
    setShowCamera(true);
  };

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        base64: false,
      });

      // Resize and compress the image
      const manipulated = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 400 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG, base64: true }
      );

      if (manipulated.base64) {
        onPhotoCapture(manipulated.base64);
      }
      setShowCamera(false);
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="camera-outline" size={18} color="#6b7280" />
        <Text style={styles.headerText}>
          Photo {required ? '(Required)' : '(Optional)'}
        </Text>
      </View>

      {capturedPhoto ? (
        <View style={styles.photoContainer}>
          <Image
            source={{ uri: `data:image/jpeg;base64,${capturedPhoto}` }}
            style={styles.photo}
          />
          <TouchableOpacity
            style={styles.removeButton}
            onPress={onPhotoClear}
          >
            <Ionicons name="close-circle" size={24} color="#ef4444" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.captureButton}
          onPress={openCamera}
          activeOpacity={0.8}
        >
          <Ionicons name="camera" size={24} color="#6366f1" />
          <Text style={styles.captureText}>Take Photo</Text>
        </TouchableOpacity>
      )}

      {/* Camera Modal */}
      <Modal visible={showCamera} animationType="slide">
        <View style={styles.cameraContainer}>
          <Camera
            ref={cameraRef}
            style={styles.camera}
            type={CameraType.front}
          >
            <View style={styles.cameraOverlay}>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="close" size={28} color="#ffffff" />
              </TouchableOpacity>

              <View style={styles.captureButtonContainer}>
                <TouchableOpacity
                  style={styles.shutterButton}
                  onPress={takePhoto}
                >
                  <View style={styles.shutterInner} />
                </TouchableOpacity>
              </View>
            </View>
          </Camera>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 8,
  },
  photoContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  photo: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f3f4f6',
  },
  removeButton: {
    position: 'absolute',
    top: 0,
    right: '30%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eef2ff',
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#c7d2fe',
    borderStyle: 'dashed',
  },
  captureText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366f1',
    marginLeft: 8,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'space-between',
    padding: 20,
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  captureButtonContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shutterInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#ffffff',
  },
});
```

### 4. `mobile/src/components/clock/TodayEntries.tsx`

```typescript
// mobile/src/components/clock/TodayEntries.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, isToday } from 'date-fns';
import { getTimesheetEntries } from '../../api/time-tracking';

interface ClockEntry {
  id: string;
  clockInTime: string;
  clockOutTime: string | null;
  status: 'ACTIVE' | 'COMPLETED';
  notes: string | null;
}

export function TodayEntries() {
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ClockEntry[]>([]);

  const loadEntries = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTimesheetEntries();
      // Filter to today's entries only
      const todayEntries = data.entries.filter((entry: any) =>
        isToday(parseISO(entry.clockInTime || entry.date))
      );
      setEntries(todayEntries);
    } catch (error) {
      console.error('[TodayEntries] Error loading entries:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadEntries();
    }, [loadEntries])
  );

  const formatDuration = (clockIn: string, clockOut: string | null): string => {
    if (!clockOut) return 'In progress';
    
    const start = parseISO(clockIn);
    const end = parseISO(clockOut);
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#6366f1" />
      </View>
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="list-outline" size={18} color="#6b7280" />
        <Text style={styles.headerText}>Today's Entries</Text>
      </View>

      {entries.map((entry, index) => (
        <View key={entry.id} style={styles.entryRow}>
          <View style={styles.entryTimes}>
            <Text style={styles.timeText}>
              {format(parseISO(entry.clockInTime), 'h:mm a')}
            </Text>
            <Ionicons name="arrow-forward" size={14} color="#9ca3af" />
            <Text style={styles.timeText}>
              {entry.clockOutTime
                ? format(parseISO(entry.clockOutTime), 'h:mm a')
                : 'Now'}
            </Text>
          </View>
          <Text
            style={[
              styles.durationText,
              entry.status === 'ACTIVE' && styles.activeDuration,
            ]}
          >
            {formatDuration(entry.clockInTime, entry.clockOutTime)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6b7280',
    marginLeft: 8,
  },
  entryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  entryTimes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    fontSize: 14,
    color: '#1f2937',
    marginHorizontal: 4,
  },
  durationText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  activeDuration: {
    color: '#22c55e',
  },
});
```

### 5. `mobile/src/components/clock/index.ts`

```typescript
// mobile/src/components/clock/index.ts
export { ManualEntryModal } from './ManualEntryModal';
export { BreakControls } from './BreakControls';
export { PhotoCapture } from './PhotoCapture';
export { TodayEntries } from './TodayEntries';
```

## Update ClockScreen

Modify the existing `mobile/src/screens/ClockScreen.tsx` to integrate new components:

**Add imports:**
```typescript
import { BreakControls, PhotoCapture, TodayEntries, ManualEntryModal } from '../components/clock';
```

**Add state:**
```typescript
const [manualEntryVisible, setManualEntryVisible] = useState(false);
const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
```

**Add in render (after main clock button, before location info):**
```tsx
{/* Break Controls */}
<BreakControls
  isClockedIn={isClockedIn}
  onBreakStart={() => console.log('Break started')}
  onBreakEnd={() => console.log('Break ended')}
/>

{/* Photo Capture (if required by settings) */}
{photoRequired && !isClockedIn && (
  <PhotoCapture
    onPhotoCapture={setCapturedPhoto}
    onPhotoClear={() => setCapturedPhoto(null)}
    capturedPhoto={capturedPhoto}
    required={true}
  />
)}

{/* Today's Entries */}
<TodayEntries />

{/* Manual Entry Modal */}
<ManualEntryModal
  visible={manualEntryVisible}
  onClose={() => setManualEntryVisible(false)}
  onSuccess={() => {
    setManualEntryVisible(false);
    loadStatus(); // Refresh status
  }}
/>
```

**Add Manual Entry button (in the footer area):**
```tsx
<TouchableOpacity
  style={styles.manualEntryButton}
  onPress={() => setManualEntryVisible(true)}
>
  <Ionicons name="create-outline" size={18} color="#6366f1" />
  <Text style={styles.manualEntryText}>Add Manual Entry</Text>
</TouchableOpacity>
```

## Dependencies to Install

Ensure these are installed in the mobile app:

```bash
cd mobile
npx expo install @react-native-community/datetimepicker
npx expo install expo-camera
npx expo install expo-image-manipulator
```

## Verification Steps

1. **Manual Entry Modal**
   - Opens from dashboard tile and clock screen
   - Date picker works correctly
   - Time pickers work correctly
   - Hours calculation updates in real-time
   - Validation prevents future dates/times
   - Validation prevents clock-out before clock-in
   - Submit creates entry and shows success
   - Error handling shows appropriate messages

2. **Break Controls**
   - Only visible when clocked in
   - Start break shows timer
   - End break accumulates total
   - Timer updates every second
   - Resets when clocked out

3. **Photo Capture**
   - Camera permission request works
   - Front camera opens
   - Photo capture works
   - Photo preview shows
   - Remove photo works
   - Photo is compressed appropriately

4. **Today's Entries**
   - Shows today's clock entries
   - Shows duration for each entry
   - Active entry shows "In progress"
   - Updates on screen focus

## Next Step

Proceed to `mobile-ta-04-shifts-screen.md` to implement the full shifts/schedule screen.
