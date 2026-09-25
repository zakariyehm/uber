import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { AppColors } from '@/constants/theme';
import { formatLocalDisplay, isValidSomaliMobile, toE164Somalia } from '@/constants/somalia';
import { useAuth } from '@/contexts/auth';
import { loginStoreStaff, requestOtp } from '@/utils/auth';
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

type PhoneAuthScreenProps = {
  mode: 'login' | 'register';
};

export function PhoneAuthScreen({ mode }: PhoneAuthScreenProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const [localNumber, setLocalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const canContinue = useMemo(() => {
    if (!isValidSomaliMobile(localNumber)) return false;
    if (needsPassword) return password.length >= 6;
    return true;
  }, [localNumber, needsPassword, password]);

  const handleContinue = async () => {
    if (!canContinue || busy) return;
    const phone = toE164Somalia(localNumber);
    setBusy(true);
    try {
      if (needsPassword) {
        const result = await loginStoreStaff(phone, password);
        await signIn(result.token, result.user);
        return;
      }
      const result = await requestOtp(phone, mode === 'register' ? 'REGISTER' : 'LOGIN');
      if (result.needsPassword) {
        setNeedsPassword(true);
        return;
      }
      router.push({
        pathname: '/otp-verify',
        params: {
          phone,
          display: formatLocalDisplay(localNumber),
          mode,
          ...(result.devCode ? { devCode: result.devCode } : {}),
        },
      });
    } catch (error: any) {
      if (error?.code === 'auth/user-disabled') {
        Alert.alert('Account disabled', error.message || 'This account is disabled. Contact Raac operations.');
      } else if (error?.code === 'auth/not-store-staff' || error?.code === 'auth/wrong-password') {
        Alert.alert('Could not sign in', error.message || 'Check the number and password, then try again.');
      } else {
        Alert.alert(needsPassword ? 'Could not sign in' : 'Could not send code', error.message || 'Please try again.');
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
          <Text style={styles.title}>Enter your mobile number</Text>

          <View style={styles.phoneRow}>
            <Pressable style={styles.flagWrap} disabled>
              <Text style={styles.flag}>🇸🇴</Text>
              <Ionicons name="chevron-down" size={14} color={AppColors.text} />
            </Pressable>
            <Text style={styles.dial}>+252</Text>
            <TextInput
              style={styles.input}
              placeholder="Mobile number"
              placeholderTextColor="#9A9A9A"
              keyboardType="phone-pad"
              value={localNumber}
              onChangeText={(value) => {
                setLocalNumber(value.replace(/[^\d]/g, '').slice(0, 9));
                if (needsPassword) {
                  setNeedsPassword(false);
                  setPassword('');
                }
              }}
              autoFocus
            />
          </View>

          {needsPassword ? (
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
                autoFocus
              />
              <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color={AppColors.muted} />
              </Pressable>
            </View>
          ) : null}

          <Pressable
            style={[styles.continue, !canContinue && styles.continueDisabled]}
            disabled={!canContinue || busy}
            onPress={() => void handleContinue()}>
            <Text style={[styles.continueText, !canContinue && styles.continueTextDisabled]}>
              {needsPassword ? 'Sign in' : 'Continue'}
            </Text>
          </Pressable>

          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <SocialButton icon="logo-google" label="Continue with Google" />
          <SocialButton icon="logo-apple" label="Continue with Apple" />

          <Text style={styles.legal}>
            By proceeding, you consent to get calls, WhatsApp or SMS messages, including by automated means, from Uber
            and its affiliates to the number provided.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={busy} message={needsPassword ? 'Signing in' : 'Sending code'} />
    </View>
  );
}

function SocialButton({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <Pressable style={styles.social} onPress={() => Alert.alert(label, 'Coming soon.')}>
      <Ionicons name={icon} size={18} color={AppColors.text} />
      <Text style={styles.socialText}>{label}</Text>
    </Pressable>
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
    marginBottom: 18,
    letterSpacing: -0.6,
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
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 18,
  },
  orLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: AppColors.border,
  },
  orText: {
    color: AppColors.muted,
    fontSize: 14,
  },
  social: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: AppColors.surface,
    borderRadius: 28,
    minHeight: 52,
    marginBottom: 10,
  },
  socialText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  legal: {
    marginTop: 28,
    fontSize: 12,
    lineHeight: 18,
    color: AppColors.muted,
  },
});
