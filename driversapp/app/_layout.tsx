import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal', animation: 'none' }} />
          <Stack.Screen name="account" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="wallet" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="history" options={{ headerShown: true, title: 'Trip History', headerBackTitle: 'Back', animation: 'none' }} />
          <Stack.Screen name="login" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="signup" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="forgot-password" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="forgot-password-verify" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen name="forgot-password-reset" options={{ headerShown: false, animation: 'none' }} />
          <Stack.Screen
            name="delivery-offer"
            options={{
              headerShown: false,
              presentation: 'transparentModal',
              animation: 'fade',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen
            name="delivery-details"
            options={{
              headerShown: false,
              presentation: 'transparentModal',
              animation: 'slide_from_bottom',
              contentStyle: { backgroundColor: 'transparent' },
            }}
          />
          <Stack.Screen name="pending-trips" options={{ headerShown: true, title: 'Trips', animation: 'none' }} />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </ThemeProvider>
  );
}
