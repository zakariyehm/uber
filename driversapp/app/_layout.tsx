import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', animation: 'none' }} />
        <Stack.Screen name="account" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="wallet" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="history" options={{ headerShown: true, title: 'Trip history', animation: 'none' }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="signup" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="forgot-password-verify" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="forgot-password-reset" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="delivery-offer" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="delivery-details" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="pending-trips" options={{ headerShown: true, title: 'Trips', animation: 'none' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
