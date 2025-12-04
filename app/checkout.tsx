import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Extract order details from params
  const pickupLocation = params.pickupLocation as string || '';
  const destinationLocation = params.destinationLocation as string || '';
  const referenceId = params.referenceId as string || '';
  const recipientName = params.recipientName as string || '';
  const recipientNumber = params.recipientNumber as string || '';
  const selectedType = params.selectedType as string || '';
  const deliveryMethod = params.deliveryMethod as string || '';
  const deliveryTime = params.deliveryTime as string || '';
  const deliveryPrice = params.deliveryPrice as string || '';

  // Use delivery price from params, or calculate if not provided
  const estimatedPrice = deliveryPrice ? deliveryPrice.replace('$', '') : '10.00';

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

  const handleConfirmOrder = async () => {
    setIsPlacingOrder(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsPlacingOrder(false);
      // Navigate to success screen with order details
      router.push({
        pathname: '/order-success',
        params: {
          pickupLocation,
          destinationLocation,
          recipientName,
          recipientNumber,
          selectedType,
          deliveryMethod,
          estimatedPrice,
        }
      });
    }, 2000);
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: scaleWidth(20), paddingVertical: scaleHeight(16) }]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={scaleFont(24)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
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
            <Text style={[styles.infoValue, { color: colors.text }]}>{pickupLocation}</Text>
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
                <Ionicons name="bicycle" size={scaleFont(20)} color={colors.icon} />
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
          <View style={styles.priceRow}>
            <Text style={[styles.priceLabel, { color: colors.text }]}>Delivery Fee</Text>
            <Text style={[styles.priceValue, { color: colors.text }]}>${estimatedPrice}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0' }]} />
          <View style={styles.priceRow}>
            <Text style={[styles.totalLabel, { color: colors.text }]}>Total</Text>
            <Text style={[styles.totalValue, { color: colors.text }]}>${estimatedPrice}</Text>
          </View>
        </View>

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
          onPress={handleConfirmOrder}>
          {isPlacingOrder ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.confirmButtonText}>Confirm Order</Text>
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

