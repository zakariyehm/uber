import { DeliveryBottomSheet } from '@/components/delivery-bottom-sheet';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState, useRef, useEffect } from 'react';
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
  const [pickupTextWidth, setPickupTextWidth] = useState(0);
  const [destinationTextWidth, setDestinationTextWidth] = useState(0);
  
  // Refs to track current input values for auto-complete
  const pickupInputRef = useRef<string>('');
  const destinationInputRef = useRef<string>('');
  const autoCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (autoCompleteTimeoutRef.current) {
        clearTimeout(autoCompleteTimeoutRef.current);
      }
    };
  }, []);

  const filterDistricts = (query: string): string[] => {
    if (!query.trim()) return [];
    const lowerQuery = query.toLowerCase();
    
    // Extract district part (before comma or if no comma, use full text)
    const districtPart = query.split(',')[0].trim().toLowerCase();
    
    return mogadishuDistricts.filter(district =>
      district.toLowerCase().startsWith(districtPart)
    ).slice(0, 5); // Limit to 5 suggestions
  };

  // Check if location contains a valid district (at the start, before comma)
  const isValidDistrict = (location: string): boolean => {
    if (!location.trim()) return false;
    
    // Extract district part (before comma or use full text if no comma)
    const districtPart = location.split(',')[0].trim();
    
    return mogadishuDistricts.some(district => 
      district.toLowerCase() === districtPart.toLowerCase()
    );
  };

  // Extract district from location (e.g., "Hodan, Main Street" -> "Hodan")
  const extractDistrict = (location: string): string | null => {
    if (!location.trim()) return null;
    const districtPart = location.split(',')[0].trim();
    const matchedDistrict = mogadishuDistricts.find(district => 
      district.toLowerCase() === districtPart.toLowerCase()
    );
    return matchedDistrict || null;
  };

  const handlePickupChange = (text: string) => {
    setPickupLocation(text);
    pickupInputRef.current = text;
    
    // If there's a comma and text after it (xafad), don't show suggestions
    if (text.includes(',') && text.split(',')[1]?.trim()) {
      setPickupSuggestions([]);
      setActiveInput('pickup');
      return;
    }
    
    // Extract district part for suggestions (before comma)
    const districtPart = text.split(',')[0].trim();
    const suggestions = filterDistricts(districtPart);
    setPickupSuggestions(suggestions);
    setActiveInput('pickup');
    
    // Clear any existing timeout
    if (autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current);
    }
    
    // Auto-complete district: if there's exactly one match and user hasn't typed comma yet
    if (!text.includes(',') && suggestions.length === 1 && districtPart.length >= 2) {
      const match = suggestions[0];
      const lowerText = districtPart.toLowerCase();
      const lowerMatch = match.toLowerCase();
      
      // Only auto-complete if the match is longer than what user typed
      if (lowerMatch.startsWith(lowerText) && lowerMatch !== lowerText) {
        autoCompleteTimeoutRef.current = setTimeout(() => {
          // Only auto-fill if the text hasn't changed and no comma was added
          if (pickupInputRef.current === text && !pickupInputRef.current.includes(',')) {
            setPickupLocation(match);
            setPickupSuggestions([]);
            setActiveInput(null);
          }
        }, 800); // Wait 800ms after user stops typing
      }
    }
  };

  const handleDestinationChange = (text: string) => {
    setDestinationLocation(text);
    destinationInputRef.current = text;
    
    // If there's a comma and text after it (xafad), don't show suggestions
    if (text.includes(',') && text.split(',')[1]?.trim()) {
      setDestinationSuggestions([]);
      setActiveInput('destination');
      return;
    }
    
    // Extract district part for suggestions (before comma)
    const districtPart = text.split(',')[0].trim();
    const suggestions = filterDistricts(districtPart);
    setDestinationSuggestions(suggestions);
    setActiveInput('destination');
    
    // Clear any existing timeout
    if (autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current);
    }
    
    // Auto-complete district: if there's exactly one match and user hasn't typed comma yet
    if (!text.includes(',') && suggestions.length === 1 && districtPart.length >= 2) {
      const match = suggestions[0];
      const lowerText = districtPart.toLowerCase();
      const lowerMatch = match.toLowerCase();
      
      // Only auto-complete if the match is longer than what user typed
      if (lowerMatch.startsWith(lowerText) && lowerMatch !== lowerText) {
        autoCompleteTimeoutRef.current = setTimeout(() => {
          // Only auto-fill if the text hasn't changed and no comma was added
          if (destinationInputRef.current === text && !destinationInputRef.current.includes(',')) {
            setDestinationLocation(match);
            setDestinationSuggestions([]);
            setActiveInput(null);
          }
        }, 800); // Wait 800ms after user stops typing
      }
    }
  };

  const handlePickupBlur = () => {
    // Clear any pending auto-complete timeout
    if (autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current);
    }
    
    // Auto-complete district on blur if there's a close match and no comma
    if (pickupLocation && !pickupLocation.includes(',')) {
      const districtPart = pickupLocation.split(',')[0].trim();
      if (!isValidDistrict(pickupLocation)) {
        const suggestions = filterDistricts(districtPart);
        if (suggestions.length === 1) {
          // Auto-fill the single match
          const match = suggestions[0];
          setPickupLocation(match);
          pickupInputRef.current = match;
          setPickupSuggestions([]);
        } else if (suggestions.length === 0) {
          // Clear if no valid match
          setPickupLocation('');
          pickupInputRef.current = '';
        }
      }
    }
    setTimeout(() => setActiveInput(null), 200);
  };

  const handleDestinationBlur = () => {
    // Clear any pending auto-complete timeout
    if (autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current);
    }
    
    // Auto-complete district on blur if there's a close match and no comma
    if (destinationLocation && !destinationLocation.includes(',')) {
      const districtPart = destinationLocation.split(',')[0].trim();
      if (!isValidDistrict(destinationLocation)) {
        const suggestions = filterDistricts(districtPart);
        if (suggestions.length === 1) {
          // Auto-fill the single match
          const match = suggestions[0];
          setDestinationLocation(match);
          destinationInputRef.current = match;
          setDestinationSuggestions([]);
        } else if (suggestions.length === 0) {
          // Clear if no valid match
          setDestinationLocation('');
          destinationInputRef.current = '';
        }
      }
    }
    setTimeout(() => setActiveInput(null), 200);
  };

  const selectSuggestion = (suggestion: string, type: 'pickup' | 'destination') => {
    // Clear any pending auto-complete timeout
    if (autoCompleteTimeoutRef.current) {
      clearTimeout(autoCompleteTimeoutRef.current);
    }
    
    if (type === 'pickup') {
      // Set the district name with comma (no space), user can continue typing to add address
      const locationWithComma = `${suggestion},`;
      setPickupLocation(locationWithComma);
      pickupInputRef.current = locationWithComma;
      setPickupSuggestions([]);
      // Keep focus so user can add address after district
      setActiveInput('pickup');
    } else {
      // Set the district name with comma (no space), user can continue typing to add address
      const locationWithComma = `${suggestion},`;
      setDestinationLocation(locationWithComma);
      destinationInputRef.current = locationWithComma;
      setDestinationSuggestions([]);
      // Keep focus so user can add address after district
      setActiveInput('destination');
    }
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
              <View style={[
                styles.inputRow,
                {
                  borderBottomWidth: 1,
                  borderBottomColor: isDark ? '#333333' : '#E0E0E0',
                }
              ]}>
                <View style={styles.inputOverlayWrapper}>
                  <TextInput
                    style={[
                      styles.locationInput,
                      styles.locationInputInline,
                      {
                        color: isDark ? '#FFFFFF' : '#000000',
                        zIndex: 10,
                      },
                    ]}
                    placeholder="Enter district (e.g. Hodan, Main Street)"
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
                  {/* Xafada hint - Overlay when district ends with comma or comma + space */}
                  {(pickupLocation.endsWith(',') || pickupLocation.endsWith(', ')) && !pickupLocation.split(',')[1]?.trim() && (
                    <View style={styles.overlayHintContainer}>
                      <Text 
                        style={[
                          styles.overlayTextMeasure,
                          { color: 'transparent' },
                        ]}
                        onLayout={(e) => setPickupTextWidth(e.nativeEvent.layout.width)}
                      >
                        {pickupLocation}
                      </Text>
                      <Text 
                        style={[
                          styles.overlayHint, 
                          { 
                            color: isDark ? '#999999' : '#666666',
                            left: pickupTextWidth,
                          }
                        ]}
                      >
                        xafada
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
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
              <View style={styles.inputRow}>
                <View style={styles.inputOverlayWrapper}>
                  <TextInput
                    style={[
                      styles.locationInput,
                      styles.locationInputLast,
                      styles.locationInputInline,
                      {
                        color: isDark ? '#FFFFFF' : '#000000',
                        zIndex: 10,
                      },
                    ]}
                    placeholder="Enter district (e.g. Hodan, Main Street)"
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
                  {/* Xafada hint - Overlay when district ends with comma or comma + space */}
                  {(destinationLocation.endsWith(',') || destinationLocation.endsWith(', ')) && !destinationLocation.split(',')[1]?.trim() && (
                    <View style={styles.overlayHintContainer}>
                      <Text 
                        style={[
                          styles.overlayTextMeasure,
                          { color: 'transparent' },
                        ]}
                        onLayout={(e) => setDestinationTextWidth(e.nativeEvent.layout.width)}
                      >
                        {destinationLocation}
                      </Text>
                      <Text 
                        style={[
                          styles.overlayHint, 
                          { 
                            color: isDark ? '#999999' : '#666666',
                            left: destinationTextWidth,
                          }
                        ]}
                      >
                        xafada
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              
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
    width: '100%',
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingVertical: scaleHeight(12),
  },
  locationInput: {
    fontSize: scaleFont(16),
    paddingVertical: scaleHeight(12),
    borderBottomWidth: 1,
  },
  locationInputInline: {
    flex: 1,
    borderBottomWidth: 0,
    paddingVertical: 0,
  },
  inputOverlayWrapper: {
    position: 'relative',
    flex: 1,
  },
  overlayHintContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    pointerEvents: 'none',
    zIndex: 1,
  },
  overlayTextMeasure: {
    fontSize: scaleFont(16),
    paddingVertical: 0,
    includeFontPadding: false,
    opacity: 0,
  },
  overlayHint: {
    fontSize: scaleFont(16),
    fontStyle: 'italic',
    marginLeft: scaleWidth(2),
    paddingLeft: 5,
    position: 'absolute',
    includeFontPadding: false,
    zIndex: 2,
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
  hintContainer: {
    marginTop: scaleHeight(4),
    paddingHorizontal: scaleWidth(4),
  },
  hintText: {
    fontSize: scaleFont(13),
    fontStyle: 'italic',
  },
  hintTextInline: {
    fontSize: scaleFont(16),
    fontStyle: 'italic',
    marginLeft: scaleWidth(-2),
  },
  footer: {
    width: '100%',
    paddingHorizontal: scaleWidth(16),
    paddingTop: scaleHeight(16),
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    backgroundColor: 'transparent',
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

