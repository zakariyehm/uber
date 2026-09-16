import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface BottomNavProps {
  statusText?: string;
  statusColor?: string;
}

/** Bottom status strip only — menu / wallet / settings live in the top header. */
export function BottomNav({
  statusText = "You're offline",
  statusColor = '#3B89EB',
}: BottomNavProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.bottomNav,
        {
          paddingBottom: Math.max(insets.bottom, 20),
          backgroundColor: statusColor,
        },
      ]}>
      <Text style={styles.statusText}>{statusText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    width: '100%',
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.05,
    paddingTop: 28,
    borderTopWidth: 0,
  },
  statusText: {
    fontSize: Math.round(width * 0.05),
    fontWeight: '700',
    color: '#fff',
  },
});
