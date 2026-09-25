import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { apiRequest } from '@/lib/api';
import { createDeliveryRequest } from '@/utils/deliveryRequests';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive helper functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

export default function CheckoutScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const placingRef = useRef(false);
  const [storeAvailable, setStoreAvailable] = useState<number | null>(null);

  // Extract order details from params
  const pickupLocation = params.pickupLocation as string || '';
  const pickupDisplay = (params.pickupDisplay as string) || pickupLocation;
  const destinationLocation = params.destinationLocation as string || '';
  const referenceId = params.referenceId as string || '';
  const senderKind = ((params.senderKind as string) || 'PERSONAL').toUpperCase() === 'STORE'
    ? 'STORE'
    : 'PERSONAL';
  const senderName = params.senderName as string || '';
  const senderNumber = params.senderNumber as string || '';
  const storeId = (params.storeId as string) || '';
  const storeOrderCode = (params.storeOrderCode as string) || '';
  const storeBranchLocation = (params.storeBranchLocation as string) || '';
  const recipientName = params.recipientName as string || '';
  const recipientNumber = params.recipientNumber as string || '';
  const selectedType = params.selectedType as string || '';
  const deliveryMethod = params.deliveryMethod as string || '';
  const deliveryTime = params.deliveryTime as string || '';
  const deliveryPrice = params.deliveryPrice as string || '';
  const distanceKm = (params.distanceKm as string) || '';
  const durationLabel = (params.durationLabel as string) || '';
  const fareBreakdown = (params.fareBreakdown as string) || '';

  // Use delivery price from params, or calculate if not provided
  const estimatedPrice = deliveryPrice ? deliveryPrice.replace('$', '') : '10.00';
  const fareAmount = Number.parseFloat(estimatedPrice) || 0;
  const storeShort =
    senderKind === 'STORE' && storeAvailable != null && storeAvailable < fareAmount;

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

  useEffect(() => {
    if (senderKind !== 'STORE') return;
    let cancelled = false;
    void apiRequest<{ available?: string; balance?: string }>('/wallet/me')
      .then((wallet) => {
        if (cancelled) return;
        const value = Number.parseFloat(wallet.available ?? wallet.balance ?? '0');
        setStoreAvailable(Number.isFinite(value) ? value : 0);
      })
      .catch(() => {
        if (!cancelled) setStoreAvailable(null);
      });
    return () => {
      cancelled = true;
    };
  }, [senderKind]);

  const handlePlaceOrder = async (payerType: 'SENDER' | 'RECIPIENT') => {
    if (placingRef.current || isPlacingOrder) return;

    const normalize = (phone: string) => {
      let digits = phone.replace(/\D/g, '');
      if (digits.startsWith('252')) digits = digits.slice(3);
      if (digits.startsWith('0')) digits = digits.slice(1);
      return digits;
    };
    const senderDigits = normalize(senderNumber);
    const recipientDigits = normalize(recipientNumber);
    if (
      senderKind === 'PERSONAL' &&
      senderDigits.length >= 7 &&
      recipientDigits.length >= 7 &&
      senderDigits === recipientDigits
    ) {
      Alert.alert(
        'Different numbers required',
        'Sender and recipient must use two different phone numbers.'
      );
      return;
    }

    if (payerType === 'SENDER' && senderKind !== 'STORE' && !senderNumber.trim()) {
      Alert.alert('Sender number required', 'Enter the sender Waafi phone number before confirming.');
      return;
    }
    if (payerType === 'RECIPIENT' && !recipientNumber.trim()) {
      Alert.alert('Recipient number required', 'Recipient phone is needed so they can pay on delivery.');
      return;
    }
    if (senderKind === 'STORE' && (!storeId || !storeOrderCode.trim() || !storeBranchLocation.trim())) {
      Alert.alert('Store details required', 'Select a store and enter order ID and branch location.');
      return;
    }
    if (!estimatedPrice || fareAmount <= 0) {
      Alert.alert('Invalid amount', 'Delivery price is missing.');
      return;
    }
    if (senderKind === 'STORE' && storeAvailable != null && storeAvailable < fareAmount) {
      Alert.alert(
        'Kuguma filna',
        `Haraaga waa $${storeAvailable.toFixed(2)}. Trip-kan waa $${fareAmount.toFixed(2)}. Samee top up.`,
        [
          { text: 'Ka noqo', style: 'cancel' },
          { text: 'Samee top up', onPress: () => router.push('/wallet') },
        ]
      );
      return;
    }

    placingRef.current = true;
    setIsPlacingOrder(true);

    try {
      const deliveryRequest = await createDeliveryRequest({
        pickupLocation,
        destinationLocation,
        recipientName,
        recipientNumber,
        itemType: selectedType || 'Package',
        deliveryMethod: deliveryMethod || 'Standard',
        deliveryPrice: estimatedPrice,
        senderName: senderName || 'Sender',
        senderKind,
        ...(senderKind === 'STORE'
          ? {
              storeId,
              storeOrderCode,
              storeBranchLocation,
              referenceId: storeOrderCode || referenceId || undefined,
            }
          : referenceId
            ? { referenceId }
            : {}),
        ...(payerType === 'SENDER' && senderKind !== 'STORE'
          ? { senderPhone: senderNumber.trim() }
          : senderNumber.trim()
            ? { senderPhone: senderNumber.trim() }
            : {}),
        payerType,
      });

      router.replace({
        pathname: '/order-success',
        params: {
          orderId: deliveryRequest.orderId,
          requestId: deliveryRequest.id,
          pickupLocation,
          destinationLocation,
          recipientName,
          recipientNumber,
          selectedType,
          deliveryMethod,
          estimatedPrice,
          payerType,
        },
      });
    } catch (error: unknown) {
      placingRef.current = false;
      setIsPlacingOrder(false);
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'Order could not be placed. Please try again.';
      const insufficient =
        senderKind === 'STORE' &&
        ((error as { code?: string; status?: number }).code === 'wallet/insufficient' ||
          (error as { status?: number }).status === 402 ||
          /insufficient/i.test(message));
      Alert.alert(
        insufficient
          ? 'Kuguma filna'
          : payerType === 'SENDER' && senderKind === 'STORE'
            ? 'Order-ka lama sameyn karin'
            : payerType === 'SENDER'
              ? 'Payment hold failed'
              : 'Could not place order',
        insufficient ? message : message,
        insufficient
          ? [
              { text: 'Ka noqo', style: 'cancel' },
              { text: 'Samee top up', onPress: () => router.push('/wallet') },
            ]
          : undefined
      );
    }
  };

  const handleConfirmOrder = () => {
    if (placingRef.current || isPlacingOrder) return;
    // Always charge the pickup sender: Waafi hold (personal) or store wallet (store).
    void handlePlaceOrder('SENDER');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <ScrollView 
        style={[styles.content, { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(20) }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleHeight(32) }}>
        
        {/* Order Summary */}
        <View style={styles.summaryContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Order Summary</Text>
          
          {/* Pickup Location */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="location" size={scaleFont(20)} color={colors.icon} />
              <Text style={[styles.infoLabel, { color: colors.icon }]}>Pickup Location</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.text }]}>{pickupDisplay}</Text>
          </View>

          {/* Destination Location */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="navigate" size={scaleFont(20)} color={colors.icon} />
              <Text style={[styles.infoLabel, { color: colors.icon }]}>Destination</Text>
            </View>
            <Text style={[styles.infoValue, { color: colors.text }]}>{destinationLocation}</Text>
          </View>

          {/* Delivery Method */}
          {deliveryMethod && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="airplane" size={scaleFont(20)} color={colors.icon} />
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Delivery Method</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {deliveryMethod} {deliveryTime ? `• ${deliveryTime}` : ''}
              </Text>
            </View>
          )}

          {/* Item Type */}
          {selectedType && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="cube" size={scaleFont(20)} color={colors.icon} />
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Item Type</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{selectedType}</Text>
            </View>
          )}

          {/* Reference ID */}
          {referenceId && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="document-text" size={scaleFont(20)} color={colors.icon} />
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Reference ID</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{referenceId}</Text>
            </View>
          )}

          {/* Sender Details */}
          <View style={styles.recipientSection}>
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>Sender Details</Text>

            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="pricetag" size={scaleFont(20)} color={colors.icon} />
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Type</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>
                {senderKind === 'STORE' ? 'Store' : 'Personal'}
              </Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="person" size={scaleFont(20)} color={colors.icon} />
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Name</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{senderName || '—'}</Text>
            </View>

            {senderKind === 'STORE' ? null : (
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="call" size={scaleFont(20)} color={colors.icon} />
                  <Text style={[styles.infoLabel, { color: colors.icon }]}>Phone</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.text }]}>{senderNumber || '—'}</Text>
              </View>
            )}

            {senderKind === 'STORE' && storeOrderCode ? (
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="receipt" size={scaleFont(20)} color={colors.icon} />
                  <Text style={[styles.infoLabel, { color: colors.icon }]}>Order ID</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.text }]}>{storeOrderCode}</Text>
              </View>
            ) : null}

            {senderKind === 'STORE' && storeBranchLocation ? (
              <View style={styles.infoRow}>
                <View style={styles.infoLabelContainer}>
                  <Ionicons name="storefront" size={scaleFont(20)} color={colors.icon} />
                  <Text style={[styles.infoLabel, { color: colors.icon }]}>Branch</Text>
                </View>
                <Text style={[styles.infoValue, { color: colors.text }]}>{storeBranchLocation}</Text>
              </View>
            ) : null}
          </View>

          {/* Recipient Details */}
          <View style={styles.recipientSection}>
            <Text style={[styles.subsectionTitle, { color: colors.text }]}>Recipient Details</Text>
            
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="person" size={scaleFont(20)} color={colors.icon} />
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Name</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{recipientName}</Text>
            </View>

            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="call" size={scaleFont(20)} color={colors.icon} />
                <Text style={[styles.infoLabel, { color: colors.icon }]}>Phone</Text>
              </View>
              <Text style={[styles.infoValue, { color: colors.text }]}>{recipientNumber}</Text>
            </View>
          </View>
        </View>

        {/* Price Summary */}
        <View style={[
          styles.priceContainer,
          {
            backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
            borderColor: isDark ? '#3A3A3A' : '#E0E0E0',
          }
        ]}>
          {distanceKm ? (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: colors.icon }]}>Distance</Text>
              <Text style={[styles.priceValue, { color: colors.text }]}>
                {distanceKm} km{durationLabel ? ` · ${durationLabel}` : ''}
              </Text>
            </View>
          ) : null}
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.text }]}>
              {fareBreakdown || 'Delivery Fee'}
            </Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>${estimatedPrice}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0' }]} />
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>${estimatedPrice}</Text>
          </View>
          {senderKind === 'STORE' ? (
            <View style={styles.priceRow}>
              <Text style={[styles.priceLabel, { color: storeShort ? '#C0392B' : colors.icon }]}>
                Haraaga
              </Text>
              <Text style={[styles.priceValue, { color: storeShort ? '#C0392B' : colors.text }]}>
                {storeAvailable == null ? '—' : `$${storeAvailable.toFixed(2)}`}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.holdHint, { color: storeShort ? '#C0392B' : colors.icon }]}>
          {senderKind === 'STORE'
            ? storeShort
              ? `Kuguma filna. Haraaga waa $${storeAvailable?.toFixed(2)}. Samee top up.`
              : `Confirm Order waxay $${estimatedPrice} ka jari doontaa wallet-kaaga (lacagtii Waafi aad ku shubatay).`
            : `When you confirm, Waafi sends a prompt to ${senderNumber || 'the sender number'}. Approve it and enter your PIN to hold $${estimatedPrice}. Funds are captured only after the trip is completed.`}
        </Text>

        {/* Confirm Order Button */}
        <TouchableOpacity 
          style={[
            styles.confirmButton,
            {
              backgroundColor: isPlacingOrder ? '#666' : '#000',
              opacity: isPlacingOrder ? 0.7 : 1,
            }
          ]}
          activeOpacity={0.8}
          disabled={isPlacingOrder}
          onPress={storeShort ? () => router.push('/wallet') : handleConfirmOrder}>
          {isPlacingOrder ? (
            <View style={styles.confirmBusy}>
              <ActivityIndicator size="small" color="#FFF" />
              <Text style={styles.confirmBusyText}>
                {senderKind === 'STORE'
                  ? 'Placing store order…'
                  : 'Waiting for PIN approval…'}
              </Text>
            </View>
          ) : (
            <Text style={styles.confirmButtonText}>
              {storeShort
                ? 'Samee top up'
                : senderKind === 'STORE'
                  ? 'Confirm Order'
                  : 'Confirm Order · Hold payment'}
            </Text>
          )}
        </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    minHeight: scaleHeight(56),
  },
  backButton: {
    padding: scaleWidth(8),
    minWidth: scaleWidth(40),
    minHeight: scaleWidth(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(20),
    fontWeight: '600',
  },
  placeholder: {
    width: scaleWidth(40),
  },
  content: {
    flex: 1,
  },
  summaryContainer: {
    marginTop: scaleHeight(24),
  },
  sectionTitle: {
    fontSize: scaleFont(20),
    fontWeight: '600',
    marginBottom: scaleHeight(20),
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(16),
    paddingBottom: scaleHeight(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  infoLabel: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    marginLeft: scaleWidth(8),
    color: '#666',
  },
  infoValue: {
    fontSize: scaleFont(16),
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  recipientSection: {
    marginTop: scaleHeight(8),
  },
  subsectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    marginBottom: scaleHeight(16),
    marginTop: scaleHeight(8),
  },
  priceContainer: {
    marginTop: scaleHeight(24),
    padding: scaleWidth(20),
    borderRadius: scaleWidth(12),
    borderWidth: 1,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: scaleHeight(8),
  },
  divider: {
    height: 1,
    marginVertical: scaleHeight(12),
  },
  priceLabel: {
    fontSize: scaleFont(16),
    fontWeight: '400',
  },
  priceValue: {
    fontSize: scaleFont(16),
    fontWeight: '500',
  },
  totalLabel: {
    fontSize: scaleFont(18),
    fontWeight: '600',
  },
  totalValue: {
    fontSize: scaleFont(20),
    fontWeight: '700',
  },
  holdHint: {
    fontSize: scaleFont(13),
    lineHeight: scaleFont(18),
    marginTop: scaleHeight(12),
    textAlign: 'center',
  },
  confirmBusy: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(10),
  },
  confirmBusyText: {
    color: '#FFF',
    fontSize: scaleFont(15),
    fontWeight: '600',
  },
  confirmButton: {
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    marginTop: scaleHeight(24),
    marginBottom: scaleHeight(32),
    minHeight: scaleHeight(52),
    justifyContent: 'center',
  },
  confirmButtonText: {
    color: '#FFF',
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
});

