import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SplashView } from '@/components/splash-view';
import { AppColors } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [fontsLoaded] = useFonts({
    'Poppins-ExtraBold': require('../assets/fonts/Poppins-ExtraBold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}

function RootNavigator() {
  const { isReady, isLoggedIn } = useAuth();

  if (!isReady) {
    return <SplashView />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerShadowVisible: false,
        headerBackTitle: 'Back',
        headerStyle: { backgroundColor: AppColors.header },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { color: '#FFFFFF', fontWeight: '600' },
      }}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="delivery" options={{ title: 'Complete Order' }} />
        <Stack.Screen name="standard-delivery" options={{ title: 'Standard Delivery' }} />
        <Stack.Screen name="checkout" options={{ title: 'Checkout' }} />
        <Stack.Screen name="order-success" options={{ title: 'Order' }} />
        <Stack.Screen name="plan-ride" options={{ title: 'Plan your ride' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
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
