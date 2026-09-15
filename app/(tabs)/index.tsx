import { BottomSheet } from '@/components/bottom-sheet';
import { BANADIR_DISTRICTS, SOMALIA_STATES } from '@/constants/somalia';
import { AppColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface BajaajOption {
  id: string;
  name: string;
  icon: 'motorbike' | 'basket';
  travelTime: string;
  distance: string;
}

const bajaajOptions: BajaajOption[] = [
  {
    id: '1',
    name: 'Moto',
    icon: 'motorbike',
    travelTime: '5 mins',
    distance: '1 km',
  },
  {
    id: '2',
    name: 'Basket',
    icon: 'basket',
    travelTime: '5 mins',
    distance: '1 km',
  },
  {
    id: '3',
    name: 'Moto Premium',
    icon: 'motorbike',
    travelTime: '5 mins',
    distance: '1 km',
  },
];

function calculateBajaajPrice(distance: string, isPremium: boolean): string {
  const km = parseFloat(distance.replace(' km', ''));
  const pricePerKm = isPremium ? 0.3 : 0.25;
  const price = km * pricePerKm;
  return `$${price.toFixed(2)}`;
}

type PickerKind = 'district' | 'state' | null;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const cardHeight = height * 0.3;
  const [showDeliverySheet, setShowDeliverySheet] = useState(false);
  const [showBajaajSheet, setShowBajaajSheet] = useState(false);
  const [selectedBajaaj, setSelectedBajaaj] = useState<string | null>(null);
  const [pickupDistrict, setPickupDistrict] = useState('');
  const [dropoffState, setDropoffState] = useState('');
  const [picker, setPicker] = useState<PickerKind>(null);

  const canContinue = useMemo(
    () => Boolean(pickupDistrict && dropoffState),
    [pickupDistrict, dropoffState]
  );

  const openDeliverySheet = () => setShowDeliverySheet(true);
  const closeDeliverySheet = () => {
    setShowDeliverySheet(false);
    setPicker(null);
  };

  const handleContinueDelivery = () => {
    if (!canContinue) return;
    closeDeliverySheet();
    router.push({
      pathname: '/delivery',
      params: {
        pickup: `${pickupDistrict}, Banadir`,
        destination: dropoffState,
        deliveryMethod: 'Delivery State',
        deliveryTime: 'State delivery',
        deliveryPrice: '',
      },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.logo} numberOfLines={1}>
          RAAC
        </Text>
        <TouchableOpacity
          style={styles.profileIconContainer}
          activeOpacity={0.7}
          onPress={() => router.push('/profile')}>
          <Ionicons name="person" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#2A2A2A' : '#F2F2F2',
                height: cardHeight,
              },
            ]}
            activeOpacity={0.8}
            onPress={openDeliverySheet}>
            <Ionicons name="airplane" size={50} color={colors.text} style={styles.cardImage} />
            <Text style={[styles.cardText, { color: colors.text }]}>Delivery State</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cardButton} activeOpacity={0.7} onPress={openDeliverySheet}>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.card,
              {
                backgroundColor: isDark ? '#2A2A2A' : '#F2F2F2',
                height: cardHeight,
              },
            ]}
            activeOpacity={0.8}
            onPress={() => setShowBajaajSheet(true)}>
            <MaterialCommunityIcons
              name="motorbike"
              size={50}
              color={colors.text}
              style={styles.cardImage}
            />
            <Text style={[styles.cardText, { color: colors.text }]}>Moto</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cardButton}
                activeOpacity={0.7}
                onPress={() => setShowBajaajSheet(true)}>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.savedLocations}>
          <TouchableOpacity
            style={[
              styles.locationItem,
              {
                backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
              },
            ]}
            activeOpacity={0.7}
            onPress={() => router.push('/plan-ride')}>
            <View
              style={[
                styles.locationIconContainer,
                {
                  backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0',
                },
              ]}>
              <Ionicons name="bag" size={24} color={colors.text} />
            </View>
            <View style={styles.locationInfo}>
              <Text style={[styles.locationName, { color: colors.text }]}>Delivery</Text>
              <Text style={[styles.locationAddress, { color: colors.icon }]}>Code Street, London, UK</Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <BottomSheet visible={showDeliverySheet} onClose={closeDeliverySheet} heightRatio={0.78}>
        <View style={styles.sheetHandle} />

        {picker ? (
          <View style={styles.pickerInline}>
            <TouchableOpacity
              style={styles.pickerBackRow}
              onPress={() => setPicker(null)}
              activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
              <Text style={[styles.pickerTitle, { color: colors.text }]}>
                {picker === 'district' ? 'Dooro degmo' : 'Dooro gobol'}
              </Text>
            </TouchableOpacity>
            <ScrollView
              style={styles.pickerList}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled">
              {(picker === 'district' ? BANADIR_DISTRICTS : SOMALIA_STATES).map((item) => {
                const selected = picker === 'district' ? pickupDistrict === item : dropoffState === item;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (picker === 'district') setPickupDistrict(item);
                      else setDropoffState(item);
                      setPicker(null);
                    }}>
                    <Text style={[styles.pickerItemText, { color: colors.text }]}>{item}</Text>
                    {selected ? <Ionicons name="checkmark" size={20} color={AppColors.header} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Delivery State</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.icon }]}>
              Dooro goobta alaabta laga qaadayo iyo goobta la geeynayo.
            </Text>

            <Text style={[styles.fieldLabel, { color: colors.icon }]}>Goobta laga qaadayo</Text>
            <View style={[styles.fixedStateRow, { backgroundColor: isDark ? '#2A2A2A' : '#F3F3F3' }]}>
              <Ionicons name="location" size={18} color={AppColors.header} />
              <View style={styles.fixedStateText}>
                <Text style={[styles.fixedStateTitle, { color: colors.text }]}>Banadir</Text>
                <Text style={[styles.fixedStateHint, { color: colors.icon }]}>State-ka pickup waa Banadir</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[styles.selectField, { backgroundColor: isDark ? '#2A2A2A' : '#F3F3F3' }]}
              activeOpacity={0.7}
              onPress={() => setPicker('district')}>
              <View style={styles.selectFieldBody}>
                <Text style={[styles.selectLabel, { color: colors.icon }]}>Degmada</Text>
                <Text style={[styles.selectValue, { color: pickupDistrict ? colors.text : colors.icon }]}>
                  {pickupDistrict || 'Dooro degmo'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.icon} />
            </TouchableOpacity>

            <Text style={[styles.fieldLabel, { color: colors.icon, marginTop: 18 }]}>Goobta la geeynayo</Text>
            <TouchableOpacity
              style={[styles.selectField, { backgroundColor: isDark ? '#2A2A2A' : '#F3F3F3' }]}
              activeOpacity={0.7}
              onPress={() => setPicker('state')}>
              <View style={styles.selectFieldBody}>
                <Text style={[styles.selectLabel, { color: colors.icon }]}>Gobolka / State</Text>
                <Text style={[styles.selectValue, { color: dropoffState ? colors.text : colors.icon }]}>
                  {dropoffState || 'Dooro gobol'}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color={colors.icon} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.chooseButton,
                {
                  backgroundColor: canContinue ? '#000' : '#E0E0E0',
                  marginTop: 24,
                },
              ]}
              disabled={!canContinue}
              activeOpacity={0.8}
              onPress={handleContinueDelivery}>
              <Text style={[styles.chooseButtonText, { color: canContinue ? '#FFF' : '#999' }]}>Continue</Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </BottomSheet>

      <BottomSheet visible={showBajaajSheet} onClose={() => setShowBajaajSheet(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Select a moto</Text>

          {bajaajOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.rideOption,
                {
                  backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                  borderColor: selectedBajaaj === option.id ? colors.tint : 'transparent',
                  borderWidth: selectedBajaaj === option.id ? 2 : 0,
                },
              ]}
              onPress={() => setSelectedBajaaj(option.id)}
              activeOpacity={0.7}>
              <View style={styles.rideOptionContent}>
                <View style={[styles.iconContainer, { backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0' }]}>
                  {option.icon === 'basket' ? (
                    <Ionicons name="basket" size={32} color={colors.text} />
                  ) : (
                    <MaterialCommunityIcons name="motorbike" size={32} color={colors.text} />
                  )}
                </View>
                <View style={styles.rideInfo}>
                  <Text style={[styles.rideName, { color: colors.text }]}>{option.name}</Text>
                  <Text style={[styles.travelTime, { color: colors.icon }]}>{option.travelTime} Travel Time</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={[styles.distance, { color: colors.text }]}>{option.distance}</Text>
                  <Text style={[styles.price, { color: colors.text }]}>
                    {calculateBajaajPrice(option.distance, option.name.includes('Premium'))}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[
              styles.chooseButton,
              {
                backgroundColor: selectedBajaaj ? '#000' : '#E0E0E0',
                marginTop: 20,
              },
            ]}
            disabled={!selectedBajaaj}
            activeOpacity={0.8}>
            <Text style={[styles.chooseButtonText, { color: selectedBajaaj ? '#FFF' : '#999' }]}>Choose</Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    backgroundColor: AppColors.header,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 16,
  },
  logo: {
    flex: 1,
    fontFamily: 'Poppins-ExtraBold',
    fontSize: 48,
    color: '#000000',
    letterSpacing: 1.5,
    lineHeight: 56,
  },
  profileIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    gap: 16,
  },
  card: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardImage: {
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  buttonContainer: {
    alignItems: 'flex-start',
    marginTop: 'auto',
  },
  cardButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  savedLocations: {
    width: '100%',
    marginTop: 25,
    gap: 12,
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    width: '100%',
  },
  locationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  locationInfo: {
    flex: 1,
  },
  locationName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationAddress: {
    fontSize: 14,
    fontWeight: '400',
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D0D0D0',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fixedStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  fixedStateText: {
    flex: 1,
  },
  fixedStateTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  fixedStateHint: {
    fontSize: 13,
    marginTop: 2,
  },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    minHeight: 64,
  },
  selectFieldBody: {
    flex: 1,
  },
  selectLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  selectValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  pickerInline: {
    flex: 1,
  },
  pickerBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  pickerList: {
    flex: 1,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  pickerItem: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E6E6E6',
    paddingHorizontal: 4,
  },
  pickerItemSelected: {
    backgroundColor: 'rgba(3,193,103,0.08)',
    borderRadius: 8,
  },
  pickerItemText: {
    fontSize: 16,
  },
  rideOption: {
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
  },
  rideOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  rideInfo: {
    flex: 1,
  },
  rideName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  travelTime: {
    fontSize: 14,
    fontWeight: '400',
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  distance: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 2,
  },
  price: {
    fontSize: 18,
    fontWeight: '700',
  },
  chooseButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  chooseButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});
