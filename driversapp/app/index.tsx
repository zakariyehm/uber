import { getAuthToken, setStoredUser } from '@/lib/api';
import { fetchCurrentDriver } from '@/utils/driverAuth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { Animated, Dimensions, Image, StatusBar, StyleSheet, Text, View } from 'react-native';

const { width, height } = Dimensions.get('window');

const SPLASH_CONFIG = {
  duration: 1800,
  backgroundColorLight: '#000000',
  backgroundColorDark: '#000000',
  logoImage: require('@/assets/images/splash-icon.png'),
  logoSize: 100,
  appName: 'Driver',
  appNameSize: 36,
  appNameColorLight: '#FFFFFF',
  appNameColorDark: '#FFFFFF',
  tagline: 'Drive with us',
  taglineSize: 14,
  taglineColorLight: '#9BA1A6',
  taglineColorDark: '#9BA1A6',
  fadeInDuration: 600,
};

export default function SplashScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
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

    let cancelled = false;
    const boot = async () => {
      await new Promise((resolve) => setTimeout(resolve, SPLASH_CONFIG.duration));
      if (cancelled) return;

      try {
        const token = await getAuthToken();
        if (token) {
          const user = await fetchCurrentDriver();
          if (user.role === 'DRIVER') {
            await setStoredUser(user);
            router.replace('/(tabs)');
            return;
          }
        }
      } catch {
        // Fall through to login
      }

      router.replace('/login');
    };

    void boot();
    return () => {
      cancelled = true;
    };
  }, [fadeAnim, router, scaleAnim]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark
            ? SPLASH_CONFIG.backgroundColorDark
            : SPLASH_CONFIG.backgroundColorLight,
        },
      ]}>
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
