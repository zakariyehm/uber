import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { AppColors } from '@/constants/theme';
import { isValidSomaliMobile, toE164Somalia } from '@/constants/somalia';
import { useAuth } from '@/contexts/auth';
import { loginStoreStaff } from '@/utils/auth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function StoreLoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [localNumber, setLocalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const canContinue = useMemo(
    () => isValidSomaliMobile(localNumber) && password.length >= 6,
    [localNumber, password]
  );

  const handleLogin = async () => {
    if (!canContinue || busy) return;
    setBusy(true);
    try {
      const result = await loginStoreStaff(toE164Somalia(localNumber), password);
      await signIn(result.token, result.user);
    } catch (error: any) {
      if (error?.code === 'auth/user-disabled') {
        Alert.alert('Account disabled', error.message || 'This account is disabled. Contact Raac operations.');
      } else if (error?.code === 'auth/not-store-staff') {
        Alert.alert(
          'Ganacsade login',
          error.message || 'This number is not registered as store staff.'
        );
      } else if (error?.code === 'auth/user-not-found') {
        Alert.alert(
          'Account not found',
          'This number is not a store staff login. Ask admin to add it when the store is registered.'
        );
      } else if (error?.code === 'auth/wrong-password') {
        Alert.alert('Incorrect password or number', 'Check the staff number and password, then try again.');
      } else {
        Alert.alert('Could not sign in', error.message || 'Please try again.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Ganacsade login</Text>
          <Text style={styles.subtitle}>
            Kaliya numbers-ka staff ee store register ayaa halkan ku soo gali kara.
          </Text>

          <View style={styles.phoneRow}>
            <Pressable style={styles.flagWrap} disabled>
              <Text style={styles.flag}>🇸🇴</Text>
              <Ionicons name="chevron-down" size={14} color={AppColors.text} />
            </Pressable>
            <Text style={styles.dial}>+252</Text>
            <TextInput
              style={styles.input}
              placeholder="Staff mobile number"
              placeholderTextColor="#9A9A9A"
              keyboardType="phone-pad"
              value={localNumber}
              onChangeText={(value) => setLocalNumber(value.replace(/[^\d]/g, '').slice(0, 9))}
              autoFocus
            />
          </View>

          <View style={styles.phoneRow}>
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#9A9A9A"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
              <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={AppColors.muted} />
            </Pressable>
          </View>

          <Pressable
            style={[styles.continue, !canContinue && styles.continueDisabled]}
            disabled={!canContinue || busy}
            onPress={() => void handleLogin()}>
            <Text style={[styles.continueText, !canContinue && styles.continueTextDisabled]}>Sign in</Text>
          </Pressable>

          <Pressable style={styles.switchLink} onPress={() => router.replace('/login')}>
            <Text style={styles.switchText}>Personal rider? Use phone login</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={busy} message="Signing in" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  flex: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    marginBottom: 8,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.muted,
    marginBottom: 18,
  },
  phoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: AppColors.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    minHeight: 56,
    marginBottom: 12,
  },
  flagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingRight: 8,
  },
  flag: { fontSize: 20 },
  dial: {
    fontSize: 16,
    fontWeight: '500',
    color: AppColors.text,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: AppColors.text,
    paddingVertical: 16,
  },
  continue: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  continueDisabled: {
    backgroundColor: AppColors.disabled,
  },
  continueText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  continueTextDisabled: {
    color: AppColors.disabledText,
  },
  switchLink: {
    alignItems: 'center',
    marginTop: 18,
  },
  switchText: {
    fontSize: 15,
    fontWeight: '600',
    color: AppColors.text,
  },
});
