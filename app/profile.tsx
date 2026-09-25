import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { Dimensions, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive helper functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

interface ProfileMenuItem {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description?: string;
  onPress?: () => void;
}

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { user, signOut } = useAuth();
  const username = useMemo(() => {
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(' ');
    return name || 'Rider';
  }, [user]);
  const [rating] = useState('5.0');

  const menuItems: ProfileMenuItem[] = [
    {
      id: 'orders',
      title: 'Orders',
      icon: 'cube-outline',
      description: 'Track deliveries from waiting to completed',
      onPress: () => router.push('/orders'),
    },
    {
      id: '1',
      title: 'Personal info',
      icon: 'person-outline',
      description: 'Manage your personal information',
      onPress: () => {
        // Handle personal info
      },
    },
    {
      id: '3',
      title: 'Wallet',
      icon: 'wallet-outline',
      description:
        user?.riderKind === 'STORE'
          ? 'Ku shub lacag Waafi, kadibna trips ka bixi'
          : 'Pending credits from no-show refunds',
      onPress: () => router.push('/wallet'),
    },
    {
      id: '8',
      title: 'Raac Driver favorites',
      icon: 'heart-outline',
      onPress: () => {
        // Handle favorites
      },
    },
    {
      id: '9',
      title: 'Raac info app',
      icon: 'information-circle-outline',
      onPress: () => {
        // Handle Raac info app
      },
    },
    {
      id: '11',
      title: 'Invite',
      icon: 'person-add-outline',
      onPress: () => {
        // Handle invite
      },
    },
    {
      id: '10',
      title: 'Logout',
      icon: 'log-out-outline',
      onPress: async () => {
        await signOut();
      },
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ScrollView 
        style={[styles.content]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleHeight(32) }}>
        
        {/* Profile Header */}
        <View style={[styles.profileHeader, { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(24), paddingBottom: scaleHeight(32) }]}>
          <View style={styles.profileInfo}>
            <View style={styles.nameRatingContainer}>
              <Text style={[styles.username, { color: colors.text, fontSize: scaleFont(28) }]}>{username}</Text>
              <View style={[styles.ratingBadge, { backgroundColor: '#000' }]}>
                <Ionicons name="star" size={scaleFont(14)} color="#FFF" />
                <Text style={[styles.ratingText, { color: '#FFF', fontSize: scaleFont(14), marginLeft: scaleWidth(4) }]}>{rating}</Text>
              </View>
            </View>
          </View>
          <View style={[
            styles.avatarContainer,
            {
              backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0',
              width: scaleWidth(60),
              height: scaleWidth(60),
              borderRadius: scaleWidth(30),
            }
          ]}>
            <Ionicons name="person" size={scaleFont(30)} color={colors.text} />
          </View>
        </View>

        {/* Menu Items */}
        <View style={[styles.menuContainer, { paddingHorizontal: scaleWidth(20) }]}>
          {menuItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={item.onPress}>
              <View style={styles.menuItemContent}>
                <Ionicons 
                  name={item.icon} 
                  size={scaleFont(24)} 
                  color={item.id === '10' ? '#FF3B30' : colors.text}
                  style={styles.menuIcon}
                />
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: item.id === '10' ? '#FF3B30' : colors.text, fontSize: scaleFont(16) }]}>
                    {item.title}
                  </Text>
                  {item.description && (
                    <Text style={[styles.menuItemDescription, { color: colors.icon, fontSize: scaleFont(13), marginTop: scaleHeight(2) }]}>
                      {item.description}
                    </Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Version */}
        <View style={[styles.versionContainer, { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(16) }]}>
          <Text style={[styles.versionText, { color: colors.icon, fontSize: scaleFont(12) }]}>v1.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  profileInfo: {
    flex: 1,
  },
  nameRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scaleWidth(8),
  },
  username: {
    fontWeight: '700',
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderRadius: scaleWidth(4),
  },
  ratingText: {
    fontWeight: '600',
  },
  avatarContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContainer: {
    marginTop: scaleHeight(8),
  },
  menuItem: {
    paddingVertical: scaleHeight(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuIcon: {
    marginRight: scaleWidth(16),
  },
  menuTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontWeight: '400',
  },
  menuItemDescription: {
    fontWeight: '400',
  },
  versionContainer: {
    alignItems: 'center',
  },
  versionText: {
    fontWeight: '400',
  },
});

