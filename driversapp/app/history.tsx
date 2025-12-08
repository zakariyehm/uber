import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Dimensions, FlatList, Platform, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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

type TripStatus = 'all' | 'completed' | 'cancelled' | 'skipped' | 'pending';

interface TripItem {
  id: string;
  date: string;
  time: string;
  pickupLocation: string;
  destinationLocation: string;
  amount: string;
  distance: string;
  duration: string;
  status: 'completed' | 'cancelled' | 'skipped' | 'pending';
  customerName?: string;
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<TripStatus>('all');

  // Sample trip data
  const allTrips: TripItem[] = [
    {
      id: '1',
      date: 'Today',
      time: '10:30 AM',
      pickupLocation: 'Hamar Weyne, Mogadishu',
      destinationLocation: 'Hodan, Mogadishu',
      amount: '$15.00',
      distance: '5.2 km',
      duration: '12 min',
      status: 'completed',
      customerName: 'Ahmed Hassan',
    },
    {
      id: '2',
      date: 'Today',
      time: '09:15 AM',
      pickupLocation: 'Waberi, Mogadishu',
      destinationLocation: 'Karaan, Mogadishu',
      amount: '$12.50',
      distance: '4.1 km',
      duration: '10 min',
      status: 'completed',
      customerName: 'Fatima Ali',
    },
    {
      id: '3',
      date: 'Today',
      time: '08:45 AM',
      pickupLocation: 'Shibis, Mogadishu',
      destinationLocation: 'Dayniile, Mogadishu',
      amount: '$0.00',
      distance: '3.8 km',
      duration: '0 min',
      status: 'skipped',
      customerName: 'Omar Mohamed',
    },
    {
      id: '4',
      date: 'Yesterday',
      time: '04:45 PM',
      pickupLocation: 'Hamar Jajab, Mogadishu',
      destinationLocation: 'Wadajir, Mogadishu',
      amount: '$18.00',
      distance: '6.5 km',
      duration: '15 min',
      status: 'completed',
      customerName: 'Khadija Abdi',
    },
    {
      id: '5',
      date: 'Yesterday',
      time: '02:20 PM',
      pickupLocation: 'Bakara Market, Mogadishu',
      destinationLocation: 'Kaxda, Mogadishu',
      amount: '$0.00',
      distance: '0 km',
      duration: '0 min',
      status: 'cancelled',
      customerName: 'Yusuf Ahmed',
    },
    {
      id: '6',
      date: 'Yesterday',
      time: '11:30 AM',
      pickupLocation: 'Howlwadaan, Mogadishu',
      destinationLocation: 'Wardhiigley, Mogadishu',
      amount: '$0.00',
      distance: '4.2 km',
      duration: '0 min',
      status: 'skipped',
      customerName: 'Amina Hassan',
    },
    {
      id: '7',
      date: 'Today',
      time: '11:45 AM',
      pickupLocation: 'Crimicar Lane & Westminster Crescent, Sheffield',
      destinationLocation: 'Street Name & Number, City',
      amount: '$4.29',
      distance: '2.9 mi',
      duration: '18 min',
      status: 'pending',
      customerName: 'John Smith',
    },
    {
      id: '8',
      date: 'Today',
      time: '12:00 PM',
      pickupLocation: 'Downtown, Mogadishu',
      destinationLocation: 'Airport Road, Mogadishu',
      amount: '$20.00',
      distance: '8.5 km',
      duration: '25 min',
      status: 'pending',
      customerName: 'Mohamed Ali',
    },
  ];

  const filterTabs: { id: TripStatus; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'completed', label: 'Completed' },
    { id: 'pending', label: 'Pending' },
    { id: 'cancelled', label: 'Cancelled' },
    { id: 'skipped', label: 'Skipped' },
  ];

  const filteredTrips = selectedFilter === 'all' 
    ? allTrips 
    : allTrips.filter(trip => trip.status === selectedFilter);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#34C759';
      case 'pending':
        return '#007AFF';
      case 'cancelled':
        return '#FF3B30';
      case 'skipped':
        return '#FF9500';
      default:
        return '#8E8E93';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'time-circle';
      case 'cancelled':
        return 'close-circle';
      case 'skipped':
        return 'arrow-forward-circle';
      default:
        return 'help-circle';
    }
  };

  const handleTripPress = (item: TripItem) => {
    // Only allow clicking on completed or pending trips
    if (item.status !== 'completed' && item.status !== 'pending') {
      return;
    }
    
    // Navigate to delivery details with trip data
    router.push({
      pathname: '/delivery-details',
      params: {
        fromHistory: 'true',
        tripId: item.id,
        tripStatus: item.status,
        senderName: item.customerName || '',
        senderPhone: '+1234567890', // You can add phone to TripItem if needed
        senderAddress: item.pickupLocation,
        receiverName: item.customerName || '',
        receiverPhone: '+0987654321', // You can add phone to TripItem if needed
        receiverAddress: item.destinationLocation,
        item: 'Food Order',
        payment: item.amount,
        timeDistance: `${item.duration} (${item.distance})`,
      },
    });
  };

  const renderTripItem = ({ item }: { item: TripItem }) => {
    const isClickable = item.status === 'completed' || item.status === 'pending';
    
    return (
      <TouchableOpacity
        style={[
          styles.tripCard,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            marginBottom: scaleHeight(12),
            opacity: isClickable ? 1 : 0.6,
          }
        ]}
        onPress={() => handleTripPress(item)}
        activeOpacity={isClickable ? 0.7 : 1}
        disabled={!isClickable}>
      {/* Trip Header */}
      <View style={styles.tripHeader}>
        <View style={styles.tripHeaderLeft}>
          <View style={[
            styles.statusIconContainer,
            { backgroundColor: getStatusColor(item.status) + '20' }
          ]}>
            <Ionicons 
              name={getStatusIcon(item.status) as any} 
              size={scaleFont(20)} 
              color={getStatusColor(item.status)} 
            />
          </View>
          <View style={styles.tripInfo}>
            <Text style={[styles.tripDate, { color: colors.text, fontSize: scaleFont(15) }]}>
              {item.date} • {item.time}
            </Text>
            {item.customerName && (
              <Text style={[styles.customerName, { color: colors.icon, fontSize: scaleFont(13) }]}>
                {item.customerName}
              </Text>
            )}
          </View>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getStatusColor(item.status) }
        ]}>
          <Text style={[styles.statusText, { color: '#FFF', fontSize: scaleFont(11) }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>

      {/* Locations */}
      <View style={styles.locationsContainer}>
        <View style={styles.locationRow}>
          <View style={[styles.locationIndicator, { backgroundColor: '#34C759' }]} />
          <View style={styles.locationTextContainer}>
            <Text style={[styles.locationLabel, { color: colors.icon, fontSize: scaleFont(11) }]}>
              PICKUP
            </Text>
            <Text style={[styles.locationText, { color: colors.text, fontSize: scaleFont(15) }]} numberOfLines={1}>
              {item.pickupLocation}
            </Text>
          </View>
        </View>
        
        <View style={styles.locationRow}>
          <View style={[styles.locationIndicator, { backgroundColor: '#FF3B30' }]} />
          <View style={styles.locationTextContainer}>
            <Text style={[styles.locationLabel, { color: colors.icon, fontSize: scaleFont(11) }]}>
              DROP OFF
            </Text>
            <Text style={[styles.locationText, { color: colors.text, fontSize: scaleFont(15) }]} numberOfLines={1}>
              {item.destinationLocation}
            </Text>
          </View>
        </View>
      </View>

      {/* Trip Details */}
      <View style={[
        styles.tripDetails,
        { borderTopColor: isDark ? '#2C2C2E' : '#E5E5EA' }
      ]}>
        <View style={styles.detailItem}>
          <Ionicons name="cash-outline" size={scaleFont(16)} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.text, fontSize: scaleFont(14) }]}>
            {item.amount}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="navigate-outline" size={scaleFont(16)} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.text, fontSize: scaleFont(14) }]}>
            {item.distance}
          </Text>
        </View>
        <View style={styles.detailItem}>
          <Ionicons name="time-outline" size={scaleFont(16)} color={colors.icon} />
          <Text style={[styles.detailText, { color: colors.text, fontSize: scaleFont(14) }]}>
            {item.duration}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0) }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} translucent />
      
      {/* Header */}
      <View style={[
        styles.header,
        {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA',
          paddingHorizontal: scaleWidth(20),
          paddingVertical: scaleHeight(16),
        }
      ]}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={scaleFont(24)} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text, fontSize: scaleFont(20) }]}>
          Trip History
        </Text>
        <View style={styles.placeholder} />
      </View>

      {/* Filter Tabs */}
      <View style={[
        styles.filterContainer,
        {
          backgroundColor: isDark ? '#000000' : '#FFFFFF',
          borderBottomColor: isDark ? '#2C2C2E' : '#E5E5EA',
          paddingHorizontal: scaleWidth(20),
          paddingVertical: scaleHeight(12),
        }
      ]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsContainer}>
          {filterTabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.filterTab,
                {
                  backgroundColor: selectedFilter === tab.id 
                    ? (isDark ? '#1C1C1E' : '#000000')
                    : 'transparent',
                  marginRight: scaleWidth(8),
                }
              ]}
              onPress={() => setSelectedFilter(tab.id)}
              activeOpacity={0.7}>
              <Text style={[
                styles.filterTabText,
                {
                  color: selectedFilter === tab.id 
                    ? '#FFFFFF'
                    : colors.icon,
                  fontSize: scaleFont(14),
                }
              ]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      
      {/* Trip List */}
      {filteredTrips.length === 0 ? (
        <View style={[styles.emptyContainer, { paddingTop: scaleHeight(100) }]}>
          <Ionicons name="time-outline" size={scaleFont(64)} color={colors.icon} />
          <Text style={[styles.emptyText, { color: colors.text, fontSize: scaleFont(18), marginTop: scaleHeight(16) }]}>
            No {selectedFilter === 'all' ? 'trips' : selectedFilter} yet
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.icon, fontSize: scaleFont(14), marginTop: scaleHeight(8) }]}>
            {selectedFilter === 'all' 
              ? 'Your trip history will appear here'
              : `Your ${selectedFilter} trips will appear here`}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          renderItem={renderTripItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContainer,
            { paddingHorizontal: scaleWidth(20), paddingTop: scaleHeight(16), paddingBottom: scaleHeight(32) }
          ]}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    padding: scaleWidth(8),
    width: scaleWidth(40),
    height: scaleWidth(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontWeight: '700',
  },
  placeholder: {
    width: scaleWidth(40),
  },
  filterContainer: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  filterTabsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterTab: {
    paddingHorizontal: scaleWidth(16),
    paddingVertical: scaleHeight(8),
    borderRadius: scaleWidth(20),
    minWidth: scaleWidth(80),
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabText: {
    fontWeight: '600',
  },
  listContainer: {
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scaleWidth(40),
  },
  emptyText: {
    fontWeight: '600',
  },
  emptySubtext: {
    fontWeight: '400',
    textAlign: 'center',
  },
  tripCard: {
    borderRadius: scaleWidth(16),
    padding: scaleWidth(16),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(16),
  },
  tripHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIconContainer: {
    width: scaleWidth(40),
    height: scaleWidth(40),
    borderRadius: scaleWidth(20),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scaleWidth(12),
  },
  tripInfo: {
    flex: 1,
  },
  tripDate: {
    fontWeight: '600',
    marginBottom: scaleHeight(2),
  },
  customerName: {
    fontWeight: '400',
  },
  statusBadge: {
    paddingHorizontal: scaleWidth(10),
    paddingVertical: scaleHeight(6),
    borderRadius: scaleWidth(12),
  },
  statusText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  locationsContainer: {
    marginBottom: scaleHeight(16),
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: scaleHeight(12),
  },
  locationIndicator: {
    width: scaleWidth(12),
    height: scaleWidth(12),
    borderRadius: scaleWidth(6),
    marginRight: scaleWidth(12),
    marginTop: scaleHeight(4),
  },
  locationTextContainer: {
    flex: 1,
  },
  locationLabel: {
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: scaleHeight(2),
  },
  locationText: {
    fontWeight: '400',
    lineHeight: scaleHeight(20),
  },
  tripDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: scaleHeight(16),
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scaleWidth(6),
  },
  detailText: {
    fontWeight: '500',
  },
});
