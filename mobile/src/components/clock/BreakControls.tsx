import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BreakControlsProps {
  isClockedIn: boolean;
  onBreakStart: () => void;
  onBreakEnd: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
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
        setTotalBreakMinutes((prev) => prev + breakMinutes);
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
              Started at {breakStartTime ? formatTime(breakStartTime) : ''}
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#94A3B8',
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
    color: '#94A3B8',
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
    color: '#94A3B8',
    marginBottom: 12,
  },
  startBreakButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    width: '100%',
  },
  startBreakText: {
    color: '#818cf8',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});
