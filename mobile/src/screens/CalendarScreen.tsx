import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getUpcomingEvents, CalendarEvent } from '../api/calendar';
import Card from '../components/Card';
import Badge from '../components/Badge';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function CalendarScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const loadData = async () => {
    try {
      const data = await getUpcomingEvents();
      setEvents(data);
    } catch (error) {
      console.error('Failed to load calendar events:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  if (loading) {
    return <LoadingState message="Loading calendar..." />;
  }

  // Group events by date
  const groupedEvents = events.reduce((groups, event) => {
    const date = new Date(event.startDate).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  const sortedDates = Object.keys(groupedEvents).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  const getEventIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'meeting':
        return 'people';
      case 'deadline':
        return 'flag';
      case 'holiday':
        return 'sunny';
      case 'training':
        return 'school';
      case 'birthday':
        return 'gift';
      default:
        return 'calendar';
    }
  };

  const getEventColor = (categoryColor?: string) => {
    return categoryColor || '#3b82f6';
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isToday = (dateString: string) => {
    const today = new Date().toLocaleDateString();
    return dateString === today;
  };

  const isTomorrow = (dateString: string) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return dateString === tomorrow.toLocaleDateString();
  };

  const getDateLabel = (dateString: string) => {
    if (isToday(dateString)) return 'Today';
    if (isTomorrow(dateString)) return 'Tomorrow';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {events.length === 0 ? (
        <EmptyState
          icon="calendar-outline"
          title="No upcoming events"
          description="Your calendar events will appear here"
        />
      ) : (
        sortedDates.map((date) => (
          <View key={date} style={styles.dateSection}>
            <View style={styles.dateHeader}>
              <Text style={styles.dateLabel}>{getDateLabel(date)}</Text>
              <Badge text={`${groupedEvents[date].length} event(s)`} variant="info" size="small" />
            </View>

            {groupedEvents[date]
              .sort(
                (a, b) =>
                  new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
              )
              .map((event) => (
                <Card key={event.id}>
                  <View style={styles.eventContent}>
                    <View
                      style={[
                        styles.eventIndicator,
                        { backgroundColor: getEventColor(event.category?.color) },
                      ]}
                    />
                    <View style={styles.eventMain}>
                      <View style={styles.eventHeader}>
                        <View style={styles.eventHeaderLeft}>
                          <View
                            style={[
                              styles.eventIcon,
                              {
                                backgroundColor:
                                  getEventColor(event.category?.color) + '15',
                              },
                            ]}
                          >
                            <Ionicons
                              name={getEventIcon(event.type)}
                              size={20}
                              color={getEventColor(event.category?.color)}
                            />
                          </View>
                          <View style={styles.eventHeaderText}>
                            <Text style={styles.eventTitle}>{event.title}</Text>
                            {event.category && (
                              <Text style={styles.eventCategory}>
                                {event.category.name}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {event.description && (
                        <Text style={styles.eventDescription}>{event.description}</Text>
                      )}

                      <View style={styles.eventMeta}>
                        {!event.allDay && (
                          <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={16} color="#64748b" />
                            <Text style={styles.metaText}>
                              {formatTime(event.startDate)}
                              {event.endDate &&
                                ` - ${formatTime(event.endDate)}`}
                            </Text>
                          </View>
                        )}
                        {event.allDay && (
                          <View style={styles.metaItem}>
                            <Ionicons name="sunny-outline" size={16} color="#64748b" />
                            <Text style={styles.metaText}>All day</Text>
                          </View>
                        )}
                        {event.isRecurring && (
                          <View style={styles.metaItem}>
                            <Ionicons name="repeat-outline" size={16} color="#64748b" />
                            <Text style={styles.metaText}>Recurring</Text>
                          </View>
                        )}
                      </View>

                      {event.attendees && event.attendees.length > 0 && (
                        <View style={styles.attendees}>
                          <Ionicons name="people-outline" size={16} color="#64748b" />
                          <Text style={styles.attendeesText}>
                            {event.attendees.length} attendee(s)
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </Card>
              ))}
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 16,
  },
  dateSection: {
    marginBottom: 24,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  eventContent: {
    flexDirection: 'row',
  },
  eventIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12,
  },
  eventMain: {
    flex: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  eventHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
  },
  eventIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  eventHeaderText: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  eventCategory: {
    fontSize: 13,
    color: '#64748b',
  },
  eventDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  eventMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 8,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
  attendees: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  attendeesText: {
    fontSize: 13,
    color: '#64748b',
    marginLeft: 6,
  },
});
