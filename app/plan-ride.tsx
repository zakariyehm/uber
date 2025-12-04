import { DeliveryBottomSheet } from '@/components/delivery-bottom-sheet';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Mogadishu Districts (Banadir)
const mogadishuDistricts = [
  'Abdiaziz',
  'Bondhere',
  'Daynile',
  'Dharkenley',
  'Hamar Jajab',
  'Hamar Weyne',
  'Hodan',
  'Howlwadag',
  'Karaan',
  'Kaxda',
  'Madina',
  'Shangaani',
  'Shibis',
  'Waberi',
  'Wadajir',
  'Wardhiigley',
  'Yaaqshiid',
  'Heliwaa',
  'Garasbaaley',
  'Gubadleey',
  'Gubta',
  'Carafad',
  'Ceelasha Biyaha',
  'Coca Cola',
  'Daarul Salaam',
  'Hamar Jajab',
  'Hamar Weyne',
];

// Responsive helper functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

export default function PlanRideScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [activeInput, setActiveInput] = useState<'pickup' | 'destination' | null>(null);
  const [pickupSuggestions, setPickupSuggestions] = useState<string[]>([]);
  const [destinationSuggestions, setDestinationSuggestions] = useState<string[]>([]);
  const [showDeliverySheet, setShowDeliverySheet] = useState(false);

  const filterDistricts = (query: string): string[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    return mogadishuDistricts.filter(district =>
      district.toLowerCase().startsWith(lowerQuery)
    ).slice(0, 5); // Limit to 5 suggestions
  };

  const isValidDistrict = (location: string): boolean => {
    return mogadishuDistricts.some(district => 
      district.toLowerCase() === location.toLowerCase()
    );
  };

  const handlePickupChange = (text: string) => {
    setPickupLocation(text);
    setPickupSuggestions(filterDistricts(text));
    setActiveInput('pickup');
  };

  const handleDestinationChange = (text: string) => {
    setDestinationLocation(text);
    setDestinationSuggestions(filterDistricts(text));
    setActiveInput('destination');
  };

  const handlePickupBlur = () => {
    // Validate that pickup location is from the districts list
    if (pickupLocation && !isValidDistrict(pickupLocation)) {
      setPickupLocation('');
    }
    setTimeout(() => setActiveInput(null), 200);
  };

  const handleDestinationBlur = () => {
    // Validate that destination location is from the districts list
    if (destinationLocation && !isValidDistrict(destinationLocation)) {
      setDestinationLocation('');
    }
    setTimeout(() => setActiveInput(null), 200);
  };

  const selectSuggestion = (suggestion: string, type: 'pickup' | 'destination') => {
    if (type === 'pickup') {
      setPickupLocation(suggestion);
      setPickupSuggestions([]);
    } else {
      setDestinationLocation(suggestion);
      setDestinationSuggestions([]);
    }
    setActiveInput(null);
  };

  const handleContinue = () => {
    // Validate both locations are from the districts list
    if (pickupLocation && destinationLocation && 
        isValidDistrict(pickupLocation) && 
        isValidDistrict(destinationLocation)) {
      // Open delivery bottom sheet
      setShowDeliverySheet(true);
    }
  };

  const handleDeliverySelect = (option: { id: string; name: string; icon: keyof typeof Ionicons.glyphMap; time: string; price: string }) => {
    // Navigate to delivery screen with location and delivery method data
    router.push({
      pathname: '/delivery',
      params: {
        pickup: pickupLocation,
        destination: destinationLocation,
        deliveryMethod: option.name,
        deliveryTime: option.time,
        deliveryPrice: option.price,
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + scaleHeight(12) }]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={scaleFont(24)} color={isDark ? '#FFFFFF' : '#000000'} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
          Plan your ride
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        
        {/* Location Input Container */}
        <View
          style={[
            styles.locationContainer,
            {
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              borderColor: isDark ? '#333333' : '#E0E0E0',
            },
          ]}>
          {/* Visual Indicator */}
          <View style={styles.locationIndicator}>
            <View style={[styles.pinCircle, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} />
            <View style={[styles.pinLine, { backgroundColor: isDark ? '#666666' : '#CCCCCC' }]} />
            <View style={[styles.pinSquare, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} />
          </View>

          {/* Input Fields */}
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.locationInput,
                  {
                    color: isDark ? '#FFFFFF' : '#000000',
                    borderBottomColor: isDark ? '#333333' : '#E0E0E0',
                  },
                ]}
                placeholder="Enter pickup location"
                placeholderTextColor={isDark ? '#666666' : '#999999'}
                value={pickupLocation}
                onChangeText={handlePickupChange}
                onFocus={() => {
                  setActiveInput('pickup');
                  if (pickupLocation) {
                    setPickupSuggestions(filterDistricts(pickupLocation));
                  }
                }}
                onBlur={handlePickupBlur}
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              {/* Pickup Suggestions - Appears below pickup field */}
              {activeInput === 'pickup' && pickupSuggestions.length > 0 && (
                <View style={[
                  styles.suggestionsList,
                  {
                    backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  }
                ]}>
                  {pickupSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(suggestion, 'pickup')}
                      activeOpacity={0.7}>
                      <Ionicons name="location" size={scaleFont(18)} color={isDark ? '#FFFFFF' : '#000000'} />
                      <Text style={[styles.suggestionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            
            <View style={styles.inputWrapper}>
              <TextInput
                style={[
                  styles.locationInput,
                  styles.locationInputLast,
                  { color: isDark ? '#FFFFFF' : '#000000' },
                ]}
                placeholder="Where to?"
                placeholderTextColor={isDark ? '#666666' : '#999999'}
                value={destinationLocation}
                onChangeText={handleDestinationChange}
                onFocus={() => {
                  setActiveInput('destination');
                  if (destinationLocation) {
                    setDestinationSuggestions(filterDistricts(destinationLocation));
                  }
                }}
                onBlur={handleDestinationBlur}
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              {/* Destination Suggestions - Appears below destination field */}
              {activeInput === 'destination' && destinationSuggestions.length > 0 && (
                <View style={[
                  styles.suggestionsList,
                  {
                    backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  }
                ]}>
                  {destinationSuggestions.map((suggestion, index) => (
                    <TouchableOpacity
                      key={index}
                      style={styles.suggestionItem}
                      onPress={() => selectSuggestion(suggestion, 'destination')}
                      activeOpacity={0.7}>
                      <Ionicons name="location" size={scaleFont(18)} color={isDark ? '#FFFFFF' : '#000000'} />
                      <Text style={[styles.suggestionText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {suggestion}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      {(pickupLocation && destinationLocation && 
        isValidDistrict(pickupLocation) && 
        isValidDistrict(destinationLocation)) && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + scaleHeight(16) }]}>
          <TouchableOpacity
            style={[styles.continueButton, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]}
            onPress={handleContinue}
            activeOpacity={0.8}>
            <Text style={[styles.continueButtonText, { color: isDark ? '#000000' : '#FFFFFF' }]}>
              Continue
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Delivery Bottom Sheet */}
      <DeliveryBottomSheet
        visible={showDeliverySheet}
        onClose={() => setShowDeliverySheet(false)}
        onSelect={handleDeliverySelect}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(16),
    paddingBottom: scaleHeight(16),
  },
  backButton: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
  },
  headerSpacer: {
    width: scaleWidth(40),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(8),
  },
  locationContainer: {
    flexDirection: 'row',
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    padding: scaleWidth(16),
    marginBottom: scaleHeight(24),
    minHeight: scaleHeight(120),
  },
  locationIndicator: {
    width: scaleWidth(24),
    alignItems: 'center',
    marginRight: scaleWidth(12),
  },
  pinCircle: {
    width: scaleWidth(12),
    height: scaleWidth(12),
    borderRadius: scaleWidth(6),
  },
  pinLine: {
    width: 2,
    height: scaleHeight(20),
    marginVertical: scaleHeight(4),
  },
  pinSquare: {
    width: scaleWidth(12),
    height: scaleWidth(12),
    borderRadius: scaleWidth(2),
  },
  inputContainer: {
    flex: 1,
  },
  inputWrapper: {
    position: 'relative',
  },
  locationInput: {
    fontSize: scaleFont(16),
    paddingVertical: scaleHeight(12),
    borderBottomWidth: 1,
  },
  locationInputLast: {
    borderBottomWidth: 0,
    marginTop: scaleHeight(8),
  },
  suggestionsList: {
    width: '100%',
    marginTop: scaleHeight(4),
    maxHeight: scaleHeight(200),
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scaleHeight(12),
    paddingHorizontal: scaleWidth(12),
    gap: scaleWidth(12),
  },
  suggestionText: {
    fontSize: scaleFont(15),
    fontWeight: '400',
  },
  footer: {
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(16),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  continueButton: {
    width: '100%',
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueButtonText: {
    fontSize: scaleFont(16),
    fontWeight: '600',
  },
});

