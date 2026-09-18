import {
  DeliveryRequest,
  driverPayoutLabel,
  getActiveDelivery,
  getDeliveryRequestById,
  getPendingRequests,
} from '@/utils/deliveryRequests';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function PendingTripsScreen() {
  const router = useRouter();
  const [pending, setPending] = useState<DeliveryRequest[]>([]);
  const [active, setActive] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const activeId = await getActiveDelivery();
      if (activeId) {
        const row = await getDeliveryRequestById(activeId);
        setActive(row);
        // Uber-style: hide other offers while on an active trip
        setPending([]);
      } else {
        setActive(null);
        const pendingRows = await getPendingRequests();
        setPending(pendingRows);
      }
    } catch (error) {
      console.error('[PendingTrips]', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
      const interval = setInterval(() => void load(true), 4000);
      return () => clearInterval(interval);
    }, [load])
  );

  if (loading && pending.length === 0 && !active) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load(true);
          }}
        />
      }>
      {active ? (
        <>
          <TouchableOpacity
            style={[styles.card, styles.activeCard]}
            onPress={() =>
              router.push({ pathname: '/delivery-details', params: { requestId: active.id } })
            }>
            <Text style={styles.section}>Active trip</Text>
            <Text style={styles.route}>
              {active.pickupLocation} → {active.destinationLocation}
            </Text>
            <Text style={styles.meta}>
              {active.status} · {driverPayoutLabel(active)}
            </Text>
          </TouchableOpacity>
          <View style={styles.empty}>
            <Ionicons name="lock-closed-outline" size={28} color="#999" />
            <Text style={styles.emptyText}>
              Finish this trip to receive new offers
            </Text>
          </View>
        </>
      ) : (
        <>
          <Text style={styles.section}>Available offers ({pending.length})</Text>
          {pending.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={40} color="#999" />
              <Text style={styles.emptyText}>No pending deliveries right now</Text>
            </View>
          ) : (
            pending.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.card}
                onPress={() =>
                  router.push({ pathname: '/delivery-offer', params: { requestId: item.id } })
                }>
                <Text style={styles.route}>
                  {item.pickupLocation} → {item.destinationLocation}
                </Text>
                <Text style={styles.meta}>
                  {driverPayoutLabel(item)} · {item.itemType}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFDF7' },
  content: { padding: 16, paddingBottom: 40, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  section: { fontSize: 14, fontWeight: '700', color: '#666', marginTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6E6E6',
  },
  activeCard: {
    borderColor: AppColors.primary,
    borderWidth: 1.5,
  },
  route: { fontSize: 15, fontWeight: '700', color: '#000', marginBottom: 4 },
  meta: { fontSize: 13, color: '#666' },
  empty: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  emptyText: { color: '#888', textAlign: 'center', paddingHorizontal: 24 },
});
