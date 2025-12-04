import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StatusBar, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

// ============================================
// SPLASH SCREEN CUSTOMIZATION - Easy to Change
// ============================================
const SPLASH_CONFIG = {
  // Duration in milliseconds (how long splash shows)
  duration: 2500, // 2.5 seconds - change this to make it longer/shorter
  
  // Background colors
  backgroundColorLight: '#FFFFFF', // Light mode background
  backgroundColorDark: '#000000',  // Dark mode background
  
  // Logo settings
  logoImage: require('@/assets/images/splash-icon.png'), // Change this to use a different logo
  logoSize: 120, // Logo width and height
  
  // App name settings
  appName: 'Eat',
  appNameSize: 42,
  appNameColorLight: '#000000',
  appNameColorDark: '#FFFFFF',
  
  // Tagline settings
  tagline: 'Food Delivery Service',
  taglineSize: 16,
  taglineColorLight: '#687076',
  taglineColorDark: '#9BA1A6',
  
  // Animation settings
  fadeInDuration: 800, // Animation fade in time
};
// ============================================

export default function SplashScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start fade in and scale animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: SPLASH_CONFIG.fadeInDuration,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Navigate to get started screen after configured duration
    const timer = setTimeout(() => {
      router.replace('/get-started');
    }, SPLASH_CONFIG.duration);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: isDark 
          ? SPLASH_CONFIG.backgroundColorDark 
          : SPLASH_CONFIG.backgroundColorLight 
      }
    ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      
      {/* Logo/Icon */}
      <Animated.View
        style={[
          styles.logoContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}>
        <Image
          source={SPLASH_CONFIG.logoImage}
          style={[styles.logo, { width: SPLASH_CONFIG.logoSize, height: SPLASH_CONFIG.logoSize }]}
          resizeMode="contain"
        />
      </Animated.View>

      {/* App Name */}
      <Animated.View
        style={[
          styles.textContainer,
          {
            opacity: fadeAnim,
          },
        ]}>
        <Text style={[
          styles.appName, 
          { 
            color: isDark 
              ? SPLASH_CONFIG.appNameColorDark 
              : SPLASH_CONFIG.appNameColorLight,
            fontSize: SPLASH_CONFIG.appNameSize,
          }
        ]}>
          {SPLASH_CONFIG.appName}
        </Text>
        <Text style={[
          styles.tagline, 
          { 
            color: isDark 
              ? SPLASH_CONFIG.taglineColorDark 
              : SPLASH_CONFIG.taglineColorLight,
            fontSize: SPLASH_CONFIG.taglineSize,
          }
        ]}>
          {SPLASH_CONFIG.tagline}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: width,
    height: height,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    // Size is now controlled by SPLASH_CONFIG.logoSize
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
    // Font size is now controlled by SPLASH_CONFIG.appNameSize
  },
  tagline: {
    fontWeight: '400',
    // Font size is now controlled by SPLASH_CONFIG.taglineSize
  },
});

