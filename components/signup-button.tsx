import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';
import { ActivityIndicator, Dimensions, Platform, StyleSheet, Text, TouchableOpacity } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

interface SignupButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  testID?: string;
}

export function SignupButton({ 
  title, 
  onPress, 
  disabled = false, 
  loading = false,
  testID 
}: SignupButtonProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const isEnabled = !disabled && !loading;
  const backgroundColor = isEnabled ? '#000' : '#E0E0E0';
  const textColor = isEnabled ? '#FFF' : '#999';
  const opacity = isEnabled ? 1 : 0.5;

  return (
    <TouchableOpacity
      testID={testID}
      style={[
        styles.button,
        {
          backgroundColor,
          opacity,
        },
      ]}
      activeOpacity={isEnabled ? 0.8 : 1}
      disabled={!isEnabled}
      onPress={onPress}>
      {loading ? (
        <ActivityIndicator size="small" color="#FFF" />
      ) : (
        <Text
          style={[
            styles.buttonText,
            {
              color: textColor,
            },
          ]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    marginTop: scaleHeight(24),
    minHeight: scaleHeight(52),
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
});

