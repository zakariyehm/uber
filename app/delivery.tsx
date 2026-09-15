import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Dimensions,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
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

const itemTypes = [
  'Mobile',
  'Document',
  'Electronic',
  'Key',
  'Passport',
  'Others',
];

export default function DeliveryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  
  // Form state
  const [receiptInfoId, setReceiptInfoId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [pickupLocation, setPickupLocation] = useState((params.pickup as string) || '');
  const [destinationLocation, setDestinationLocation] = useState((params.destination as string) || '');
  const [deliveryMethod, setDeliveryMethod] = useState((params.deliveryMethod as string) || '');
  const [deliveryTime, setDeliveryTime] = useState((params.deliveryTime as string) || '');
  const [deliveryPrice, setDeliveryPrice] = useState((params.deliveryPrice as string) || '');
  
  // Modal state
  const [showItemPicker, setShowItemPicker] = useState(false);

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

  const handleContinue = () => {
    if (!isFormValid()) return;
    router.push({
      pathname: '/checkout',
      params: {
        pickupLocation: pickupLocation,
        destinationLocation: destinationLocation,
        referenceId: receiptInfoId || '',
        senderName: senderName.trim(),
        senderNumber: senderNumber.trim(),
        recipientName: recipientName.trim(),
        recipientNumber: recipientNumber.trim(),
        selectedType: selectedItem,
        deliveryMethod: deliveryMethod || '',
        deliveryTime: deliveryTime || '',
        deliveryPrice: deliveryPrice || '',
      },
    });
  };

  const isFormValid = () => {
    return (
      senderName.trim().length > 0 &&
      senderNumber.trim().length > 0 &&
      recipientName.trim().length > 0 &&
      recipientNumber.trim().length > 0 &&
      selectedItem &&
      pickupLocation &&
      destinationLocation
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: isDark ? '#000000' : '#FFFFFF' }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingHorizontal: scaleWidth(20), paddingBottom: scaleHeight(32) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        
        {/* Delivery Method Info */}
        {deliveryMethod && (
          <View style={[
            styles.infoCard,
            {
              backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
              marginBottom: scaleHeight(20),
            }
          ]}>
            <View style={styles.infoRow}>
              <Ionicons name="bicycle" size={scaleFont(20)} color={isDark ? '#FFFFFF' : '#000000'} />
              <Text style={[styles.infoText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {deliveryMethod} • {deliveryTime} • {deliveryPrice}
              </Text>
            </View>
          </View>
        )}

        {/* Pickup Location */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>Pickup Location</Text>
          <View style={[
            styles.inputWrapper,
            {
              backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
              borderColor: isDark ? '#333333' : '#E0E0E0',
            }
          ]}>
            <Ionicons name="location" size={scaleFont(20)} color={isDark ? '#FFFFFF' : '#000000'} style={styles.inputIcon} />
            <Text style={[styles.locationText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {pickupLocation || 'Not set'}
            </Text>
          </View>
        </View>

        {/* Destination Location */}
        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>Destination</Text>
          <View style={[
            styles.inputWrapper,
            {
              backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
              borderColor: isDark ? '#333333' : '#E0E0E0',
            }
          ]}>
            <Ionicons name="location" size={scaleFont(20)} color={isDark ? '#FFFFFF' : '#000000'} style={styles.inputIcon} />
            <Text style={[styles.locationText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {destinationLocation || 'Not set'}
            </Text>
          </View>
        </View>

        {/* Sender Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Sender</Text>
          <Text style={[styles.helperText, { color: isDark ? '#999999' : '#666666' }]}>
            Magaca iyo number-ka waa qasab
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                color: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#333333' : '#E0E0E0',
                marginBottom: scaleHeight(12),
              },
            ]}
            placeholder="Enter sender name *"
            placeholderTextColor={isDark ? '#666666' : '#999999'}
            value={senderName}
            onChangeText={setSenderName}
            autoCapitalize="words"
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                color: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#333333' : '#E0E0E0',
                marginBottom: scaleHeight(12),
              },
            ]}
            placeholder="Enter sender phone number *"
            placeholderTextColor={isDark ? '#666666' : '#999999'}
            value={senderNumber}
            onChangeText={setSenderNumber}
            keyboardType="phone-pad"
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                color: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#333333' : '#E0E0E0',
              },
            ]}
            placeholder="Enter receipt info ID (optional)"
            placeholderTextColor={isDark ? '#666666' : '#999999'}
            value={receiptInfoId}
            onChangeText={setReceiptInfoId}
            keyboardType="default"
          />
        </View>

        {/* Recipient Section */}
        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Recipient</Text>
          <Text style={[styles.helperText, { color: isDark ? '#999999' : '#666666' }]}>
            Magaca iyo number-ka qofka alaabta loo geeynayo waa qasab
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                color: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#333333' : '#E0E0E0',
                marginBottom: scaleHeight(12),
              },
            ]}
            placeholder="Enter recipient name *"
            placeholderTextColor={isDark ? '#666666' : '#999999'}
            value={recipientName}
            onChangeText={setRecipientName}
            autoCapitalize="words"
          />

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                color: isDark ? '#FFFFFF' : '#000000',
                borderColor: isDark ? '#333333' : '#E0E0E0',
                marginBottom: scaleHeight(12),
              },
            ]}
            placeholder="Enter recipient phone number *"
            placeholderTextColor={isDark ? '#666666' : '#999999'}
            value={recipientNumber}
            onChangeText={setRecipientNumber}
            keyboardType="phone-pad"
          />

          <TouchableOpacity
            style={[
              styles.input,
              styles.pickerButton,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                borderColor: isDark ? '#333333' : '#E0E0E0',
              },
            ]}
            onPress={() => setShowItemPicker(true)}
            activeOpacity={0.7}>
            <Text
              style={[
                styles.pickerText,
                {
                  color: selectedItem
                    ? isDark
                      ? '#FFFFFF'
                      : '#000000'
                    : isDark
                      ? '#666666'
                      : '#999999',
                },
              ]}>
              {selectedItem || 'select type *'}
            </Text>
            <Ionicons name="chevron-down" size={scaleFont(20)} color={isDark ? '#666666' : '#999999'} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + scaleHeight(16) }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: isFormValid() 
                ? (isDark ? '#FFFFFF' : '#000000')
                : (isDark ? '#3A3A3A' : '#E0E0E0'),
            }
          ]}
          onPress={handleContinue}
          disabled={!isFormValid()}
          activeOpacity={0.8}>
          <Text style={[
            styles.continueButtonText,
            {
              color: isFormValid()
                ? (isDark ? '#000000' : '#FFFFFF')
                : (isDark ? '#666666' : '#999999')
            }
          ]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      {/* Item Type Picker Modal */}
      <Modal
        visible={showItemPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowItemPicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowItemPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[
                styles.modalContent,
                {
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                }
              ]}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Select Item Type
                </Text>
                <ScrollView>
                  {itemTypes.map((item, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.modalItem,
                        index !== itemTypes.length - 1 && {
                          borderBottomColor: isDark ? '#333333' : '#E0E0E0',
                          borderBottomWidth: 1,
                        }
                      ]}
                      onPress={() => {
                        setSelectedItem(item);
                        setShowItemPicker(false);
                      }}
                      activeOpacity={0.7}>
                      <Text style={[styles.modalItemText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                        {item}
                      </Text>
                      {selectedItem === item && (
                        <Ionicons name="checkmark" size={scaleFont(20)} color={isDark ? '#FFFFFF' : '#000000'} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
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
  infoCard: {
    padding: scaleWidth(16),
    borderRadius: scaleWidth(12),
    marginTop: scaleHeight(8),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(12),
  },
  infoText: {
    fontSize: scaleFont(16),
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: scaleHeight(24),
  },
  sectionTitle: {
    fontSize: scaleFont(18),
    fontWeight: '600',
    marginBottom: scaleHeight(6),
  },
  helperText: {
    fontSize: scaleFont(13),
    marginBottom: scaleHeight(12),
  },
  inputContainer: {
    marginBottom: scaleHeight(20),
  },
  label: {
    fontSize: scaleFont(14),
    fontWeight: '600',
    marginBottom: scaleHeight(8),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(14),
    borderRadius: scaleWidth(8),
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: scaleWidth(12),
  },
  locationText: {
    fontSize: scaleFont(16),
    flex: 1,
  },
  input: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(14),
    borderRadius: scaleWidth(8),
    borderWidth: 1,
    fontSize: scaleFont(16),
  },
  pickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: scaleFont(16),
    flex: 1,
  },
  footer: {
    paddingHorizontal: scaleWidth(20),
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: scaleWidth(12),
    padding: scaleWidth(20),
  },
  modalTitle: {
    fontSize: scaleFont(20),
    fontWeight: '700',
    marginBottom: scaleHeight(20),
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scaleHeight(16),
  },
  modalItemText: {
    fontSize: scaleFont(16),
    fontWeight: '400',
  },
});
