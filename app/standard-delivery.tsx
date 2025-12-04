import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, FlatList, Modal, Platform, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive helper functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size; // Base width: 375 (iPhone X)
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size; // Base height: 812 (iPhone X)
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

const locations = [
  'Abdiaziz',
  'Boondheere',
  'Carafad',
  'Ceelasha Biyaha',
  'Coca Cola (Yaqshid)',
  'Daarul Salaam',
  'Dayniile',
  'Dharkenley',
  'Garasbaaley',
  'Gubadleey',
  'Gubta (Deyniile)',
  'Hodon',
  'Howlwadaan/Rakaarol',
  'Hamar Jajab',
  'Hamar Weyne',
  'Heliwaa',
  'Karaan',
  'Shibis',
  'Shangaani',
  'Wadajir',
  'Waberi',
  'Wardhiigley',
  'Yaaqshiid',
  'Darusalaam',
  'Kaxda',
];

const itemTypes = [
  'Mobile',
  'Document',
  'Electronic',
  'Key',
  'Passport',
  'Others',
];

export default function StandardDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [pickupLocation, setPickupLocation] = useState('');
  const [destinationLocation, setDestinationLocation] = useState('');
  const [referenceId, setReferenceId] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [selectedType, setSelectedType] = useState('');
  
  // Modal picker state
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickerType, setPickerType] = useState<'pickup' | 'destination' | 'type' | null>(null);
  const [tempPickupLocation, setTempPickupLocation] = useState('');
  const [tempDestinationLocation, setTempDestinationLocation] = useState('');
  const [tempSelectedType, setTempSelectedType] = useState('');

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    // Check initial internet connection
    const checkConnection = async () => {
      const netInfo = await NetInfo.fetch();
      setIsConnected(netInfo.isConnected);
      
      // If connected, hide loading after initial delay
      if (netInfo.isConnected) {
        timer = setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } else {
        // If not connected, keep loading visible
        setIsLoading(true);
      }
    };

    checkConnection();

    // Listen for network state changes
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        // When internet is restored, hide loading after a short delay
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          setIsLoading(false);
        }, 500);
      } else {
        // When internet is lost, show loading
        if (timer) clearTimeout(timer);
        setIsLoading(true);
      }
    });

    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  const handleOpenPicker = (type: 'pickup' | 'destination' | 'type') => {
    setPickerType(type);
    if (type === 'pickup') {
      setTempPickupLocation(pickupLocation);
    } else if (type === 'destination') {
      setTempDestinationLocation(destinationLocation);
    } else if (type === 'type') {
      setTempSelectedType(selectedType);
    }
    setShowLocationPicker(true);
  };

  const handlePickerDone = () => {
    if (pickerType === 'pickup') {
      setPickupLocation(tempPickupLocation);
    } else if (pickerType === 'destination') {
      setDestinationLocation(tempDestinationLocation);
    } else if (pickerType === 'type') {
      setSelectedType(tempSelectedType);
    }
    setShowLocationPicker(false);
    setPickerType(null);
  };

  const handlePickerCancel = () => {
    setShowLocationPicker(false);
    setPickerType(null);
  };

  const getPickerData = () => {
    if (pickerType === 'pickup' || pickerType === 'destination') {
      return locations;
    } else if (pickerType === 'type') {
      return itemTypes;
    }
    return [];
  };

  const getSelectedValue = () => {
    if (pickerType === 'pickup') {
      return tempPickupLocation;
    } else if (pickerType === 'destination') {
      return tempDestinationLocation;
    } else if (pickerType === 'type') {
      return tempSelectedType;
    }
    return '';
  };

  const handlePickerValueChange = (value: string) => {
    if (pickerType === 'pickup') {
      setTempPickupLocation(value);
    } else if (pickerType === 'destination') {
      setTempDestinationLocation(value);
    } else if (pickerType === 'type') {
      setTempSelectedType(value);
    }
  };

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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Standard Delivery</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Content */}
      <ScrollView 
        style={[styles.content, { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(20) }]}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scaleHeight(32) }}>
        {/* Location Fields */}
        <View style={styles.locationContainer}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location Details</Text>
          
          {/* Pickup Location */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.icon }]}>Pickup Location</Text>
            <TouchableOpacity
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                  borderColor: isDark ? '#3A3A3A' : '#E0E0E0',
                }
              ]}
              activeOpacity={0.7}
              onPress={() => handleOpenPicker('pickup')}>
              <Ionicons name="location" size={scaleFont(20)} color={colors.icon} style={styles.inputIcon} />
              <Text style={[
                styles.inputText,
                { 
                  color: pickupLocation ? colors.text : colors.icon,
                  flex: 1,
                }
              ]}>
                {pickupLocation || 'Meesha laga qadayo'}
              </Text>
              <Ionicons name="chevron-down" size={scaleFont(20)} color={colors.icon} />
            </TouchableOpacity>
          </View>

          {/* Destination Location */}
          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.icon }]}>Destination Location</Text>
            <TouchableOpacity
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                  borderColor: isDark ? '#3A3A3A' : '#E0E0E0',
                }
              ]}
              activeOpacity={0.7}
              onPress={() => handleOpenPicker('destination')}>
              <Ionicons name="navigate" size={scaleFont(20)} color={colors.icon} style={styles.inputIcon} />
              <Text style={[
                styles.inputText,
                { 
                  color: destinationLocation ? colors.text : colors.icon,
                  flex: 1,
                }
              ]}>
                {destinationLocation || 'Meesha la geynayo'}
              </Text>
              <Ionicons name="chevron-down" size={scaleFont(20)} color={colors.icon} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Receipt Section - Only shows when both locations are selected */}
        {pickupLocation && destinationLocation && (
          <View style={styles.receiptContainer}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Receipt</Text>
            
            {/* Reference ID - Optional */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.icon }]}>
                Reference ID Order <Text style={{ color: colors.icon, fontSize: 12 }}>(Optional)</Text>
              </Text>
              <View style={[
                styles.textInputWrapper,
                {
                  backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                  borderColor: isDark ? '#3A3A3A' : '#E0E0E0',
                }
              ]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Reference ID Order"
                  placeholderTextColor={colors.icon}
                  value={referenceId}
                  onChangeText={setReferenceId}
                />
              </View>
            </View>

            {/* Select Type */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.icon }]}>Select type</Text>
              <TouchableOpacity
                style={[
                  styles.textInputWrapper,
                  {
                    backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                    borderColor: isDark ? '#3A3A3A' : '#E0E0E0',
                  }
                ]}
                activeOpacity={0.7}
                onPress={() => handleOpenPicker('type')}>
                <Text style={[
                  styles.textInput,
                  { 
                    color: selectedType ? colors.text : colors.icon,
                    flex: 1,
                  }
                ]}>
                  {selectedType || 'Select type'}
                </Text>
                <Ionicons name="chevron-down" size={scaleFont(20)} color={colors.icon} />
              </TouchableOpacity>
            </View>

            {/* Recipient Name - Required */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.icon }]}>
                Enter name <Text style={{ color: '#FF3B30', fontSize: 12 }}>*</Text>
              </Text>
              <View style={[
                styles.textInputWrapper,
                {
                  backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                  borderColor: isDark ? '#3A3A3A' : '#E0E0E0',
                }
              ]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Enter name"
                  placeholderTextColor={colors.icon}
                  value={recipientName}
                  onChangeText={setRecipientName}
                />
              </View>
            </View>

            {/* Recipient Number - Required */}
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.icon }]}>
                Enter number <Text style={{ color: '#FF3B30', fontSize: 12 }}>*</Text>
              </Text>
              <View style={[
                styles.textInputWrapper,
                {
                  backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                  borderColor: isDark ? '#3A3A3A' : '#E0E0E0',
                }
              ]}>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="Enter number"
                  placeholderTextColor={colors.icon}
                  value={recipientNumber}
                  onChangeText={setRecipientNumber}
                  keyboardType="phone-pad"
                />
              </View>
            </View>
          </View>
        )}

        {/* Order Button */}
        <TouchableOpacity 
          style={[
            styles.orderButton,
            {
              backgroundColor: pickupLocation && destinationLocation && recipientName && recipientNumber
                ? '#000' 
                : '#E0E0E0',
              opacity: pickupLocation && destinationLocation && recipientName && recipientNumber ? 1 : 0.5,
            }
          ]}
          activeOpacity={pickupLocation && destinationLocation && recipientName && recipientNumber ? 0.8 : 1}
          disabled={!pickupLocation || !destinationLocation || !recipientName || !recipientNumber}
          onPress={() => {
            if (pickupLocation && destinationLocation && recipientName && recipientNumber) {
              // Navigate to checkout screen with order details
              router.push({
                pathname: '/checkout',
                params: {
                  pickupLocation,
                  destinationLocation,
                  referenceId,
                  recipientName,
                  recipientNumber,
                  selectedType,
                }
              });
            }
          }}>
          <Text style={[
            styles.orderButtonText,
            {
              color: pickupLocation && destinationLocation && recipientName && recipientNumber ? '#FFF' : '#999',
            }
          ]}>
            Place Order
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Location/Type Picker Modal */}
      <Modal
        visible={showLocationPicker}
        transparent
        animationType="slide"
        onRequestClose={handlePickerCancel}>
        <TouchableWithoutFeedback onPress={handlePickerCancel}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[
                styles.pickerModalContent,
                {
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  paddingBottom: insets.bottom
                }
              ]}>
                {/* Picker Header */}
                <View style={[
                  styles.pickerHeader,
                  {
                    borderBottomColor: isDark ? '#3A3A3A' : '#E0E0E0',
                  }
                ]}>
                  <TouchableOpacity onPress={handlePickerCancel}>
                    <Text style={[styles.pickerCancelButton, { color: colors.text }]}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={[styles.pickerTitle, { color: colors.text }]}>
                    {pickerType === 'pickup' ? 'Pickup Location' : 
                     pickerType === 'destination' ? 'Destination Location' : 
                     'Select Type'}
                  </Text>
                  <TouchableOpacity onPress={handlePickerDone}>
                    <Text style={[styles.pickerDoneButton, { color: '#007AFF' }]}>Done</Text>
                  </TouchableOpacity>
                </View>

                {/* Scrollable List */}
                <FlatList
                  data={pickerType === 'type' ? itemTypes : locations}
                  keyExtractor={(item) => item}
                  style={styles.listContainer}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => {
                    const isSelected = getSelectedValue() === item;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.listItem,
                          {
                            backgroundColor: isSelected 
                              ? (isDark ? '#E0E0E0' : '#F0F0F0')
                              : 'transparent',
                          }
                        ]}
                        activeOpacity={0.7}
                        onPress={() => handlePickerValueChange(item)}>
                        <Text style={[
                          styles.listItemText,
                          {
                            color: colors.text,
                            fontWeight: isSelected ? '600' : '400',
                          }
                        ]}>
                          {item}
                        </Text>
                        {isSelected && (
                          <Ionicons name="checkmark" size={scaleFont(20)} color="#007AFF" />
                        )}
                      </TouchableOpacity>
                    );
                  }}
                />
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
  locationContainer: {
    marginTop: scaleHeight(24),
  },
  sectionTitle: {
    fontSize: scaleFont(20),
    fontWeight: '600',
    marginBottom: scaleHeight(16),
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
  inputText: {
    flex: 1,
    fontSize: scaleFont(16),
    fontWeight: '400',
  },
  receiptContainer: {
    marginTop: scaleHeight(24),
  },
  textInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(14),
    borderRadius: scaleWidth(12),
    borderWidth: 1,
    minHeight: scaleHeight(50),
  },
  textInput: {
    flex: 1,
    fontSize: scaleFont(16),
    fontWeight: '400',
  },
  pickerTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  orderButton: {
    paddingVertical: scaleHeight(16),
    borderRadius: scaleWidth(12),
    alignItems: 'center',
    marginTop: scaleHeight(24),
    marginBottom: scaleHeight(32),
    minHeight: scaleHeight(52),
  },
  orderButtonText: {
    color: '#FFF',
    fontSize: scaleFont(18),
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModalContent: {
    borderTopLeftRadius: scaleWidth(20),
    borderTopRightRadius: scaleWidth(20),
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(16),
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  pickerCancelButton: {
    fontSize: scaleFont(17),
    fontWeight: '400',
  },
  pickerTitle: {
    fontSize: scaleFont(17),
    fontWeight: '600',
  },
  pickerDoneButton: {
    fontSize: scaleFont(17),
    fontWeight: '600',
  },
  listContainer: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  listContent: {
    paddingHorizontal: scaleWidth(20),
    paddingVertical: scaleHeight(8),
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(16),
    paddingHorizontal: scaleWidth(16),
    borderRadius: scaleWidth(8),
    marginVertical: scaleHeight(2),
  },
  listItemText: {
    fontSize: scaleFont(16),
    flex: 1,
  },
});

