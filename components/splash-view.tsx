import { useColorScheme } from '@/hooks/use-color-scheme';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StatusBar, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const SPLASH_CONFIG = {
  backgroundColorLight: '#FFFFFF',
  backgroundColorDark: '#000000',
  logoImage: require('@/assets/images/splash-icon.png'),
  logoSize: 120,
  appName: 'RAAC',
  appNameSize: 42,
  appNameColorLight: '#000000',
  appNameColorDark: '#FFFFFF',
  tagline: 'Ride & Delivery',
  taglineSize: 16,
  taglineColorLight: '#687076',
  taglineColorDark: '#9BA1A6',
  fadeInDuration: 800,
};

export function SplashView() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
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
  }, [fadeAnim, scaleAnim]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? SPLASH_CONFIG.backgroundColorDark : SPLASH_CONFIG.backgroundColorLight,
        },
      ]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      <Animated.View style={[styles.logoContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
        <Image
          source={SPLASH_CONFIG.logoImage}
          style={{ width: SPLASH_CONFIG.logoSize, height: SPLASH_CONFIG.logoSize }}
          resizeMode="contain"
        />
      </Animated.View>
      <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
        <Text
          style={[
            styles.appName,
            {
              color: isDark ? SPLASH_CONFIG.appNameColorDark : SPLASH_CONFIG.appNameColorLight,
              fontSize: SPLASH_CONFIG.appNameSize,
            },
          ]}>
          {SPLASH_CONFIG.appName}
        </Text>
        <Text
          style={[
            styles.tagline,
            {
              color: isDark ? SPLASH_CONFIG.taglineColorDark : SPLASH_CONFIG.taglineColorLight,
              fontSize: SPLASH_CONFIG.taglineSize,
            },
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
    width,
    height,
  },
  logoContainer: {
    marginBottom: 40,
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 1,
  },
  tagline: {
    fontWeight: '400',
  },
});
