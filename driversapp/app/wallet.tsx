import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function WalletScreen() {
  const insets = useSafeAreaInsets();
  const [isLoading, setIsLoading] = useState(true);
  const [balance, setBalance] = useState<string | null>(null);
  const [tripsCompleted, setTripsCompleted] = useState<number | null>(null);
  const [tipsCanceled, setTipsCanceled] = useState<number | null>(null);
  const [isBalanceVisible, setIsBalanceVisible] = useState(false);

  useEffect(() => {
    // Simulate data loading
    const loadData = async () => {
      setIsLoading(true);
      // Simulate API call
      setTimeout(() => {
        setBalance('854.36');
        setTripsCompleted(32);
        setTipsCanceled(5);
        setIsLoading(false);
      }, 1000);
    };

    loadData();
  }, []);

  const toggleBalanceVisibility = () => {
    setIsBalanceVisible(!isBalanceVisible);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Dark Overlay Box - Centered */}
      <View style={styles.overlayContainer}>
        <View style={styles.darkBox}>
          {/* Top row: Back icon and Eye icon */}
          <View style={styles.topRow}>
            <TouchableOpacity
              onPress={() => router.back()}
              activeOpacity={0.7}
              style={styles.backButton}>
              <Ionicons 
                name="arrow-back" 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={toggleBalanceVisibility}
              activeOpacity={0.7}
              style={styles.eyeButton}>
              <Ionicons 
                name={isBalanceVisible ? 'eye-outline' : 'eye-off-outline'} 
                size={24} 
                color="#FFFFFF" 
              />
            </TouchableOpacity>
          </View>

          {/* Centered Balance */}
          <View style={styles.balanceContainer}>
            <Text style={styles.priceText}>
              {isBalanceVisible && balance ? `$${balance}` : '••••'}
            </Text>
          </View>

          {/* TODAY */}
          <Text style={styles.todayText}>TODAY</Text>

          {/* Trips completed */}
          {tripsCompleted !== null && (
            <Text style={styles.infoText}>{tripsCompleted} trips completed</Text>
          )}

          {/* Tips Canceled */}
          {tipsCanceled !== null && (
            <Text style={styles.infoText}>{tipsCanceled} tips canceled</Text>
          )}

          {/* Withdrawal Balance Button */}
          <TouchableOpacity 
            style={styles.summaryButton}
            activeOpacity={0.8}>
            <Text style={styles.summaryButtonText}>Withdrawal Balance</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Loading Overlay */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#00FF00" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: width * 0.025,
    paddingTop: width * 0.05,
  },
  darkBox: {
    backgroundColor: '#000',
    width: '95%',
    maxWidth: 600,
    paddingHorizontal: width * 0.06,
    paddingVertical: width * 0.06,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: width * 0.04,
  },
  backButton: {
    padding: width * 0.01,
  },
  eyeButton: {
    padding: width * 0.01,
  },
  balanceContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: width * 0.04,
  },
  priceText: {
    fontSize: width * 0.08,
    fontWeight: '700',
    color: '#00FF00',
  },
  todayText: {
    fontSize: width * 0.045,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: width * 0.04,
    marginBottom: width * 0.05,
  },
  infoText: {
    fontSize: width * 0.04,
    fontWeight: '400',
    color: '#FFFFFF',
    marginTop: width * 0.04,
  },
  pointsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: width * 0.03,
  },
  pointsText: {
    fontSize: width * 0.04,
    fontWeight: '400',
    color: '#FFFFFF',
    marginLeft: width * 0.02,
  },
  summaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: width * 0.03,
    paddingHorizontal: width * 0.04,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: width * 0.05,
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
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});

