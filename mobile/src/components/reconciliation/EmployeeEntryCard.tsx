import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO, differenceInMinutes } from 'date-fns';
import { ReconciliationEntry } from '../../api/reconciliation';

// Extended entry type with internal fields
type ExtendedEntry = ReconciliationEntry & {
  _hasNotStarted?: boolean;
  _isInProgress?: boolean;
  _varianceType?: string;
  _role?: string;
};

interface EmployeeEntryCardProps {
  entry: ReconciliationEntry;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onFlag: () => void;
  onApprove: () => void;
}

export function EmployeeEntryCard({
  entry,
  isSelected,
  onSelect,
  onEdit,
  onFlag,
  onApprove,
}: EmployeeEntryCardProps) {
  const extEntry = entry as ExtendedEntry;
  
  // Determine shift state
  const now = new Date();
  const shiftStart = entry.shiftStart ? new Date(entry.shiftStart) : null;
  const shiftEnd = entry.shiftEnd ? new Date(entry.shiftEnd) : null;
  
  const hasNotStarted = extEntry._hasNotStarted ?? (shiftStart && shiftStart > now);
  const isInProgress = extEntry._isInProgress ?? (shiftStart && shiftEnd && shiftStart <= now && shiftEnd > now);
  const isCompleted = shiftEnd && shiftEnd <= now;
  const hasClockData = entry.clockInTime || entry.clockOutTime;
  const hasTimesheetData = entry.timesheetEntryId;
  const isNoShow = isCompleted && !hasClockData && !hasTimesheetData;
  
  const getShiftState = () => {
    if (hasNotStarted) return 'upcoming';
    if (isInProgress) return 'in-progress';
    if (entry.status === 'APPROVED') return 'approved';
    if (entry.status === 'FLAGGED') return 'flagged';
    if (isNoShow) return 'no-show';
    if (hasClockData || hasTimesheetData) return 'needs-review';
    return 'pending';
  };
  
  const shiftState = getShiftState();
  
  const getStatusConfig = () => {
    switch (shiftState) {
      case 'upcoming':
        return { color: '#3b82f6', bg: '#eff6ff', icon: 'time-outline' as const, label: 'Upcoming' };
      case 'in-progress':
        return { color: '#8b5cf6', bg: '#f5f3ff', icon: 'play-circle-outline' as const, label: 'In Progress' };
      case 'approved':
        return { color: '#22c55e', bg: '#dcfce7', icon: 'checkmark-circle' as const, label: 'Approved' };
      case 'flagged':
        return { color: '#ef4444', bg: '#fef2f2', icon: 'flag' as const, label: 'Flagged' };
      case 'no-show':
        return { color: '#f59e0b', bg: '#fef3c7', icon: 'alert-circle-outline' as const, label: 'No Show' };
      case 'needs-review':
        return { color: '#6366f1', bg: '#eef2ff', icon: 'eye-outline' as const, label: 'Review' };
      default:
        return { color: '#9ca3af', bg: '#f3f4f6', icon: 'ellipse-outline' as const, label: 'Pending' };
    }
  };
  
  const statusConfig = getStatusConfig();

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '—';
    try {
      return format(parseISO(timeStr), 'h:mm a');
    } catch {
      return '—';
    }
  };
  
  const formatTimeRange = (start: string | null, end: string | null) => {
    if (!start) return 'Not scheduled';
    const startFormatted = formatTime(start);
    const endFormatted = end ? formatTime(end) : 'ongoing';
    return `${startFormatted} → ${endFormatted}`;
  };

  const getVarianceDisplay = () => {
    const { variance } = entry;
    if (!variance.totalVarianceMinutes) return null;
    
    const mins = Math.abs(variance.totalVarianceMinutes);
    const sign = variance.totalVarianceMinutes > 0 ? '+' : '-';
    const hours = Math.floor(mins / 60);
    const minutes = mins % 60;
    
    return {
      text: hours > 0 ? `${sign}${hours}h ${minutes}m` : `${sign}${minutes}m`,
      color: variance.totalVarianceMinutes > 0 ? '#22c55e' : '#ef4444',
      isPositive: variance.totalVarianceMinutes > 0,
    };
  };

  const varianceDisplay = getVarianceDisplay();
  
  // Get initials safely
  const getInitials = (name: string) => {
    if (!name || name === 'Unassigned') return '?';
    return name.split(' ').map(n => n[0]?.toUpperCase() || '').join('').slice(0, 2) || '?';
  };

  return (
    <TouchableOpacity
      style={[
        styles.container, 
        isSelected && styles.selectedContainer,
        hasNotStarted && styles.upcomingContainer,
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      {/* Status Indicator */}
      <View style={[styles.statusBar, { backgroundColor: statusConfig.color }]} />

      <View style={styles.content}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          {/* Employee Info */}
          <View style={styles.employeeInfo}>
            {entry.profileImageUrl ? (
              <Image
                source={{ uri: entry.profileImageUrl }}
                style={styles.avatar}
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: statusConfig.bg }]}>
                <Text style={[styles.avatarText, { color: statusConfig.color }]}>
                  {getInitials(entry.employeeName)}
                </Text>
              </View>
            )}
            <View style={styles.nameContainer}>
              <Text style={styles.employeeName} numberOfLines={1}>
                {entry.employeeName || 'Unassigned'}
              </Text>
              {extEntry._role && (
                <Text style={styles.roleText}>{extEntry._role}</Text>
              )}
            </View>
          </View>

          {/* Status Badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Ionicons name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Shift Times Section */}
        <View style={styles.timesSection}>
          {/* Scheduled Time */}
          <View style={styles.timeBlock}>
            <View style={styles.timeLabelRow}>
              <Ionicons name="calendar-outline" size={14} color="#6b7280" />
              <Text style={styles.timeLabel}>Scheduled</Text>
            </View>
            <Text style={styles.timeValue}>
              {formatTimeRange(entry.shiftStart, entry.shiftEnd)}
            </Text>
          </View>

          {/* Actual Time - only show if shift has started */}
          {!hasNotStarted && (
            <View style={styles.timeBlock}>
              <View style={styles.timeLabelRow}>
                <Ionicons name="time-outline" size={14} color="#6b7280" />
                <Text style={styles.timeLabel}>Actual</Text>
              </View>
              {hasClockData ? (
                <Text style={styles.timeValue}>
                  {formatTimeRange(entry.clockInTime, entry.clockOutTime)}
                </Text>
              ) : (
                <Text style={styles.noDataText}>
                  {isInProgress ? 'Not clocked in' : 'No clock data'}
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Hours & Variance Row - only for completed shifts */}
        {!hasNotStarted && (
          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Hours</Text>
              <Text style={styles.metricValue}>
                {entry.hours > 0 ? `${entry.hours.toFixed(1)}h` : '—'}
              </Text>
            </View>
            
            {varianceDisplay && (
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Variance</Text>
                <View style={styles.varianceContainer}>
                  <Ionicons 
                    name={varianceDisplay.isPositive ? 'arrow-up' : 'arrow-down'} 
                    size={12} 
                    color={varianceDisplay.color} 
                  />
                  <Text style={[styles.varianceValue, { color: varianceDisplay.color }]}>
                    {varianceDisplay.text}
                  </Text>
                </View>
              </View>
            )}
            
            {isNoShow && (
              <View style={styles.metricItem}>
                <Text style={styles.metricLabel}>Status</Text>
                <Text style={[styles.metricValue, { color: '#f59e0b' }]}>No Show</Text>
              </View>
            )}
          </View>
        )}

        {/* Notes */}
        {entry.notes && (
          <View style={styles.notesContainer}>
            <Ionicons name="document-text-outline" size={14} color="#6b7280" />
            <Text style={styles.notesText} numberOfLines={2}>{entry.notes}</Text>
          </View>
        )}

        {/* Actions - different based on shift state */}
        <View style={styles.actionsRow}>
          {hasNotStarted ? (
            // Upcoming shift - limited actions
            <View style={styles.upcomingMessage}>
              <Ionicons name="information-circle-outline" size={16} color="#3b82f6" />
              <Text style={styles.upcomingText}>Shift starts at {formatTime(entry.shiftStart)}</Text>
            </View>
          ) : (
            // Completed/In-progress shift - full actions
            <>
              <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
                <Ionicons name="create-outline" size={18} color="#6366f1" />
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.actionButton} onPress={onFlag}>
                <Ionicons
                  name={entry.status === 'FLAGGED' ? 'flag' : 'flag-outline'}
                  size={18}
                  color={entry.status === 'FLAGGED' ? '#ef4444' : '#6b7280'}
                />
                <Text style={[
                  styles.actionText,
                  { color: entry.status === 'FLAGGED' ? '#ef4444' : '#6b7280' }
                ]}>
                  {entry.status === 'FLAGGED' ? 'Unflag' : 'Flag'}
                </Text>
              </TouchableOpacity>

              {entry.status !== 'APPROVED' && (
                <TouchableOpacity
                  style={styles.approveButton}
                  onPress={onApprove}
                >
                  <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              )}
              
              {entry.status === 'APPROVED' && (
                <View style={styles.approvedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                  <Text style={styles.approvedText}>Approved</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    flexDirection: 'row',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  selectedContainer: {
    borderWidth: 2,
    borderColor: '#6366f1',
  },
  upcomingContainer: {
    opacity: 0.85,
  },
  statusBar: {
    width: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  employeeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  employeeName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
  },
  roleText: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  timesSection: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 10,
  },
  timeBlock: {
    gap: 4,
  },
  timeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
    textTransform: 'uppercase',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginLeft: 20,
  },
  noDataText: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
    marginLeft: 20,
  },
  metricsRow: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 24,
  },
  metricItem: {
    gap: 2,
  },
  metricLabel: {
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
  },
  varianceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  varianceValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
    gap: 8,
  },
  notesText: {
    flex: 1,
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
    paddingVertical: 6,
    gap: 4,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6b7280',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 'auto',
    gap: 4,
  },
  approveText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
    gap: 4,
  },
  approvedText: {
    fontSize: 13,
    color: '#22c55e',
    fontWeight: '600',
  },
  upcomingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  upcomingText: {
    fontSize: 13,
    color: '#3b82f6',
    fontWeight: '500',
  },
});
