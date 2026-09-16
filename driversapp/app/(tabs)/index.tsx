import { BottomNav } from '@/components/bottom-nav';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  DeliveryRequest,
  getActiveDelivery,
  getDeliveryRequestById,
  getDriverOnline,
  listenForPendingRequests,
  setActiveDelivery,
  setDriverOnline,
} from '@/utils/deliveryRequests';
import { toUserFriendlyError } from '@/utils/errors';
import { useFocusEffect, router } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

type DriverStatus = 'offline' | 'waiting' | 'active' | 'online' | 'deactivating';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('offline');
  const [isLoading, setIsLoading] = useState(false);
  const [waitingTimer, setWaitingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [activeTimer, setActiveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [deactivatingTimer, setDeactivatingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const requestListenerRef = useRef<(() => void) | null>(null);
  /** One offer screen at a time — Uber style */
  const offerInFlightRef = useRef(false);
  const screenFocusedRef = useRef(true);
  const goButtonSize = width * 0.18;
  const goButtonFontSize = width * 0.06;

  useEffect(() => {
    return () => {
      if (waitingTimer) clearTimeout(waitingTimer);
      if (activeTimer) clearTimeout(activeTimer);
      if (deactivatingTimer) clearTimeout(deactivatingTimer);
    };
  }, [waitingTimer, activeTimer, deactivatingTimer]);

  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true;
      offerInFlightRef.current = false;

      let cancelled = false;
      const resume = async () => {
        try {
          const activeId = await getActiveDelivery();
          if (cancelled) return;
          if (activeId) {
            try {
              const trip = await getDeliveryRequestById(activeId);
              if (!trip || trip.status === 'cancelled') {
                await setActiveDelivery(null);
              } else if (
                trip.status === 'completed' &&
                trip.userConfirmedDelivery
              ) {
                await setActiveDelivery(null);
              } else {
                offerInFlightRef.current = true;
                router.push({ pathname: '/delivery-details', params: { requestId: activeId } });
                return;
              }
            } catch (error: any) {
              if (error?.status === 404) {
                await setActiveDelivery(null);
              } else {
                // Network busy — still open the trip sheet; it will retry.
                offerInFlightRef.current = true;
                router.push({ pathname: '/delivery-details', params: { requestId: activeId } });
                return;
              }
            }
          }

          // Decline should keep driver online — restore status from server
          const isOnline = await getDriverOnline();
          if (!cancelled && isOnline) {
            setDriverStatus((prev) => (prev === 'online' ? prev : 'online'));
          }
        } catch {
          // ignore
        }
      };
      void resume();

      return () => {
        cancelled = true;
        screenFocusedRef.current = false;
      };
    }, [])
  );

  useEffect(() => {
    if (driverStatus === 'waiting') {
      const timer = setTimeout(() => setDriverStatus('active'), 1200);
      setWaitingTimer(timer);
    } else if (driverStatus === 'active') {
      const timer = setTimeout(() => setDriverStatus('online'), 800);
      setActiveTimer(timer);
    } else if (driverStatus === 'deactivating') {
      const timer = setTimeout(() => setDriverStatus('offline'), 1000);
      setDeactivatingTimer(timer);
    }
  }, [driverStatus]);

  useEffect(() => {
    if (driverStatus !== 'online') {
      if (requestListenerRef.current) {
        requestListenerRef.current();
        requestListenerRef.current = null;
      }
      setIsLoading(false);
      return;
    }

    const unsubscribe = listenForPendingRequests((requests: DeliveryRequest[]) => {
      if (!screenFocusedRef.current || offerInFlightRef.current) {
        setIsLoading(false);
        return;
      }

      const next = requests[0];
      if (!next) {
        setIsLoading(false);
        return;
      }

      offerInFlightRef.current = true;
      setIsLoading(true);
      router.push({
        pathname: '/delivery-offer',
        params: { requestId: next.id },
      });
      setIsLoading(false);
    });

    requestListenerRef.current = unsubscribe;
    return () => {
      unsubscribe();
      requestListenerRef.current = null;
    };
  }, [driverStatus]);

  const handleLeftIconPress = () => {
    router.push('/pending-trips');
  };

  const handleRightIconPress = () => {
    router.push('/account');
  };

  const handleGoPress = async () => {
    if (driverStatus === 'offline') {
      try {
        const activeId = await getActiveDelivery();
        if (activeId) {
          try {
            const trip = await getDeliveryRequestById(activeId);
            if (!trip || trip.status === 'cancelled') {
              await setActiveDelivery(null);
            } else {
              router.push({ pathname: '/delivery-details', params: { requestId: activeId } });
              return;
            }
          } catch (error: any) {
            if (error?.status === 404) {
              await setActiveDelivery(null);
            } else {
              router.push({ pathname: '/delivery-details', params: { requestId: activeId } });
              return;
            }
          }
        }
        await setDriverOnline(true);
        setDriverStatus('waiting');
      } catch (error: any) {
        Alert.alert(
          'Could not go online',
          toUserFriendlyError(error, 'Network busy. Check your connection and try again.')
        );
      }
      return;
    }

    if (driverStatus === 'online' || driverStatus === 'active' || driverStatus === 'waiting') {
      if (waitingTimer) clearTimeout(waitingTimer);
      if (activeTimer) clearTimeout(activeTimer);
      try {
        await setDriverOnline(false);
      } catch (error: any) {
        Alert.alert('Could not go offline', toUserFriendlyError(error, 'Try again'));
        return;
      }
      setDriverStatus('deactivating');
    }
  };

  const getStatusText = (): string => {
    switch (driverStatus) {
      case 'offline':
        return "You're offline";
      case 'waiting':
        return 'Waiting...';
      case 'active':
        return 'Active';
      case 'online':
        return 'Online';
      case 'deactivating':
        return 'Deactivating...';
      default:
        return "You're offline";
    }
  };

  const getStatusColor = (): string => {
    switch (driverStatus) {
      case 'offline':
        return '#3B89EB';
      case 'waiting':
        return '#FF9500';
      case 'active':
      case 'online':
        return '#34C759';
      case 'deactivating':
        return '#8E8E93';
      default:
        return '#3B89EB';
    }
  };

  const getGoButtonText = (): string => (driverStatus === 'offline' ? 'GO' : 'OFF');
  const getGoButtonColor = (): string => (driverStatus === 'offline' ? '#007AFF' : '#FF3B30');

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      <View style={styles.homeContainer}>
        <View style={styles.goButtonContainer}>
          <TouchableOpacity
            style={[
              styles.goButton,
              {
                width: goButtonSize,
                height: goButtonSize,
                borderRadius: goButtonSize / 2,
                backgroundColor: getGoButtonColor(),
              },
            ]}
            onPress={handleGoPress}
            activeOpacity={0.8}>
            <Text style={[styles.goButtonText, { fontSize: goButtonFontSize }]}>
              {getGoButtonText()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />
      <BottomNav
        statusText={getStatusText()}
        statusColor={getStatusColor()}
        onLeftIconPress={handleLeftIconPress}
        onRightIconPress={handleRightIconPress}
      />

      {isLoading && driverStatus === 'online' ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#000000" />
          <Text style={styles.loadingText}>Loading request...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  homeContainer: {
    flex: 1,
  },
  goButtonContainer: {
    position: 'absolute',
    bottom: width * 0.1,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  goButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    position: 'absolute',
    bottom: width * 0.12,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
  },
});
