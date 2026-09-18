import { DeliveryRequest, getMyDriverDeliveries } from '@/utils/deliveryRequests';
import { toUserFriendlyError } from '@/utils/errors';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const TEXT = '#11181C';

type TripFilter = 'all' | 'completed' | 'active' | 'cancelled';

function formatWhen(iso?: string) {
  if (!iso) return { date: '—', time: '' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

function statusColor(status: string) {
  switch (status) {
    case 'completed':
      return AppColors.success;
    case 'cancelled':
      return AppColors.danger;
    case 'accepted':
    case 'picked_up':
    case 'in_transit':
      return AppColors.primary;
    default:
      return '#8E8E93';
  }
}

function isActiveStatus(status: string) {
  return ['accepted', 'picked_up', 'in_transit'].includes(status);
}

export default function HistoryScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<TripFilter>('all');
  const [trips, setTrips] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const rows = await getMyDriverDeliveries();
      setTrips(rows);
    } catch (err: any) {
      setError(toUserFriendlyError(err, 'Could not load trip history'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const stats = useMemo(() => {
    const completed = trips.filter((t) => t.status === 'completed');
    const earnings = completed.reduce((sum, t) => {
      const amount = t.openToAllVehicleTypes
        ? Number.parseFloat(t.driverEarnings || '0.50')
        : Number.parseFloat(t.deliveryPrice) || 0;
      return sum + (Number.isFinite(amount) ? amount : 0);
    }, 0);
    return {
      total: trips.length,
      completed: completed.length,
      active: trips.filter((t) => isActiveStatus(t.status)).length,
      earnings: earnings.toFixed(2),
    };
  }, [trips]);

  const filterTabs: { id: TripFilter; label: string }[] = [
    { id: 'all', label: `All (${stats.total})` },
    { id: 'completed', label: `Done (${stats.completed})` },
    { id: 'active', label: `Active (${stats.active})` },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  const filteredTrips = useMemo(() => {
    if (selectedFilter === 'all') return trips;
    if (selectedFilter === 'active') return trips.filter((t) => isActiveStatus(t.status));
    if (selectedFilter === 'completed') return trips.filter((t) => t.status === 'completed');
    return trips.filter((t) => t.status === 'cancelled');
  }, [selectedFilter, trips]);

  const renderTripItem = ({ item }: { item: DeliveryRequest }) => {
    const when = formatWhen(item.completedAt || item.startedAt || item.acceptedAt || item.createdAt);
    const color = statusColor(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.75}
        onPress={() =>
          router.push({ pathname: '/delivery-details', params: { requestId: item.id } })
        }>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.dateText}>
              {when.date} · {when.time}
            </Text>
            <Text style={styles.orderId}>#{item.orderId.replace(/^#/, '')}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: color }]}>
            <Text style={styles.badgeText}>{item.status.replace('_', ' ')}</Text>
          </View>
        </View>

        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: AppColors.success }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Pickup</Text>
              <Text style={styles.routeValue} numberOfLines={1}>
                {item.pickupLocation}
              </Text>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={[styles.dot, { backgroundColor: '#FF3B30' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.routeLabel}>Drop-off</Text>
              <Text style={styles.routeValue} numberOfLines={1}>
                {item.destinationLocation}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Sender</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.senderName || '—'}
            </Text>
            <Text style={styles.infoMeta} numberOfLines={1}>
              {item.senderPhone || 'No phone'}
            </Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Recipient</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {item.recipientName || '—'}
            </Text>
            <Text style={styles.infoMeta} numberOfLines={1}>
              {item.recipientNumber || 'No phone'}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <View style={styles.footerChip}>
            <Ionicons name="cube-outline" size={16} color="#666" />
            <Text style={styles.footerChipText}>{item.itemType}</Text>
          </View>
          <Text style={styles.price}>
            $
            {item.openToAllVehicleTypes
              ? item.driverEarnings || '0.50'
              : item.deliveryPrice}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.completed}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{stats.active}</Text>
          <Text style={styles.summaryLabel}>Active</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${stats.earnings}</Text>
          <Text style={styles.summaryLabel}>Earned</Text>
        </View>
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          data={filterTabs}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item }) => {
            const active = selectedFilter === item.id;
            return (
              <TouchableOpacity
                style={[styles.filterTab, active && styles.filterTabActive]}
                onPress={() => setSelectedFilter(item.id)}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => void load()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load(true);
              }}
            />
          }
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="time-outline" size={44} color="#AAA" />
              <Text style={styles.emptyTitle}>No trips yet</Text>
              <Text style={styles.emptySub}>Accepted deliveries will show up here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF7' },
  summary: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 4, fontWeight: '600' },
  summaryDivider: { width: StyleSheet.hairlineWidth, height: 28, backgroundColor: 'rgba(255,255,255,0.25)' },
  filters: { paddingVertical: 12 },
  filterTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F1F1',
  },
  filterTabActive: { backgroundColor: '#000' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#333' },
  filterTextActive: { color: '#fff' },
  listContent: { paddingHorizontal: 16, paddingBottom: 40, flexGrow: 1, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 48, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginTop: 8 },
  emptySub: { fontSize: 14, color: '#888' },
  errorText: { color: '#FF3B30', textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: {
    marginTop: 8,
    backgroundColor: '#000',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryText: { color: '#fff', fontWeight: '700' },
  card: {
    borderRadius: 14,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6E6E6',
    backgroundColor: '#FFFFFF',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  dateText: { fontSize: 15, fontWeight: '700', color: TEXT },
  orderId: { fontSize: 13, fontWeight: '700', color: '#111', marginTop: 3, letterSpacing: 1.4 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  routeBlock: { gap: 10, marginBottom: 12 },
  routeRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  routeLabel: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 2 },
  routeValue: { fontSize: 15, fontWeight: '600', color: TEXT },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EFEFEF',
    paddingTop: 12,
    marginBottom: 12,
  },
  infoCol: { flex: 1 },
  infoLabel: { fontSize: 11, fontWeight: '700', color: '#888', marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '700', color: TEXT },
  infoMeta: { fontSize: 12, color: '#777', marginTop: 2 },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  footerChip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  footerChipText: { fontSize: 13, color: '#555', fontWeight: '600' },
  price: { fontSize: 18, fontWeight: '800', color: '#000' },
});
