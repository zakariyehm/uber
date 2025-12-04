import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = () => {
    console.log('Login pressed', { phoneNumber, password });
    // Navigate to home after login
    router.replace('/(tabs)');
  };

  const handleSignUpPress = () => {
    router.push('/signup');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
      <StatusBar barStyle="dark-content" translucent />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header - Empty for clean look */}
        <View style={styles.header} />

        {/* Content */}
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
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
                    size={20}
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
                (!phoneNumber || !password) && styles.loginButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!phoneNumber || !password}
              activeOpacity={0.8}>
              <Text style={styles.loginButtonText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUpPress} activeOpacity={0.7}>
            <Text style={styles.footerLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  },
  formSection: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: width * 0.06,
  },
  inputLabel: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#000000',
    marginBottom: width * 0.025,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: width * 0.04,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: width * 0.045,
    color: '#000000',
    paddingVertical: width * 0.035,
  },
  eyeButton: {
    padding: 4,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: width * 0.06,
  },
  forgotPasswordText: {
    fontSize: width * 0.04,
    fontWeight: '500',
    color: '#007AFF',
  },
  loginButton: {
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
  loginButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  loginButtonText: {
    fontSize: width * 0.05,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: width * 0.06,
    paddingTop: width * 0.04,
  },
  footerText: {
    fontSize: width * 0.04,
    fontWeight: '400',
    color: '#666666',
  },
  footerLink: {
    fontSize: width * 0.04,
    fontWeight: '600',
    color: '#000000',
  },
});

