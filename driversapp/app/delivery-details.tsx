import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { UberSheet } from '@/components/uber-sheet';
import {
  cancelDeliveryRequest,
  completeDelivery,
  DeliveryRequest,
  driverPayoutLabel,
  getDeliveryRequestById,
  tripStatsLabel,
  markAsPickedUp,
  markDriverArrived,
  requestPayment,
  requestReturnToStore,
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

/** After Start trip, wait this long before Complete is available. */
const MIN_TRIP_AFTER_START_SEC = 120;

type StepAction = {
  kind: 'hold' | 'tap' | 'wait';
  label: string;
  color?: string;
  run?: () => Promise<unknown>;
  nextHome?: boolean;
};

function tripWaitLeftSec(startedAt: string | undefined, nowMs: number): number {
  if (!startedAt) return 0;
  const elapsed = Math.floor((nowMs - new Date(startedAt).getTime()) / 1000);
  return Math.max(0, MIN_TRIP_AFTER_START_SEC - elapsed);
}

function formatMmSs(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function sheetCopy(request: DeliveryRequest): { title: string; subtitle: string } {
  if (request.status === 'accepted' && !request.driverArrived) {
    return { title: 'Head to pickup', subtitle: request.pickupLocation };
  }
  if (
    request.senderKind === 'STORE' &&
    request.status === 'accepted' &&
    request.driverArrived &&
    !request.userConfirmedPickup
  ) {
    return { title: 'Waiting for store handoff', subtitle: 'Store must confirm package handed over' };
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
  if (request.status === 'in_transit' && request.returnRequested) {
    return {
      title: 'Returning to store',
      subtitle: request.storeBranchLocation || request.pickupLocation,
    };
  }
  if (request.status === 'in_transit') {
    if (request.payerType === 'RECIPIENT' && request.paymentHoldStatus !== 'COMMITTED') {
      return {
        title: 'Collect payment',
        subtitle: `Request Waafi from ${request.recipientNumber}`,
      };
    }
    return { title: 'Delivering package', subtitle: request.destinationLocation };
  }
  if (request.status === 'cancelled' && request.cancelReason === 'return_to_store') {
    const earned = request.driverEarnings || '0.50';
    return { title: 'Package returned', subtitle: `$${earned} earned · Delivery State payout` };
  }
  if (request.status === 'completed' && !request.userConfirmedDelivery) {
    return { title: 'Waiting for receipt confirm', subtitle: 'Rider must confirm received' };
  }
  if (request.status === 'completed') {
    const earned = request.openToAllVehicleTypes
      ? request.driverEarnings || '0.50'
      : request.deliveryPrice;
    return { title: 'Delivery complete', subtitle: `$${earned} earned` };
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
  const [nowTick, setNowTick] = useState(Date.now());
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
    if (request.status === 'in_transit' || request.startedAt) {
      Alert.alert('Trip started', 'You cannot cancel after Start trip. Complete the delivery.');
      return;
    }

    const waitingArrival =
      request.status === 'accepted' && request.driverArrived && !request.userConfirmedArrival;
    const canNoShow = Boolean(request.canCancelForNoShow);
    const waitLeft = request.arrivalWaitSecondsRemaining ?? 0;
    const waitMin = request.arrivalWaitMinutes ?? 15;

    if (waitingArrival && !canNoShow) {
      const mins = Math.ceil(waitLeft / 60);
      Alert.alert(
        'Wait at pickup',
        `You must wait ${waitMin} minutes after Arrived before cancelling for no-show. About ${mins} min left. If the rider never confirms, you earn $0.50.`
      );
      return;
    }

    const message = waitingArrival
      ? 'Rider did not Confirm Arrival after 15 minutes. Waafi will commit the hold: you get $0.50, rider gets the rest as pending wallet credit.'
      : 'Rider has not confirmed. The payment hold will be released (no earnings).';

    Alert.alert('Cancel this trip?', message, [
      { text: 'Keep waiting', style: 'cancel' },
      {
        text: waitingArrival ? 'Cancel · earn $0.50' : 'Cancel trip',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await cancelDeliveryRequest(request.id, {
              cancelledBy: 'driver',
              cancelReason: waitingArrival ? 'no_show' : 'rider_not_responding',
            });
            await goHome(
              waitingArrival ? 'No-show settled' : undefined,
              waitingArrival ? '$0.50 credited to today’s wallet after Waafi commit.' : undefined
            );
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
    ]);
  }, [busy, goHome, request]);

  useEffect(() => {
    const waitingArrival =
      request?.status === 'accepted' && request.driverArrived && !request.userConfirmedArrival;
    const waitingMinTrip = request?.status === 'in_transit' && !!request.startedAt;
    if (!waitingArrival && !waitingMinTrip) return;
    const timer = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [
    request?.driverArrived,
    request?.userConfirmedArrival,
    request?.status,
    request?.startedAt,
  ]);
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
        if (row.cancelReason === 'return_to_store') {
          const earned = row.driverEarnings || '0.50';
          await goHome(
            'Package returned',
            `Store confirmed return. You earned $${earned} (Delivery State payout).`
          );
          return;
        }
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
    const isStore = request.senderKind === 'STORE';

    if (request.status === 'accepted' && !request.driverArrived) {
      return {
        kind: 'hold',
        label: 'Hold · Arrived at pickup',
        color: '#000',
        run: () => markDriverArrived(request.id),
      };
    }

    // Store shortcut: wait for store handoff, then Start trip (no driver pickup hold).
    if (isStore && request.status === 'accepted' && request.driverArrived && !request.userConfirmedPickup) {
      return {
        kind: 'wait',
        label: 'Waiting for store to hand package',
      };
    }

    if (request.status === 'accepted' && request.driverArrived && !request.userConfirmedArrival) {
      return {
        kind: 'wait',
        label: 'Waiting for rider confirmation',
      };
    }

    if (!isStore && request.status === 'accepted' && request.userConfirmedArrival) {
      return {
        kind: 'hold',
        label: 'Hold · Package picked up',
        color: '#000',
        run: () => markAsPickedUp(request.id),
      };
    }

    if (!isStore && request.status === 'picked_up' && !request.userConfirmedPickup) {
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
      if (request.returnRequested) {
        return {
          kind: 'wait',
          label: 'Returning to store · waiting for store to confirm',
        };
      }
      const left = tripWaitLeftSec(request.startedAt, nowTick);
      if (left > 0) {
        return {
          kind: 'wait',
          label: `On the way · complete in ${formatMmSs(left)}`,
        };
      }
      if (request.payerType === 'RECIPIENT' && request.paymentHoldStatus !== 'COMMITTED') {
        return {
          kind: 'hold',
          label: `Hold · Request payment · ${request.recipientNumber}`,
          color: '#03C167',
          run: () => requestPayment(request.id),
        };
      }
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
  const isStoreSender = request.senderKind === 'STORE';
  const senderLine = isStoreSender
    ? [
        request.senderName,
        request.storeOrderCode ? `Order ID ${request.storeOrderCode}` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : [request.senderName, request.senderPhone].filter(Boolean).join(' · ');
  const pickupTitle =
    isStoreSender && request.storeBranchLocation
      ? request.storeBranchLocation
      : request.pickupLocation;
  const recipientLine = [request.recipientName, request.recipientNumber].filter(Boolean).join(' · ');
  const priceLabel = driverPayoutLabel(request);
  const isWaitingOnRider = step?.kind === 'wait';
  const tripStarted = request.status === 'in_transit' || !!request.startedAt;
  const canShowCancel = isWaitingOnRider && !tripStarted;
  const canShowReturn =
    isStoreSender &&
    request.status === 'in_transit' &&
    !request.returnRequested;
  const waitingArrivalConfirm =
    request.status === 'accepted' && request.driverArrived && !request.userConfirmedArrival;

  let arrivalWaitLeft = request.arrivalWaitSecondsRemaining ?? 0;
  if (waitingArrivalConfirm && request.driverArrivedAt) {
    const elapsed = Math.floor((nowTick - new Date(request.driverArrivedAt).getTime()) / 1000);
    arrivalWaitLeft = Math.max(0, (request.arrivalWaitMinutes ?? 15) * 60 - elapsed);
  }
  const canNoShowCancel = waitingArrivalConfirm && arrivalWaitLeft <= 0;

  const waitLabel = waitingArrivalConfirm
    ? canNoShowCancel
      ? 'Rider still not confirming · you can cancel for $0.50'
      : `Waiting for Confirm Arrival · ${Math.floor(arrivalWaitLeft / 60)}:${String(
          arrivalWaitLeft % 60
        ).padStart(2, '0')} left`
    : step?.label || 'Waiting';

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
                <Text style={styles.waitText}>{waitLabel}</Text>
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
            {canShowReturn ? (
              <TouchableOpacity
                style={styles.secondaryBtn}
                disabled={busy}
                onPress={() => {
                  Alert.alert(
                    'Recipient not found?',
                    'Return the package to the store. After the store confirms, you earn the Delivery State driver payout from the store balance.',
                    [
                      { text: 'Keep delivering', style: 'cancel' },
                      {
                        text: 'Return to store',
                        style: 'destructive',
                        onPress: () => void runAction(() => requestReturnToStore(request.id)),
                      },
                    ]
                  );
                }}>
                <Text style={styles.secondaryText}>Recipient not found · Return to store</Text>
              </TouchableOpacity>
            ) : null}
            {canShowCancel ? (
              <TouchableOpacity
                style={[
                  styles.secondaryBtn,
                  waitingArrivalConfirm && !canNoShowCancel && styles.secondaryBtnDisabled,
                ]}
                disabled={busy || (waitingArrivalConfirm && !canNoShowCancel)}
                onPress={cancelAndGoHome}>
                <Text style={styles.secondaryText}>
                  {waitingArrivalConfirm
                    ? canNoShowCancel
                      ? 'No-show cancel · earn $0.50'
                      : `Wait ${Math.ceil(arrivalWaitLeft / 60)} min before no-show cancel`
                    : 'Rider not responding · Cancel trip'}
                </Text>
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
              {pickupTitle}
            </Text>
            {senderLine ? (
              <Text style={styles.routeMeta} numberOfLines={2}>
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

      {tripStatsLabel(request) ? (
        <View style={styles.statsRow}>
          <Text style={styles.statsLabel}>Trip</Text>
          <Text style={styles.statsValue}>{tripStatsLabel(request)}</Text>
        </View>
      ) : null}

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
  secondaryBtnDisabled: {
    opacity: 0.45,
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
  statsRow: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: '#F7F7F7',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  statsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#777',
  },
  statsValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#11181C',
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
