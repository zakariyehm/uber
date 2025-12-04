import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

export default function SignupStep2Screen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ phone?: string }>({});

  const firstName = params.firstName as string || '';
  const lastName = params.lastName as string || '';

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

  const handleVerify = () => {
    const newErrors: { phone?: string } = {};
    
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    setErrors(newErrors);
    
    if (Object.keys(newErrors).length === 0) {
      // Generate a random 4-digit PIN for verification
      const verificationPin = Math.floor(1000 + Math.random() * 9000).toString();
      
      router.push({
        pathname: '/signup-step3',
        params: { 
          firstName, 
          lastName, 
          phone,
          verificationPin 
        }
      });
    }
  };

  const isFormValid = phone.trim().length > 0;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      
      <View style={[styles.header, { paddingHorizontal: scaleWidth(20), paddingVertical: scaleHeight(16) }]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={scaleFont(24)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sign Up</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={[styles.content, { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(32) }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleHeight(32) }}>
        
        <View style={styles.welcomeContainer}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Enter Phone Number</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.icon }]}>
            We'll send you a verification code
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>Phone Number</Text>
          <View style={[
            styles.inputWrapper,
            {
              backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
              borderColor: errors.phone 
                ? '#FF3B30' 
                : (isDark ? '#3A3A3A' : '#E0E0E0'),
            }
          ]}>
            <Ionicons name="call-outline" size={scaleFont(20)} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Enter phone number"
              placeholderTextColor={colors.icon}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                if (errors.phone) setErrors({ ...errors, phone: undefined });
              }}
              keyboardType="phone-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {errors.phone && (
            <Text style={styles.errorText}>{errors.phone}</Text>
          )}
        </View>

        <TouchableOpacity 
          style={[
            styles.verifyButton,
            {
              backgroundColor: isFormValid ? '#000' : '#E0E0E0',
              opacity: isFormValid ? 1 : 0.5,
            }
          ]}
          activeOpacity={isFormValid ? 0.8 : 1}
          disabled={!isFormValid}
          onPress={handleVerify}>
          <Text style={[
            styles.verifyButtonText,
            {
              color: isFormValid ? '#FFF' : '#999',
            }
          ]}>
            Verify
          </Text>
        </TouchableOpacity>
      </ScrollView>

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
  },
  inputContainer: {
    marginBottom: scaleHeight(20),
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    marginBottom: scaleHeight(8),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(14),
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    minHeight: scaleHeight(50),
  },
  inputIcon: {
    marginRight: scaleWidth(12),
  },
  textInput: {
    flex: 1,
    fontSize: scaleFont(16),
    fontWeight: '400',
  },
  errorText: {
    fontSize: scaleFont(12),
    color: '#FF3B30',
    marginTop: scaleHeight(4),
    marginLeft: scaleWidth(4),
  },
  verifyButton: {
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    marginTop: scaleHeight(24),
    minHeight: scaleHeight(52),
    justifyContent: 'center',
  },
  verifyButtonText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
});

