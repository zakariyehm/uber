import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import {
  completeDelivery,
  DeliveryRequest,
  getDeliveryRequestById,
  markAsPickedUp,
  markDriverArrived,
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

type StepAction = {
  kind: 'hold' | 'tap' | 'wait';
  label: string;
  hint?: string;
  color?: string;
  run?: () => Promise<unknown>;
  nextHome?: boolean;
};

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
    const interval = setInterval(() => void load(), 2500);
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

  const currentStep = (): StepAction | null => {
    if (!request) return null;

    if (request.status === 'accepted' && !request.driverArrived) {
      return {
        kind: 'hold',
        label: 'Hold to confirm arrived at pickup',
        color: '#03C167',
        run: () => markDriverArrived(request.id),
      };
    }

    if (request.status === 'accepted' && request.driverArrived && !request.userConfirmedArrival) {
      return {
        kind: 'wait',
        label: 'Waiting for rider confirmation',
        hint: 'Ask the sender to confirm you arrived in the Raac app',
      };
    }

    if (request.status === 'accepted' && request.userConfirmedArrival) {
      return {
        kind: 'hold',
        label: 'Hold to confirm package picked up',
        color: '#000',
        run: () => markAsPickedUp(request.id),
      };
    }

    if (request.status === 'picked_up' && !request.userConfirmedPickup) {
      return {
        kind: 'wait',
        label: 'Waiting for pickup confirmation',
        hint: 'Rider must confirm you took the package in Raac',
      };
    }

    if (request.status === 'picked_up' && request.userConfirmedPickup) {
      return {
        kind: 'tap',
        label: 'Start trip',
        color: '#000',
        run: () => startTrip(request.id),
      };
    }

    if (request.status === 'in_transit') {
      return {
        kind: 'hold',
        label: 'Hold to complete delivery',
        color: '#03C167',
        run: () => completeDelivery(request.id),
      };
    }

    if (request.status === 'completed' && !request.userConfirmedDelivery) {
      return {
        kind: 'wait',
        label: 'Waiting for recipient confirmation',
        hint: 'Rider must confirm they received the package',
      };
    }

    if (request.status === 'completed' && request.userConfirmedDelivery) {
      return {
        kind: 'tap',
        label: 'Back to home',
        color: '#000',
        nextHome: true,
        run: async () => undefined,
      };
    }

    return null;
  };

  const step = currentStep();

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
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 140 }}>
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
          <Text style={styles.label}>Sender</Text>
          <Text style={styles.value}>{request.senderName || '—'}</Text>
          <Text style={styles.meta}>{request.senderPhone || 'No phone'}</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Recipient</Text>
          <Text style={styles.value}>{request.recipientName || '—'}</Text>
          <Text style={styles.meta}>{request.recipientNumber || 'No phone'}</Text>

          <Text style={[styles.label, { marginTop: 14 }]}>Item type</Text>
          <Text style={styles.value}>{request.itemType || '—'}</Text>
          <Text style={styles.meta}>{request.orderId}</Text>
        </View>

        <View style={styles.checklist}>
          <Check done={!!request.driverArrived} label="Driver at pickup" />
          <Check done={!!request.userConfirmedArrival} label="Rider confirmed arrival" />
          <Check done={request.status !== 'accepted' && request.status !== 'pending'} label="Package picked up" />
          <Check done={!!request.userConfirmedPickup} label="Rider confirmed package taken" />
          <Check done={request.status === 'in_transit' || request.status === 'completed'} label="Trip started" />
          <Check done={request.status === 'completed'} label="Driver marked delivered" />
          <Check done={!!request.userConfirmedDelivery} label="Rider confirmed received" />
        </View>
      </ScrollView>

      {step ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
          {step.hint ? <Text style={styles.hint}>{step.hint}</Text> : null}
          {step.kind === 'wait' ? (
            <View style={styles.waitBox}>
              <ActivityIndicator color="#000" />
              <Text style={styles.waitText}>{step.label}</Text>
            </View>
          ) : null}
          {step.kind === 'hold' && step.run ? (
            <HoldToConfirmButton
              label={step.label}
              color={step.color || '#000'}
              disabled={busy}
              onConfirm={() => runAction(step.run!)}
            />
          ) : null}
          {step.kind === 'tap' && step.run ? (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: step.color || '#000' }]}
              disabled={busy}
              onPress={() => runAction(step.run!, step.nextHome)}>
              {busy ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryText}>{step.label}</Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function Check({ done, label }: { done: boolean; label: string }) {
  return (
    <View style={styles.checkRow}>
      <Ionicons
        name={done ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
        color={done ? '#03C167' : '#BBB'}
      />
      <Text style={[styles.checkLabel, done && styles.checkDone]}>{label}</Text>
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
  checklist: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E6E6E6',
  },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  checkLabel: { fontSize: 14, color: '#777' },
  checkDone: { color: '#111', fontWeight: '600' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: '#FFFDF7',
    gap: 10,
  },
  hint: { fontSize: 13, color: '#666', textAlign: 'center' },
  waitBox: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#F1F1F1',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  waitText: { fontSize: 15, fontWeight: '700', color: '#333', flexShrink: 1 },
  primaryBtn: {
    minHeight: 54,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
