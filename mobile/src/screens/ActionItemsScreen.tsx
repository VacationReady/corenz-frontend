import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getMyActionItems,
  completeActionItem,
  updateActionItemStatus,
  ActionItem,
} from '../api/action-items';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Button from '../components/Button';
import LoadingState from '../components/LoadingState';
import EmptyState from '../components/EmptyState';

export default function ActionItemsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<ActionItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('pending');

  const loadData = async () => {
    try {
      const data = await getMyActionItems();
      setItems(data);
    } catch (error) {
      console.error('Failed to load action items:', error);
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

  const handleComplete = async (itemId: string) => {
    try {
      await completeActionItem(itemId);
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, status: 'COMPLETED', completedAt: new Date().toISOString() }
            : item
        )
      );
      Alert.alert('Success', 'Action item marked as complete');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to complete action item');
    }
  };

  const handleStatusChange = async (itemId: string, status: ActionItem['status']) => {
    try {
      await updateActionItemStatus(itemId, status);
      setItems((prev) =>
        prev.map((item) => (item.id === itemId ? { ...item, status } : item))
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update action item');
    }
  };

  if (loading) {
    return <LoadingState message="Loading your action items..." />;
  }

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true;
    if (filter === 'pending') return item.status !== 'COMPLETED';
    if (filter === 'completed') return item.status === 'COMPLETED';
    return true;
  });

  const pendingCount = items.filter((i) => i.status !== 'COMPLETED').length;
  const completedCount = items.filter((i) => i.status === 'COMPLETED').length;

  const priorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return '#ef4444';
      case 'HIGH':
        return '#f59e0b';
      case 'MEDIUM':
        return '#3b82f6';
      case 'LOW':
        return '#64748b';
      default:
        return '#64748b';
    }
  };

  const statusVariant = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'PENDING':
        return 'warning';
      case 'CANCELLED':
        return 'neutral';
      default:
        return 'neutral';
    }
  };

  return (
    <View style={styles.container}>
      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{pendingCount}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{completedCount}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{items.length}</Text>
          <Text style={styles.statLabel}>Total</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text
            style={[styles.filterTabText, filter === 'pending' && styles.filterTabTextActive]}
          >
            Pending ({pendingCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text
            style={[styles.filterTabText, filter === 'completed' && styles.filterTabTextActive]}
          >
            Completed ({completedCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterTab, filter === 'all' && styles.filterTabActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterTabText, filter === 'all' && styles.filterTabTextActive]}>
            All ({items.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Items List */}
      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredItems.length === 0 ? (
          <EmptyState
            icon="checkmark-done-outline"
            title="No action items"
            description={
              filter === 'completed'
                ? 'Completed items will appear here'
                : 'You have no pending action items'
            }
          />
        ) : (
          filteredItems
            .sort((a, b) => {
              // Sort by priority first, then by due date
              const priorityOrder = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
              const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
              const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
              if (aPriority !== bPriority) return aPriority - bPriority;
              
              if (a.dueDate && b.dueDate) {
                return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
              }
              return 0;
            })
            .map((item) => (
              <Card key={item.id}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemHeaderLeft}>
                    <View
                      style={[styles.priorityIndicator, { backgroundColor: priorityColor(item.priority) }]}
                    />
                    <View style={styles.itemHeaderText}>
                      <Text style={styles.itemTitle}>{item.title}</Text>
                      <Text style={styles.itemCategory}>{item.category}</Text>
                    </View>
                  </View>
                  <Badge text={item.status} variant={statusVariant(item.status)} size="small" />
                </View>

                {item.description && (
                  <Text style={styles.itemDescription}>{item.description}</Text>
                )}

                <View style={styles.itemMeta}>
                  {item.dueDate && (
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={16} color="#64748b" />
                      <Text style={styles.metaText}>
                        Due: {new Date(item.dueDate).toLocaleDateString()}
                      </Text>
                    </View>
                  )}
                  {item.assignedBy && (
                    <View style={styles.metaItem}>
                      <Ionicons name="person-outline" size={16} color="#64748b" />
                      <Text style={styles.metaText}>
                        From: {item.assignedBy.firstName} {item.assignedBy.lastName}
                      </Text>
                    </View>
                  )}
                </View>

                {item.status !== 'COMPLETED' && (
                  <View style={styles.itemActions}>
                    {item.status === 'PENDING' && (
                      <Button
                        title="Start"
                        onPress={() => handleStatusChange(item.id, 'IN_PROGRESS')}
                        variant="outline"
                        size="small"
                        style={{ flex: 1, marginRight: 8 }}
                      />
                    )}
                    <Button
                      title={item.status === 'IN_PROGRESS' ? 'Mark Complete' : 'Complete'}
                      onPress={() => handleComplete(item.id)}
                      variant="primary"
                      size="small"
                      style={{ flex: 1 }}
                    />
                  </View>
                )}

                {item.completedAt && (
                  <View style={styles.completedBanner}>
                    <Ionicons name="checkmark-circle" size={16} color="#10b981" />
                    <Text style={styles.completedText}>
                      Completed on {new Date(item.completedAt).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </Card>
            ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  statDivider: {
    width: 1,
    backgroundColor: '#e2e8f0',
  },
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  filterTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  filterTabActive: {
    borderBottomColor: '#3b82f6',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  filterTabTextActive: {
    color: '#3b82f6',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  itemHeaderLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 8,
  },
  priorityIndicator: {
    width: 4,
    height: '100%',
    borderRadius: 2,
    marginRight: 12,
  },
  itemHeaderText: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  itemCategory: {
    fontSize: 13,
    color: '#64748b',
  },
  itemDescription: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 12,
  },
  itemMeta: {
    gap: 8,
    marginBottom: 12,
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
  itemActions: {
    flexDirection: 'row',
    marginTop: 8,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  completedText: {
    fontSize: 13,
    color: '#16a34a',
    fontWeight: '600',
    marginLeft: 8,
  },
});
