import { getStoredUser } from '@/lib/api';
import {
  acceptDeliveryRequest,
  declineDeliveryRequest,
  DeliveryRequest,
  driverPayoutLabel,
  getDeliveryRequestById,
  getPendingRequests,
} from '@/utils/deliveryRequests';
import { driverDisplayName } from '@/utils/driverAuth';
import { toUserFriendlyError } from '@/utils/errors';
import { startOfferAlert, stopOfferAlert } from '@/utils/offerAlert';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const OFFER_FALLBACK_SEC = 30;

export default function DeliveryOfferScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ requestId?: string }>();
  const [request, setRequest] = useState<DeliveryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(OFFER_FALLBACK_SEC);
  const progress = useRef(new Animated.Value(1)).current;
  const timedOutRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        if (params.requestId) {
          const byId = await getDeliveryRequestById(params.requestId);
          if (byId && byId.status === 'pending') {
            const driver = await getStoredUser();
            if (
              driver?.vehicleType &&
              byId.vehicleType &&
              driver.vehicleType !== byId.vehicleType &&
              !byId.openToAllVehicleTypes
            ) {
              if (!cancelled) setRequest(null);
              return;
            }
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
        if (!cancelled) Alert.alert('Error', toUserFriendlyError(error, 'Could not load offer'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [params.requestId]);

  // Ring + vibrate until offer is accepted, declined, or times out
  useEffect(() => {
    if (!request) return;
    void startOfferAlert();
    return () => {
      void stopOfferAlert();
    };
  }, [request?.id]);

  const leaveHome = () => {
    void stopOfferAlert();
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/(tabs)');
  };

  const handleTimeout = async () => {
    if (!request || busy) {
      leaveHome();
      return;
    }
    setBusy(true);
    try {
      await declineDeliveryRequest(request.id);
    } catch {
      // server rotates on next poll
    }
    leaveHome();
  };

  useEffect(() => {
    if (!request) return;

    const expiresAt = request.offerExpiresAt
      ? new Date(request.offerExpiresAt).getTime()
      : Date.now() + OFFER_FALLBACK_SEC * 1000;
    const totalMs = Math.max(
      1000,
      (request.offerSecondsRemaining ?? OFFER_FALLBACK_SEC) * 1000
    );

    const tick = () => {
      const leftMs = Math.max(0, expiresAt - Date.now());
      const leftSec = Math.ceil(leftMs / 1000);
      setSecondsLeft(leftSec);
      progress.setValue(leftMs / totalMs);
      if (leftMs <= 0 && !timedOutRef.current) {
        timedOutRef.current = true;
        void handleTimeout();
      }
    };

    tick();
    const interval = setInterval(tick, 200);
    return () => clearInterval(interval);
  }, [request?.id, request?.offerExpiresAt]);

  const handleDecline = async () => {
    if (!request || busy) return;
    setBusy(true);
    try {
      await declineDeliveryRequest(request.id);
      leaveHome();
    } catch (error: any) {
      Alert.alert('Decline failed', toUserFriendlyError(error, 'Try again'));
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
      await stopOfferAlert();
      router.replace({
        pathname: '/delivery-details',
        params: { requestId: accepted.id },
      });
    } catch (error: any) {
      Alert.alert('Could not accept', toUserFriendlyError(error, 'Offer timed out or was taken'));
      leaveHome();
    }
  };

  if (loading) {
    return (
      <View style={styles.root}>
        <View style={styles.backdrop} />
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!request) {
    return (
      <View style={styles.root}>
        <View style={styles.backdrop} />
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 18) }]}>
          <Text style={styles.unavailableTitle}>Offer unavailable</Text>
          <Text style={styles.unavailableSub}>This delivery moved to another driver</Text>
          <TouchableOpacity style={styles.acceptBtn} onPress={leaveHome}>
            <Text style={styles.acceptText}>Back online</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const widthInterp = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  const serviceLabel = (request.deliveryMethod || 'Delivery').replace('Delivery ', '');
  const openFleet = Boolean(request.openToAllVehicleTypes);
  const vehicleLabel = openFleet
    ? 'Motorcycle · Bicycle'
    : request.vehicleType === 'BICYCLE'
      ? 'Bicycle'
      : 'Motorcycle';
  const vehicleIcon = openFleet
    ? 'airplane-outline'
    : request.vehicleType === 'BICYCLE'
      ? 'bicycle'
      : 'speedometer-outline';

  return (
    <View style={styles.root}>
      <View style={styles.backdrop} />

      <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 18) }]}>
        {/* Timer strip like Uber accept window */}
        <View style={styles.timerTrack}>
          <Animated.View style={[styles.timerFill, { width: widthInterp }]} />
        </View>

        <View style={styles.topBlock}>
          <View style={styles.serviceBadge}>
            <Ionicons name={vehicleIcon} size={12} color="#fff" />
            <Text style={styles.serviceBadgeText}>{serviceLabel} · {vehicleLabel}</Text>
          </View>

          <Text style={styles.price}>
            ${openFleet ? request.driverEarnings || '0.50' : request.deliveryPrice}
          </Text>
          <Text style={styles.priceHint}>
            {openFleet
              ? `${secondsLeft}s to accept · fare $${request.deliveryPrice} · you earn ${driverPayoutLabel(request)}`
              : `${secondsLeft}s to accept · ${request.itemType}`}
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.routeBlock}>
          <View style={styles.routeRow}>
            <View style={styles.timelineCol}>
              <View style={styles.pickupDot}>
                <View style={styles.pickupDotInner} />
              </View>
              <View style={styles.timelineLine} />
            </View>
            <View style={styles.routeTextCol}>
              <Text style={styles.routePrimary} numberOfLines={1}>
                Pickup ·{' '}
                {request.senderKind === 'STORE' && request.storeBranchLocation
                  ? request.storeBranchLocation
                  : request.pickupLocation}
              </Text>
              <Text style={styles.routeSecondary} numberOfLines={2}>
                {request.senderKind === 'STORE'
                  ? [
                      request.senderName || 'Store',
                      request.storeOrderCode ? `Order ID ${request.storeOrderCode}` : null,
                      request.storeBranchLocation &&
                      request.storeBranchLocation !== request.pickupLocation
                        ? request.pickupLocation
                        : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')
                  : `${request.senderName || 'Sender'} · ${request.senderPhone || 'No phone'}`}
              </Text>
            </View>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.timelineCol}>
              <View style={styles.dropDot}>
                <View style={styles.dropDotInner} />
              </View>
            </View>
            <View style={styles.routeTextCol}>
              <Text style={styles.routePrimary} numberOfLines={1}>
                Drop-off · {request.destinationLocation}
              </Text>
              <Text style={styles.routeSecondary} numberOfLines={1}>
                {request.recipientName || 'Recipient'} · {request.recipientNumber || 'No phone'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.declineBtn} onPress={handleDecline} disabled={busy}>
            {busy ? <ActivityIndicator color="#000" /> : <Text style={styles.declineText}>Decline</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept} disabled={busy}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.acceptText}>Accept</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 16,
  },
  timerTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#EFEFEF',
    overflow: 'hidden',
    marginBottom: 16,
  },
  timerFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 2,
  },
  topBlock: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  serviceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 12,
  },
  serviceBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  price: {
    fontSize: 40,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  priceHint: {
    marginTop: 6,
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginBottom: 16,
  },
  routeBlock: {
    gap: 0,
    marginBottom: 18,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  timelineCol: {
    width: 18,
    alignItems: 'center',
  },
  pickupDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickupDotInner: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#fff',
  },
  dropDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropDotInner: {
    width: 6,
    height: 6,
    borderRadius: 1,
    backgroundColor: '#fff',
  },
  timelineLine: {
    width: 2,
    flexGrow: 1,
    minHeight: 28,
    backgroundColor: '#D1D1D6',
    marginVertical: 4,
  },
  routeTextCol: {
    flex: 1,
    paddingBottom: 14,
  },
  routePrimary: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    letterSpacing: -0.2,
  },
  routeSecondary: {
    marginTop: 3,
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '400',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  declineBtn: {
    flex: 1,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineText: { fontSize: 16, fontWeight: '700', color: '#000' },
  acceptBtn: {
    flex: 1.35,
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  unavailableTitle: {
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginTop: 12,
  },
  unavailableSub: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginVertical: 12,
  },
});
