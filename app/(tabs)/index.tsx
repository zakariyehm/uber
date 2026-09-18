import { BottomSheet } from '@/components/bottom-sheet';
import { BANADIR_DISTRICTS } from '@/constants/somalia';
import { AppColors, Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchDeliveryStateMethods, type CatalogMethod } from '@/utils/catalog';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Image,
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

const { height } = Dimensions.get('window');

type PickerKind = 'district' | 'state' | null;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const cardHeight = height * 0.3;
  const [showDeliverySheet, setShowDeliverySheet] = useState(false);
  const [pickupDistrict, setPickupDistrict] = useState('');
  const [pickupNeighborhood, setPickupNeighborhood] = useState('');
  const [dropoffMethod, setDropoffMethod] = useState<CatalogMethod | null>(null);
  const [stateMethods, setStateMethods] = useState<CatalogMethod[]>([]);
  const [picker, setPicker] = useState<PickerKind>(null);

  const canContinue = useMemo(
    () =>
      Boolean(
        pickupDistrict &&
          pickupNeighborhood.trim().length >= 2 &&
          dropoffMethod
      ),
    [pickupDistrict, pickupNeighborhood, dropoffMethod]
  );

  useEffect(() => {
    if (!showDeliverySheet) return;
    let cancelled = false;
    void fetchDeliveryStateMethods().then((methods) => {
      if (cancelled) return;
      setStateMethods(methods);
      setDropoffMethod((current) => {
        if (!current) return current;
        return methods.find((row) => row.id === current.id || row.name === current.name) || null;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [showDeliverySheet]);

  const openDeliverySheet = () => setShowDeliverySheet(true);
  const closeDeliverySheet = () => {
    setShowDeliverySheet(false);
    setPicker(null);
  };

  const handleContinueDelivery = () => {
    if (!canContinue || !dropoffMethod) return;
    closeDeliverySheet();
    router.push({
      pathname: '/delivery',
      params: {
        pickup: `${pickupDistrict}, ${pickupNeighborhood.trim()}`,
        destination: dropoffMethod.name,
        deliveryMethod: dropoffMethod.name,
        deliveryTime: dropoffMethod.time,
        deliveryPrice: dropoffMethod.displayPrice || `$${dropoffMethod.price}`,
      },
    });
  };

  const openPlanRide = () => {
    router.push({
      pathname: '/plan-ride',
      params: { rideType: 'Moto' },
    });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Image
          source={require('@/assets/images/raac-logo.png')}
          style={styles.logo}
          resizeMode="contain"
          accessibilityLabel="RAAC"
        />
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
            onPress={openPlanRide}>
            <MaterialCommunityIcons
              name="motorbike"
              size={50}
              color={colors.text}
              style={styles.cardImage}
            />
            <Text style={[styles.cardText, { color: colors.text }]}>Moto</Text>
            <View style={styles.buttonContainer}>
              <TouchableOpacity style={styles.cardButton} activeOpacity={0.7} onPress={openPlanRide}>
                <Ionicons name="arrow-forward" size={16} color="#FFF" />
              </TouchableOpacity>
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
              {(picker === 'district' ? BANADIR_DISTRICTS : stateMethods.map((row) => row.name)).map((item) => {
                const selected = picker === 'district' ? pickupDistrict === item : dropoffMethod?.name === item;
                const method = picker === 'state' ? stateMethods.find((row) => row.name === item) : null;
                return (
                  <TouchableOpacity
                    key={item}
                    style={[styles.pickerItem, selected && styles.pickerItemSelected]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (picker === 'district') {
                        setPickupDistrict(item);
                        setPickupNeighborhood('');
                      } else if (method) {
                        setDropoffMethod(method);
                      }
                      setPicker(null);
                    }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.pickerItemText, { color: colors.text }]}>{item}</Text>
                      {method ? (
                        <Text style={[styles.fixedStateHint, { color: colors.icon }]}>
                          {method.displayPrice || `$${method.price}`} · {method.time}
                        </Text>
                      ) : null}
                    </View>
                    {selected ? <Ionicons name="checkmark" size={20} color={AppColors.header} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        ) : (
          <KeyboardAvoidingView
            style={styles.pickerInline}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <Text style={[styles.sheetTitle, { color: colors.text }]}>Delivery State</Text>
            <Text style={[styles.sheetSubtitle, { color: colors.icon }]}>
              Dooro degmada, kadib geli xaafadda. Destination-ka waa gobol.
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

            {pickupDistrict ? (
              <View style={[styles.selectField, { backgroundColor: isDark ? '#2A2A2A' : '#F3F3F3', marginTop: 10 }]}>
                <View style={styles.selectFieldBody}>
                  <Text style={[styles.selectLabel, { color: colors.icon }]}>Xaafadda</Text>
                  <TextInput
                    style={[styles.neighborhoodInput, { color: colors.text }]}
                    placeholder="Geli xaafadda (tusaale Taleex)"
                    placeholderTextColor={colors.icon}
                    value={pickupNeighborhood}
                    onChangeText={setPickupNeighborhood}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                  />
                </View>
              </View>
            ) : null}

            <Text style={[styles.fieldLabel, { color: colors.icon, marginTop: 18 }]}>Goobta la geeynayo</Text>
            <TouchableOpacity
              style={[styles.selectField, { backgroundColor: isDark ? '#2A2A2A' : '#F3F3F3' }]}
              activeOpacity={0.7}
              onPress={() => setPicker('state')}>
              <View style={styles.selectFieldBody}>
                <Text style={[styles.selectLabel, { color: colors.icon }]}>Gobolka / State</Text>
                <Text style={[styles.selectValue, { color: dropoffMethod ? colors.text : colors.icon }]}>
                  {dropoffMethod?.name || 'Dooro gobol'}
                </Text>
                {dropoffMethod ? (
                  <Text style={[styles.fixedStateHint, { color: colors.icon, marginTop: 4 }]}>
                    {dropoffMethod.displayPrice || `$${dropoffMethod.price}`} · {dropoffMethod.time}
                  </Text>
                ) : null}
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
          </KeyboardAvoidingView>
        )}
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
    paddingLeft: 8,
    paddingRight: 16,
    paddingBottom: 12,
    minHeight: 64,
  },
  logo: {
    width: 128,
    height: 50,
    marginLeft: 0,
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
  neighborhoodInput: {
    minHeight: 28,
    padding: 0,
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
