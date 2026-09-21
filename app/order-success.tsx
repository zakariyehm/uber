import { HoldToConfirmButton } from '@/components/hold-to-confirm-button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  confirmDeliveryReceived,
  confirmDriverArrival,
  confirmPackagePickup,
  confirmStoreHandoff,
  DeliveryRequest as DeliveryRequestType,
  DeliveryStatus,
  getDeliveryRequestById,
  getDeliveryRequestByOrderId,
} from '@/utils/deliveryRequests';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

function cancelReasonCopy(reason?: string, cancelledBy?: string) {
  if (reason === 'no_driver') {
    return {
      title: 'No driver available',
      message:
        'We could not find an available driver for your delivery right now. Your order has been cancelled and the payment hold on your Waafi account has been released — you were not charged.',
      short: 'No driver was available. Your payment hold was released; you were not charged.',
    };
  }
  if (reason === 'rider_not_responding') {
    return {
      title: 'Order cancelled',
      message: 'Your driver cancelled because confirmation was not received in time.',
      short: 'Your driver cancelled because confirmation was not received in time.',
    };
  }
  if (reason === 'no_show') {
    return {
      title: 'Order cancelled',
      message: 'The driver waited at pickup and cancelled after no confirmation.',
      short: 'Cancelled after no-show at pickup.',
    };
  }
  if (cancelledBy === 'driver') {
    return {
      title: 'Order cancelled',
      message: 'Your driver cancelled this delivery. If a payment hold was placed, it has been released.',
      short: 'Your driver cancelled this delivery.',
    };
  }
  return {
    title: 'Order cancelled',
    message: 'This delivery was cancelled. If a payment hold was placed, it has been released.',
    short: 'This delivery was cancelled.',
  };
}

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('pending');
  const [driverName, setDriverName] = useState<string>('');
  const [deliveryRequest, setDeliveryRequest] = useState<DeliveryRequestType | null>(null);
  const cancelAlertShown = React.useRef(false);

  const orderId = (params.orderId as string) || '';
  const requestId = (params.requestId as string) || '';
  const fromOrders = params.from === 'orders';

  const goHome = () => {
    router.replace('/(tabs)');
  };

  const showCancelPopup = (request: DeliveryRequestType) => {
    if (cancelAlertShown.current) return;
    if (request.status !== 'cancelled') return;
    cancelAlertShown.current = true;
    const copy = cancelReasonCopy(request.cancelReason, request.cancelledBy);
    Alert.alert(copy.title, copy.message, [{ text: 'OK', style: 'default' }]);
  };

  const refresh = async () => {
    if (!requestId && !orderId) return;
    // Prefer id (stable) — order code lookup is a fallback.
    const request = requestId
      ? await getDeliveryRequestById(requestId)
      : await getDeliveryRequestByOrderId(orderId);
    if (request) {
      setDeliveryRequest(request);
      setDeliveryStatus(request.status);
      if (request.driverName) setDriverName(request.driverName);
      if (request.status === 'cancelled') showCancelPopup(request);
    }
  };

  useLayoutEffect(() => {
    if (fromOrders) {
      navigation.setOptions({
        gestureEnabled: true,
        headerBackVisible: true,
        headerLeft: undefined,
        title: 'Track order',
      });
      return;
    }

    navigation.setOptions({
      gestureEnabled: false,
      headerBackVisible: false,
      title: 'Order',
      headerLeft: () => (
        <TouchableOpacity onPress={goHome} hitSlop={12} style={{ paddingHorizontal: 8 }}>
          <Ionicons name="home-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, fromOrders]);

  useEffect(() => {
    if (!requestId && !orderId) return;
    void refresh();
    const statusInterval = setInterval(() => void refresh(), 2500);
    return () => clearInterval(statusInterval);
  }, [requestId, orderId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const checkConnection = async () => {
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected) {
        timer = setTimeout(() => setIsLoading(false), 500);
      } else {
        setIsLoading(true);
      }
    };

    void checkConnection();
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setIsLoading(false), 500);
      } else {
        if (timer) clearTimeout(timer);
        setIsLoading(true);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const cancelCopy =
    deliveryStatus === 'cancelled'
      ? cancelReasonCopy(deliveryRequest?.cancelReason, deliveryRequest?.cancelledBy)
      : null;

  const statusMessage = (() => {
    const isStore = deliveryRequest?.senderKind === 'STORE';
    if (deliveryStatus === 'pending') {
      if (deliveryRequest?.payerType === 'RECIPIENT') {
        return 'Waiting for a driver. The recipient will pay with Waafi when the package is delivered.';
      }
      return 'Waiting for a driver to accept your delivery request...';
    }
    if (isStore && deliveryStatus === 'accepted' && deliveryRequest?.driverArrived && !deliveryRequest.userConfirmedPickup) {
      return `${driverName || 'Driver'} is at the store. Hold to confirm you handed the package.`;
    }
    if (deliveryStatus === 'accepted' && deliveryRequest?.driverArrived && !deliveryRequest.userConfirmedArrival) {
      return `${driverName || 'Your driver'} is at pickup. Hold to confirm they arrived.`;
    }
    if (deliveryStatus === 'accepted') {
      return driverName
        ? `Driver ${driverName} accepted and is heading to pickup.`
        : 'A driver accepted your order and is heading to pickup.';
    }
    if (isStore && (deliveryStatus === 'picked_up' || deliveryStatus === 'in_transit')) {
      return deliveryStatus === 'picked_up'
        ? 'Package handed over. Driver can start the trip.'
        : 'Package is on the way to the destination.';
    }
    if (deliveryStatus === 'picked_up' && !deliveryRequest?.userConfirmedPickup) {
      return 'Driver says the package was collected. Hold to confirm they took it.';
    }
    if (deliveryStatus === 'picked_up') return 'Package confirmed. Driver can start the trip.';
    if (deliveryStatus === 'in_transit') {
      if (deliveryRequest?.payerType === 'RECIPIENT') {
        return 'Your package is on the way. The recipient will pay with Waafi when the driver requests payment.';
      }
      return 'Your package is on the way to the destination.';
    }
    if (deliveryStatus === 'completed' && !deliveryRequest?.userConfirmedDelivery) {
      return 'Driver marked delivery complete. Hold to confirm you received the package.';
    }
    if (deliveryStatus === 'completed') {
      if (deliveryRequest?.payerType === 'RECIPIENT') {
        return 'Delivery completed. Recipient payment collected. Thank you!';
      }
      return 'Delivery completed and confirmed. Thank you!';
    }
    if (deliveryStatus === 'cancelled' && cancelCopy) return cancelCopy.short;
    return 'Your order has been confirmed.';
  })();

  const isStoreOrder = deliveryRequest?.senderKind === 'STORE';

  const showStoreHandoffHold =
    !!deliveryRequest &&
    isStoreOrder &&
    deliveryStatus === 'accepted' &&
    !!deliveryRequest.driverArrived &&
    !deliveryRequest.userConfirmedPickup;

  const showArrivalHold =
    !!deliveryRequest &&
    !isStoreOrder &&
    deliveryStatus === 'accepted' &&
    !!deliveryRequest.driverArrived &&
    !deliveryRequest.userConfirmedArrival;

  const showPickupHold =
    !!deliveryRequest &&
    !isStoreOrder &&
    deliveryStatus === 'picked_up' &&
    !deliveryRequest.userConfirmedPickup;

  const showReceivedHold =
    !!deliveryRequest &&
    !isStoreOrder &&
    deliveryStatus === 'completed' &&
    !deliveryRequest.userConfirmedDelivery;

  return (
    <View
      style={[
        styles.container,
        { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0) },
      ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />

      <ScrollView
        style={[styles.content, { paddingHorizontal: scaleWidth(20) }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: scaleHeight(32),
          flexGrow: 1,
          justifyContent: 'center',
          minHeight: SCREEN_HEIGHT - insets.top - insets.bottom - scaleHeight(100),
        }}>
        <View style={styles.successIconContainer}>
          <View
            style={[
              styles.successCircle,
              {
                backgroundColor:
                  deliveryStatus === 'cancelled'
                    ? isDark
                      ? '#4A1C1C'
                      : '#FFEBEE'
                    : isDark
                      ? '#1A5F1A'
                      : '#E8F5E9',
              },
            ]}>
            <Ionicons
              name={deliveryStatus === 'cancelled' ? 'close-circle' : 'checkmark-circle'}
              size={scaleFont(80)}
              color={deliveryStatus === 'cancelled' ? '#FF3B30' : '#4CAF50'}
            />
          </View>
        </View>

        <View style={styles.messageContainer}>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            {deliveryStatus === 'cancelled'
              ? cancelCopy?.title || 'Order cancelled'
              : fromOrders
                ? 'Track your order'
                : 'Order placed successfully'}
          </Text>
          <Text style={[styles.successMessage, { color: colors.icon }]}>{statusMessage}</Text>
        </View>

        {deliveryStatus === 'cancelled' ? (
          <View style={[styles.statusContainer, { backgroundColor: isDark ? '#3A1C1C' : '#FFEBEE' }]}>
            <View style={styles.statusRow}>
              <View style={[styles.statusDot, { backgroundColor: '#FF3B30' }]} />
              <Text style={[styles.statusText, { color: isDark ? '#FF8A80' : '#C62828' }]}>
                Status: Cancelled
              </Text>
            </View>
            {deliveryRequest?.cancelReason === 'no_driver' ? (
              <Text style={[styles.cancelReasonDetail, { color: isDark ? '#FFAB91' : '#B71C1C' }]}>
                Reason: No driver available
              </Text>
            ) : null}
            {deliveryRequest?.paymentHoldStatus === 'RELEASED' ||
            deliveryRequest?.cancelReason === 'no_driver' ? (
              <Text style={[styles.cancelReasonDetail, { color: isDark ? '#A5D6A7' : '#2E7D32' }]}>
                Payment hold released · you were not charged
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.statusContainer, { backgroundColor: isDark ? '#1C1C1E' : '#F0F0F0' }]}>
            <View style={styles.statusRow}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: deliveryStatus === 'pending' ? '#FF9500' : '#34C759' },
                ]}
              />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {deliveryStatus === 'pending' && 'Waiting for driver'}
                {deliveryStatus === 'accepted' && 'Driver accepted'}
                {deliveryStatus === 'picked_up' && 'Items picked up'}
                {deliveryStatus === 'in_transit' && 'In transit'}
                {deliveryStatus === 'completed' &&
                  (deliveryRequest?.userConfirmedDelivery
                    ? 'Confirmed received'
                    : 'Awaiting your confirmation')}
              </Text>
            </View>
          </View>
        )}

        {deliveryStatus !== 'cancelled' ? (
          <View style={[styles.infoContainer, { backgroundColor: isDark ? '#1C1C1E' : '#E3F2FD' }]}>
            <Ionicons name="information-circle" size={scaleFont(20)} color={colors.icon} />
            <Text style={[styles.infoText, { color: colors.icon }]}>
              Critical steps use Hold to confirm on both Raac and Driver apps so nobody taps by mistake.
            </Text>
          </View>
        ) : (
          <View style={[styles.infoContainer, { backgroundColor: isDark ? '#1C1C1E' : '#FFF3E0' }]}>
            <Ionicons name="information-circle" size={scaleFont(20)} color="#FF9500" />
            <Text style={[styles.infoText, { color: isDark ? '#FFCC80' : '#E65100' }]}>
              {deliveryRequest?.cancelReason === 'no_driver'
                ? 'Try again in a few minutes — more drivers may be online nearby.'
                : 'You can place a new delivery anytime from Home.'}
            </Text>
          </View>
        )}

        <View style={styles.buttonContainer}>
          {deliveryStatus !== 'cancelled' && showStoreHandoffHold ? (
            <HoldToConfirmButton
              label="Hold · Wan dhibe dalabka"
              color="#000"
              onConfirm={async () => {
                await confirmStoreHandoff(deliveryRequest!.id);
                await refresh();
              }}
            />
          ) : null}

          {deliveryStatus !== 'cancelled' && showArrivalHold ? (
            <HoldToConfirmButton
              label="Hold to confirm driver arrived"
              color="#34C759"
              onConfirm={async () => {
                await confirmDriverArrival(deliveryRequest!.id);
                await refresh();
              }}
            />
          ) : null}

          {deliveryStatus !== 'cancelled' &&
          !isStoreOrder &&
          deliveryRequest?.userConfirmedArrival &&
          deliveryStatus === 'accepted' ? (
            <View style={[styles.infoMessage, { backgroundColor: isDark ? '#1C1C1E' : '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={scaleFont(20)} color="#4CAF50" />
              <Text style={[styles.infoMessageText, { color: isDark ? '#FFFFFF' : '#2E7D32' }]}>
                Arrival confirmed. Waiting for driver to collect the package.
              </Text>
            </View>
          ) : null}

          {deliveryStatus !== 'cancelled' && showPickupHold ? (
            <HoldToConfirmButton
              label="Hold to confirm package taken"
              color="#000"
              onConfirm={async () => {
                await confirmPackagePickup(deliveryRequest!.id);
                await refresh();
              }}
            />
          ) : null}

          {deliveryStatus !== 'cancelled' &&
          deliveryRequest?.userConfirmedPickup &&
          (deliveryStatus === 'picked_up' || deliveryStatus === 'in_transit') ? (
            <View style={[styles.infoMessage, { backgroundColor: isDark ? '#1C1C1E' : '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={scaleFont(20)} color="#4CAF50" />
              <Text style={[styles.infoMessageText, { color: isDark ? '#FFFFFF' : '#2E7D32' }]}>
                {isStoreOrder
                  ? 'Package handed over. Driver can start the trip.'
                  : 'Package confirmed. Driver can start the trip.'}
              </Text>
            </View>
          ) : null}

          {deliveryStatus !== 'cancelled' && showReceivedHold ? (
            <HoldToConfirmButton
              label="Hold to confirm I received the package"
              color="#03C167"
              onConfirm={async () => {
                await confirmDeliveryReceived(deliveryRequest!.id);
                await refresh();
              }}
            />
          ) : null}

          {deliveryStatus !== 'cancelled' && deliveryRequest?.userConfirmedDelivery ? (
            <View style={[styles.infoMessage, { backgroundColor: isDark ? '#1C1C1E' : '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={scaleFont(20)} color="#4CAF50" />
              <Text style={[styles.infoMessageText, { color: isDark ? '#FFFFFF' : '#2E7D32' }]}>
                Delivery fully confirmed. Thank you!
              </Text>
            </View>
          ) : null}

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#000' }]} onPress={goHome}>
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  content: { flex: 1 },
  successIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleHeight(40),
    marginBottom: scaleHeight(24),
  },
  successCircle: {
    width: scaleWidth(160),
    height: scaleWidth(160),
    borderRadius: scaleWidth(80),
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: scaleHeight(32),
    paddingHorizontal: scaleWidth(20),
  },
  successTitle: {
    fontSize: scaleFont(24),
    fontWeight: '700',
    marginBottom: scaleHeight(12),
    textAlign: 'center',
  },
  successMessage: {
    fontSize: scaleFont(16),
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: scaleFont(22),
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: scaleWidth(16),
    borderRadius: scaleWidth(12),
    marginBottom: scaleHeight(24),
  },
  infoText: {
    fontSize: scaleFont(14),
    fontWeight: '400',
    marginLeft: scaleWidth(12),
    flex: 1,
    lineHeight: scaleFont(20),
  },
  buttonContainer: { gap: scaleHeight(12) },
  primaryButton: {
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    minHeight: scaleHeight(52),
    justifyContent: 'center',
  },
  primaryButtonText: { color: '#FFF', fontSize: scaleFont(18), fontWeight: '700' },
  statusContainer: {
    padding: scaleWidth(16),
    borderRadius: scaleWidth(12),
    marginBottom: scaleHeight(24),
    alignItems: 'center',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: scaleWidth(12) },
  statusDot: { width: scaleWidth(12), height: scaleWidth(12), borderRadius: scaleWidth(6) },
  statusText: { fontSize: scaleFont(16), fontWeight: '600' },
  cancelReasonDetail: {
    marginTop: scaleHeight(10),
    fontSize: scaleFont(13),
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: scaleFont(18),
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaleWidth(16),
    borderRadius: scaleWidth(12),
    gap: scaleWidth(12),
  },
  infoMessageText: { fontSize: scaleFont(14), fontWeight: '600', flex: 1 },
});
