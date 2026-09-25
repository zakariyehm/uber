import { apiRequest, getStoredUser } from '@/lib/api';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const PRESETS = ['2', '5', '10', '20', '50'];

type TopUpRow = {
  id: string;
  amount: string;
  status: string;
  target: string;
  createdAt: string;
};

type RiderWalletPayload = {
  role?: string;
  kind?: 'PERSONAL' | 'STORE' | string;
  canTopUp?: boolean;
  storeName?: string | null;
  phone?: string | null;
  balance?: string;
  available?: string;
  pendingDebits?: string;
  pendingBalance?: string;
  creditEvents?: number;
  updatedAt?: string;
  topUps?: TopUpRow[];
};

function friendlyError(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: string }).message === 'string') {
    return (err as { message: string }).message || fallback;
  }
  return fallback;
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState<RiderWalletPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);
  const [amount, setAmount] = useState('10');
  const [accountNo, setAccountNo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [data, user] = await Promise.all([
        apiRequest<RiderWalletPayload>('/wallet/me'),
        getStoredUser(),
      ]);
      setWallet(data);
      setAccountNo((current) => current || data.phone || user?.phone || '');
    } catch (err) {
      setError(friendlyError(err, 'Could not load wallet'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const isStore = wallet?.canTopUp === true || wallet?.kind === 'STORE';
  const available = wallet?.available ?? wallet?.balance ?? '0.00';
  const pending = wallet?.pendingBalance ?? '0.00';
  const creditEvents = wallet?.creditEvents ?? 0;
  const parsedAmount = Math.round(Number(amount) * 100) / 100;
  const canSubmit =
    isStore && Number.isFinite(parsedAmount) && parsedAmount >= 1 && parsedAmount <= 100 && !submitting;

  const handleTopUp = () => {
    if (!canSubmit) return;
    Alert.alert(
      'Confirm top up',
      `Charge $${parsedAmount.toFixed(2)} from ${accountNo.trim() || 'this Waafi number'} and add it to your ${isStore ? 'store' : 'Raac'} wallet?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Top up',
          onPress: () => {
            void (async () => {
              setSubmitting(true);
              setError(null);
              try {
                const data = await apiRequest<RiderWalletPayload & { lastTopUp?: { mock?: boolean } }>(
                  '/wallet/topup',
                  {
                    method: 'POST',
                    retry: false,
                    body: JSON.stringify({
                      amount: parsedAmount,
                      accountNo: accountNo.trim() || undefined,
                    }),
                  }
                );
                setWallet(data);
                Alert.alert(
                  'Top up sent',
                  data.lastTopUp?.mock
                    ? `$${parsedAmount.toFixed(2)} was added in test mode.`
                    : `Approve the Waafi prompt on ${accountNo.trim() || 'your phone'}. $${parsedAmount.toFixed(2)} will show on your wallet after the charge succeeds.`
                );
              } catch (err) {
                const message = friendlyError(err, 'Top up failed. Try again.');
                setError(message);
                Alert.alert('Top up failed', message);
              } finally {
                setSubmitting(false);
              }
            })();
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load(true);
              }}
              tintColor={AppColors.header}
            />
          }>
          <View style={styles.card}>
            <View style={styles.topRow}>
              <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn} hitSlop={8}>
                <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsBalanceVisible((v) => !v)}
                style={styles.iconBtn}
                hitSlop={8}>
                <Ionicons
                  name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'}
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            <Text style={styles.caption}>
              {isStore ? `${wallet?.storeName || 'Store'} wallet` : 'Pending wallet credit'}
            </Text>
            <View style={styles.balanceContainer}>
              <Text style={styles.priceText}>
                {isBalanceVisible ? `$${isStore ? available : pending}` : '••••••'}
              </Text>
            </View>
            {isStore && Number(wallet?.pendingDebits || 0) > 0 ? (
              <Text style={styles.storeHold}>
                ${wallet?.pendingDebits} held on open store orders
              </Text>
            ) : null}

            {isStore ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>TOP UP</Text>
                <Text style={styles.hintText}>
                  Waafi ayaa lambarkan ka qaada, kadib Raac waxay ku dartaa top-up
                  balance-kaaga. Xadka waa $1–$100.
                </Text>

                <View style={styles.presetRow}>
                  {PRESETS.map((value) => {
                    const selected = amount === value;
                    return (
                      <TouchableOpacity
                        key={value}
                        style={[styles.preset, selected && styles.presetOn]}
                        onPress={() => setAmount(value)}>
                        <Text style={[styles.presetText, selected && styles.presetTextOn]}>${value}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>Amount (USD)</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="10.00"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                />

                <Text style={styles.fieldLabel}>Waafi number</Text>
                <TextInput
                  style={styles.input}
                  value={accountNo}
                  onChangeText={setAccountNo}
                  keyboardType="phone-pad"
                  placeholder="25261xxxxxxx"
                  placeholderTextColor="rgba(255,255,255,0.35)"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={[styles.topUpBtn, !canSubmit && styles.topUpBtnOff]}
                  onPress={handleTopUp}
                  disabled={!canSubmit}>
                  {submitting ? (
                    <ActivityIndicator color="#000" />
                  ) : (
                    <Text style={styles.topUpBtnText}>
                      Top up ${Number.isFinite(parsedAmount) ? parsedAmount.toFixed(2) : '0.00'}
                    </Text>
                  )}
                </TouchableOpacity>

                {(wallet?.topUps || []).length > 0 ? (
                  <>
                    <Text style={[styles.sectionLabel, { marginTop: 22 }]}>RECENT</Text>
                    {(wallet?.topUps || []).map((row) => (
                      <View key={row.id} style={styles.topUpRow}>
                        <View>
                          <Text style={styles.infoText}>${row.amount}</Text>
                          <Text style={styles.hintText}>{formatWhen(row.createdAt)}</Text>
                        </View>
                        <Text
                          style={[
                            styles.statusText,
                            row.status === 'COMPLETED' && styles.statusOk,
                            row.status === 'FAILED' && styles.statusBad,
                          ]}>
                          {row.status}
                        </Text>
                      </View>
                    ))}
                  </>
                ) : null}
              </>
            ) : (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>CREDITS</Text>
                <Text style={styles.infoText}>
                  {creditEvents} no-show refund{creditEvents === 1 ? '' : 's'} credited
                </Text>
                <Text style={styles.hintText}>
                  When a driver cancels for no-show after waiting, most of your held fare returns here
                  as pending credit until payout.
                </Text>
              </>
            )}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={AppColors.header} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: AppColors.bg },
  scroll: {
    paddingHorizontal: width * 0.025,
    paddingTop: width * 0.04,
    paddingBottom: 40,
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#000',
    width: '95%',
    maxWidth: 600,
    paddingHorizontal: width * 0.06,
    paddingVertical: width * 0.06,
    borderRadius: 12,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: width * 0.04,
  },
  iconBtn: { padding: width * 0.01 },
  caption: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  balanceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: width * 0.02,
  },
  priceText: {
    fontSize: width * 0.1,
    fontWeight: '800',
    color: AppColors.header,
  },
  storeHold: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  sectionLabel: {
    fontSize: width * 0.045,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  infoText: {
    fontSize: width * 0.04,
    fontWeight: '400',
    color: '#FFFFFF',
    marginTop: 8,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.55)',
    marginTop: 8,
    lineHeight: 18,
  },
  fieldLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
    borderRadius: 10,
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 14,
  },
  preset: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  presetOn: {
    backgroundColor: AppColors.header,
    borderColor: AppColors.header,
  },
  presetText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  presetTextOn: {
    color: '#000000',
  },
  topUpBtn: {
    marginTop: 18,
    backgroundColor: AppColors.header,
    borderRadius: 12,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topUpBtnOff: {
    opacity: 0.45,
  },
  topUpBtnText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '800',
  },
  topUpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  statusText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '700',
  },
  statusOk: { color: '#7CFFB2' },
  statusBad: { color: '#FF6B6B' },
  errorText: {
    color: '#FF6B6B',
    marginTop: 12,
    fontSize: 13,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
