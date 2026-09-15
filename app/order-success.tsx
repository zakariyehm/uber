import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { getDeliveryRequestByOrderId, DeliveryStatus, confirmDriverArrival, DeliveryRequest as DeliveryRequestType } from '@/utils/deliveryRequests';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive helper functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

export default function OrderSuccessScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('pending');
  const [driverName, setDriverName] = useState<string>('');
  const [deliveryRequest, setDeliveryRequest] = useState<DeliveryRequestType | null>(null);
  const [isConfirmingArrival, setIsConfirmingArrival] = useState(false);
  
  const orderId = params.orderId as string || '';
  const requestId = params.requestId as string || '';
  const fromOrders = params.from === 'orders';

  const goHome = () => {
    router.replace('/(tabs)');
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

  // Check delivery status periodically
  useEffect(() => {
    if (!orderId) return;

    const checkStatus = async () => {
      try {
        const request = await getDeliveryRequestByOrderId(orderId);
        if (request) {
          setDeliveryRequest(request);
          setDeliveryStatus(request.status);
          if (request.driverName) {
            setDriverName(request.driverName);
          }
        }
      } catch (error) {
        console.error('Error checking delivery status:', error);
      }
    };

    // Check immediately
    checkStatus();

    // Check every 3 seconds
    const statusInterval = setInterval(checkStatus, 3000);

    return () => clearInterval(statusInterval);
  }, [orderId]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const checkConnection = async () => {
      const netInfo = await NetInfo.fetch();
      setIsConnected(netInfo.isConnected);
      
      if (netInfo.isConnected) {
        timer = setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } else {
        setIsLoading(true);
      }
    };

    checkConnection();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          setIsLoading(false);
        }, 500);
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

  const handleGoHome = () => {
    goHome();
  };

  const handleConfirmDriverArrival = async () => {
    if (!deliveryRequest || !deliveryRequest.id) return;
    
    setIsConfirmingArrival(true);
    try {
      await confirmDriverArrival(deliveryRequest.id);
      console.log('[OrderSuccess] Driver arrival confirmed');
      // Refresh status
      const request = await getDeliveryRequestByOrderId(orderId);
      if (request) {
        setDeliveryRequest(request);
      }
    } catch (error) {
      console.error('Error confirming driver arrival:', error);
    } finally {
      setIsConfirmingArrival(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      
      {/* Content */}
      <ScrollView 
        style={[styles.content, { paddingHorizontal: scaleWidth(20) }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          paddingBottom: scaleHeight(32),
          flexGrow: 1,
          justifyContent: 'center',
          minHeight: SCREEN_HEIGHT - insets.top - insets.bottom - scaleHeight(100)
        }}>
        
        {/* Success Icon Container */}
        <View style={styles.successIconContainer}>
          <View style={[
            styles.successCircle,
            {
              backgroundColor: isDark ? '#1A5F1A' : '#E8F5E9',
            }
          ]}>
            <Ionicons name="checkmark-circle" size={scaleFont(80)} color="#4CAF50" />
          </View>
        </View>

        {/* Success Message */}
        <View style={styles.messageContainer}>
          <Text style={[styles.successTitle, { color: colors.text }]}>Order Placed Successfully!</Text>
          <Text style={[styles.successMessage, { color: colors.icon }]}>
            {deliveryStatus === 'pending' && 'Waiting for a driver to accept your delivery request...'}
            {deliveryStatus === 'accepted' && driverName && `Driver ${driverName} has accepted your order! They're on their way to pick up your items.`}
            {deliveryStatus === 'accepted' && !driverName && 'A driver has accepted your order! They\'re on their way to pick up your items.'}
            {deliveryStatus === 'picked_up' && 'Your items have been picked up! The driver is heading to the destination.'}
            {deliveryStatus === 'in_transit' && 'Your items are on the way! The driver is delivering to the destination.'}
            {deliveryStatus === 'completed' && 'Delivery completed! Your items have been successfully delivered.'}
            {deliveryStatus === 'cancelled' && 'Your delivery request was cancelled.'}
            {!deliveryStatus && 'Your order has been confirmed and will be processed shortly.'}
          </Text>
        </View>

        {/* Status Indicator */}
        {deliveryStatus !== 'completed' && deliveryStatus !== 'cancelled' && (
          <View style={[
            styles.statusContainer,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#F0F0F0',
            }
          ]}>
            <View style={styles.statusRow}>
              <View style={[
                styles.statusDot,
                { backgroundColor: deliveryStatus === 'pending' ? '#FF9500' : '#34C759' }
              ]} />
              <Text style={[styles.statusText, { color: colors.text }]}>
                {deliveryStatus === 'pending' && 'Waiting for driver'}
                {deliveryStatus === 'accepted' && 'Driver accepted'}
                {deliveryStatus === 'picked_up' && 'Items picked up'}
                {deliveryStatus === 'in_transit' && 'In transit'}
              </Text>
            </View>
          </View>
        )}

        {/* Completion Message */}
        {deliveryStatus === 'completed' && (
          <View style={[
            styles.completionContainer,
            {
              backgroundColor: isDark ? '#1A5F1A' : '#E8F5E9',
            }
          ]}>
            <Ionicons name="checkmark-circle" size={scaleFont(32)} color="#4CAF50" />
            <Text style={[styles.completionText, { color: '#4CAF50' }]}>
              Delivery Completed Successfully!
            </Text>
          </View>
        )}

        {/* Info Message */}
        <View style={[
          styles.infoContainer,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#E3F2FD',
          }
        ]}>
          <Ionicons name="information-circle" size={scaleFont(20)} color={colors.icon} />
          <Text style={[styles.infoText, { color: colors.icon }]}>
            {deliveryStatus === 'pending' && 'A driver will be notified and can accept your delivery request.'}
            {deliveryStatus === 'accepted' && 'You will be notified when the driver picks up your items.'}
            {deliveryStatus === 'picked_up' && 'You will be notified when your items are delivered.'}
            {deliveryStatus === 'in_transit' && 'Your items are on the way to the destination.'}
            {deliveryStatus === 'completed' && 'Thank you for using our delivery service!'}
            {!deliveryStatus && 'You will receive updates about your order status via SMS or phone call.'}
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          {/* Driver Arrival Confirmation Button - Show when driver accepts */}
          {deliveryStatus === 'accepted' && deliveryRequest && !deliveryRequest.userConfirmedArrival && (
            <TouchableOpacity 
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: '#34C759',
                  marginBottom: scaleHeight(12),
                }
              ]}
              activeOpacity={0.8}
              onPress={handleConfirmDriverArrival}
              disabled={isConfirmingArrival}>
              <Ionicons name="checkmark-circle-outline" size={scaleFont(20)} color="#FFFFFF" />
              <Text style={styles.secondaryButtonText}>
                {isConfirmingArrival ? 'Confirming...' : 'Driver Has Arrived - Confirm'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Driver Arrival Confirmed Message */}
          {deliveryRequest && deliveryRequest.userConfirmedArrival && (
            <View style={[
              styles.infoMessage,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#E8F5E9',
                marginBottom: scaleHeight(12),
              }
            ]}>
              <Ionicons name="checkmark-circle" size={scaleFont(20)} color="#4CAF50" />
              <Text style={[styles.infoMessageText, { color: isDark ? '#FFFFFF' : '#2E7D32' }]}>
                Driver arrival confirmed. Driver can now pick up items.
              </Text>
            </View>
          )}

          {/* Go to Home Button */}
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              {
                backgroundColor: '#000',
              }
            ]}
            activeOpacity={0.8}
            onPress={handleGoHome}>
            <Text style={styles.primaryButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
  content: {
    flex: 1,
  },
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
    backgroundColor: '#E3F2FD',
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
  buttonContainer: {
    gap: scaleHeight(12),
  },
  primaryButton: {
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    minHeight: scaleHeight(52),
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
  statusContainer: {
    padding: scaleWidth(16),
    borderRadius: scaleWidth(12),
    marginBottom: scaleHeight(24),
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
  },
  statusDot: {
    width: scaleWidth(12),
    height: scaleWidth(12),
    borderRadius: scaleWidth(6),
  },
  statusText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  completionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaleWidth(16),
    borderRadius: scaleWidth(12),
    marginBottom: scaleHeight(24),
    gap: scaleWidth(12),
  },
  completionText: {
    fontSize: scaleFont(16),
    fontWeight: '700',
    flex: 1,
  },
  secondaryButton: {
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    minHeight: scaleHeight(52),
    justifyContent: 'center',
    flexDirection: 'row',
    gap: scaleWidth(8),
  },
  secondaryButtonText: {
    color: '#FFF',
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
  infoMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scaleWidth(16),
    borderRadius: scaleWidth(12),
    gap: scaleWidth(12),
  },
  infoMessageText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    flex: 1,
  },
});

