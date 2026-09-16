import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');
const CIRCLE = Math.round(width * 0.115);

type DriverHomeHeaderProps = {
  balance?: string | null;
  badgeCount?: number;
  onMenuPress?: () => void;
  onWalletPress?: () => void;
  onSettingsPress?: () => void;
};

/** Uber-style floating top bar: menu · wallet · settings */
export function DriverHomeHeader({
  balance = '0.00',
  badgeCount = 0,
  onMenuPress,
  onWalletPress,
  onSettingsPress,
}: DriverHomeHeaderProps) {
  const insets = useSafeAreaInsets();
  const iconSize = Math.round(width * 0.055);
  const display = balance?.replace(/^\$/, '') || '0.00';

  return (
    <View style={[styles.wrap, { paddingTop: Math.max(insets.top, 12) + 6 }]} pointerEvents="box-none">
      <View style={styles.row}>
        <TouchableOpacity style={styles.circle} onPress={onMenuPress} activeOpacity={0.85}>
          <Ionicons name="menu" size={iconSize} color="#FFFFFF" />
          {badgeCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeCount > 9 ? '9+' : String(badgeCount)}</Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity style={styles.walletPill} onPress={onWalletPress} activeOpacity={0.85}>
          <Text style={styles.dollar}>$</Text>
          <Text style={styles.amount} numberOfLines={1}>
            {display}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.circle} onPress={onSettingsPress} activeOpacity={0.85}>
          <Ionicons name="settings" size={iconSize} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  circle: {
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    backgroundColor: '#111111',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#0B1220',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  walletPill: {
    flex: 1,
    maxWidth: width * 0.48,
    alignSelf: 'center',
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
