import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { loginDriver } from '@/utils/driverAuth';
import { toUserFriendlyError } from '@/utils/errors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive helper functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async () => {
    if (!phoneNumber.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both phone number and password');
      return;
    }

    setIsLoggingIn(true);
    
    try {
      console.log('[Login] Attempting driver login...');
      const session = await loginDriver(phoneNumber, password);
      await signIn(session.token, session.user);
      console.log('[Login] Driver logged in successfully!');
      
      // Navigate to home after successful login
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[Login] Login error:', error);
      setIsLoggingIn(false);
      
      // Show error alert
      let errorMessage = 'An error occurred during login. Please try again.';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No driver account for this number. Ask Raac operations to issue a login.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid phone number format.';
      } else {
        errorMessage = toUserFriendlyError(error, errorMessage);
      }
      
      Alert.alert('Login Failed', errorMessage, [{ text: 'OK' }]);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent />
      <View style={[
        styles.container, 
        { 
          paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0),
        }
      ]}>
        {/* Content */}
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            
            {/* Brand + Title */}
            <View style={styles.titleSection}>
              <Image
                source={require('@/assets/images/raac-logo.png')}
                style={styles.brandLogo}
                resizeMode="contain"
                accessibilityLabel="RAAC"
              />
              <Text style={styles.title}>Welcome back</Text>
              <Text style={styles.subtitle}>Sign in to continue driving</Text>
            </View>

            {/* Form Section */}
            <View style={styles.formSection}>
              {/* Phone Number Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Phone Number</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your phone number"
                    placeholderTextColor="#999999"
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.inputWrapper}>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your password"
                    placeholderTextColor="#999999"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}>
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={scaleFont(20)}
                      color="#666666"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity 
                style={styles.forgotPasswordContainer}
                onPress={() => router.push('/forgot-password')}>
                <Text style={styles.forgotPasswordText}>Forgot password?</Text>
              </TouchableOpacity>

              {/* Login Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  ((!phoneNumber || !password) || isLoggingIn) && styles.loginButtonDisabled,
                ]}
                onPress={handleLogin}
                disabled={(!phoneNumber || !password) || isLoggingIn}
                activeOpacity={0.8}>
                {isLoggingIn ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.loginButtonText}>Sign in</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        <View style={[
          styles.footer, 
          { 
            paddingBottom: insets.bottom + scaleHeight(16),
            paddingTop: scaleHeight(16),
          }
        ]}>
          <Text style={styles.footerText}>Driver logins are issued by Raac operations</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    width: '100%',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scaleWidth(20),
    paddingTop: scaleHeight(32),
    paddingBottom: scaleHeight(16),
  },
  titleSection: {
    marginBottom: scaleHeight(36),
    alignItems: 'flex-start',
  },
  brandLogo: {
    width: scaleWidth(132),
    height: scaleHeight(52),
    marginBottom: scaleHeight(20),
    tintColor: AppColors.primary,
  },
  title: {
    fontSize: scaleFont(32),
    fontWeight: '700',
    color: '#000000',
    marginBottom: scaleHeight(8),
  },
  subtitle: {
    fontSize: scaleFont(16),
    fontWeight: '400',
    color: '#666666',
  },
  formSection: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: scaleHeight(24),
  },
  inputLabel: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    color: '#000000',
    marginBottom: scaleHeight(8),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: scaleWidth(12),
    backgroundColor: '#FFFFFF',
    paddingHorizontal: scaleWidth(16),
    minHeight: scaleHeight(52),
  },
  input: {
    flex: 1,
    fontSize: scaleFont(16),
    color: '#000000',
    paddingVertical: scaleHeight(14),
  },
  eyeButton: {
    padding: scaleWidth(4),
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: scaleHeight(24),
  },
  forgotPasswordText: {
    fontSize: scaleFont(14),
    fontWeight: '500',
    color: AppColors.primary,
  },
  loginButton: {
    backgroundColor: AppColors.primary,
    borderRadius: scaleWidth(12),
    paddingVertical: scaleHeight(16),
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: scaleHeight(52),
    shadowColor: AppColors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.28,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: '#E0E0E0',
    shadowOpacity: 0,
  },
  loginButtonText: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(20),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E0E0E0',
    backgroundColor: '#FFFFFF',
  },
  footerText: {
    fontSize: scaleFont(14),
    fontWeight: '400',
    color: '#666666',
    textAlign: 'center',
  },
});

