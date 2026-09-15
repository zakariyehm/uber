import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { SplashView } from '@/components/splash-view';
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
    <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
      <Stack.Protected guard={isLoggedIn}>
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="delivery" />
        <Stack.Screen name="standard-delivery" />
        <Stack.Screen name="checkout" />
        <Stack.Screen name="order-success" />
        <Stack.Screen name="plan-ride" />
        <Stack.Screen name="profile" />
      </Stack.Protected>

      <Stack.Protected guard={!isLoggedIn}>
        <Stack.Screen name="get-started" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="otp-verify" />
        <Stack.Screen name="personal-info" />
        <Stack.Screen name="signup-step1" />
        <Stack.Screen name="signup-step2" />
        <Stack.Screen name="signup-step3" />
        <Stack.Screen name="signup-step4" />
      </Stack.Protected>

      <Stack.Screen name="index" />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}
