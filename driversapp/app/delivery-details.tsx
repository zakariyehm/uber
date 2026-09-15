import {
  completeDelivery,
  DeliveryRequest,
  getDeliveryRequestById,
  markAsPickedUp,
  markDriverArrived,
  requestPayment,
  setActiveDelivery,
  startTrip,
} from '@/utils/deliveryRequests';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DeliveryDetailsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!params.requestId) return;
    try {
      const row = await getDeliveryRequestById(params.requestId);
      setRequest(row);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not load trip');
    } finally {
      setLoading(false);
    }
  }, [params.requestId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 4000);
    return () => clearInterval(interval);
  }, [load]);

  const runAction = async (action: () => Promise<unknown>, nextHome = false) => {
    if (!request || busy) return;
    setBusy(true);
    try {
      await action();
      if (nextHome) {
        await setActiveDelivery(null);
        router.replace('/(tabs)');
        return;
      }
      await load();
    } catch (error: any) {
      Alert.alert('Action failed', error.message || 'Try again');
    } finally {
      setBusy(false);
    }
  };

  const primaryAction = () => {
    if (!request) return null;
    if (request.status === 'accepted' && !request.driverArrived) {
      return {
        label: 'Arrived at pickup',
        onPress: () => runAction(() => markDriverArrived(request.id)),
      };
    }
    if (request.status === 'accepted' && request.driverArrived) {
      return {
        label: 'Confirm pickup',
        onPress: () => runAction(() => markAsPickedUp(request.id)),
      };
    }
    if (request.status === 'picked_up') {
      return {
        label: 'Start trip',
        onPress: () => runAction(() => startTrip(request.id)),
      };
    }
    if (request.status === 'in_transit' && !request.paymentRequested) {
      return {
        label: 'Request payment',
        onPress: () => runAction(() => requestPayment(request.id)),
      };
    }
    if (request.status === 'in_transit') {
      return {
        label: 'Complete delivery',
        onPress: () => runAction(() => completeDelivery(request.id), true),
      };
    }
    if (request.status === 'completed') {
      return {
        label: 'Back to home',
        onPress: () => router.replace('/(tabs)'),
      };
    }
    return null;
  };

  const action = primaryAction();

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.empty}>Trip not found</Text>
        <TouchableOpacity onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.link}>Go home</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 120 }}>
        <Text style={styles.status}>{request.status.replace('_', ' ').toUpperCase()}</Text>
        <Text style={styles.price}>${request.deliveryPrice}</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="locate" size={20} color="#03C167" />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Pickup</Text>
              <Text style={styles.value}>{request.pickupLocation}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="flag" size={20} color="#000" />
            <View style={{ flex: 1 }}>
              <Text style={styles.label}>Drop-off</Text>
              <Text style={styles.value}>{request.destinationLocation}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Recipient</Text>
          <Text style={styles.value}>{request.recipientName}</Text>
          <Text style={styles.meta}>{request.recipientNumber}</Text>
          {request.senderName ? (
            <>
              <Text style={[styles.label, { marginTop: 12 }]}>Sender</Text>
              <Text style={styles.value}>{request.senderName}</Text>
              <Text style={styles.meta}>{request.senderPhone}</Text>
            </>
          ) : null}
          <Text style={[styles.label, { marginTop: 12 }]}>Item</Text>
          <Text style={styles.value}>{request.itemType}</Text>
          <Text style={styles.meta}>{request.orderId}</Text>
        </View>
      </ScrollView>

      {action ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity style={styles.primaryBtn} disabled={busy} onPress={action.onPress}>
            {busy ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryText}>{action.label}</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFDF7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF7', gap: 12 },
  empty: { fontSize: 18, fontWeight: '700' },
  link: { color: '#007AFF', fontWeight: '600' },
  status: { fontSize: 13, fontWeight: '700', color: '#03C167', marginBottom: 8 },
  price: { fontSize: 36, fontWeight: '800', marginBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6E6E6',
  },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '600', color: '#000' },
  meta: { fontSize: 13, color: '#666', marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E6E6E6', marginVertical: 14 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFDF7',
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
