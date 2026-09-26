import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '@/constants/theme';

type DriverHomeHeaderProps = {
  balance?: string | null;
  onWalletPress?: () => void;
};

function formatToday(raw?: string | null) {
  const n = Number(String(raw ?? '0').replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

/** Uber-style floating earnings: $amount pill + TODAY tag. Opens wallet. */
export function DriverHomeHeader({ balance = '0.00', onWalletPress }: DriverHomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const display = formatToday(balance);

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) + 4 }]} pointerEvents="box-none">
      <TouchableOpacity style={styles.cluster} onPress={onWalletPress} activeOpacity={0.85}>
        <View style={styles.walletPill}>
          <Text style={styles.dollar}>$</Text>
          <Text style={styles.amount} numberOfLines={1}>
            {display}
          </Text>
        </View>
        <View style={styles.todayTag}>
          <Text style={styles.todayText}>TODAY</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    alignItems: 'center',
  },
  cluster: {
    alignItems: 'center',
  },
  walletPill: {
    minWidth: 118,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppColors.navy,
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 18,
    zIndex: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 8,
  },
  dollar: {
    color: AppColors.primary,
    fontSize: 18,
    fontWeight: '800',
    marginRight: 3,
  },
  amount: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  todayTag: {
    marginTop: 8,
    minWidth: 92,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    paddingVertical: 5,
    paddingHorizontal: 14,
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.14,
    shadowRadius: 2,
    elevation: 4,
  },
  todayText: {
    color: '#111111',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
  },
});
