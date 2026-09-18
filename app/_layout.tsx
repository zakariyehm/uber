import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-reanimated';

import { AppColors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="dark" />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { isReady, isLoggedIn } = useAuth();

  useEffect(() => {
    if (!isReady) return;
    void SplashScreen.hideAsync().catch(() => {});
  }, [isReady]);

  // Keep the native splash visible until network + auth are ready.
  if (!isReady) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        headerStyle: {
          backgroundColor: AppColors.header,
          ...(Platform.OS === 'android' ? { height: 52 } : {}),
        },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { color: '#FFFFFF', fontWeight: '600', fontSize: 17 },
      }}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="delivery" options={{ title: 'Complete Order' }} />
        <Stack.Screen name="standard-delivery" options={{ title: 'Standard Delivery' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen
          name="order-success"
          options={{ title: 'Order', gestureEnabled: false, headerBackVisible: false }}
        />
        <Stack.Screen name="plan-ride" options={{ title: 'Plan your ride' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="wallet" options={{ title: 'Wallet', headerShown: false }} />
        <Stack.Screen name="orders" options={{ title: 'Orders' }} />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="get-started" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: 'Log in' }} />
        <Stack.Screen name="signup" options={{ title: 'Sign up' }} />
        <Stack.Screen name="otp-verify" options={{ title: 'Verify' }} />
        <Stack.Screen name="personal-info" options={{ title: 'Your details' }} />
        <Stack.Screen name="signup-step1" options={{ title: 'Sign up' }} />
        <Stack.Screen name="signup-step2" options={{ title: 'Sign up' }} />
        <Stack.Screen name="signup-step3" options={{ title: 'Verify PIN' }} />
        <Stack.Screen name="signup-step4" options={{ title: 'Create password' }} />
      </Stack.Protected>

      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}
