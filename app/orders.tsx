import { AppColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DeliveryRequest, DeliveryStatus, getMyDeliveries } from '@/utils/deliveryRequests';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

function statusLabel(status: DeliveryStatus | string) {
  switch (status) {
    case 'pending':
      return 'Waiting for driver';
    case 'accepted':
      return 'Driver accepted';
    case 'picked_up':
      return 'Items picked up';
    case 'in_transit':
      return 'In transit';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}

function statusColor(status: DeliveryStatus | string) {
  switch (status) {
    case 'pending':
      return '#FF9500';
    case 'accepted':
    case 'picked_up':
    case 'in_transit':
      return '#0A84FF';
    case 'completed':
      return '#34C759';
    case 'cancelled':
      return '#FF3B30';
    default:
      return '#8E8E93';
  }
}

export default function OrdersScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [orders, setOrders] = useState<DeliveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadOrders = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const rows = await getMyDeliveries();
      setOrders(rows);
    } catch (error) {
      console.error('[Orders] failed to load:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadOrders();
      const interval = setInterval(() => void loadOrders(true), 4000);
      return () => clearInterval(interval);
    }, [loadOrders])
  );

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#000' : '#fff' }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      {loading && orders.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={AppColors.header} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadOrders(true);
              }}
              tintColor={AppColors.header}
            />
          }>
          {orders.length === 0 ? (
            <View style={styles.center}>
              <Ionicons name="cube-outline" size={48} color={colors.icon} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No orders yet</Text>
              <Text style={[styles.emptyBody, { color: colors.icon }]}>
                Orders you place will appear here so you can track them.
              </Text>
            </View>
          ) : (
            orders.map((order) => (
              <TouchableOpacity
                key={order.id}
                style={[styles.card, { backgroundColor: isDark ? '#1C1C1E' : '#F8F8F8' }]}
                activeOpacity={0.75}
                onPress={() =>
                  router.push({
                    pathname: '/order-success',
                    params: {
                      orderId: order.orderId,
                      requestId: order.id,
                      pickupLocation: order.pickupLocation,
                      destinationLocation: order.destinationLocation,
                      recipientName: order.recipientName,
                      recipientNumber: order.recipientNumber,
                      selectedType: order.itemType,
                      deliveryMethod: order.deliveryMethod,
                      estimatedPrice: order.deliveryPrice,
                      from: 'orders',
                    },
                  })
                }>
                <View style={styles.cardTop}>
                  <View style={[styles.iconWrap, { backgroundColor: isDark ? '#2C2C2E' : '#E8F8EF' }]}>
                    <Ionicons name="airplane" size={22} color={AppColors.header} />
                  </View>
                  <View style={styles.cardBody}>
                    <Text style={[styles.route, { color: colors.text }]} numberOfLines={1}>
                      {order.pickupLocation} → {order.destinationLocation}
                    </Text>
                    <Text style={[styles.meta, { color: colors.icon }]}>
                      #{order.orderId.replace(/^#/, '')} · ${order.deliveryPrice}
                    </Text>
                  </View>
                </View>
                <View style={styles.statusRow}>
                  <View style={[styles.dot, { backgroundColor: statusColor(order.status) }]} />
                  <Text style={[styles.statusText, { color: colors.text }]}>{statusLabel(order.status)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.icon} />
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingTop: 80,
    gap: 10,
  },
  list: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
    flexGrow: 1,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyBody: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    borderRadius: 14,
    padding: 14,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  route: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  meta: {
    fontSize: 12,
  },
  statusRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
});
