import { BottomNav } from '@/components/bottom-nav';
import { DriverHomeHeader } from '@/components/driver-home-header';
import { apiRequest } from '@/lib/api';
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
  ImageBackground,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');

/** offline ↔ waiting → online ; online/waiting → deactivating → offline */
type DriverStatus = 'offline' | 'waiting' | 'online' | 'deactivating';

export default function HomeScreen() {
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('offline');
  const [isLoading, setIsLoading] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [walletBalance, setWalletBalance] = useState('0.00');

  const requestListenerRef = useRef<(() => void) | null>(null);
  const offerInFlightRef = useRef(false);
  const screenFocusedRef = useRef(true);
  const statusRef = useRef<DriverStatus>('offline');
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusEpochRef = useRef(0);

  const goButtonSize = width * 0.18;
  const goButtonFontSize = width * 0.06;

  const clearTransitionTimer = () => {
    if (transitionTimerRef.current) {
      clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = null;
    }
  };

  const applyStatus = (next: DriverStatus) => {
    statusRef.current = next;
    setDriverStatus(next);
  };

  useEffect(() => {
    return () => clearTransitionTimer();
  }, []);

  useFocusEffect(
    useCallback(() => {
      screenFocusedRef.current = true;
      offerInFlightRef.current = false;

      let cancelled = false;
      const resume = async () => {
        try {
          try {
            const wallet = await apiRequest<{ balance: string }>('/wallet/me');
            if (!cancelled && wallet?.balance != null) {
              setWalletBalance(String(wallet.balance));
            }
          } catch {
            // keep last known balance
          }

          const activeId = await getActiveDelivery();
          if (cancelled) return;

          if (activeId) {
            try {
              const trip = await getDeliveryRequestById(activeId);
              if (!trip || trip.status === 'cancelled') {
                await setActiveDelivery(null);
              } else if (trip.status === 'completed' && trip.userConfirmedDelivery) {
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
                offerInFlightRef.current = true;
                router.push({ pathname: '/delivery-details', params: { requestId: activeId } });
                return;
              }
            }
          }

          // Sync UI with server — decline keeps online; OFF must stay offline
          const isOnline = await getDriverOnline();
          if (cancelled) return;

          const current = statusRef.current;
          if (current === 'waiting' || current === 'deactivating') return;

          if (isOnline) {
            applyStatus('online');
          } else {
            applyStatus('offline');
          }
        } catch {
          // ignore resume errors
        }
      };
      void resume();

      return () => {
        cancelled = true;
        screenFocusedRef.current = false;
      };
    }, [])
  );

  // Offer listener only while fully online
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

  const handleMenuPress = () => {
    router.push('/history');
  };

  const handleWalletPress = () => {
    router.push('/wallet');
  };

  const handleSettingsPress = () => {
    router.push('/account');
  };

  const goOnline = async () => {
    if (toggling) return;
    setToggling(true);
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
      clearTransitionTimer();
      const epoch = ++statusEpochRef.current;
      applyStatus('waiting');

      transitionTimerRef.current = setTimeout(() => {
        if (statusEpochRef.current !== epoch) return;
        if (statusRef.current !== 'waiting') return;
        applyStatus('online');
      }, 1200);
    } catch (error: any) {
      applyStatus('offline');
      Alert.alert(
        'Could not go online',
        toUserFriendlyError(error, 'Network busy. Check your connection and try again.')
      );
    } finally {
      setToggling(false);
    }
  };

  const goOffline = async () => {
    if (toggling) return;
    setToggling(true);
    clearTransitionTimer();
    const epoch = ++statusEpochRef.current;

    try {
      await setDriverOnline(false);
      applyStatus('deactivating');

      transitionTimerRef.current = setTimeout(() => {
        if (statusEpochRef.current !== epoch) return;
        applyStatus('offline');
      }, 800);
    } catch (error: any) {
      // Stay in previous online/waiting state if server reject
      const isOnline = await getDriverOnline().catch(() => statusRef.current !== 'offline');
      applyStatus(isOnline ? 'online' : 'offline');
      Alert.alert('Could not go offline', toUserFriendlyError(error, 'Try again'));
    } finally {
      setToggling(false);
    }
  };

  const handleGoPress = () => {
    if (driverStatus === 'offline') {
      void goOnline();
      return;
    }
    if (driverStatus === 'waiting' || driverStatus === 'online') {
      void goOffline();
    }
    // deactivating: ignore taps until transition finishes
  };

  const getStatusText = (): string => {
    switch (driverStatus) {
      case 'offline':
        return "You're offline";
      case 'waiting':
        return 'Going online...';
      case 'online':
        return 'Online';
      case 'deactivating':
        return 'Going offline...';
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
      case 'online':
        return '#34C759';
      case 'deactivating':
        return '#8E8E93';
      default:
        return '#3B89EB';
    }
  };

  const isOfflineUi = driverStatus === 'offline';
  const buttonDisabled = toggling || driverStatus === 'deactivating';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />
      <ImageBackground
        source={require('../../assets/images/raacmap.png')}
        style={styles.mapBackground}
        resizeMode="cover">
        <View style={styles.homeContainer}>
          <DriverHomeHeader
            balance={walletBalance}
            onMenuPress={handleMenuPress}
            onWalletPress={handleWalletPress}
            onSettingsPress={handleSettingsPress}
          />
          <View style={styles.goButtonContainer}>
            <TouchableOpacity
              style={[
                styles.goButton,
                {
                  width: goButtonSize,
                  height: goButtonSize,
                  borderRadius: goButtonSize / 2,
                  backgroundColor: isOfflineUi ? '#007AFF' : '#FF3B30',
                  opacity: buttonDisabled ? 0.6 : 1,
                },
              ]}
              onPress={handleGoPress}
              disabled={buttonDisabled}
              activeOpacity={0.8}>
              {toggling ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={[styles.goButtonText, { fontSize: goButtonFontSize }]}>
                  {isOfflineUi ? 'GO' : 'OFF'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>

      <View style={styles.divider} />
      <BottomNav statusText={getStatusText()} statusColor={getStatusColor()} />

      {isLoading && driverStatus === 'online' ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Loading request...</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  mapBackground: {
    flex: 1,
    width: '100%',
  },
  homeContainer: {
    flex: 1,
  },
  goButtonContainer: {
    position: 'absolute',
    bottom: width * 0.22,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
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
    bottom: width * 0.24,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E0E0E0',
    opacity: 0.35,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(11, 18, 32, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
