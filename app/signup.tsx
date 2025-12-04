import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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

export default function SignupScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ 
    name?: string; 
    phone?: string;
    password?: string; 
    confirmPassword?: string;
  }>({});

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

  const validateForm = () => {
    const newErrors: { 
      name?: string; 
      phone?: string;
      password?: string; 
      confirmPassword?: string;
    } = {};
    
    if (!name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^\+?[1-9]\d{1,14}$/.test(phone.replace(/\s/g, ''))) {
      newErrors.phone = 'Please enter a valid phone number';
    }
    
    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    if (!confirmPassword.trim()) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignup = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSigningUp(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSigningUp(false);
      // Navigate to home after successful signup
      router.replace('/(tabs)');
    }, 2000);
  };

  const isFormValid = name && phone && password && confirmPassword;

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      
      {/* Header */}
      <View style={[styles.header, { paddingHorizontal: scaleWidth(20), paddingVertical: scaleHeight(16) }]}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={styles.backButton}>
          <Ionicons name="arrow-back" size={scaleFont(24)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Sign Up</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={[styles.content, { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(32) }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleHeight(32) }}>
        
        {/* Welcome Text */}
        <View style={styles.welcomeContainer}>
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Create Account</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.icon }]}>
            Sign up to get started with Eat
          </Text>
        </View>

        {/* Name Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>Full Name</Text>
          <View style={[
            styles.inputWrapper,
            {
              backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
              borderColor: errors.name 
                ? '#FF3B30' 
                : (isDark ? '#3A3A3A' : '#E0E0E0'),
            }
          ]}>
            <Ionicons name="person-outline" size={scaleFont(20)} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Enter your full name"
              placeholderTextColor={colors.icon}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>
          {errors.name && (
            <Text style={styles.errorText}>{errors.name}</Text>
          )}
        </View>

        {/* Phone Input */}
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

        {/* Password Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>Password</Text>
          <View style={[
            styles.inputWrapper,
            {
              backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
              borderColor: errors.password 
                ? '#FF3B30' 
                : (isDark ? '#3A3A3A' : '#E0E0E0'),
            }
          ]}>
            <Ionicons name="lock-closed-outline" size={scaleFont(20)} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Enter password"
              placeholderTextColor={colors.icon}
              value={password}
              onChangeText={(text) => {
                setPassword(text);
                if (errors.password) setErrors({ ...errors, password: undefined });
              }}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeIcon}>
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={scaleFont(20)} 
                color={colors.icon} 
              />
            </TouchableOpacity>
          </View>
          {errors.password && (
            <Text style={styles.errorText}>{errors.password}</Text>
          )}
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputContainer}>
          <Text style={[styles.inputLabel, { color: colors.icon }]}>Confirm Password</Text>
          <View style={[
            styles.inputWrapper,
            {
              backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
              borderColor: errors.confirmPassword 
                ? '#FF3B30' 
                : (isDark ? '#3A3A3A' : '#E0E0E0'),
            }
          ]}>
            <Ionicons name="lock-closed-outline" size={scaleFont(20)} color={colors.icon} style={styles.inputIcon} />
            <TextInput
              style={[styles.textInput, { color: colors.text }]}
              placeholder="Confirm password"
              placeholderTextColor={colors.icon}
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
              }}
              secureTextEntry={!showConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              style={styles.eyeIcon}>
              <Ionicons 
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                size={scaleFont(20)} 
                color={colors.icon} 
              />
            </TouchableOpacity>
          </View>
          {errors.confirmPassword && (
            <Text style={styles.errorText}>{errors.confirmPassword}</Text>
          )}
        </View>

        {/* Sign Up Button */}
        <TouchableOpacity 
          style={[
            styles.signupButton,
            {
              backgroundColor: isFormValid ? '#000' : '#E0E0E0',
              opacity: isFormValid ? 1 : 0.5,
            }
          ]}
          activeOpacity={isFormValid ? 0.8 : 1}
          disabled={!isFormValid || isSigningUp}
          onPress={handleSignup}>
          {isSigningUp ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={[
              styles.signupButtonText,
              {
                color: isFormValid ? '#FFF' : '#999',
              }
            ]}>
              Sign Up
            </Text>
          )}
        </TouchableOpacity>

        {/* Login Link */}
        <View style={styles.loginContainer}>
          <Text style={[styles.loginText, { color: colors.icon }]}>Already have an account? </Text>
          <TouchableOpacity onPress={() => router.push('/login')}>
            <Text style={[styles.loginLink, { color: '#007AFF' }]}>Login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Loading Overlay */}
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
  eyeIcon: {
    padding: scaleWidth(4),
  },
  errorText: {
    fontSize: scaleFont(12),
    color: '#FF3B30',
    marginTop: scaleHeight(4),
    marginLeft: scaleWidth(4),
  },
  signupButton: {
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    marginTop: scaleHeight(8),
    marginBottom: scaleHeight(24),
    minHeight: scaleHeight(52),
    justifyContent: 'center',
  },
  signupButtonText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    fontSize: scaleFont(14),
    fontWeight: '400',
  },
  loginLink: {
    fontSize: scaleFont(14),
    fontWeight: '600',
  },
});

