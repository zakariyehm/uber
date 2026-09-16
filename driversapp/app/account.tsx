import { useAuth } from '@/contexts/auth';
import { driverDisplayName } from '@/utils/driverAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

const TEXT = '#11181C';

interface AccountOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [username, setUsername] = useState('Driver');
  const [rating] = useState('5.0');

  useEffect(() => {
    setUsername(driverDisplayName(user));
  }, [user]);

  const accountOptions: AccountOption[] = [
    { id: 'history', title: 'Trip History', subtitle: 'Past and active deliveries', icon: 'time-outline' },
    { id: 'wallet', title: 'Wallet', icon: 'wallet-outline' },
    { id: 'payment', title: 'Payment', icon: 'card-outline' },
    { id: 'uber', title: 'Manage Raac account', icon: 'person-outline' },
    { id: 'privacy', title: 'Privacy', icon: 'lock-closed-outline' },
    { id: 'logout', title: 'Logout', icon: 'log-out-outline' },
  ];

  const handleOptionPress = (option: AccountOption) => {
    if (option.id === 'wallet') {
      router.push('/wallet');
    }
    if (option.id === 'history') {
      router.push('/history');
    }
    if (option.id === 'logout') {
      handleLogout();
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          try {
            await signOut();
            router.replace('/login');
          } catch {
            Alert.alert('Error', 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0),
        },
      ]}>
      <StatusBar barStyle="dark-content" translucent />

      <View style={[styles.topBar, { paddingHorizontal: scaleWidth(16) }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)'))}
          activeOpacity={0.7}
          hitSlop={10}>
          <Ionicons name="chevron-back" size={scaleFont(28)} color={TEXT} />
        </TouchableOpacity>
        <Text style={[styles.topTitle, { fontSize: scaleFont(17) }]}>Settings</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleHeight(32) }}>
        <View
          style={[
            styles.profileHeader,
            {
              paddingHorizontal: scaleWidth(20),
              paddingTop: scaleHeight(12),
              paddingBottom: scaleHeight(32),
            },
          ]}>
          <View
            style={[
              styles.avatarContainer,
              {
                backgroundColor: '#E0E0E0',
                width: scaleWidth(60),
                height: scaleWidth(60),
                borderRadius: scaleWidth(30),
                marginRight: scaleWidth(16),
              },
            ]}>
            <Ionicons name="person" size={scaleFont(30)} color={TEXT} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRatingContainer}>
              <Text style={[styles.username, { fontSize: scaleFont(28) }]}>{username}</Text>
              <View style={styles.ratingBadge}>
                <Ionicons name="star" size={scaleFont(14)} color="#FFF" />
                <Text style={[styles.ratingText, { fontSize: scaleFont(14), marginLeft: scaleWidth(4) }]}>
                  {rating}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.menuContainer, { paddingHorizontal: scaleWidth(20) }]}>
          {accountOptions.map((option) => {
            const isLogout = option.id === 'logout';
            const color = isLogout ? '#FF3B30' : TEXT;
            return (
              <TouchableOpacity
                key={option.id}
                style={styles.menuItem}
                activeOpacity={0.7}
                onPress={() => handleOptionPress(option)}>
                <View style={styles.menuItemContent}>
                  <Ionicons name={option.icon} size={scaleFont(24)} color={color} style={styles.menuIcon} />
                  <View style={styles.menuTextContainer}>
                    <Text style={[styles.menuItemText, { color, fontSize: scaleFont(16) }]}>
                      {option.title}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    marginBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  topTitle: {
    fontWeight: '600',
    color: TEXT,
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
    color: TEXT,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(8),
    paddingVertical: scaleHeight(4),
    borderRadius: scaleWidth(4),
    backgroundColor: '#000',
  },
  ratingText: {
    fontWeight: '600',
    color: '#FFF',
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
});
