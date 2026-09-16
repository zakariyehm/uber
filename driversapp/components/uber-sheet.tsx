import React from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type UberSheetProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
  maxHeightRatio?: number;
};

/** Uber-style map backdrop + rounded bottom sheet shell. */
export function UberSheet({
  title,
  subtitle,
  children,
  footer,
  style,
  maxHeightRatio = 0.72,
}: UberSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={styles.mapBackdrop}>
        <View style={styles.mapGrid} />
        <View style={styles.mapPin}>
          <View style={styles.mapPinDot} />
        </View>
      </View>

      <View
        style={[
          styles.sheet,
          {
            maxHeight: SCREEN_HEIGHT * maxHeightRatio,
            paddingBottom: Math.max(insets.bottom, 16),
          },
          style,
        ]}>
        <View style={styles.handle} />
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        <View style={styles.body}>{children}</View>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </View>
  );
}

export function UberInfoCard({
  selected = false,
  title,
  meta,
  right,
  children,
}: {
  selected?: boolean;
  title: string;
  meta?: string;
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.card, selected && styles.cardSelected]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          {meta ? <Text style={styles.cardMeta}>{meta}</Text> : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

export function UberPill({
  icon,
  label,
  tone = 'neutral',
}: {
  icon?: React.ReactNode;
  label: string;
  tone?: 'neutral' | 'accent';
}) {
  return (
    <View style={[styles.pill, tone === 'accent' && styles.pillAccent]}>
      {icon}
      <Text style={[styles.pillText, tone === 'accent' && styles.pillTextAccent]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  mapBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#E8EEF2',
  },
  mapGrid: {
    ...StyleSheet.absoluteFill,
    opacity: 0.35,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  mapPin: {
    position: 'absolute',
    top: '28%',
    alignSelf: 'center',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D8D8D8',
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: '#8A8A8A',
    textAlign: 'center',
    fontWeight: '500',
  },
  body: {
    marginTop: 18,
    gap: 12,
  },
  footer: {
    marginTop: 16,
    gap: 10,
  },
  card: {
    borderWidth: 1.5,
    borderColor: '#E5E5E5',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#fff',
  },
  cardSelected: {
    borderColor: '#000',
    borderWidth: 2.5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 13,
    color: '#777',
    fontWeight: '500',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#F2F2F2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  pillAccent: {
    backgroundColor: 'transparent',
    paddingHorizontal: 0,
  },
  pillText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '600',
  },
  pillTextAccent: {
    color: '#276EF1',
  },
});
