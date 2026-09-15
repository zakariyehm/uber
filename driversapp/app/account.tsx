import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getStoredUser } from '@/lib/api';
import { driverDisplayName, logoutDriver } from '@/utils/driverAuth';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Dimensions, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive helper functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

interface AccountOption {
  id: string;
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
}

export default function AccountScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [username, setUsername] = useState('Driver');
  const [rating] = useState('5.0');

  useEffect(() => {
    void (async () => {
      const user = await getStoredUser();
      setUsername(driverDisplayName(user));
    })();
  }, []);

  const accountOptions: AccountOption[] = [
    { id: 'history', title: 'Trip History', subtitle: 'Past and active deliveries', icon: 'time-outline' },
    { id: 'wallet', title: 'Wallet', icon: 'wallet-outline' },
    { id: 'payment', title: 'Payment', icon: 'card-outline' },
    { id: 'uber', title: 'Manage Raac account', icon: 'person-outline' },
    { id: 'privacy', title: 'Privacy', icon: 'lock-closed-outline' },
    { id: 'logout', title: 'Logout', icon: 'log-out-outline' },
  ];

  const handleOptionPress = (option: AccountOption) => {
    console.log(`${option.title} pressed`);
    if (option.id === 'wallet') {
      router.push('/wallet');
    }
    if (option.id === 'history') {
      router.push('/history');
    }
    if (option.id === 'logout') {
      handleLogout();
    }
    // Handle navigation to other screens
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[Account] Logging out driver...');
              await logoutDriver();
              console.log('[Account] Driver logged out successfully');
              // Navigate to login screen
              router.replace('/login');
            } catch (error: any) {
              console.error('[Account] Logout error:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      
      {/* Content */}
      <ScrollView 
        style={[styles.content]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleHeight(32) }}>
        
        {/* Profile Header */}
        <View style={[styles.profileHeader, { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(24), paddingBottom: scaleHeight(32) }]}>
          <View style={[
            styles.avatarContainer,
            {
              backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0',
              width: scaleWidth(60),
              height: scaleWidth(60),
              borderRadius: scaleWidth(30),
              marginRight: scaleWidth(16),
            }
          ]}>
            <Ionicons name="person" size={scaleFont(30)} color={colors.text} />
          </View>
          <View style={styles.profileInfo}>
            <View style={styles.nameRatingContainer}>
              <Text style={[styles.username, { color: colors.text, fontSize: scaleFont(28) }]}>{username}</Text>
              <View style={[styles.ratingBadge, { backgroundColor: '#000' }]}>
                <Ionicons name="star" size={scaleFont(14)} color="#FFF" />
                <Text style={[styles.ratingText, { color: '#FFF', fontSize: scaleFont(14), marginLeft: scaleWidth(4) }]}>{rating}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View style={[styles.menuContainer, { paddingHorizontal: scaleWidth(20) }]}>
          {accountOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.menuItem}
              activeOpacity={0.7}
              onPress={() => handleOptionPress(option)}>
              <View style={styles.menuItemContent}>
                <Ionicons 
                  name={option.icon} 
                  size={scaleFont(24)} 
                  color={option.id === 'logout' ? '#FF3B30' : colors.text}
                  style={styles.menuIcon}
                />
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuItemText, { color: option.id === 'logout' ? '#FF3B30' : colors.text, fontSize: scaleFont(16) }]}>
                    {option.title}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
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
});

