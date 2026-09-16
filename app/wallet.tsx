import { apiRequest } from '@/lib/api';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type RiderWalletPayload = {
  role?: string;
  balance?: string;
  pendingBalance?: string;
  creditEvents?: number;
  updatedAt?: string;
};

function friendlyError(err: unknown, fallback: string) {
  if (err && typeof err === 'object' && 'message' in err && typeof (err as any).message === 'string') {
    return (err as any).message || fallback;
  }
  return fallback;
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState<RiderWalletPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<RiderWalletPayload>('/wallet/me');
      setWallet(data);
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

  const pending = wallet?.pendingBalance ?? '0.00';
  const creditEvents = wallet?.creditEvents ?? 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
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

          <Text style={styles.caption}>Pending wallet credit</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.priceText}>{isBalanceVisible ? `$${pending}` : '••••••'}</Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.sectionLabel}>CREDITS</Text>
          <Text style={styles.infoText}>
            {creditEvents} no-show refund{creditEvents === 1 ? '' : 's'} credited
          </Text>
          <Text style={styles.hintText}>
            When a driver cancels for no-show after waiting, most of your held fare returns here as
            pending credit until payout.
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </ScrollView>

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
    marginBottom: width * 0.04,
  },
  priceText: {
    fontSize: width * 0.1,
    fontWeight: '800',
    color: AppColors.header,
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
    marginTop: 14,
    lineHeight: 18,
  },
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
