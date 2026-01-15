import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';

import Card from '../../components/Card';
import LoadingState from '../../components/LoadingState';
import EmptyState from '../../components/EmptyState';
import { getLeaveBalances, LeaveBalance } from '../../api/profile';

interface RouteParams {
  employeeId: string;
}

export default function LeaveBalancesScreen() {
  const route = useRoute();
  const { employeeId } = route.params as RouteParams;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);

  const loadBalances = useCallback(async () => {
    try {
      const data = await getLeaveBalances(employeeId);
      setBalances(data);
    } catch (error) {
      console.error('Failed to load leave balances:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadBalances();
  }, [loadBalances]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBalances();
  };

  const getLeaveIcon = (name: string): keyof typeof Ionicons.glyphMap => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('annual') || lowerName.includes('holiday')) {
      return 'sunny-outline';
    }
    if (lowerName.includes('sick')) {
      return 'medkit-outline';
    }
    if (lowerName.includes('parental')) {
      return 'people-outline';
    }
    if (lowerName.includes('bereavement')) {
      return 'heart-outline';
    }
    return 'calendar-outline';
  };

  const getLeaveColor = (name: string, defaultColor?: string | null): string => {
    if (defaultColor) return defaultColor;
    const lowerName = name.toLowerCase();
    if (lowerName.includes('annual')) return '#f59e0b';
    if (lowerName.includes('sick')) return '#ef4444';
    if (lowerName.includes('parental')) return '#8b5cf6';
    return '#3b82f6';
  };

  if (loading) {
    return <LoadingState message="Loading leave balances..." />;
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Leave Summary</Text>
        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {balances.reduce((acc, b) => acc + (b.totalDays - b.usedDays), 0).toFixed(1)}
            </Text>
            <Text style={styles.summaryLabel}>Days Available</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryStat}>
            <Text style={styles.summaryValue}>
              {balances.reduce((acc, b) => acc + b.usedDays, 0).toFixed(1)}
            </Text>
            <Text style={styles.summaryLabel}>Days Used</Text>
          </View>
        </View>
      </Card>

      {balances.length === 0 && (
        <EmptyState
          icon="calendar-outline"
          title="No Leave Balances"
          description="Leave entitlements will appear here once configured"
        />
      )}

      {balances.map((balance) => {
        const remaining = balance.totalDays - balance.usedDays;
        const percentage = balance.totalDays > 0 
          ? Math.min(100, Math.round((balance.usedDays / balance.totalDays) * 100))
          : 0;
        const color = getLeaveColor(balance.EventCategory.name, balance.EventCategory.color);

        return (
          <Card key={balance.id} style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <View style={[styles.balanceIcon, { backgroundColor: `${color}15` }]}>
                <Ionicons name={getLeaveIcon(balance.EventCategory.name)} size={24} color={color} />
              </View>
              <View style={styles.balanceInfo}>
                <Text style={styles.balanceName}>{balance.EventCategory.name}</Text>
                <Text style={styles.balanceSubtitle}>{remaining.toFixed(1)} days remaining</Text>
              </View>
              <View style={styles.balanceBadge}>
                <Text style={[styles.balanceBadgeText, { color }]}>{remaining.toFixed(1)}</Text>
                <Text style={styles.balanceBadgeUnit}>days</Text>
              </View>
            </View>

            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${percentage}%`, backgroundColor: color }]} />
            </View>
            <View style={styles.progressLabels}>
              <Text style={styles.progressLabel}>{balance.usedDays.toFixed(1)} used</Text>
              <Text style={styles.progressLabel}>{balance.totalDays.toFixed(1)} total</Text>
            </View>
          </Card>
        );
      })}

      <View style={styles.bottomPadding} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  summaryCard: { marginHorizontal: 16, marginTop: 16, backgroundColor: '#3b82f6' },
  summaryTitle: { fontSize: 14, fontWeight: '600', color: 'rgba(255,255,255,0.8)', marginBottom: 16, textTransform: 'uppercase' },
  summaryStats: { flexDirection: 'row', alignItems: 'center' },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '700', color: '#fff', marginBottom: 4 },
  summaryLabel: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  summaryDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.2)' },
  balanceCard: { marginHorizontal: 16, marginTop: 16 },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  balanceIcon: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  balanceInfo: { flex: 1 },
  balanceName: { fontSize: 17, fontWeight: '700', color: '#0f172a', marginBottom: 2 },
  balanceSubtitle: { fontSize: 13, color: '#64748b' },
  balanceBadge: { alignItems: 'flex-end' },
  balanceBadgeText: { fontSize: 24, fontWeight: '700' },
  balanceBadgeUnit: { fontSize: 12, color: '#64748b' },
  progressBar: { height: 8, backgroundColor: '#e2e8f0', borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  progressLabel: { fontSize: 12, color: '#94a3b8' },
  bottomPadding: { height: 40 },
});
