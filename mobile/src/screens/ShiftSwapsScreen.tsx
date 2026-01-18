// mobile/src/screens/ShiftSwapsScreen.tsx
import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Text,
  TouchableOpacity,
} from 'react-native';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SwapCard, SwapRequestModal, SwapDecisionModal } from '../components/swaps';
import { swapService } from '../services/SwapService';
import { ShiftSwapRequest } from '../api/swaps';
import { Shift } from '../api/shifts';

type TabType = 'incoming' | 'outgoing';

export default function ShiftSwapsScreen() {
  const route = useRoute<any>();
  const shiftToSwap = route.params?.shiftToSwap as Shift | undefined;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('incoming');
  const [incomingSwaps, setIncomingSwaps] = useState<ShiftSwapRequest[]>([]);
  const [outgoingSwaps, setOutgoingSwaps] = useState<ShiftSwapRequest[]>([]);
  
  // Modals
  const [requestModalVisible, setRequestModalVisible] = useState(!!shiftToSwap);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(shiftToSwap || null);
  const [decisionModalVisible, setDecisionModalVisible] = useState(false);
  const [selectedSwap, setSelectedSwap] = useState<ShiftSwapRequest | null>(null);
  const [decisionAction, setDecisionAction] = useState<'accept' | 'reject' | 'cancel' | null>(null);

  const loadSwaps = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { incoming, outgoing } = await swapService.getMySwaps();
      setIncomingSwaps(incoming);
      setOutgoingSwaps(outgoing);
    } catch (error) {
      console.error('[ShiftSwapsScreen] Error loading swaps:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSwaps();
    }, [loadSwaps])
  );

  const handleAccept = (swap: ShiftSwapRequest) => {
    setSelectedSwap(swap);
    setDecisionAction('accept');
    setDecisionModalVisible(true);
  };

  const handleReject = (swap: ShiftSwapRequest) => {
    setSelectedSwap(swap);
    setDecisionAction('reject');
    setDecisionModalVisible(true);
  };

  const handleCancel = (swap: ShiftSwapRequest) => {
    setSelectedSwap(swap);
    setDecisionAction('cancel');
    setDecisionModalVisible(true);
  };

  const handleDecisionSuccess = () => {
    setDecisionModalVisible(false);
    setSelectedSwap(null);
    setDecisionAction(null);
    loadSwaps();
  };

  const handleRequestSuccess = () => {
    setRequestModalVisible(false);
    setSelectedShift(null);
    setActiveTab('outgoing');
    loadSwaps();
  };

  const currentSwaps = activeTab === 'incoming' ? incomingSwaps : outgoingSwaps;
  const pendingIncoming = incomingSwaps.filter(s => s.status === 'PENDING').length;

  const renderSwapCard = ({ item }: { item: ShiftSwapRequest }) => (
    <SwapCard
      swap={item}
      type={activeTab}
      onAccept={activeTab === 'incoming' ? () => handleAccept(item) : undefined}
      onReject={activeTab === 'incoming' ? () => handleReject(item) : undefined}
      onCancel={activeTab === 'outgoing' && item.status === 'PENDING' ? () => handleCancel(item) : undefined}
    />
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'incoming' && styles.activeTab]}
          onPress={() => setActiveTab('incoming')}
        >
          <Text style={[styles.tabText, activeTab === 'incoming' && styles.activeTabText]}>
            Incoming
          </Text>
          {pendingIncoming > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{pendingIncoming}</Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'outgoing' && styles.activeTab]}
          onPress={() => setActiveTab('outgoing')}
        >
          <Text style={[styles.tabText, activeTab === 'outgoing' && styles.activeTabText]}>
            Outgoing
          </Text>
        </TouchableOpacity>
      </View>

      {/* Swaps List */}
      {currentSwaps.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="swap-horizontal-outline" size={48} color="#d1d5db" />
          </View>
          <Text style={styles.emptyTitle}>No Swap Requests</Text>
          <Text style={styles.emptySubtitle}>
            {activeTab === 'incoming'
              ? "You don't have any incoming swap requests"
              : "You haven't requested any swaps yet"}
          </Text>
        </View>
      ) : (
        <FlatList
          data={currentSwaps}
          keyExtractor={(item) => item.id}
          renderItem={renderSwapCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadSwaps(true)}
              colors={['#6366f1']}
              tintColor="#6366f1"
            />
          }
        />
      )}

      {/* Swap Request Modal */}
      <SwapRequestModal
        visible={requestModalVisible}
        shift={selectedShift}
        onClose={() => {
          setRequestModalVisible(false);
          setSelectedShift(null);
        }}
        onSuccess={handleRequestSuccess}
      />

      {/* Decision Modal */}
      <SwapDecisionModal
        visible={decisionModalVisible}
        swap={selectedSwap}
        action={decisionAction}
        onClose={() => {
          setDecisionModalVisible(false);
          setSelectedSwap(null);
          setDecisionAction(null);
        }}
        onSuccess={handleDecisionSuccess}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#eef2ff',
  },
  tabText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#6366f1',
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});
