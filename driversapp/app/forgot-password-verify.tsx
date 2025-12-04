import NetInfo from '@react-native-community/netinfo';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

export default function ForgotPasswordVerifyScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);

  const phone = params.phone as string || '';
  const verificationPin = params.verificationPin as string || '';

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const checkConnection = async () => {
      const netInfo = await NetInfo.fetch();
      setIsConnected(netInfo.isConnected);
      
      if (netInfo.isConnected) {
        timer = setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } else {
        setIsLoading(true);
      }
    };

    checkConnection();

    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } else {
        if (timer) clearTimeout(timer);
        setIsLoading(true);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Auto-navigate when 4 digits are entered
    if (pin.length === 4) {
      handleVerify();
    }
  }, [pin]);

  const handleVerify = () => {
    const newError = '';
    
    if (!pin.trim()) {
      setError('Verification PIN is required');
      return;
    }

    if (pin.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    if (pin !== verificationPin) {
      setError('Invalid verification PIN');
      return;
    }

    setError(newError);
    
    // Navigate to reset password screen
    router.push({
      pathname: '/forgot-password-reset',
      params: {
        phone,
      },
    });
  };

  const handlePinChange = (text: string) => {
    // Only allow numbers and limit to 4 digits
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numericText);
    if (error) setError('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <StatusBar barStyle="dark-content" translucent />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header} />

        {/* Content */}
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Verify PIN</Text>
            <Text style={styles.subtitle}>
              Enter the 4-digit code sent to {phone}
            </Text>
            {/* For testing - show the PIN */}
            <Text style={styles.testPinText}>
              Test PIN: {verificationPin}
            </Text>
          </View>

          {/* PIN Input Section */}
          <View style={styles.pinSection}>
            <View style={styles.pinContainer}>
              {[0, 1, 2, 3].map((index) => (
                <View
                  key={index}
                  style={[
                    styles.pinBox,
                    error && styles.pinBoxError,
                  ]}>
                  <Text style={styles.pinText}>
                    {pin[index] || ''}
                  </Text>
                </View>
              ))}
            </View>
            <TextInput
              style={styles.hiddenInput}
              value={pin}
              onChangeText={handlePinChange}
              keyboardType="number-pad"
              maxLength={4}
              autoFocus
            />
            {error && <Text style={styles.errorText}>{error}</Text>}
          </View>

          {/* Verify Button */}
          <TouchableOpacity
            style={[
              styles.verifyButton,
              pin.length !== 4 && styles.verifyButtonDisabled,
            ]}
            onPress={handleVerify}
            disabled={pin.length !== 4}
            activeOpacity={0.8}>
            <Text style={styles.verifyButtonText}>Verify</Text>
          </TouchableOpacity>
        </View>

        {/* Loading Overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#000000" />
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: width * 0.05,
    paddingVertical: width * 0.04,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: width * 0.06,
  },
  titleSection: {
    marginTop: width * 0.08,
    marginBottom: width * 0.1,
    alignItems: 'center',
  },
  title: {
    fontSize: width * 0.08,
    fontWeight: '700',
    color: '#000000',
    marginBottom: width * 0.02,
  },
  subtitle: {
    fontSize: width * 0.045,
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
    lineHeight: width * 0.06,
  },
  testPinText: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#666666',
    marginTop: width * 0.03,
  },
  pinSection: {
    alignItems: 'center',
    marginBottom: width * 0.06,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: width * 0.03,
    marginBottom: width * 0.04,
  },
  pinBox: {
    width: width * 0.15,
    height: width * 0.15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinBoxError: {
    borderColor: '#FF0000',
  },
  pinText: {
    fontSize: width * 0.06,
    fontWeight: '700',
    color: '#000000',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  errorText: {
    fontSize: width * 0.035,
    color: '#FF0000',
    marginTop: width * 0.02,
  },
  verifyButton: {
    backgroundColor: '#000000',
    borderRadius: 8,
    paddingVertical: width * 0.045,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: width * 0.02,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 3.84,
    elevation: 5,
  },
  verifyButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  verifyButtonText: {
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

