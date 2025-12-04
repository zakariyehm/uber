import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

interface BottomNavProps {
  onLeftIconPress?: () => void;
  onRightIconPress?: () => void;
  statusText?: string;
  statusColor?: string;
}

export function BottomNav({ 
  onLeftIconPress, 
  onRightIconPress, 
  statusText = "You're offline",
  statusColor = "#3B89EB"
}: BottomNavProps) {
  const insets = useSafeAreaInsets();
  const iconSize = width * 0.06; // ~6% of screen width

  return (
    <View style={[
      styles.bottomNav,
      {
        paddingBottom: Math.max(insets.bottom, width * 0.03),
        backgroundColor: statusColor,
      }
    ]}>
      {/* Left Icon - Menu */}
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={onLeftIconPress}
        activeOpacity={0.7}>
        <Ionicons name="menu" size={iconSize} color="#fff" />
      </TouchableOpacity>

      {/* Center Status Text */}
      <View style={styles.statusContainer}>
        <Text style={styles.statusText}>{statusText}</Text>
      </View>

      {/* Right Icon - Settings */}
      <TouchableOpacity 
        style={styles.iconButton}
        onPress={onRightIconPress}
        activeOpacity={0.7}>
        <Ionicons name="settings" size={iconSize} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bottomNav: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingTop: width * 0.03,
    borderTopWidth: 0,
  },
  iconButton: {
    width: width * 0.1,
    height: width * 0.1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: width * 0.05,
  },
  statusText: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#fff',
  },
});

