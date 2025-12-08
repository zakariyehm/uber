import { BottomNav } from '@/components/bottom-nav';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Dimensions, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');

type DriverStatus = 'offline' | 'waiting' | 'active' | 'online' | 'deactivating';

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('offline');
  const [waitingTimer, setWaitingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [activeTimer, setActiveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [deactivatingTimer, setDeactivatingTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Responsive sizes for GO button
  const goButtonSize = width * 0.18; // ~18% of screen width (smaller)
  const goButtonFontSize = width * 0.06; // ~6% of screen width (smaller)

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (waitingTimer) clearTimeout(waitingTimer);
      if (activeTimer) clearTimeout(activeTimer);
      if (deactivatingTimer) clearTimeout(deactivatingTimer);
    };
  }, [waitingTimer, activeTimer, deactivatingTimer]);

  // Handle status transitions
  useEffect(() => {
    if (driverStatus === 'waiting') {
      // After 3 seconds, change to active
      const timer = setTimeout(() => {
        setDriverStatus('active');
      }, 3000);
      setWaitingTimer(timer);
    } else if (driverStatus === 'active') {
      // After 3 seconds, change to online
      const timer = setTimeout(() => {
        setDriverStatus('online');
      }, 3000);
      setActiveTimer(timer);
    } else if (driverStatus === 'deactivating') {
      // After 2 seconds, change to offline
      const timer = setTimeout(() => {
        setDriverStatus('offline');
      }, 2000);
      setDeactivatingTimer(timer);
    }
  }, [driverStatus]);

  // Navigate to delivery offer when driver goes online
  useEffect(() => {
    if (driverStatus === 'online') {
      // Navigate to delivery offer screen after a short delay
      const navigateTimer = setTimeout(() => {
        router.push('/delivery-offer');
      }, 500);
      return () => clearTimeout(navigateTimer);
    }
  }, [driverStatus]);

  const handleLeftIconPress = () => {
    // Navigate to History screen
    router.push('/history');
  };

  const handleRightIconPress = () => {
    // Navigate to Account screen
    router.push('/account');
  };

  const handleGoPress = () => {
    if (driverStatus === 'offline') {
      // Start the waiting process
      setDriverStatus('waiting');
    } else if (driverStatus === 'online' || driverStatus === 'active' || driverStatus === 'waiting') {
      // Start deactivating process
      if (waitingTimer) clearTimeout(waitingTimer);
      if (activeTimer) clearTimeout(activeTimer);
      setDriverStatus('deactivating');
    }
  };

  const getStatusText = (): string => {
    switch (driverStatus) {
      case 'offline':
        return "You're offline";
      case 'waiting':
        return 'Waiting...';
      case 'active':
        return 'Active';
      case 'online':
        return 'Online';
      case 'deactivating':
        return 'Deactivating...';
      default:
        return "You're offline";
    }
  };

  const getStatusColor = (): string => {
    switch (driverStatus) {
      case 'offline':
        return '#3B89EB'; // Blue
      case 'waiting':
        return '#FF9500'; // Orange
      case 'active':
        return '#34C759'; // Green
      case 'online':
        return '#34C759'; // Green
      case 'deactivating':
        return '#8E8E93'; // Gray
      default:
        return '#3B89EB';
    }
  };

  const getGoButtonText = (): string => {
    if (driverStatus === 'offline') {
      return 'GO';
    } else if (driverStatus === 'deactivating') {
      return 'OFF';
    } else {
      return 'OFF';
    }
  };

  const getGoButtonColor = (): string => {
    if (driverStatus === 'offline') {
      return '#007AFF'; // Blue
    } else {
      return '#FF3B30'; // Red
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      
      {/* Home Content with GO Button */}
      <View style={styles.homeContainer}>
        {/* GO Button - Positioned above bottom nav */}
        <View style={styles.goButtonContainer}>
          <TouchableOpacity
            style={[
              styles.goButton,
              {
                width: goButtonSize,
                height: goButtonSize,
                borderRadius: goButtonSize / 2,
                backgroundColor: getGoButtonColor(),
              }
            ]}
            onPress={handleGoPress}
            activeOpacity={0.8}>
            <Text style={[styles.goButtonText, { fontSize: goButtonFontSize }]}>
              {getGoButtonText()}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider above bottom nav */}
      <View style={styles.divider} />

      <BottomNav 
        statusText={getStatusText()}
        statusColor={getStatusColor()}
        onLeftIconPress={handleLeftIconPress}
        onRightIconPress={handleRightIconPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFDF7',
  },
  homeContainer: {
    flex: 1,
  },
  goButtonContainer: {
    position: 'absolute',
    bottom: width * 0.1, // Position closer to bottom nav
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  goButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    letterSpacing: 1,
  },
  divider: {
    position: 'absolute',
    bottom: width * 0.12, // Position above bottom nav
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
});
