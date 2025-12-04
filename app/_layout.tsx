import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="splash" options={{ headerShown: false }} />
        <Stack.Screen name="get-started" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="login" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="signup" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="signup-step1" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="signup-step2" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="signup-step3" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="signup-step4" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="delivery" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="standard-delivery" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="checkout" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="order-success" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="plan-ride" options={{ headerShown: false, animation: 'none' }} />
        <Stack.Screen name="profile" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
