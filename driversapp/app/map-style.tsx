import { AppColors } from '@/constants/theme';
import {
  DEFAULT_MAP_STYLE,
  MAP_STYLES,
  MAP_STYLE_ORDER,
  readMapStyle,
  writeMapStyle,
  type MapStyleId,
} from '@/utils/map-style';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const TEXT = '#11181C';

export default function MapStyleScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selected, setSelected] = useState<MapStyleId>(DEFAULT_MAP_STYLE);

  useEffect(() => {
    let cancelled = false;
    void readMapStyle().then((saved) => {
      if (!cancelled) setSelected(saved);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const choose = (id: MapStyleId) => {
    setSelected(id);
    void writeMapStyle(id);
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(
            insets.top,
            Platform.OS === 'ios' ? 0 : StatusBar.currentHeight || 0
          ),
        },
      ]}>
      <StatusBar barStyle="dark-content" translucent />

      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/account'))}
          activeOpacity={0.7}
          hitSlop={10}>
          <Ionicons name="chevron-back" size={28} color={TEXT} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Map type</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}>
        <Text style={styles.intro}>
          Choose how the map looks while you drive. Your choice applies right away and is
          remembered next time you open Raac.
        </Text>

        {MAP_STYLE_ORDER.map((id) => {
          const active = id === selected;
          return (
            <TouchableOpacity
              key={id}
              style={styles.row}
              activeOpacity={0.7}
              onPress={() => choose(id)}>
              <View style={[styles.rowIcon, active && styles.rowIconActive]}>
                <Ionicons
                  name="map-outline"
                  size={20}
                  color={active ? '#FFFFFF' : AppColors.muted}
                />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{MAP_STYLES[id].label}</Text>
                <Text style={styles.rowHint}>{MAP_STYLES[id].hint}</Text>
              </View>
              {active ? (
                <Ionicons name="checkmark" size={22} color={AppColors.primary} />
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    minHeight: 44,
    marginBottom: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  topTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: TEXT,
  },
  content: {
    flex: 1,
  },
  intro: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
    fontSize: 14,
    lineHeight: 20,
    color: AppColors.muted,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E0E0E0',
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  rowIconActive: {
    backgroundColor: AppColors.primary,
  },
  rowText: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: TEXT,
  },
  rowHint: {
    marginTop: 2,
    fontSize: 13,
    color: AppColors.muted,
  },
});
