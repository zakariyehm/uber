import { apiRequest } from '@/lib/api';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
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

type WalletPayload = {
  balance: string;
  tripsCompleted: number;
  tripsCancelled: number;
  todayCompleted: number;
  todayEarnings: string;
  updatedAt?: string;
};

async function fetchDriverWallet() {
  return apiRequest<WalletPayload>('/wallet/me');
}

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wallet, setWallet] = useState<WalletPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(true);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDriverWallet();
      setWallet(data);
    } catch (err: any) {
      setError(err.message || 'Could not load wallet');
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

  const balance = wallet?.balance ?? '0.00';
  const todayCompleted = wallet?.todayCompleted ?? 0;
  const todayEarnings = wallet?.todayEarnings ?? '0.00';
  const tripsCompleted = wallet?.tripsCompleted ?? 0;
  const tripsCancelled = wallet?.tripsCancelled ?? 0;

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
          />
        }>
        <View style={styles.darkBox}>
          <View style={styles.topRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.iconBtn}>
              <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsBalanceVisible((v) => !v)}
              style={styles.iconBtn}>
              <Ionicons
                name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'}
                size={24}
                color="#FFFFFF"
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.caption}>Available balance</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.priceText}>
              {isBalanceVisible ? `$${balance}` : '••••••'}
            </Text>
          </View>

          <View style={styles.divider} />

          <Text style={styles.todayText}>TODAY</Text>
          <Text style={styles.infoText}>{todayCompleted} trips completed</Text>
          <Text style={styles.infoText}>${todayEarnings} earned today</Text>

          <View style={styles.divider} />

          <Text style={styles.infoText}>{tripsCompleted} trips completed (all time)</Text>
          <Text style={styles.infoText}>{tripsCancelled} trips cancelled</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity style={styles.summaryButton} activeOpacity={0.8}>
            <Text style={styles.summaryButtonText}>Withdrawal Balance</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {isLoading ? (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#03C167" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  scroll: {
    paddingHorizontal: width * 0.025,
    paddingTop: width * 0.05,
    paddingBottom: 40,
    alignItems: 'center',
  },
  darkBox: {
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
    color: '#03C167',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginVertical: 16,
  },
  todayText: {
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
  errorText: {
    color: '#FF6B6B',
    marginTop: 12,
    fontSize: 13,
  },
  summaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: width * 0.03,
    paddingHorizontal: width * 0.04,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: width * 0.06,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  summaryButtonText: {
    fontSize: width * 0.038,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1,
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
