import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';

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
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

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
    router.replace('/(tabs)');
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
            Your order has been confirmed and will be processed shortly.
          </Text>
        </View>

        {/* Info Message */}
        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={scaleFont(20)} color={colors.icon} />
          <Text style={[styles.infoText, { color: colors.icon }]}>
            You will receive updates about your order status via SMS or phone call.
          </Text>
        </View>

        {/* Action Button */}
        <View style={styles.buttonContainer}>
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
});

