import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Animated,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiFetch } from '../api/client';
import LoadingState from '../components/LoadingState';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DAY_WIDTH = (SCREEN_WIDTH - 48) / 7;

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  type: string;
  categoryName?: string;
  approvalStatus?: string;
  reason?: string;
  employee?: {
    id: string;
    name: string;
    department?: string;
    profileImageUrl?: string;
  };
}

interface Department {
  id: string;
  name: string;
}

interface DayEvents {
  [key: string]: CalendarEvent[];
}

const formatDateKey = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthDays = (year: number, month: number): Date[] => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const days: Date[] = [];
  const firstDayOfWeek = firstDay.getDay();
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    days.push(new Date(year, month, -i));
  }
  for (let i = 1; i <= lastDay.getDate(); i++) {
    days.push(new Date(year, month, i));
  }
  const remainingDays = 7 - (days.length % 7);
  if (remainingDays < 7) {
    for (let i = 1; i <= remainingDays; i++) {
      days.push(new Date(year, month + 1, i));
    }
  }
  return days;
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const getCategoryColor = (categoryName?: string): { bg: string; text: string; border: string } => {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('annual') || name.includes('vacation') || name.includes('holiday')) return { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' };
  if (name.includes('sick')) return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
  if (name.includes('personal')) return { bg: '#f3e8ff', text: '#7c3aed', border: '#c4b5fd' };
  if (name.includes('bereavement')) return { bg: '#f1f5f9', text: '#475569', border: '#cbd5e1' };
  if (name.includes('parental') || name.includes('maternity') || name.includes('paternity')) return { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' };
  if (name.includes('study') || name.includes('training')) return { bg: '#ccfbf1', text: '#0d9488', border: '#5eead4' };
  return { bg: '#e0f2fe', text: '#0284c7', border: '#7dd3fc' };
};

const getCategoryIcon = (categoryName?: string): keyof typeof Ionicons.glyphMap => {
  const name = (categoryName || '').toLowerCase();
  if (name.includes('annual') || name.includes('vacation')) return 'sunny';
  if (name.includes('sick')) return 'medical';
  if (name.includes('personal')) return 'person';
  if (name.includes('bereavement')) return 'heart';
  if (name.includes('parental')) return 'people';
  if (name.includes('study')) return 'school';
  return 'calendar';
};

const Avatar = ({ uri, name, size = 40 }: { uri?: string | null; name?: string; size?: number }) => {
  const initials = name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : '?';
  if (uri) return <Image source={{ uri }} style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]} />;
  return (
    <View style={[styles.avatarPlaceholder, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.avatarInitials, { fontSize: size * 0.4 }]}>{initials}</Text>
    </View>
  );
};

const StatCard = ({ icon, label, value, gradient }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: number | string; gradient: string[] }) => (
  <View style={styles.statCard}>
    <LinearGradient colors={gradient as any} style={styles.statGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
      <Ionicons name={icon} size={18} color="#fff" />
    </LinearGradient>
    <View style={styles.statContent}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  </View>
);

const DayCell = ({ date, events, isCurrentMonth, isToday, isSelected, onPress }: { date: Date; events: CalendarEvent[]; isCurrentMonth: boolean; isToday: boolean; isSelected: boolean; onPress: () => void }) => {
  const eventCount = events.length;
  return (
    <TouchableOpacity style={[styles.dayCell, !isCurrentMonth && styles.dayCellOutside, isToday && styles.dayCellToday, isSelected && styles.dayCellSelected]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.dayNumber, !isCurrentMonth && styles.dayNumberOutside, isToday && styles.dayNumberToday, isSelected && styles.dayNumberSelected]}>{date.getDate()}</Text>
      {eventCount > 0 && (
        <View style={styles.eventDotsContainer}>
          {events.slice(0, 3).map((event, index) => {
            const colors = getCategoryColor(event.categoryName);
            return <View key={event.id + index} style={[styles.eventDot, { backgroundColor: colors.text }]} />;
          })}
          {eventCount > 3 && <Text style={styles.moreEventsText}>+{eventCount - 3}</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
};

const EventCard = ({ event, onPress }: { event: CalendarEvent; onPress: () => void }) => {
  const colors = getCategoryColor(event.categoryName);
  const icon = getCategoryIcon(event.categoryName);
  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const durationDays = Math.max(1, Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)));
  const formatDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  return (
    <TouchableOpacity style={[styles.eventCard, { borderLeftColor: colors.text }]} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.eventCardContent}>
        <View style={styles.eventCardHeader}>
          <View style={styles.eventEmployeeInfo}>
            <Avatar uri={event.employee?.profileImageUrl} name={event.employee?.name} size={44} />
            <View style={styles.eventEmployeeDetails}>
              <Text style={styles.eventEmployeeName} numberOfLines={1}>{event.employee?.name || 'Unknown'}</Text>
              {event.employee?.department && <Text style={styles.eventDepartment} numberOfLines={1}>{event.employee.department}</Text>}
            </View>
          </View>
          <View style={[styles.categoryBadge, { backgroundColor: colors.bg, borderColor: colors.border }]}>
            <Ionicons name={icon} size={12} color={colors.text} />
            <Text style={[styles.categoryBadgeText, { color: colors.text }]} numberOfLines={1}>{event.categoryName || 'Leave'}</Text>
          </View>
        </View>
        <View style={styles.eventCardFooter}>
          <View style={styles.eventDateRange}>
            <Ionicons name="calendar-outline" size={14} color="#64748b" />
            <Text style={styles.eventDateText}>{durationDays === 1 ? formatDate(startDate) : `${formatDate(startDate)} - ${formatDate(new Date(endDate.getTime() - 86400000))}`}</Text>
          </View>
          <View style={styles.eventDuration}>
            <Text style={styles.eventDurationText}>{durationDays} {durationDays === 1 ? 'day' : 'days'}</Text>
          </View>
        </View>
        {event.approvalStatus && (
          <View style={[styles.statusBadge, event.approvalStatus === 'APPROVED' && styles.statusApproved, event.approvalStatus === 'PENDING' && styles.statusPending, event.approvalStatus === 'DECLINED' && styles.statusDeclined]}>
            <Ionicons name={event.approvalStatus === 'APPROVED' ? 'checkmark-circle' : event.approvalStatus === 'PENDING' ? 'time' : 'close-circle'} size={12} color={event.approvalStatus === 'APPROVED' ? '#16a34a' : event.approvalStatus === 'PENDING' ? '#ca8a04' : '#dc2626'} />
            <Text style={[styles.statusText, event.approvalStatus === 'APPROVED' && styles.statusTextApproved, event.approvalStatus === 'PENDING' && styles.statusTextPending, event.approvalStatus === 'DECLINED' && styles.statusTextDeclined]}>{event.approvalStatus.charAt(0) + event.approvalStatus.slice(1).toLowerCase()}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

export default function CompanyCalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [dayModalVisible, setDayModalVisible] = useState(false);
  const [eventModalVisible, setEventModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth();

  const fetchEvents = useCallback(async () => {
    try {
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      startOfMonth.setDate(startOfMonth.getDate() - 7);
      endOfMonth.setDate(endOfMonth.getDate() + 7);
      const params = new URLSearchParams({ from: startOfMonth.toISOString().split('T')[0], to: endOfMonth.toISOString().split('T')[0] });
      const response = await apiFetch(`/api/calendar-events?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch events');
      const data = await response.json();
      setEvents(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
      setEvents([]);
    }
  }, [currentYear, currentMonth]);

  const fetchDepartments = useCallback(async () => {
    try {
      const response = await apiFetch('/api/departments');
      if (response.ok) {
        const data = await response.json();
        setDepartments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Failed to load departments:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchEvents(), fetchDepartments()]);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    };
    loadData();
  }, [fetchEvents, fetchDepartments]);

  useEffect(() => { fetchEvents(); }, [currentYear, currentMonth]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents();
    setRefreshing(false);
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    if (selectedDepartments.length === 0) return events;
    const deptNames = new Set(departments.filter(d => selectedDepartments.includes(d.id)).map(d => d.name));
    return events.filter(e => e.employee?.department && deptNames.has(e.employee.department));
  }, [events, selectedDepartments, departments]);

  const eventsByDate = useMemo(() => {
    const grouped: DayEvents = {};
    filteredEvents.forEach(event => {
      const startDate = new Date(event.start);
      const endDate = new Date(event.end);
      const current = new Date(startDate);
      while (current < endDate) {
        const key = formatDateKey(current);
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(event);
        current.setDate(current.getDate() + 1);
      }
    });
    return grouped;
  }, [filteredEvents]);

  const monthDays = useMemo(() => getMonthDays(currentYear, currentMonth), [currentYear, currentMonth]);

  const stats = useMemo(() => {
    const today = new Date();
    const todayKey = formatDateKey(today);
    const offToday = eventsByDate[todayKey]?.length || 0;
    const totalRequests = filteredEvents.length;
    const uniquePeople = new Set(filteredEvents.map(e => e.employee?.id)).size;
    return { offToday, totalRequests, uniquePeople };
  }, [eventsByDate, filteredEvents]);

  const goToPreviousMonth = () => setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  const goToNextMonth = () => setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  const goToToday = () => setCurrentDate(new Date());
  const handleDayPress = (date: Date) => { setSelectedDate(date); setDayModalVisible(true); };
  const handleEventPress = (event: CalendarEvent) => { setSelectedEvent(event); setDayModalVisible(false); setTimeout(() => setEventModalVisible(true), 300); };
  const handleDepartmentSelect = (deptId: string) => setSelectedDepartments(prev => prev.includes(deptId) ? prev.filter(id => id !== deptId) : [...prev, deptId]);

  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    return eventsByDate[formatDateKey(selectedDate)] || [];
  }, [selectedDate, eventsByDate]);

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return filteredEvents.filter(e => new Date(e.start) >= today).sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()).slice(0, 20);
  }, [filteredEvents]);

  if (loading) return <LoadingState message="Loading calendar..." />;

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#3b82f6']} />} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={['#3b82f6', '#8b5cf6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerTitleRow}>
              <View style={styles.headerIconContainer}><Ionicons name="calendar" size={24} color="#fff" /></View>
              <View><Text style={styles.headerTitle}>Company Calendar</Text><Text style={styles.headerSubtitle}>Team availability & leave</Text></View>
            </View>
            <TouchableOpacity style={styles.filterButton} onPress={() => setFilterModalVisible(true)}>
              <Ionicons name="filter" size={20} color="#fff" />
              {selectedDepartments.length > 0 && <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{selectedDepartments.length}</Text></View>}
            </TouchableOpacity>
          </View>
        </LinearGradient>

        <View style={styles.statsContainer}>
          <StatCard icon="people" label="Off Today" value={stats.offToday} gradient={['#3b82f6', '#60a5fa']} />
          <StatCard icon="calendar" label="This Month" value={stats.totalRequests} gradient={['#8b5cf6', '#a78bfa']} />
          <StatCard icon="person" label="People" value={stats.uniquePeople} gradient={['#06b6d4', '#22d3ee']} />
        </View>

        <View style={styles.viewToggleContainer}>
          <View style={styles.viewToggle}>
            <TouchableOpacity style={[styles.viewToggleButton, viewMode === 'month' && styles.viewToggleButtonActive]} onPress={() => setViewMode('month')}>
              <Ionicons name="grid" size={18} color={viewMode === 'month' ? '#fff' : '#64748b'} />
              <Text style={[styles.viewToggleText, viewMode === 'month' && styles.viewToggleTextActive]}>Month</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleButtonActive]} onPress={() => setViewMode('list')}>
              <Ionicons name="list" size={18} color={viewMode === 'list' ? '#fff' : '#64748b'} />
              <Text style={[styles.viewToggleText, viewMode === 'list' && styles.viewToggleTextActive]}>List</Text>
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'month' ? (
          <View style={styles.calendarContainer}>
            <View style={styles.monthNavigation}>
              <TouchableOpacity style={styles.navButton} onPress={goToPreviousMonth}><Ionicons name="chevron-back" size={24} color="#0f172a" /></TouchableOpacity>
              <TouchableOpacity style={styles.monthTitleContainer} onPress={goToToday}>
                <Text style={styles.monthTitle}>{MONTHS[currentMonth]} {currentYear}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.navButton} onPress={goToNextMonth}><Ionicons name="chevron-forward" size={24} color="#0f172a" /></TouchableOpacity>
            </View>
            <View style={styles.weekdayHeader}>
              {WEEKDAYS.map((day, index) => (
                <View key={day} style={styles.weekdayCell}><Text style={[styles.weekdayText, (index === 0 || index === 6) && styles.weekdayTextWeekend]}>{day}</Text></View>
              ))}
            </View>
            <View style={styles.calendarGrid}>
              {monthDays.map((date, index) => {
                const dateKey = formatDateKey(date);
                const dayEvents = eventsByDate[dateKey] || [];
                const isCurrentMonth = date.getMonth() === currentMonth;
                const today = new Date();
                const isToday = date.toDateString() === today.toDateString();
                const isSelected = selectedDate?.toDateString() === date.toDateString();
                return <DayCell key={`${dateKey}-${index}`} date={date} events={dayEvents} isCurrentMonth={isCurrentMonth} isToday={isToday} isSelected={isSelected} onPress={() => handleDayPress(date)} />;
              })}
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#1d4ed8' }]} /><Text style={styles.legendText}>Annual</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#dc2626' }]} /><Text style={styles.legendText}>Sick</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#7c3aed' }]} /><Text style={styles.legendText}>Other</Text></View>
            </View>
          </View>
        ) : (
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Upcoming Leave</Text>
            {upcomingEvents.length === 0 ? (
              <View style={styles.emptyListContainer}><Ionicons name="calendar-outline" size={48} color="#cbd5e1" /><Text style={styles.emptyListTitle}>No upcoming leave</Text></View>
            ) : (
              upcomingEvents.map(event => <EventCard key={event.id} event={event} onPress={() => handleEventPress(event)} />)
            )}
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Day Detail Modal */}
      <Modal visible={dayModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDayModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setDayModalVisible(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
          </View>
          {selectedDate && (
            <>
              <View style={styles.dayModalTitleContainer}>
                <Ionicons name="calendar" size={24} color="#3b82f6" />
                <Text style={styles.dayModalTitle}>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
              </View>
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {selectedDateEvents.length === 0 ? (
                  <View style={styles.emptyDayContainer}><Ionicons name="sunny-outline" size={48} color="#cbd5e1" /><Text style={styles.emptyDayTitle}>No one is off</Text><Text style={styles.emptyDaySubtitle}>Everyone is available</Text></View>
                ) : (
                  <View style={styles.dayEventsList}>
                    <Text style={styles.dayEventsCount}>{selectedDateEvents.length} {selectedDateEvents.length === 1 ? 'person' : 'people'} off</Text>
                    {selectedDateEvents.map(event => <EventCard key={event.id} event={event} onPress={() => handleEventPress(event)} />)}
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      </Modal>

      {/* Event Detail Modal */}
      <Modal visible={eventModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEventModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setEventModalVisible(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
          </View>
          {selectedEvent && (
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.modalEmployeeHeader}>
                <Avatar uri={selectedEvent.employee?.profileImageUrl} name={selectedEvent.employee?.name} size={72} />
                <Text style={styles.modalEmployeeName}>{selectedEvent.employee?.name || 'Unknown'}</Text>
                {selectedEvent.employee?.department && <Text style={styles.modalEmployeeDepartment}>{selectedEvent.employee.department}</Text>}
              </View>
              <View style={styles.modalCategoryContainer}>
                <View style={[styles.modalCategoryBadge, { backgroundColor: getCategoryColor(selectedEvent.categoryName).bg, borderColor: getCategoryColor(selectedEvent.categoryName).border }]}>
                  <Ionicons name={getCategoryIcon(selectedEvent.categoryName)} size={18} color={getCategoryColor(selectedEvent.categoryName).text} />
                  <Text style={[styles.modalCategoryText, { color: getCategoryColor(selectedEvent.categoryName).text }]}>{selectedEvent.categoryName || 'Leave'}</Text>
                </View>
              </View>
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Duration</Text>
                <View style={styles.modalDateCard}>
                  <View style={styles.modalDateRow}><Text style={styles.modalDateLabel}>From</Text><Text style={styles.modalDateValue}>{new Date(selectedEvent.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text></View>
                  <View style={styles.modalDateDivider} />
                  <View style={styles.modalDateRow}><Text style={styles.modalDateLabel}>To</Text><Text style={styles.modalDateValue}>{new Date(new Date(selectedEvent.end).getTime() - 86400000).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</Text></View>
                  <View style={styles.modalDurationBadge}><Ionicons name="time-outline" size={16} color="#3b82f6" /><Text style={styles.modalDurationText}>{Math.max(1, Math.ceil((new Date(selectedEvent.end).getTime() - new Date(selectedEvent.start).getTime()) / (1000 * 60 * 60 * 24)))} days</Text></View>
                </View>
              </View>
              {selectedEvent.approvalStatus && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Status</Text>
                  <View style={[styles.modalStatusCard, selectedEvent.approvalStatus === 'APPROVED' && styles.modalStatusApproved, selectedEvent.approvalStatus === 'PENDING' && styles.modalStatusPending, selectedEvent.approvalStatus === 'DECLINED' && styles.modalStatusDeclined]}>
                    <Ionicons name={selectedEvent.approvalStatus === 'APPROVED' ? 'checkmark-circle' : selectedEvent.approvalStatus === 'PENDING' ? 'time' : 'close-circle'} size={24} color={selectedEvent.approvalStatus === 'APPROVED' ? '#16a34a' : selectedEvent.approvalStatus === 'PENDING' ? '#ca8a04' : '#dc2626'} />
                    <Text style={[styles.modalStatusText, { color: selectedEvent.approvalStatus === 'APPROVED' ? '#16a34a' : selectedEvent.approvalStatus === 'PENDING' ? '#ca8a04' : '#dc2626' }]}>{selectedEvent.approvalStatus === 'APPROVED' ? 'Approved' : selectedEvent.approvalStatus === 'PENDING' ? 'Pending Approval' : 'Declined'}</Text>
                  </View>
                </View>
              )}
              {selectedEvent.reason && (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>Reason</Text>
                  <View style={styles.modalReasonCard}><Ionicons name="chatbubble-outline" size={16} color="#64748b" /><Text style={styles.modalReasonText}>"{selectedEvent.reason}"</Text></View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setFilterModalVisible(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHandle} />
            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setFilterModalVisible(false)}><Ionicons name="close" size={24} color="#64748b" /></TouchableOpacity>
          </View>
          <View style={styles.filterModalHeader}><Ionicons name="filter" size={24} color="#3b82f6" /><Text style={styles.filterModalTitle}>Filter Calendar</Text></View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.filterSectionTitle}>Departments</Text>
            <TouchableOpacity style={[styles.filterOption, selectedDepartments.length === 0 && styles.filterOptionSelected]} onPress={() => setSelectedDepartments([])}>
              <Ionicons name={selectedDepartments.length === 0 ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selectedDepartments.length === 0 ? '#3b82f6' : '#94a3b8'} />
              <Text style={[styles.filterOptionText, selectedDepartments.length === 0 && styles.filterOptionTextSelected]}>All Departments</Text>
            </TouchableOpacity>
            {departments.map(dept => {
              const isSelected = selectedDepartments.includes(dept.id);
              return (
                <TouchableOpacity key={dept.id} style={[styles.filterOption, isSelected && styles.filterOptionSelected]} onPress={() => handleDepartmentSelect(dept.id)}>
                  <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={isSelected ? '#3b82f6' : '#94a3b8'} />
                  <Text style={[styles.filterOptionText, isSelected && styles.filterOptionTextSelected]}>{dept.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={styles.filterModalFooter}>
            <TouchableOpacity style={styles.filterApplyButton} onPress={() => setFilterModalVisible(false)}><Text style={styles.filterApplyButtonText}>Apply Filters</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  scrollView: { flex: 1 },
  header: { paddingTop: Platform.OS === 'ios' ? 60 : 40, paddingBottom: 40, paddingHorizontal: 20, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  headerIconContainer: { width: 48, height: 48, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  filterButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  filterBadge: { position: 'absolute', top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' },
  filterBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  statsContainer: { flexDirection: 'row', paddingHorizontal: 16, marginTop: -20, gap: 10 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4 },
  statGradient: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  statContent: { flex: 1 },
  statValue: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
  statLabel: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  viewToggleContainer: { paddingHorizontal: 16, marginTop: 20, marginBottom: 16 },
  viewToggle: { flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 12, padding: 4 },
  viewToggleButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, gap: 6 },
  viewToggleButtonActive: { backgroundColor: '#3b82f6' },
  viewToggleText: { fontSize: 14, fontWeight: '600', color: '#64748b' },
  viewToggleTextActive: { color: '#fff' },
  calendarContainer: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 20, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3 },
  monthNavigation: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  navButton: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  monthTitleContainer: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  todayBadge: { backgroundColor: '#dbeafe', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  todayBadgeText: { fontSize: 11, fontWeight: '600', color: '#3b82f6' },
  weekdayHeader: { flexDirection: 'row', marginBottom: 8 },
  weekdayCell: { width: DAY_WIDTH, alignItems: 'center', paddingVertical: 8 },
  weekdayText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  weekdayTextWeekend: { color: '#94a3b8' },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: DAY_WIDTH, height: DAY_WIDTH + 8, alignItems: 'center', paddingTop: 6, borderRadius: 10 },
  dayCellOutside: { opacity: 0.4 },
  dayCellToday: { backgroundColor: '#dbeafe' },
  dayCellSelected: { backgroundColor: '#3b82f6' },
  dayNumber: { fontSize: 14, fontWeight: '600', color: '#0f172a' },
  dayNumberOutside: { color: '#94a3b8' },
  dayNumberToday: { color: '#1d4ed8', fontWeight: '700' },
  dayNumberSelected: { color: '#fff' },
  eventDotsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 3 },
  eventDot: { width: 6, height: 6, borderRadius: 3 },
  moreEventsText: { fontSize: 9, fontWeight: '600', color: '#64748b' },
  legend: { flexDirection: 'row', justifyContent: 'center', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f1f5f9', gap: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  listContainer: { paddingHorizontal: 16 },
  listTitle: { fontSize: 18, fontWeight: '700', color: '#0f172a', marginBottom: 16 },
  emptyListContainer: { alignItems: 'center', paddingVertical: 48, backgroundColor: '#fff', borderRadius: 20 },
  emptyListTitle: { fontSize: 16, fontWeight: '600', color: '#64748b', marginTop: 16 },
  eventCard: { backgroundColor: '#fff', borderRadius: 16, marginBottom: 12, borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  eventCardContent: { padding: 16 },
  eventCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  eventEmployeeInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  eventEmployeeDetails: { marginLeft: 12, flex: 1 },
  eventEmployeeName: { fontSize: 15, fontWeight: '700', color: '#0f172a' },
  eventDepartment: { fontSize: 13, color: '#64748b', marginTop: 2 },
  categoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1, gap: 5, marginLeft: 8 },
  categoryBadgeText: { fontSize: 11, fontWeight: '600' },
  eventCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  eventDateRange: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  eventDateText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  eventDuration: { backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  eventDurationText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, gap: 5, marginTop: 12 },
  statusApproved: { backgroundColor: '#dcfce7' },
  statusPending: { backgroundColor: '#fef3c7' },
  statusDeclined: { backgroundColor: '#fee2e2' },
  statusText: { fontSize: 12, fontWeight: '600' },
  statusTextApproved: { color: '#16a34a' },
  statusTextPending: { color: '#ca8a04' },
  statusTextDeclined: { color: '#dc2626' },
  avatar: { backgroundColor: '#e2e8f0' },
  avatarPlaceholder: { backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center' },
  avatarInitials: { color: '#fff', fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: '#f8fafc' },
  modalHeader: { alignItems: 'center', paddingTop: 12, paddingBottom: 8, paddingHorizontal: 16 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#cbd5e1', borderRadius: 2 },
  modalCloseButton: { position: 'absolute', right: 16, top: 8, width: 36, height: 36, borderRadius: 18, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center' },
  modalContent: { flex: 1, paddingHorizontal: 20 },
  dayModalTitleContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginHorizontal: 20, marginBottom: 16 },
  dayModalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  emptyDayContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyDayTitle: { fontSize: 18, fontWeight: '600', color: '#64748b', marginTop: 16 },
  emptyDaySubtitle: { fontSize: 14, color: '#94a3b8', marginTop: 4 },
  dayEventsList: { paddingBottom: 24 },
  dayEventsCount: { fontSize: 14, fontWeight: '600', color: '#64748b', marginBottom: 16 },
  modalEmployeeHeader: { alignItems: 'center', paddingVertical: 24 },
  modalEmployeeName: { fontSize: 22, fontWeight: '700', color: '#0f172a', marginTop: 16 },
  modalEmployeeDepartment: { fontSize: 15, color: '#64748b', marginTop: 4 },
  modalCategoryContainer: { alignItems: 'center', marginBottom: 24 },
  modalCategoryBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 8 },
  modalCategoryText: { fontSize: 15, fontWeight: '600' },
  modalSection: { marginBottom: 24 },
  modalSectionTitle: { fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  modalDateCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  modalDateRow: { paddingVertical: 8 },
  modalDateLabel: { fontSize: 12, color: '#94a3b8', fontWeight: '500', marginBottom: 4 },
  modalDateValue: { fontSize: 15, color: '#0f172a', fontWeight: '600' },
  modalDateDivider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 8 },
  modalDurationBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#dbeafe', paddingVertical: 10, borderRadius: 10, marginTop: 12, gap: 6 },
  modalDurationText: { fontSize: 14, fontWeight: '600', color: '#3b82f6' },
  modalStatusCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 16, gap: 10 },
  modalStatusApproved: { backgroundColor: '#dcfce7' },
  modalStatusPending: { backgroundColor: '#fef3c7' },
  modalStatusDeclined: { backgroundColor: '#fee2e2' },
  modalStatusText: { fontSize: 16, fontWeight: '600' },
  modalReasonCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 16, padding: 16, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 },
  modalReasonText: { flex: 1, fontSize: 14, color: '#475569', fontStyle: 'italic', lineHeight: 22 },
  filterModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#e2e8f0', marginHorizontal: 20, marginBottom: 16 },
  filterModalTitle: { fontSize: 20, fontWeight: '700', color: '#0f172a' },
  filterSectionTitle: { fontSize: 13, fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  filterOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 16, borderRadius: 12, marginBottom: 8, gap: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  filterOptionSelected: { backgroundColor: '#dbeafe', borderColor: '#93c5fd' },
  filterOptionText: { fontSize: 15, color: '#475569', fontWeight: '500' },
  filterOptionTextSelected: { color: '#1d4ed8', fontWeight: '600' },
  filterModalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  filterApplyButton: { backgroundColor: '#3b82f6', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  filterApplyButtonText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
