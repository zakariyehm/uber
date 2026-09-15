import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DeliveryRequest, getMyDriverDeliveries } from '@/utils/deliveryRequests';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

type TripStatus = 'all' | 'completed' | 'cancelled' | 'pending' | 'accepted' | 'picked_up' | 'in_transit';

function formatWhen(iso?: string) {
  if (!iso) return { date: '—', time: '' };
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString(),
    time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

export default function HistoryScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<TripStatus>('all');
  const [trips, setTrips] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const rows = await getMyDriverDeliveries();
      setTrips(rows);
    } catch (error) {
      console.error('[History]', error);
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

  const filterTabs: { id: TripStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'completed', label: 'Completed' },
    { id: 'in_transit', label: 'Active' },
    { id: 'cancelled', label: 'Cancelled' },
  ];

  const filteredTrips = useMemo(() => {
    if (selectedFilter === 'all') return trips;
    if (selectedFilter === 'in_transit') {
      return trips.filter((t) =>
        ['accepted', 'picked_up', 'in_transit'].includes(t.status)
      );
    }
    return trips.filter((t) => t.status === selectedFilter);
  }, [selectedFilter, trips]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'pending':
      case 'accepted':
      case 'picked_up':
      case 'in_transit':
        return '#007AFF';
      case 'cancelled':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const handleTripPress = (item: DeliveryRequest) => {
    router.push({
      pathname: '/delivery-details',
      params: { requestId: item.id },
    });
  };

  const renderTripItem = ({ item }: { item: DeliveryRequest }) => {
    const when = formatWhen(item.completedAt || item.startedAt || item.acceptedAt || item.createdAt);
    return (
      <TouchableOpacity
        style={[
          styles.tripCard,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            marginBottom: scaleHeight(12),
          },
        ]}
        onPress={() => handleTripPress(item)}
        activeOpacity={0.7}>
        <View style={styles.tripHeader}>
          <View style={styles.tripHeaderLeft}>
            <View
              style={[
                styles.statusIconContainer,
                { backgroundColor: getStatusColor(item.status) + '20' },
              ]}>
              <Ionicons
                name="cube"
                size={scaleFont(20)}
                color={getStatusColor(item.status)}
              />
            </View>
            <View style={styles.tripInfo}>
              <Text style={[styles.tripDate, { color: colors.text, fontSize: scaleFont(15) }]}>
                {when.date} • {when.time}
              </Text>
              <Text style={[styles.customerName, { color: colors.icon, fontSize: scaleFont(13) }]}>
                {item.recipientName}
              </Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={[styles.statusText, { color: '#FFF', fontSize: scaleFont(11) }]}>
              {item.status.replace('_', ' ')}
            </Text>
          </View>
        </View>

        <View style={styles.locationsContainer}>
          <View style={styles.locationRow}>
            <View style={[styles.locationIndicator, { backgroundColor: '#34C759' }]} />
            <View style={styles.locationTextContainer}>
              <Text style={[styles.locationLabel, { color: colors.icon, fontSize: scaleFont(11) }]}>
                PICKUP
              </Text>
              <Text
                style={[styles.locationText, { color: colors.text, fontSize: scaleFont(15) }]}
                numberOfLines={1}>
                {item.pickupLocation}
              </Text>
            </View>
          </View>
          <View style={styles.locationRow}>
            <View style={[styles.locationIndicator, { backgroundColor: '#FF3B30' }]} />
            <View style={styles.locationTextContainer}>
              <Text style={[styles.locationLabel, { color: colors.icon, fontSize: scaleFont(11) }]}>
                DROP OFF
              </Text>
              <Text
                style={[styles.locationText, { color: colors.text, fontSize: scaleFont(15) }]}
                numberOfLines={1}>
                {item.destinationLocation}
              </Text>
            </View>
          </View>
        </View>

        <View
          style={[
            styles.tripDetails,
            { borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA' },
          ]}>
          <View style={styles.detailItem}>
            <Ionicons name="cash-outline" size={scaleFont(16)} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.text, fontSize: scaleFont(14) }]}>
              ${item.deliveryPrice}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <Ionicons name="cube-outline" size={scaleFont(16)} color={colors.icon} />
            <Text style={[styles.detailText, { color: colors.text, fontSize: scaleFont(14) }]}>
              {item.itemType}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />

      <View
        style={[
          styles.filterContainer,
          { backgroundColor: isDark ? '#000000' : '#FFFFFF' },
        ]}>
        <FlatList
          horizontal
          data={filterTabs}
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: scaleWidth(16), gap: scaleWidth(8) }}
          renderItem={({ item }) => {
            const active = selectedFilter === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: active ? '#000' : isDark ? '#1C1C1E' : '#F2F2F7',
                  },
                ]}
                onPress={() => setSelectedFilter(item.id)}>
                <Text
                  style={{
                    color: active ? '#fff' : colors.text,
                    fontWeight: '600',
                    fontSize: scaleFont(13),
                  }}>
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
      ) : (
        <FlatList
          data={filteredTrips}
          keyExtractor={(item) => item.id}
          renderItem={renderTripItem}
          contentContainerStyle={{
            padding: scaleWidth(16),
            paddingBottom: scaleHeight(40),
            flexGrow: 1,
          }}
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
              <Ionicons name="time-outline" size={40} color="#999" />
              <Text style={{ color: '#888', marginTop: 10 }}>No trips yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFDF7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  filterContainer: { paddingVertical: scaleHeight(12) },
  filterTab: {
    paddingHorizontal: scaleWidth(14),
    paddingVertical: scaleHeight(8),
    borderRadius: scaleWidth(20),
  },
  tripCard: {
    borderRadius: scaleWidth(12),
    padding: scaleWidth(14),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5E5EA',
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scaleHeight(12),
  },
  tripHeaderLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusIconContainer: {
    width: scaleWidth(36),
    height: scaleWidth(36),
    borderRadius: scaleWidth(18),
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scaleWidth(10),
  },
  tripInfo: { flex: 1 },
  tripDate: { fontWeight: '600' },
  customerName: { marginTop: 2 },
  statusBadge: {
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderRadius: scaleWidth(6),
  },
  statusText: { fontWeight: '700', textTransform: 'capitalize' },
  locationsContainer: { gap: scaleHeight(10), marginBottom: scaleHeight(12) },
  locationRow: { flexDirection: 'row', alignItems: 'flex-start' },
  locationIndicator: {
    width: scaleWidth(8),
    height: scaleWidth(8),
    borderRadius: scaleWidth(4),
    marginTop: scaleHeight(6),
    marginRight: scaleWidth(10),
  },
  locationTextContainer: { flex: 1 },
  locationLabel: { fontWeight: '700', marginBottom: 2 },
  locationText: { fontWeight: '500' },
  tripDetails: {
    flexDirection: 'row',
    gap: scaleWidth(16),
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: scaleHeight(12),
  },
  detailItem: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(6) },
  detailText: { fontWeight: '600' },
});
