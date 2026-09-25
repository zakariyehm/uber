import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { fetchMotoMethods, type CatalogMethod } from '@/utils/catalog';
import { etaForMotoOption, fareForMotoOption, type TripQuote } from '@/utils/deliveryRequests';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.5;

interface DeliveryOption {
  id: string;
  name: string;
  icon: 'motorbike' | 'bicycle';
  time: string;
  price: string;
}

function toOption(method: CatalogMethod): DeliveryOption {
  return {
    id: method.id,
    name: method.name,
    icon: method.icon === 'bicycle' || method.vehicleType === 'BICYCLE' ? 'bicycle' : 'motorbike',
    time: method.time,
    price: method.displayPrice || `$${method.price}`,
  };
}

interface DeliveryBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (option: DeliveryOption) => void;
  /** Server distance quote — Standard vs Express use different fares. */
  quote?: TripQuote | null;
  quotedTime?: string | null;
  quotedStats?: string | null;
}

export function DeliveryBottomSheet({
  visible,
  onClose,
  onSelect,
  quote,
  quotedTime,
  quotedStats,
}: DeliveryBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';
  const translateY = useRef(new Animated.Value(SHEET_HEIGHT)).current;
  const pan = useRef(new Animated.ValueXY()).current;
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [loadingMethods, setLoadingMethods] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoadingMethods(true);
    void fetchMotoMethods()
      .then((methods) => {
        if (!cancelled) setDeliveryOptions(methods.map(toOption));
      })
      .finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  useEffect(() => {
    if (visible) {
      pan.setValue({ x: 0, y: 0 });
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 11,
      }).start();
    } else {
      Animated.timing(translateY, {
        toValue: SHEET_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        pan.setValue({ x: 0, y: 0 });
        setSelectedOption(null);
      });
    }
  }, [visible]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dy) > 5 && gestureState.dy > 0;
      },
      onPanResponderGrant: () => {
        pan.setOffset({ x: 0, y: 0 });
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          pan.setValue({ x: 0, y: gestureState.dy });
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (gestureState.dy > 100) {
          onClose();
        } else {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const handleSelect = (option: DeliveryOption) => {
    setSelectedOption(option.id);
  };

  const handleConfirm = () => {
    if (selectedOption) {
      const option = deliveryOptions.find(opt => opt.id === selectedOption);
      if (option) {
        const quoted = fareForMotoOption(quote, option.name);
        onSelect({
          ...option,
          time: etaForMotoOption(quote, option.name) || quotedTime || option.time,
          price: quoted ? `$${quoted}` : option.price,
        });
        onClose();
      }
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  paddingBottom: insets.bottom,
                  transform: [
                    { translateY: Animated.add(translateY, pan.y) },
                  ],
                },
              ]}>
              {/* Title */}
              <Text style={[styles.title, { color: colors.text }]}>
                Choose Moto
              </Text>

              {/* Options List */}
              {loadingMethods ? (
                <Text style={[styles.optionTime, { color: colors.icon, marginBottom: 16 }]}>
                  Loading Moto prices…
                </Text>
              ) : null}
              <ScrollView 
                style={styles.optionsList}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.optionsContent}>
                {deliveryOptions.map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    style={[
                      styles.optionCard,
                      {
                        backgroundColor: isDark ? '#2A2A2A' : '#F8F8F8',
                        borderColor: selectedOption === option.id 
                          ? colors.tint
                          : 'transparent',
                        borderWidth: selectedOption === option.id ? 2 : 0,
                      },
                    ]}
                    onPress={() => handleSelect(option)}
                    activeOpacity={0.7}>
                    <View style={[styles.iconContainer, { backgroundColor: isDark ? '#3A3A3A' : '#E0E0E0' }]}>
                      <MaterialCommunityIcons
                        name={option.icon}
                        size={32}
                        color={colors.text}
                      />
                    </View>
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionName, { color: colors.text }]}>
                        {option.name}
                      </Text>
                      <Text style={[styles.optionTime, { color: colors.icon }]}>
                        {etaForMotoOption(quote, option.name) || quotedTime || option.time}
                        {/\bexpress\b/i.test(option.name) ? ' · +$0.50' : ''}
                        {/\bbicycle\b|\bbaaskiil\b/i.test(option.name) ? ' · $0.30/km' : ''}
                        {quotedStats ? ` · ${quotedStats}` : ''}
                      </Text>
                    </View>
                    <Text style={[styles.optionPrice, { color: colors.text }]}>
                      {fareForMotoOption(quote, option.name)
                        ? `$${fareForMotoOption(quote, option.name)}`
                        : option.price}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Confirm Button */}
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  {
                    backgroundColor: selectedOption ? '#000' : '#E0E0E0',
                    marginTop: 20,
                  },
                ]}
                onPress={handleConfirm}
                disabled={!selectedOption}
                activeOpacity={0.8}>
                <Text style={[
                  styles.confirmButtonText,
                  { 
                    color: selectedOption ? '#FFF' : '#999'
                  }
                ]}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    height: SHEET_HEIGHT,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 24,
  },
  optionsList: {
    flex: 1,
  },
  optionsContent: {
    paddingBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    minHeight: 80,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  optionTime: {
    fontSize: 14,
    fontWeight: '400',
  },
  optionPrice: {
    fontSize: 18,
    fontWeight: '700',
  },
  confirmButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
});

