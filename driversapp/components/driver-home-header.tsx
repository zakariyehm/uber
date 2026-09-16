import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

type DriverHomeHeaderProps = {
  balance?: string | null;
  onWalletPress?: () => void;
};

/** Floating wallet pill — menu / settings stay on the bottom status bar. */
export function DriverHomeHeader({ balance = '0.00', onWalletPress }: DriverHomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const display = balance?.replace(/^\$/, '') || '0.00';

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) + 6 }]} pointerEvents="box-none">
      <TouchableOpacity style={styles.walletPill} onPress={onWalletPress} activeOpacity={0.85}>
        <Text style={styles.dollar}>$</Text>
        <Text style={styles.amount} numberOfLines={1}>
          {display}
        </Text>
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
    paddingHorizontal: width * 0.04,
    alignItems: 'center',
  },
  walletPill: {
    minWidth: width * 0.42,
    maxWidth: width * 0.55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.22,
    shadowRadius: 4,
    elevation: 6,
  },
  dollar: {
    color: '#34C759',
    fontSize: Math.round(width * 0.048),
    fontWeight: '800',
    marginRight: 2,
  },
  amount: {
    color: '#FFFFFF',
    fontSize: Math.round(width * 0.048),
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
