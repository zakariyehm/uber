import { BottomSheet } from '@/components/bottom-sheet';
import { AppColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height } = Dimensions.get('window');

interface RideOption {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  travelTime: string;
  distance: string;
  color: string;
}

interface BajaajOption {
  id: string;
  name: string;
  icon: 'motorbike' | 'basket';
  travelTime: string;
  distance: string;
}

const rideOptions: RideOption[] = [
  {
    id: '1',
    name: 'Economy',
    icon: 'airplane-outline',
    travelTime: '10 hours 20 mins',
    distance: '10 km',
    color: '#FFFFFF',
  },
  {
    id: '2',
    name: 'Premium',
    icon: 'airplane',
    travelTime: '10 hours 20 mins',
    distance: '10 km',
    color: '#FFFFFF',
  },
  {
    id: '3',
    name: 'Luxury',
    icon: 'airplane',
    travelTime: '10 hours 20 mins',
    distance: '10 km',
    color: '#000000',
  },
];

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

function calculateCarPrice(distance: string, carType: string): string {
  // Extract number from distance string (e.g., "10 km" -> 10)
  const km = parseFloat(distance.replace(' km', ''));
  // Calculate price based on car type
  let pricePerKm = 0.5; // Default: Economy
  if (carType === 'Premium') {
    pricePerKm = 0.6;
  } else if (carType === 'Luxury') {
    pricePerKm = 0.7;
  }
  const price = km * pricePerKm;
  return `$${price.toFixed(2)}`;
}

function calculateBajaajPrice(distance: string, isPremium: boolean): string {
  // Extract number from distance string (e.g., "0.25 km" -> 0.25)
  const km = parseFloat(distance.replace(' km', ''));
  // Calculate price: Regular = $0.25/km, Premium = $0.3/km
  const pricePerKm = isPremium ? 0.3 : 0.25;
  const price = km * pricePerKm;
  return `$${price.toFixed(2)}`;
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const cardHeight = height * 0.3; // 30% of screen height
  const [showRideSheet, setShowRideSheet] = useState(false);
  const [showBajaajSheet, setShowBajaajSheet] = useState(false);
  const [selectedRide, setSelectedRide] = useState<string | null>(null);
  const [selectedBajaaj, setSelectedBajaaj] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" translucent />
      
      {/* Header */}
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
      {/* 2 Main Options */}
      <View style={styles.row}>
        {/* User Delivery Card */}
        <TouchableOpacity 
          style={[
            styles.card,
            { 
              backgroundColor: isDark ? '#2A2A2A' : '#F2F2F2',
              height: cardHeight,
            }
          ]}
          activeOpacity={0.8}
          onPress={() => setShowRideSheet(true)}>
          <Ionicons 
            name="airplane" 
            size={50} 
            color={colors.text} 
            style={styles.cardImage}
          />
          <Text style={[styles.cardText, { color: colors.text }]}>Delivery State</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.cardButton} 
              activeOpacity={0.7}
              onPress={() => setShowRideSheet(true)}>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>

        {/* Moto Card */}
        <TouchableOpacity 
          style={[
            styles.card,
            { 
              backgroundColor: isDark ? '#2A2A2A' : '#F2F2F2',
              height: cardHeight,
            }
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

      {/* Saved Locations */}
      <View style={styles.savedLocations}>
        {/* Delivery Location */}
        <TouchableOpacity 
          style={[
            styles.locationItem,
            {
              backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
            }
          ]}
          activeOpacity={0.7}
          onPress={() => router.push('/plan-ride')}>
          <View style={[
            styles.locationIconContainer,
            {
              backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0',
            }
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

      {/* Ride Bottom Sheet */}
      <BottomSheet visible={showRideSheet} onClose={() => setShowRideSheet(false)}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Select delivery</Text>
          
          {rideOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.rideOption,
                {
                  backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                  borderColor: selectedRide === option.id ? colors.tint : 'transparent',
                  borderWidth: selectedRide === option.id ? 2 : 0,
                },
              ]}
              onPress={() => setSelectedRide(option.id)}
              activeOpacity={0.7}>
              <View style={styles.rideOptionContent}>
                <View style={[styles.iconContainer, { backgroundColor: option.color === '#000000' ? '#000' : '#E0E0E0' }]}>
                  <Ionicons 
                    name={option.icon} 
                    size={32} 
                    color={option.color === '#000000' ? '#FFF' : '#000'} 
                  />
                </View>
                <View style={styles.rideInfo}>
                  <Text style={[styles.rideName, { color: colors.text }]}>{option.name}</Text>
                  <Text style={[styles.travelTime, { color: colors.icon }]}>{option.travelTime} Travel Time</Text>
                </View>
                <View style={styles.priceContainer}>
                  <Text style={[styles.distance, { color: colors.text }]}>{option.distance}</Text>
                  <Text style={[styles.price, { color: colors.text }]}>{calculateCarPrice(option.distance, option.name)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={[
              styles.chooseButton,
              {
                backgroundColor: selectedRide ? '#000' : '#E0E0E0',
                marginTop: 20,
              },
            ]}
            disabled={!selectedRide}
            activeOpacity={0.8}>
            <Text style={[styles.chooseButtonText, { color: selectedRide ? '#FFF' : '#999' }]}>
              Choose
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheet>

      {/* Moto Bottom Sheet */}
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
            <Text style={[styles.chooseButtonText, { color: selectedBajaaj ? '#FFF' : '#999' }]}>
              Choose
            </Text>
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
  sheetTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
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
