import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { verifyOtp } from '@/utils/auth';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function OtpVerifyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{
    phone?: string;
    display?: string;
    mode?: string;
    devCode?: string;
  }>();
  const [code, setCode] = useState('');
  const [seconds, setSeconds] = useState(30);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const ready = code.length === 4;
  const purpose = params.mode === 'register' ? 'REGISTER' : 'LOGIN';

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((value) => (value > 0 ? value - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const timerLabel = useMemo(() => {
    const mm = String(Math.floor(seconds / 60)).padStart(1, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  }, [seconds]);

  const submit = async (value: string) => {
    if (value.length !== 4 || !params.phone || busy) return;
    setBusy(true);
    try {
      const result = await verifyOtp(params.phone, value, purpose);
      if (result.token && result.user && !result.isNewUser) {
        await signIn(result.token, result.user);
        return;
      }
      router.replace({
        pathname: '/personal-info',
        params: {
          phone: result.phone || params.phone,
          verificationToken: result.verificationToken || '',
          mode: params.mode || 'register',
        },
      });
    } catch (error: any) {
      Alert.alert('Verification failed', error.message || 'Check the code and try again.');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={styles.body} onPress={() => inputRef.current?.focus()}>
          <Text style={styles.title}>
            Enter the 4-digit code sent to you at {params.display || params.phone}.
          </Text>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.change}>Changed your mobile number?</Text>
          </Pressable>

          <View style={styles.otpRow}>
            {[0, 1, 2, 3].map((index) => {
              const char = code[index] || '';
              const focused = code.length === index;
              return (
                <View key={index} style={[styles.otpBox, focused && styles.otpBoxFocused]}>
                  <Text style={styles.otpChar}>{char}</Text>
                  {focused && !char ? <View style={styles.caret} /> : null}
                </View>
              );
            })}
          </View>

          <TextInput
            ref={inputRef}
            value={code}
            onChangeText={(value) => {
              const next = value.replace(/\D/g, '').slice(0, 4);
              setCode(next);
              if (next.length === 4) {
                void submit(next);
              }
            }}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            autoFocus
            style={styles.hiddenInput}
          />

          <View style={styles.resendPill}>
            <Text style={styles.resendText}>
              {seconds > 0 ? `I didn't receive a code (${timerLabel})` : "I didn't receive a code"}
            </Text>
          </View>
          {__DEV__ && params.devCode ? <Text style={styles.devCode}>Dev code: {params.devCode}</Text> : null}

          <View style={styles.flex} />

          <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
            <Pressable
              style={[styles.nextBtn, !ready && styles.nextBtnDisabled]}
              disabled={!ready || busy}
              onPress={() => void submit(code)}>
              <Text style={[styles.nextText, !ready && styles.nextTextDisabled]}>Next</Text>
              <Ionicons name="arrow-forward" size={18} color={ready ? AppColors.text : AppColors.disabledText} />
            </Pressable>
          </View>
        </Pressable>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={busy} message="Verifying" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },
  flex: { flex: 1 },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: -0.6,
    lineHeight: 34,
  },
  change: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '700',
    color: AppColors.text,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 28,
  },
  otpBox: {
    width: 52,
    height: 56,
    borderRadius: 10,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpBoxFocused: {
    borderWidth: 1.5,
    borderColor: AppColors.text,
  },
  otpChar: {
    fontSize: 24,
    fontWeight: '600',
    color: AppColors.text,
  },
  caret: {
    width: 2,
    height: 22,
    backgroundColor: AppColors.text,
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    height: 0,
    width: 0,
  },
  resendPill: {
    alignSelf: 'flex-start',
    marginTop: 18,
    backgroundColor: AppColors.surface,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resendText: {
    color: AppColors.muted,
    fontSize: 13,
  },
  devCode: {
    marginTop: 10,
    color: AppColors.muted,
    fontSize: 12,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: AppColors.surface,
    borderRadius: 24,
    paddingHorizontal: 18,
    height: 48,
  },
  nextBtnDisabled: {
    opacity: 0.7,
  },
  nextText: {
    fontSize: 16,
    fontWeight: '600',
    color: AppColors.text,
  },
  nextTextDisabled: {
    color: AppColors.disabledText,
  },
});
