import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { UberSheet } from '@/components/uber-sheet';
import {
  cancelDeliveryRequest,
  completeDelivery,
  DeliveryRequest,
  getDeliveryRequestById,
  markAsPickedUp,
  markDriverArrived,
  setActiveDelivery,
  startTrip,
} from '@/utils/deliveryRequests';
import { toUserFriendlyError } from '@/utils/errors';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  return { title: 'Trip details', subtitle: request.pickupLocation };
}

export default function DeliveryDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [leavingHome, setLeavingHome] = useState(false);
  const goneHomeRef = useRef(false);
  const hasRequestRef = useRef(false);

  const goHome = useCallback(
    async (title?: string, message?: string) => {
      if (goneHomeRef.current) return;
      goneHomeRef.current = true;
      setLeavingHome(true);
      try {
        await setActiveDelivery(null);
      } catch {
        // Still leave the sheet even if clearing active fails.
      }
      if (title && message) {
        Alert.alert(title, message, [
          { text: 'OK', onPress: () => router.replace('/(tabs)') },
        ]);
      } else {
        router.replace('/(tabs)');
      }
    },
    [router]
  );

  const cancelAndGoHome = useCallback(() => {
    if (!request || busy || goneHomeRef.current) return;
    Alert.alert(
      'Cancel this trip?',
      'Rider has not confirmed. You will return home and can go online for new offers.',
      [
        { text: 'Keep waiting', style: 'cancel' },
        {
          text: 'Cancel trip',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              await cancelDeliveryRequest(request.id);
              await goHome();
            } catch (error: any) {
              if (error?.status === 404) {
                await goHome();
                return;
              }
              setBusy(false);
              Alert.alert('Could not cancel', toUserFriendlyError(error, 'Try again'));
            }
          },
        },
      ]
    );
  }, [busy, goHome, request]);

  const load = useCallback(async () => {
    if (!params.requestId || goneHomeRef.current) return;
    try {
      const row = await getDeliveryRequestById(params.requestId);
      if (!row) {
        // Trip gone — return home quietly so driver can go online again.
        await goHome();
        return;
      }
      if (row.status === 'cancelled') {
        await goHome();
        return;
      }
      hasRequestRef.current = true;
      setRequest(row);
    } catch (error: any) {
      if (!hasRequestRef.current && !goneHomeRef.current) {
        Alert.alert('Could not load trip', toUserFriendlyError(error, 'Try again'), [
          { text: 'Go home', onPress: () => void goHome() },
          { text: 'Retry', style: 'cancel' },
        ]);
      }
    } finally {
      setLoading(false);
    }
  }, [goHome, params.requestId]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 2500);
    return () => clearInterval(interval);
  }, [load]);

  const runAction = async (action: () => Promise<unknown>, nextHome = false) => {
    if (!request || busy || goneHomeRef.current) return;
    setBusy(true);
    try {
      await action();
      if (nextHome) {
        await goHome();
        return;
      }
      await load();
    } catch (error: any) {
      if (error?.status === 404) {
        await goHome();
        return;
      }
      Alert.alert('Action failed', toUserFriendlyError(error, 'Try again'));
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

  if (loading || leavingHome) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  const copy = sheetCopy(request);
  const step = currentStep();
  const senderLine = [request.senderName, request.senderPhone].filter(Boolean).join(' · ');
  const recipientLine = [request.recipientName, request.recipientNumber].filter(Boolean).join(' · ');
  const priceLabel = request.deliveryPrice?.startsWith('$')
    ? request.deliveryPrice
    : `$${request.deliveryPrice || '0.00'}`;
  const isWaitingOnRider = step?.kind === 'wait';

  return (
    <UberSheet
      title={copy.title}
      subtitle={copy.subtitle}
      footer={
        step ? (
          <View style={styles.footerBlock}>
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
            {isWaitingOnRider ? (
              <TouchableOpacity
                style={styles.secondaryBtn}
                disabled={busy}
                onPress={cancelAndGoHome}>
                <Text style={styles.secondaryText}>Rider not responding · Cancel trip</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null
      }>
      <View style={styles.routeCard}>
        <View style={styles.routeRow}>
          <View style={styles.timelineCol}>
            <View style={[styles.timelineDot, styles.dotPickup]} />
            <View style={styles.timelineLine} />
          </View>
          <View style={styles.routeCopy}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeTitle} numberOfLines={2}>
              {request.pickupLocation}
            </Text>
            {senderLine ? (
              <Text style={styles.routeMeta} numberOfLines={1}>
                {senderLine}
              </Text>
            ) : null}
          </View>
        </View>

        <View style={styles.routeRow}>
          <View style={styles.timelineCol}>
            <View style={[styles.timelineDot, styles.dotDrop]} />
          </View>
          <View style={styles.routeCopy}>
            <Text style={styles.routeLabel}>Drop-off</Text>
            <Text style={styles.routeTitle} numberOfLines={2}>
              {request.destinationLocation}
            </Text>
            {recipientLine ? (
              <Text style={styles.routeMeta} numberOfLines={1}>
                {recipientLine}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.fareRow}>
        <View>
          <Text style={styles.fareLabel}>Your earnings</Text>
          {request.itemType ? (
            <Text style={styles.itemMeta} numberOfLines={1}>
              {request.itemType}
            </Text>
          ) : null}
        </View>
        <Text style={styles.fareValue}>{priceLabel}</Text>
      </View>
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
  secondaryBtn: {
    minHeight: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  secondaryText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  routeCard: {
    borderWidth: 1.5,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 6,
    backgroundColor: '#fff',
    gap: 4,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
  },
  timelineCol: {
    width: 14,
    alignItems: 'center',
    paddingTop: 4,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotPickup: { backgroundColor: '#000' },
  dotDrop: { backgroundColor: '#000' },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 28,
    backgroundColor: '#D8D8D8',
    marginTop: 4,
  },
  routeCopy: { flex: 1, paddingBottom: 2 },
  routeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8A8A8A',
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  routeTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    lineHeight: 22,
  },
  routeMeta: {
    marginTop: 4,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  fareRow: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  fareLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
  },
  fareValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
});
