import { DeliveryBottomSheet } from '@/components/delivery-bottom-sheet';
import { BANADIR_DISTRICTS } from '@/constants/somalia';
import { AppColors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DISTRICTS = [...BANADIR_DISTRICTS];

type SearchTarget = 'pickup' | 'dropoff' | null;

function filterDistricts(query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return DISTRICTS;
  const starts = DISTRICTS.filter((d) => d.toLowerCase().startsWith(q));
  const rest = DISTRICTS.filter((d) => !d.toLowerCase().startsWith(q) && d.toLowerCase().includes(q));
  return [...starts, ...rest];
}

export default function PlanRideScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ rideType?: string }>();

  const [pickupDistrict, setPickupDistrict] = useState('');
  const [pickupNeighborhood, setPickupNeighborhood] = useState('');
  const [dropoffDistrict, setDropoffDistrict] = useState('');
  const [dropoffNeighborhood, setDropoffNeighborhood] = useState('');
  const [searchTarget, setSearchTarget] = useState<SearchTarget>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeliverySheet, setShowDeliverySheet] = useState(false);

  const filteredDistricts = useMemo(() => filterDistricts(searchQuery), [searchQuery]);
  const popupVisible = searchTarget !== null;

  const canContinue =
    Boolean(pickupDistrict && pickupNeighborhood.trim().length >= 2) &&
    Boolean(dropoffDistrict && dropoffNeighborhood.trim().length >= 2);

  const openDistrictPopup = (target: 'pickup' | 'dropoff') => {
    setSearchTarget(target);
    setSearchQuery('');
  };

  const closeDistrictPopup = () => {
    setSearchTarget(null);
    setSearchQuery('');
  };

  const clearDistrict = (target: 'pickup' | 'dropoff') => {
    if (target === 'pickup') {
      setPickupDistrict('');
      setPickupNeighborhood('');
    } else {
      setDropoffDistrict('');
      setDropoffNeighborhood('');
    }
    openDistrictPopup(target);
  };

  const selectDistrict = (district: string) => {
    if (searchTarget === 'pickup') {
      setPickupDistrict(district);
      setPickupNeighborhood('');
    } else if (searchTarget === 'dropoff') {
      setDropoffDistrict(district);
      setDropoffNeighborhood('');
    }
    closeDistrictPopup();
  };

  const formatLocation = (district: string, neighborhood: string) =>
    `${district}, ${neighborhood.trim()}`;

  const handleContinue = () => {
    if (!canContinue) return;
    setShowDeliverySheet(true);
  };

  const handleDeliverySelect = (option: {
    id: string;
    name: string;
    icon: keyof typeof Ionicons.glyphMap;
    time: string;
    price: string;
  }) => {
    router.push({
      pathname: '/delivery',
      params: {
        pickup: formatLocation(pickupDistrict, pickupNeighborhood),
        destination: formatLocation(dropoffDistrict, dropoffNeighborhood),
        deliveryMethod: option.name,
        deliveryTime: option.time,
        deliveryPrice: option.price,
        rideType: params.rideType || '',
      },
    });
  };

  const renderLocationRow = (
    target: 'pickup' | 'dropoff',
    district: string,
    neighborhood: string,
    onNeighborhoodChange: (text: string) => void,
    label: string
  ) => {
    const selected = Boolean(district);

    return (
      <View style={styles.rowBlock}>
        <View style={styles.rowTop}>
          <View style={[styles.dot, target === 'dropoff' && styles.dotSquare]} />
          <Text style={styles.rowLabel}>{label}</Text>
        </View>

        {!selected ? (
          <TouchableOpacity
            style={styles.fieldBtn}
            activeOpacity={0.8}
            onPress={() => openDistrictPopup(target)}>
            <Ionicons name="search" size={18} color="#8A8A8A" />
            <Text style={styles.fieldBtnText}>Raadi degmo...</Text>
            <Ionicons name="chevron-down" size={18} color="#8A8A8A" />
          </TouchableOpacity>
        ) : (
          <View style={styles.selectedBlock}>
            <View style={styles.districtChipRow}>
              <View style={styles.districtChip}>
                <Ionicons name="location" size={14} color="#000" />
                <Text style={styles.districtChipText}>{district}</Text>
              </View>
              <TouchableOpacity onPress={() => clearDistrict(target)} hitSlop={10}>
                <Text style={styles.changeLink}>Change</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.neighborhoodInput}
              placeholder="Geli xaafadda (tusaale Taleex)"
              placeholderTextColor="#9A9A9A"
              value={neighborhood}
              onChangeText={onNeighborhoodChange}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
            />
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" />

      <View style={[styles.content, { paddingBottom: insets.bottom + 12 }]}>
        <Text style={styles.title}>{params.rideType ? `Plan your ${params.rideType}` : 'Plan your ride'}</Text>
        <Text style={styles.subtitle}>Dooro degmo popup-ka, kadib geli xaafadda.</Text>

        <View style={styles.card}>
          {renderLocationRow(
            'pickup',
            pickupDistrict,
            pickupNeighborhood,
            setPickupNeighborhood,
            'Pickup'
          )}
          <View style={styles.divider} />
          {renderLocationRow(
            'dropoff',
            dropoffDistrict,
            dropoffNeighborhood,
            setDropoffNeighborhood,
            'Drop-off'
          )}
        </View>

        <View style={styles.spacer} />

        {canContinue ? (
          <TouchableOpacity style={styles.continueBtn} activeOpacity={0.85} onPress={handleContinue}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal
        visible={popupVisible}
        transparent
        animationType="fade"
        onRequestClose={closeDistrictPopup}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeDistrictPopup} />
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={[styles.modalCardWrap, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.modalCard}>
              <View style={styles.modalHandle} />
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {searchTarget === 'pickup' ? 'Dooro pickup degmo' : 'Dooro drop-off degmo'}
                </Text>
                <TouchableOpacity onPress={closeDistrictPopup} hitSlop={10} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#111" />
                </TouchableOpacity>
              </View>

              <View style={styles.searchBox}>
                <Ionicons name="search" size={18} color="#8A8A8A" />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Qor magaca degmada..."
                  placeholderTextColor="#9A9A9A"
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  autoFocus
                  autoCapitalize="words"
                  autoCorrect={false}
                  clearButtonMode="while-editing"
                />
              </View>

              <FlatList
                data={filteredDistricts}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                  <Text style={styles.emptyText}>Degmo lama helin. Isku day magac kale.</Text>
                }
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.listItem}
                    activeOpacity={0.7}
                    onPress={() => selectDistrict(item)}>
                    <View style={styles.listIcon}>
                      <Ionicons name="location-outline" size={18} color="#111" />
                    </View>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>{item}</Text>
                      <Text style={styles.listMeta}>Banadir · Mogadishu</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#C0C0C0" />
                  </TouchableOpacity>
                )}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

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
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    fontSize: 14,
    lineHeight: 20,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  card: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 16,
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  rowBlock: {
    paddingVertical: 12,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
  dotSquare: {
    borderRadius: 2,
  },
  rowLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A8A8A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldBtn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldBtnText: {
    flex: 1,
    fontSize: 15,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  selectedBlock: {
    gap: 10,
  },
  districtChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  districtChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F1F1',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  districtChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
  },
  changeLink: {
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.header,
  },
  neighborhoodInput: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 14,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E6E6E6',
    marginLeft: 18,
  },
  spacer: {
    flex: 1,
  },
  continueBtn: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCardWrap: {
    width: '100%',
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '78%',
    minHeight: '55%',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D8D8',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#F4F4F4',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
    paddingVertical: 10,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ECECEC',
  },
  listIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F2F2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCopy: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  listMeta: {
    marginTop: 2,
    fontSize: 13,
    color: '#8A8A8A',
    fontWeight: '500',
  },
  emptyText: {
    marginTop: 24,
    textAlign: 'center',
    color: '#8A8A8A',
    fontSize: 14,
  },
});
