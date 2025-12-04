import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

export default function GetStartedScreen() {
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

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ 
          flexGrow: 1,
          justifyContent: 'center',
          paddingHorizontal: scaleWidth(20),
          paddingBottom: insets.bottom + scaleHeight(32),
        }}>
        
        {/* Logo/Icon */}
        <View style={styles.logoContainer}>
          <View style={[
            styles.logoCircle,
            {
              backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
            }
          ]}>
            <Ionicons name="restaurant" size={scaleFont(80)} color={isDark ? '#FFFFFF' : '#000000'} />
          </View>
        </View>

        {/* Welcome Text */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: colors.text }]}>Welcome to Eat</Text>
          <Text style={[styles.subtitle, { color: colors.icon }]}>
            Order food and get it delivered to your doorstep quickly and safely
          </Text>
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[
              styles.primaryButton,
              {
                backgroundColor: '#000',
              }
            ]}
            activeOpacity={0.8}
            onPress={() => router.push('/signup-step1')}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={scaleFont(20)} color="#FFF" style={styles.buttonIcon} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={[
              styles.secondaryButton,
              {
                backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                borderColor: isDark ? '#3A3A3A' : '#E0E0E0',
              }
            ]}
            activeOpacity={0.8}
            onPress={() => router.push('/login')}>
            <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Login</Text>
          </TouchableOpacity>
        </View>

        {/* Footer Text */}
        <View style={styles.footerContainer}>
          <Text style={[styles.footerText, { color: colors.icon }]}>
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
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
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scaleHeight(60),
    marginBottom: scaleHeight(40),
  },
  logoCircle: {
    width: scaleWidth(160),
    height: scaleWidth(160),
    borderRadius: scaleWidth(80),
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: scaleHeight(48),
    paddingHorizontal: scaleWidth(20),
  },
  title: {
    fontSize: scaleFont(32),
    fontWeight: '700',
    marginBottom: scaleHeight(16),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: scaleFont(16),
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: scaleFont(24),
    paddingHorizontal: scaleWidth(20),
  },
  buttonContainer: {
    gap: scaleHeight(16),
    marginBottom: scaleHeight(32),
  },
  primaryButton: {
    flexDirection: 'row',
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scaleHeight(56),
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: scaleFont(18),
    fontWeight: '700',
    marginRight: scaleWidth(8),
  },
  buttonIcon: {
    marginLeft: scaleWidth(4),
  },
  secondaryButton: {
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scaleHeight(56),
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
  },
  footerContainer: {
    paddingHorizontal: scaleWidth(20),
    marginTop: scaleHeight(24),
  },
  footerText: {
    fontSize: scaleFont(12),
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: scaleFont(18),
  },
});

