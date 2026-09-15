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

export default function SignupStep4Screen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ 
    password?: string; 
    confirmPassword?: string;
  }>({});

  const firstName = params.firstName as string || '';
  const lastName = params.lastName as string || '';
  const phone = params.phone as string || '';

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

  const handleSignup = async () => {
    const newErrors: { 
      password?: string; 
      confirmPassword?: string;
    } = {};
    
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
    
    if (Object.keys(newErrors).length === 0) {
      setIsSigningUp(true);
      
      // Simulate API call
      setTimeout(() => {
        setIsSigningUp(false);
        // Navigate to home after successful signup
        router.replace('/(tabs)');
      }, 2000);
    }
  };

  const isFormValid = password && confirmPassword;

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
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
          <Text style={[styles.welcomeTitle, { color: colors.text }]}>Set Password</Text>
          <Text style={[styles.welcomeSubtitle, { color: colors.icon }]}>
            Create a secure password for your account
          </Text>
        </View>

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

        <SignupButton
          title="Complete Sign Up"
          onPress={handleSignup}
          disabled={!isFormValid}
          loading={isSigningUp}
        />
          </ScrollView>
        </KeyboardAvoidingView>

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
});

