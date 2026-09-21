import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import NetInfo from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { fetchActiveStores, type CatalogStore } from '@/utils/catalog';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Responsive helper functions
const scaleWidth = (size: number) => (SCREEN_WIDTH / 375) * size;
const scaleHeight = (size: number) => (SCREEN_HEIGHT / 812) * size;
const scaleFont = (size: number) => {
  const scale = SCREEN_WIDTH / 375;
  const newSize = size * scale;
  return Platform.OS === 'ios' ? Math.round(newSize) : Math.round(newSize);
};

/** Digits only, drop leading 252 / 0 so local numbers compare fairly. */
function normalizePhoneDigits(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('252')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

function phonesAreSame(a: string, b: string) {
  const left = normalizePhoneDigits(a);
  const right = normalizePhoneDigits(b);
  return left.length >= 7 && right.length >= 7 && left === right;
}

const itemTypes = [
  'Mobile',
  'Document',
  'Electronic',
  'Key',
  'Passport',
  'Others',
];

type SenderKind = 'PERSONAL' | 'STORE';

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
  const [senderKind, setSenderKind] = useState<SenderKind>('PERSONAL');
  const [receiptInfoId, setReceiptInfoId] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderNumber, setSenderNumber] = useState('');
  const [stores, setStores] = useState<CatalogStore[]>([]);
  const [selectedStore, setSelectedStore] = useState<CatalogStore | null>(null);
  const [storeOrderCode, setStoreOrderCode] = useState('');
  const [storeBranchLocation, setStoreBranchLocation] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientNumber, setRecipientNumber] = useState('');
  const [selectedItem, setSelectedItem] = useState('');
  const [pickupLocation, setPickupLocation] = useState((params.pickup as string) || '');
  const [destinationLocation, setDestinationLocation] = useState((params.destination as string) || '');
  const [deliveryMethod, setDeliveryMethod] = useState((params.deliveryMethod as string) || '');
  const [deliveryTime, setDeliveryTime] = useState((params.deliveryTime as string) || '');
  const [deliveryPrice, setDeliveryPrice] = useState((params.deliveryPrice as string) || '');
  const serviceCategory = (params.serviceCategory as string) || '';

  // Modal state
  const [showItemPicker, setShowItemPicker] = useState(false);
  const [showStorePicker, setShowStorePicker] = useState(false);

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

    const unsubscribe = NetInfo.addEventListener((state) => {
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await fetchActiveStores();
      if (!cancelled) setStores(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectStore = (store: CatalogStore) => {
    setSelectedStore(store);
    setSenderName(store.name);
    if (store.phone?.trim()) setSenderNumber(store.phone.trim());
    setShowStorePicker(false);
  };

  const handleContinue = () => {
    if (!isFormValid()) return;
    if (phonesAreSame(senderNumber, recipientNumber)) {
      Alert.alert(
        'Different numbers required',
        'Sender and recipient must use two different phone numbers. Please enter another number to continue.'
      );
      return;
    }
    router.push({
      pathname: '/checkout',
      params: {
        pickupLocation: pickupLocation,
        destinationLocation: destinationLocation,
        referenceId: senderKind === 'STORE' ? storeOrderCode.trim() : receiptInfoId || '',
        senderKind,
        senderName:
          senderKind === 'STORE'
            ? (selectedStore?.name || senderName).trim()
            : senderName.trim(),
        senderNumber: senderNumber.trim(),
        storeId: senderKind === 'STORE' ? selectedStore?.id || '' : '',
        storeOrderCode: senderKind === 'STORE' ? storeOrderCode.trim() : '',
        storeBranchLocation: senderKind === 'STORE' ? storeBranchLocation.trim() : '',
        recipientName: recipientName.trim(),
        recipientNumber: recipientNumber.trim(),
        selectedType: selectedItem,
        deliveryMethod: deliveryMethod || '',
        deliveryTime: deliveryTime || '',
        deliveryPrice: deliveryPrice || '',
        serviceCategory: serviceCategory || '',
      },
    });
  };

  const numbersConflict = phonesAreSame(senderNumber, recipientNumber);

  const isFormValid = () => {
    const senderOk =
      senderKind === 'STORE'
        ? Boolean(
            selectedStore?.id &&
              storeOrderCode.trim().length > 0 &&
              storeBranchLocation.trim().length > 0 &&
              senderNumber.trim().length > 0
          )
        : senderName.trim().length > 0 && senderNumber.trim().length > 0;

    return (
      senderOk &&
      recipientName.trim().length > 0 &&
      recipientNumber.trim().length > 0 &&
      !numbersConflict &&
      selectedItem &&
      pickupLocation &&
      destinationLocation
    );
  };

  const segmentBg = isDark ? '#1A1A1A' : '#F0F0F0';
  const segmentActive = isDark ? '#FFFFFF' : '#000000';
  const segmentActiveText = isDark ? '#000000' : '#FFFFFF';
  const segmentIdleText = isDark ? '#AAAAAA' : '#666666';

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
        {deliveryMethod && (
          <View
            style={[
              styles.infoCard,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                marginBottom: scaleHeight(20),
              },
            ]}>
            <View style={styles.infoRow}>
              <Ionicons name="airplane" size={scaleFont(20)} color={isDark ? '#FFFFFF' : '#000000'} />
              <Text style={[styles.infoText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {deliveryMethod} • {deliveryTime} • {deliveryPrice}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>Pickup Location</Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                borderColor: isDark ? '#333333' : '#E0E0E0',
              },
            ]}>
            <Ionicons
              name="location"
              size={scaleFont(20)}
              color={isDark ? '#FFFFFF' : '#000000'}
              style={styles.inputIcon}
            />
            <Text style={[styles.locationText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {pickupLocation || 'Not set'}
            </Text>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: isDark ? '#FFFFFF' : '#000000' }]}>Destination</Text>
          <View
            style={[
              styles.inputWrapper,
              {
                backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                borderColor: isDark ? '#333333' : '#E0E0E0',
              },
            ]}>
            <Ionicons
              name="location"
              size={scaleFont(20)}
              color={isDark ? '#FFFFFF' : '#000000'}
              style={styles.inputIcon}
            />
            <Text style={[styles.locationText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
              {destinationLocation || 'Not set'}
            </Text>
          </View>
        </View>

        <View style={styles.sectionContainer}>
          <Text style={[styles.sectionTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Sender</Text>

          <View style={[styles.segmentRow, { backgroundColor: segmentBg }]}>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                senderKind === 'PERSONAL' && { backgroundColor: segmentActive },
              ]}
              onPress={() => setSenderKind('PERSONAL')}
              activeOpacity={0.85}>
              <Text
                style={[
                  styles.segmentText,
                  { color: senderKind === 'PERSONAL' ? segmentActiveText : segmentIdleText },
                ]}>
                Personal
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                senderKind === 'STORE' && { backgroundColor: segmentActive },
              ]}
              onPress={() => setSenderKind('STORE')}
              activeOpacity={0.85}>
              <Text
                style={[
                  styles.segmentText,
                  { color: senderKind === 'STORE' ? segmentActiveText : segmentIdleText },
                ]}>
                Store
              </Text>
            </TouchableOpacity>
          </View>

          {senderKind === 'PERSONAL' ? (
            <>
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
            </>
          ) : (
            <>
              <Text style={[styles.helperText, { color: isDark ? '#999999' : '#666666' }]}>
                Dooro dukan, geli order ID iyo branch location — waa qasab
              </Text>

              <TouchableOpacity
                style={[
                  styles.input,
                  styles.pickerButton,
                  {
                    backgroundColor: isDark ? '#1A1A1A' : '#F8F8F8',
                    borderColor: isDark ? '#333333' : '#E0E0E0',
                    marginBottom: scaleHeight(12),
                  },
                ]}
                onPress={() => setShowStorePicker(true)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.pickerText,
                    {
                      color: selectedStore
                        ? isDark
                          ? '#FFFFFF'
                          : '#000000'
                        : isDark
                          ? '#666666'
                          : '#999999',
                    },
                  ]}>
                  {selectedStore ? selectedStore.name : 'Select store *'}
                </Text>
                <Ionicons name="chevron-down" size={scaleFont(20)} color={isDark ? '#666666' : '#999999'} />
              </TouchableOpacity>

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
                placeholder="Store order ID *"
                placeholderTextColor={isDark ? '#666666' : '#999999'}
                value={storeOrderCode}
                onChangeText={setStoreOrderCode}
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
                placeholder="Branch location *"
                placeholderTextColor={isDark ? '#666666' : '#999999'}
                value={storeBranchLocation}
                onChangeText={setStoreBranchLocation}
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
                placeholder="Store phone number *"
                placeholderTextColor={isDark ? '#666666' : '#999999'}
                value={senderNumber}
                onChangeText={setSenderNumber}
                keyboardType="phone-pad"
              />
            </>
          )}
        </View>

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
                borderColor: numbersConflict ? '#FF3B30' : isDark ? '#333333' : '#E0E0E0',
                marginBottom: scaleHeight(numbersConflict ? 6 : 12),
              },
            ]}
            placeholder="Enter recipient phone number *"
            placeholderTextColor={isDark ? '#666666' : '#999999'}
            value={recipientNumber}
            onChangeText={setRecipientNumber}
            keyboardType="phone-pad"
          />
          {numbersConflict ? (
            <Text style={[styles.helperText, { color: '#FF3B30', marginBottom: scaleHeight(12) }]}>
              Recipient number must be different from the sender number.
            </Text>
          ) : null}

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

      <View style={[styles.footer, { paddingBottom: insets.bottom + scaleHeight(16) }]}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            {
              backgroundColor: isFormValid()
                ? isDark
                  ? '#FFFFFF'
                  : '#000000'
                : isDark
                  ? '#3A3A3A'
                  : '#E0E0E0',
            },
          ]}
          onPress={handleContinue}
          disabled={!isFormValid()}
          activeOpacity={0.8}>
          <Text
            style={[
              styles.continueButtonText,
              {
                color: isFormValid()
                  ? isDark
                    ? '#000000'
                    : '#FFFFFF'
                  : isDark
                    ? '#666666'
                    : '#999999',
              },
            ]}>
            Continue
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showItemPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowItemPicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowItemPicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  {
                    backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  },
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
                        },
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
                        <Ionicons
                          name="checkmark"
                          size={scaleFont(20)}
                          color={isDark ? '#FFFFFF' : '#000000'}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={showStorePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowStorePicker(false)}>
        <TouchableWithoutFeedback onPress={() => setShowStorePicker(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.modalContent,
                  { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' },
                ]}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Select Store
                </Text>
                <ScrollView>
                  {stores.length === 0 ? (
                    <Text
                      style={[
                        styles.helperText,
                        { color: isDark ? '#999999' : '#666666', marginBottom: 0 },
                      ]}>
                      No active stores yet. Ask admin to register a store.
                    </Text>
                  ) : (
                    stores.map((store, index) => (
                      <TouchableOpacity
                        key={store.id}
                        style={[
                          styles.modalItem,
                          index !== stores.length - 1 && {
                            borderBottomColor: isDark ? '#333333' : '#E0E0E0',
                            borderBottomWidth: 1,
                          },
                        ]}
                        onPress={() => selectStore(store)}
                        activeOpacity={0.7}>
                        <View style={{ flex: 1, paddingRight: scaleWidth(8) }}>
                          <Text
                            style={[
                              styles.modalItemText,
                              { color: isDark ? '#FFFFFF' : '#000000' },
                            ]}>
                            {store.name}
                          </Text>
                          {(store.district || store.address) && (
                            <Text
                              style={{
                                fontSize: scaleFont(12),
                                color: isDark ? '#999999' : '#666666',
                                marginTop: 2,
                              }}>
                              {[store.district, store.address].filter(Boolean).join(' · ')}
                            </Text>
                          )}
                        </View>
                        {selectedStore?.id === store.id && (
                          <Ionicons
                            name="checkmark"
                            size={scaleFont(20)}
                            color={isDark ? '#FFFFFF' : '#000000'}
                          />
                        )}
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
  segmentRow: {
    flexDirection: 'row',
    borderRadius: scaleWidth(10),
    padding: scaleWidth(4),
    marginBottom: scaleHeight(12),
    gap: scaleWidth(4),
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: scaleHeight(10),
    borderRadius: scaleWidth(8),
    alignItems: 'center',
  },
  segmentText: {
    fontSize: scaleFont(14),
    fontWeight: '600',
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
