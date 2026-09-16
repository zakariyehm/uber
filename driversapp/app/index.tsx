import { useAuth } from '@/contexts/auth';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, StatusBar, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const SPLASH_CONFIG = {
  duration: 1200,
  backgroundColor: '#000000',
  logoImage: require('@/assets/images/splash-icon.png'),
  logoSize: 100,
  appName: 'Driver',
  appNameSize: 36,
  appNameColor: '#FFFFFF',
  tagline: 'Drive with us',
  taglineSize: 14,
  taglineColor: '#9BA1A6',
  fadeInDuration: 600,
};

export default function SplashScreen() {
  const router = useRouter();
  const { isReady, isLoggedIn } = useAuth();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const [minSplashDone, setMinSplashDone] = useState(false);

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

    const timer = setTimeout(() => setMinSplashDone(true), SPLASH_CONFIG.duration);
    return () => clearTimeout(timer);
  }, [fadeAnim, scaleAnim]);

  useEffect(() => {
    if (!isReady || !minSplashDone) return;
    router.replace(isLoggedIn ? '/(tabs)' : '/login');
  }, [isReady, isLoggedIn, minSplashDone, router]);

  return (
    <View style={[styles.container, { backgroundColor: SPLASH_CONFIG.backgroundColor }]}>
      <StatusBar barStyle="light-content" translucent />
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
      <Animated.View style={[styles.textContainer, { opacity: fadeAnim }]}>
        <Text
          style={[
            styles.appName,
            {
              color: SPLASH_CONFIG.appNameColor,
              fontSize: SPLASH_CONFIG.appNameSize,
            },
          ]}>
          {SPLASH_CONFIG.appName}
        </Text>
        <Text
          style={[
            styles.tagline,
            {
              color: SPLASH_CONFIG.taglineColor,
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
    marginBottom: 32,
  },
  logo: {
    tintColor: '#FFFFFF',
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontWeight: '700',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  tagline: {
    fontWeight: '400',
    letterSpacing: 0.3,
  },
});
