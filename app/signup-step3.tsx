import { SignupButton } from '@/components/signup-button';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, KeyboardAvoidingView, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

export default function SignupStep3Screen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [pin, setPin] = useState('');
  const [errors, setErrors] = useState<{ pin?: string }>({});

  const firstName = params.firstName as string || '';
  const lastName = params.lastName as string || '';
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
      handleContinue();
    }
  }, [pin]);

  const handleContinue = () => {
    const newErrors: { pin?: string } = {};
    
    if (!pin.trim()) {
      newErrors.pin = 'Verification PIN is required';
    } else if (pin.length !== 4) {
      newErrors.pin = 'PIN must be 4 digits';
    } else if (pin !== verificationPin) {
      newErrors.pin = 'Invalid verification PIN';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      router.push({
        pathname: '/signup-step4',
        params: { 
          firstName, 
          lastName, 
          phone 
        }
      });
    }
  };

  const handlePinChange = (text: string) => {
    // Only allow numbers and limit to 4 digits
    const numericText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setPin(numericText);
    if (errors.pin) setErrors({ ...errors, pin: undefined });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0) }]}>
        <View style={[styles.header, { paddingHorizontal: scaleWidth(20), paddingVertical: scaleHeight(16) }]}>
          <View style={styles.placeholder} />
          <Text style={[styles.headerTitle, { color: colors.text }]}>Verify PIN</Text>
          <View style={styles.placeholder} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
          <ScrollView 
            style={[styles.content, { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(32) }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ 
              paddingBottom: insets.bottom + 100,
              flexGrow: 1,
            }}
            keyboardShouldPersistTaps="handled">
        
        <View style={styles.welcomeContainer}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Enter Verification PIN</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.icon }]}>
            Enter the 4-digit code sent to {phone}
          </Text>
          {/* For testing - show the PIN */}
          <Text style={[styles.testPinText, { color: colors.icon }]}>
            Test PIN: {verificationPin}
          </Text>
          <TouchableOpacity 
            style={styles.editNumberButton}
            onPress={() => {
              router.push({
                pathname: '/signup-step2',
                params: { firstName, lastName }
              });
            }}>
            <Text style={[styles.editNumberText, { color: '#007AFF' }]}>Edit Number</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>Verification PIN</Text>
          <View style={[
            styles.pinContainer,
            {
              borderColor: errors.pin 
                ? '#FF3B30' 
                : (isDark ? '#3A3A3A' : '#E0E0E0'),
            }
          ]}>
            {[0, 1, 2, 3].map((index) => (
              <View
                key={index}
                style={[
                  styles.pinBox,
                  {
                    backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                    borderColor: errors.pin 
                      ? '#FF3B30' 
                      : (isDark ? '#3A3A3A' : '#E0E0E0'),
                  }
                ]}>
                <Text style={[styles.pinText, { color: colors.text }]}>
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
          {errors.pin && (
            <Text style={styles.errorText}>{errors.pin}</Text>
          )}
        </View>

        <SignupButton
          title="Continue"
          onPress={handleContinue}
          disabled={pin.length !== 4}
        />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>

      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={isDark ? '#FFFFFF' : '#000000'} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    width: '100%',
  },
  keyboardView: {
    flex: 1,
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
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
    minHeight: scaleHeight(56),
  },
  backButton: {
    padding: scaleWidth(8),
    minWidth: scaleWidth(40),
    minHeight: scaleWidth(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: scaleFont(20),
    fontWeight: '600',
  },
  placeholder: {
    width: scaleWidth(40),
  },
  content: {
    flex: 1,
  },
  welcomeContainer: {
    marginBottom: scaleHeight(32),
  },
  welcomeTitle: {
    fontSize: scaleFont(28),
    fontWeight: '700',
    marginBottom: scaleHeight(8),
  },
  welcomeSubtitle: {
    fontSize: scaleFont(16),
    fontWeight: '400',
    marginBottom: scaleHeight(8),
  },
  testPinText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    marginTop: scaleHeight(8),
    textAlign: 'center',
  },
  editNumberButton: {
    marginTop: scaleHeight(16),
  },
  editNumberText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: scaleHeight(20),
    alignItems: 'center',
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    marginBottom: scaleHeight(16),
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scaleWidth(12),
    marginBottom: scaleHeight(8),
  },
  pinBox: {
    width: scaleWidth(60),
    height: scaleWidth(60),
    borderRadius: scaleWidth(12),
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pinText: {
    fontSize: scaleFont(24),
    fontWeight: '700',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: 0,
    height: 0,
  },
  errorText: {
    fontSize: scaleFont(12),
    color: '#FF3B30',
    marginTop: scaleHeight(4),
  },
});

