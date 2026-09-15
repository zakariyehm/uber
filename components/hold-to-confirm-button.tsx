import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  GestureResponderEvent,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

type Props = {
  label: string;
  holdingLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  durationMs?: number;
  color?: string;
  style?: ViewStyle;
};

/** Hold to confirm — Uber-style anti-mis-tap for critical trip steps. */
export function HoldToConfirmButton({
  label,
  holdingLabel = 'Keep holding…',
  onConfirm,
  disabled = false,
  durationMs = 1400,
  color = '#000',
  style,
}: Props) {
  const [holding, setHolding] = useState(false);
  const [busy, setBusy] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animRef = useRef<Animated.CompositeAnimation | null>(null);
  const doneRef = useRef(false);

  const reset = () => {
    animRef.current?.stop();
    animRef.current = null;
    doneRef.current = false;
    setHolding(false);
    Animated.timing(progress, { toValue: 0, duration: 120, useNativeDriver: false }).start();
  };

  const finish = async () => {
    if (doneRef.current || busy || disabled) return;
    doneRef.current = true;
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
      reset();
    }
  };

  const onPressIn = (_e: GestureResponderEvent) => {
    if (disabled || busy) return;
    setHolding(true);
    doneRef.current = false;
    progress.setValue(0);
    animRef.current = Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: false,
    });
    animRef.current.start(({ finished }) => {
      if (finished) void finish();
    });
  };

  const onPressOut = () => {
    if (busy) return;
    reset();
  };

  const widthInterp = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View
      style={[styles.wrap, { backgroundColor: color, opacity: disabled ? 0.45 : 1 }, style]}
      onStartShouldSetResponder={() => true}
      onResponderGrant={onPressIn}
      onResponderRelease={onPressOut}
      onResponderTerminate={onPressOut}>
      <Animated.View style={[styles.fill, { width: widthInterp, backgroundColor: 'rgba(255,255,255,0.22)' }]} />
      <View style={styles.content} pointerEvents="none">
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.label}>{holding ? holdingLabel : label}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 54,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
});
