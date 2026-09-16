import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { UberInfoCard, UberPill, UberSheet } from '@/components/uber-sheet';
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
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type StepAction = {
  kind: 'hold' | 'tap' | 'wait';
  label: string;
  hint?: string;
  color?: string;
  run?: () => Promise<unknown>;
  nextHome?: boolean;
};

function sheetCopy(request: DeliveryRequest): { title: string; subtitle: string } {
  if (request.status === 'accepted' && !request.driverArrived) {
    return { title: 'Head to pickup', subtitle: request.pickupLocation };
  }
  if (request.status === 'accepted' && request.driverArrived && !request.userConfirmedArrival) {
    return { title: 'Waiting for rider', subtitle: 'Ask them to confirm you arrived' };
  }
  if (request.status === 'accepted' && request.userConfirmedArrival) {
    return { title: 'Confirm package pickup', subtitle: request.pickupLocation };
  }
  if (request.status === 'picked_up' && !request.userConfirmedPickup) {
    return { title: 'Waiting for rider', subtitle: 'Ask them to confirm package taken' };
  }
  if (request.status === 'picked_up' && request.userConfirmedPickup) {
    return { title: 'Ready to start trip', subtitle: request.destinationLocation };
  }
  if (request.status === 'in_transit') {
    return { title: 'Delivering package', subtitle: request.destinationLocation };
  }
  if (request.status === 'completed' && !request.userConfirmedDelivery) {
    return { title: 'Waiting for receipt confirm', subtitle: 'Rider must confirm received' };
  }
  if (request.status === 'completed') {
    return { title: 'Delivery complete', subtitle: `$${request.deliveryPrice} earned` };
  }
  return { title: 'Trip details', subtitle: request.orderId };
}

export default function DeliveryDetailsScreen() {
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
        label: 'Hold · Arrived at pickup',
        color: '#000',
        run: () => markDriverArrived(request.id),
      };
    }

    if (request.status === 'accepted' && request.driverArrived && !request.userConfirmedArrival) {
      return {
        kind: 'wait',
        label: 'Waiting for rider confirmation',
        hint: 'Rider confirms arrival in Raac',
      };
    }

    if (request.status === 'accepted' && request.userConfirmedArrival) {
      return {
        kind: 'hold',
        label: 'Hold · Package picked up',
        color: '#000',
        run: () => markAsPickedUp(request.id),
      };
    }

    if (request.status === 'picked_up' && !request.userConfirmedPickup) {
      return {
        kind: 'wait',
        label: 'Waiting for pickup confirmation',
        hint: 'Rider confirms package was taken',
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
        label: 'Hold · Complete delivery',
        color: '#000',
        run: () => completeDelivery(request.id),
      };
    }

    if (request.status === 'completed' && !request.userConfirmedDelivery) {
      return {
        kind: 'wait',
        label: 'Waiting for recipient confirmation',
        hint: 'Rider confirms they received the package',
      };
    }

    if (request.status === 'completed' && request.userConfirmedDelivery) {
      return {
        kind: 'tap',
        label: 'Done',
        color: '#000',
        nextHome: true,
        run: async () => undefined,
      };
    }

    return null;
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!request) {
    return (
      <UberSheet title="Trip not found" subtitle="Go back online to keep receiving offers">
        <TouchableOpacity style={styles.primaryBtn} onPress={() => router.replace('/(tabs)')}>
          <Text style={styles.primaryText}>Go home</Text>
        </TouchableOpacity>
      </UberSheet>
    );
  }

  const copy = sheetCopy(request);
  const step = currentStep();

  return (
    <UberSheet
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        step ? (
          <View style={styles.footerBlock}>
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
        ) : null
      }>
      <UberInfoCard
        selected={request.status === 'accepted' || request.status === 'picked_up'}
        title={request.pickupLocation}
        meta="Pickup">
        <View style={styles.pillRow}>
          <UberPill
            icon={<Ionicons name="person-outline" size={12} color="#555" />}
            label={request.senderName || 'Sender'}
          />
          <UberPill label={request.senderPhone || 'No phone'} />
        </View>
      </UberInfoCard>

      <UberInfoCard
        selected={request.status === 'in_transit' || request.status === 'completed'}
        title={request.destinationLocation}
        meta="Drop-off">
        <View style={styles.pillRow}>
          <UberPill
            icon={<Ionicons name="flag-outline" size={12} color="#555" />}
            label={request.recipientName || 'Recipient'}
          />
          <UberPill label={request.recipientNumber || 'No phone'} />
        </View>
      </UberInfoCard>

      <UberInfoCard title={request.itemType || 'Item'} meta="Order details">
        <View style={styles.pillRow}>
          <UberPill
            icon={<Ionicons name="flash" size={12} color="#276EF1" />}
            label={`$${request.deliveryPrice}`}
            tone="accent"
          />
          <UberPill label={request.status.replace('_', ' ')} />
          <UberPill label={request.orderId} />
        </View>
      </UberInfoCard>
    </UberSheet>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8EEF2',
  },
  footerBlock: { gap: 10 },
  hint: { textAlign: 'center', color: '#777', fontSize: 13, fontWeight: '500' },
  waitBox: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#F3F3F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 14,
  },
  waitText: { fontSize: 15, fontWeight: '700', color: '#222', flexShrink: 1 },
  primaryBtn: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
