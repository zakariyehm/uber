import {
  acceptDeliveryRequest,
  declineDeliveryRequest,
  DeliveryRequest,
  getDeliveryRequestById,
  getPendingRequests,
} from '@/utils/deliveryRequests';
import { driverDisplayName } from '@/utils/driverAuth';
import { getStoredUser } from '@/lib/api';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
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

export default function DeliveryOfferScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (params.requestId) {
          const byId = await getDeliveryRequestById(params.requestId);
          if (byId && byId.status === 'pending') {
            if (!cancelled) setRequest(byId);
            return;
          }
        }
        const pending = await getPendingRequests();
        const match = params.requestId
          ? pending.find((item) => item.id === params.requestId) || pending[0]
          : pending[0];
        if (!cancelled) setRequest(match || null);
      } catch (error: any) {
        if (!cancelled) Alert.alert('Error', error.message || 'Could not load offer');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.requestId]);

  const handleDecline = async () => {
    if (!request || busy) return;
    setBusy(true);
    try {
      await declineDeliveryRequest(request.id);
      // Order stays pending for other drivers and returns after cooldown
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Decline failed', error.message || 'Try again');
      setBusy(false);
    }
  };

  const handleAccept = async () => {
    if (!request || busy) return;
    setBusy(true);
    try {
      const user = await getStoredUser();
      const accepted = await acceptDeliveryRequest(
        request.id,
        user?.id,
        driverDisplayName(user)
      );
      if (!accepted) throw new Error('Accept failed');
      // Active trip is set on the server — no other offers until complete
      router.replace({
        pathname: '/delivery-details',
        params: { requestId: accepted.id },
      });
    } catch (error: any) {
      Alert.alert('Could not accept', error.message || 'This offer may already be taken');
      router.replace('/(tabs)');
    }
  };

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
        <Text style={styles.emptyTitle}>Offer no longer available</Text>
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.secondaryText}>Back online</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 120, paddingHorizontal: 20 }}>
        <Text style={styles.eyebrow}>New delivery offer</Text>
        <Text style={styles.price}>${request.deliveryPrice}</Text>
        <Text style={styles.method}>{request.deliveryMethod || 'Delivery'}</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Ionicons name="locate" size={20} color="#03C167" />
            <View style={styles.rowText}>
              <Text style={styles.label}>Pickup</Text>
              <Text style={styles.value}>{request.pickupLocation}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <Ionicons name="flag" size={20} color="#000" />
            <View style={styles.rowText}>
              <Text style={styles.label}>Drop-off</Text>
              <Text style={styles.value}>{request.destinationLocation}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Item</Text>
          <Text style={styles.value}>{request.itemType}</Text>
          <Text style={[styles.label, { marginTop: 12 }]}>Recipient</Text>
          <Text style={styles.value}>
            {request.recipientName} · {request.recipientNumber}
          </Text>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} disabled={busy}>
          {busy ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.declineText}>Decline</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFFDF7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFDF7', gap: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  eyebrow: { fontSize: 14, color: '#666', marginBottom: 8 },
  price: { fontSize: 40, fontWeight: '800', color: '#000' },
  method: { fontSize: 16, color: '#666', marginBottom: 24 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6E6E6',
  },
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  rowText: { flex: 1 },
  label: { fontSize: 12, color: '#888', marginBottom: 4, fontWeight: '600' },
  value: { fontSize: 16, color: '#000', fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E6E6E6', marginVertical: 14 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFDF7',
  },
  declineBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { fontSize: 16, fontWeight: '700', color: '#000' },
  acceptBtn: {
    flex: 1.2,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  secondaryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#000',
  },
  secondaryText: { color: '#fff', fontWeight: '700' },
});
