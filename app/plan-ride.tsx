import { DeliveryBottomSheet } from '@/components/delivery-bottom-sheet';
import { BANADIR_DISTRICTS } from '@/constants/somalia';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { quoteDelivery, type TripQuote } from '@/utils/deliveryRequests';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
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
const SCREEN_HEIGHT = Dimensions.get('window').height;
const SHEET_HEIGHT = Math.round(SCREEN_HEIGHT * 0.68);

type SearchTarget = 'pickup' | 'dropoff' | null;

export default function PlanRideScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ rideType?: string }>();
  const { user } = useAuth();
  const isStoreAccount = user?.riderKind === 'STORE' && Boolean(user.store?.id);

  const [pickupDistrict, setPickupDistrict] = useState('');
  const [pickupNeighborhood, setPickupNeighborhood] = useState('');
  const [dropoffDistrict, setDropoffDistrict] = useState('');
  const [dropoffNeighborhood, setDropoffNeighborhood] = useState('');
  const [storeBranchAddress, setStoreBranchAddress] = useState('');
  const [storeOrderId, setStoreOrderId] = useState('');
  const [searchTarget, setSearchTarget] = useState<SearchTarget>(null);
  const [highlighted, setHighlighted] = useState<string | null>(null);
  const [showDeliverySheet, setShowDeliverySheet] = useState(false);
  const [quote, setQuote] = useState<TripQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const storeDistrict = useMemo(() => {
    if (!isStoreAccount) return '';
    return (user?.store?.district || '').trim() || 'Banadir';
  }, [isStoreAccount, user?.store?.district]);

  useEffect(() => {
    if (!isStoreAccount) return;
    setPickupDistrict(storeDistrict);
  }, [isStoreAccount, storeDistrict]);

  const popupVisible = searchTarget !== null;

  const canContinue = isStoreAccount
    ? Boolean(
        storeBranchAddress.trim().length >= 2 &&
          storeOrderId.trim().length >= 1 &&
          dropoffDistrict &&
          dropoffNeighborhood.trim().length >= 2
      )
    : Boolean(pickupDistrict && pickupNeighborhood.trim().length >= 2) &&
      Boolean(dropoffDistrict && dropoffNeighborhood.trim().length >= 2);

  const openDistrictPopup = (target: 'pickup' | 'dropoff') => {
    if (isStoreAccount && target === 'pickup') return;
    const current = target === 'pickup' ? pickupDistrict : dropoffDistrict;
    setSearchTarget(target);
    setHighlighted(current || null);
  };

  const closeDistrictPopup = () => {
    setSearchTarget(null);
    setHighlighted(null);
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

  const confirmDistrict = () => {
    if (!highlighted || !searchTarget) return;
    if (searchTarget === 'pickup') {
      setPickupDistrict(highlighted);
      setPickupNeighborhood('');
    } else {
      setDropoffDistrict(highlighted);
      setDropoffNeighborhood('');
    }
    closeDistrictPopup();
  };

  const formatLocation = (district: string, neighborhood: string) =>
    `${district}, ${neighborhood.trim()}`;

  const pickupLabel = isStoreAccount
    ? `${storeDistrict}, ${storeBranchAddress.trim()}`
    : pickupDistrict && pickupNeighborhood.trim()
      ? formatLocation(pickupDistrict, pickupNeighborhood)
      : '';
  const dropoffLabel =
    dropoffDistrict && dropoffNeighborhood.trim()
      ? formatLocation(dropoffDistrict, dropoffNeighborhood)
      : '';

  useEffect(() => {
    if (!canContinue || !pickupLabel || !dropoffLabel) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    void quoteDelivery({ pickupLocation: pickupLabel, destinationLocation: dropoffLabel })
      .then((next) => {
        if (!cancelled) setQuote(next);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      })
      .finally(() => {
        if (!cancelled) setQuoteLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canContinue, pickupLabel, dropoffLabel]);

  const handleContinue = () => {
    if (!canContinue) return;
    setShowDeliverySheet(true);
  };

  const handleDeliverySelect = (option: {
    id: string;
    name: string;
    icon: string;
    time: string;
    price: string;
  }) => {
    const branch = storeBranchAddress.trim();
    const pickup = isStoreAccount
      ? `${storeDistrict}, ${branch}`
      : formatLocation(pickupDistrict, pickupNeighborhood);
    router.push({
      pathname: '/delivery',
      params: {
        pickup,
        destination: formatLocation(dropoffDistrict, dropoffNeighborhood),
        deliveryMethod: option.name,
        deliveryTime: quote?.durationLabel || option.time,
        deliveryPrice: quote ? `$${quote.fare}` : option.price,
        distanceKm: quote ? String(quote.distanceKm) : '',
        durationMinutes: quote ? String(quote.durationMinutes) : '',
        durationLabel: quote?.durationLabel || '',
        fareBreakdown: quote?.breakdown || '',
        rideType: params.rideType || '',
        ...(isStoreAccount
          ? {
              senderKind: 'STORE',
              isStoreAccount: '1',
              storeId: user?.store?.id || '',
              storeName: user?.store?.name || '',
              storeOrderCode: storeOrderId.trim(),
              storeBranchLocation: branch,
            }
          : {}),
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
        <Text style={styles.subtitle}>
          {isStoreAccount
            ? 'Geli branch address iyo order ID, kadib drop-off.'
            : 'Dooro degmo, kadib geli xaafadda.'}
        </Text>

        <View style={styles.card}>
          {isStoreAccount ? (
            <View style={styles.rowBlock}>
              <View style={styles.rowTop}>
                <View style={styles.dot} />
                <Text style={styles.rowLabel}>Pickup</Text>
              </View>
              <View style={styles.selectedBlock}>
                <View style={styles.districtChipRow}>
                  <View style={[styles.districtChip, { flexShrink: 1 }]}>
                    <Ionicons name="storefront" size={14} color="#000" />
                    <Text style={styles.districtChipText} numberOfLines={1}>
                      {user?.store?.name || 'Store'}
                    </Text>
                  </View>
                </View>
                <View style={styles.districtChipRow}>
                  <View style={styles.districtChip}>
                    <Ionicons name="pricetag" size={14} color="#000" />
                    <Text style={styles.districtChipText}>
                      Type ·{' '}
                      {(user?.store?.category || 'OTHER')
                        .toLowerCase()
                        .split('_')
                        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                        .join(' ')}
                    </Text>
                  </View>
                </View>
                <TextInput
                  style={styles.neighborhoodInput}
                  placeholder="Geli branch address *"
                  placeholderTextColor="#9A9A9A"
                  value={storeBranchAddress}
                  onChangeText={setStoreBranchAddress}
                  autoCapitalize="words"
                  autoCorrect={false}
                  returnKeyType="next"
                />
                <TextInput
                  style={styles.neighborhoodInput}
                  placeholder="Order ID *"
                  placeholderTextColor="#9A9A9A"
                  value={storeOrderId}
                  onChangeText={setStoreOrderId}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                />
              </View>
            </View>
          ) : (
            renderLocationRow(
              'pickup',
              pickupDistrict,
              pickupNeighborhood,
              setPickupNeighborhood,
              'Pickup'
            )
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

        {canContinue ? (
          <View style={styles.quoteCard}>
            {quoteLoading && !quote ? (
              <Text style={styles.quoteHint}>Estimating distance and fare…</Text>
            ) : quote ? (
              <>
                <Text style={styles.quoteFare}>${quote.fare}</Text>
                <Text style={styles.quoteMeta}>
                  {quote.distanceKm.toFixed(1)} km · {quote.durationLabel}
                </Text>
                <Text style={styles.quoteHint}>{quote.breakdown}</Text>
              </>
            ) : (
              <Text style={styles.quoteHint}>Fare is $0.25 per km once the trip is estimated.</Text>
            )}
          </View>
        ) : null}

        <View style={styles.spacer} />

        <TouchableOpacity
          style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
          activeOpacity={0.85}
          disabled={!canContinue}
          onPress={handleContinue}>
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={popupVisible}
        transparent
        animationType="slide"
        onRequestClose={closeDistrictPopup}
        statusBarTranslucent>
        <View style={styles.modalRoot}>
          <Pressable style={styles.modalBackdrop} onPress={closeDistrictPopup} />
          <View style={[styles.sheet, { height: SHEET_HEIGHT, paddingBottom: Math.max(insets.bottom, 14) }]}>
            <Text style={styles.sheetTitle}>
              {searchTarget === 'pickup' ? 'Choose pickup district' : 'Choose drop-off district'}
            </Text>

            <FlatList
              data={DISTRICTS}
              keyExtractor={(item) => item}
              showsVerticalScrollIndicator={false}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => {
                const selected = highlighted === item;
                return (
                  <TouchableOpacity
                    style={[styles.optionRow, selected && styles.optionRowSelected]}
                    activeOpacity={0.85}
                    onPress={() => setHighlighted(item)}>
                    <View style={styles.optionIcon}>
                      <Ionicons name="location" size={20} color="#000" />
                    </View>
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionTitle}>{item}</Text>
                      <Text style={styles.optionMeta}>Banadir · Mogadishu</Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={[styles.chooseBtn, !highlighted && styles.chooseBtnDisabled]}
                disabled={!highlighted}
                activeOpacity={0.85}
                onPress={confirmDistrict}>
                <Text style={styles.chooseBtnText}>
                  {highlighted ? `Choose ${highlighted}` : 'Choose a district'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <DeliveryBottomSheet
        visible={showDeliverySheet}
        onClose={() => setShowDeliverySheet(false)}
        onSelect={handleDeliverySelect}
        quotedFare={quote?.fare}
        quotedTime={quote?.durationLabel}
        quotedStats={quote ? `${quote.distanceKm.toFixed(1)} km` : null}
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
  storePickupHint: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
    paddingHorizontal: 2,
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
  quoteCard: {
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: '#F6F7F8',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  quoteFare: {
    fontSize: 28,
    fontWeight: '700',
    color: '#11181C',
    letterSpacing: -0.4,
  },
  quoteMeta: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '600',
    color: '#11181C',
  },
  quoteHint: {
    marginTop: 4,
    fontSize: 13,
    color: '#6B6B6B',
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
  continueBtnDisabled: {
    backgroundColor: '#D0D0D0',
  },
  continueText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },

  // Uber-style bottom sheet
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 18,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -4 },
    elevation: 20,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 72,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: 'transparent',
    marginBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  optionRowSelected: {
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F1F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
  },
  optionMeta: {
    marginTop: 3,
    fontSize: 13,
    color: '#6B6B6B',
    fontWeight: '500',
  },
  sheetFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E8E8E8',
    paddingTop: 12,
  },
  chooseBtn: {
    minHeight: 54,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseBtnDisabled: {
    backgroundColor: '#D0D0D0',
  },
  chooseBtnText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
