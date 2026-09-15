import { ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';

import { AppColors } from '@/constants/theme';

type LoadingOverlayProps = {
  visible: boolean;
  /** Optional — only set on important flows. */
  message?: string;
};

/** Full-screen spinner for auth and other blocking flows. */
export function LoadingOverlay({ visible, message }: LoadingOverlayProps) {
  const withLabel = Boolean(message);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={[styles.indicatorWrap, withLabel && styles.indicatorWrapLabeled]}>
          <ActivityIndicator size="large" color={AppColors.accent} />
          {withLabel ? <Text style={styles.message}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: `${AppColors.bg}E6`,
  },
  indicatorWrap: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 0,
    backgroundColor: AppColors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: AppColors.border,
  },
  indicatorWrapLabeled: {
    width: undefined,
    height: undefined,
    minWidth: 160,
    paddingHorizontal: 24,
    paddingVertical: 20,
    gap: 12,
  },
  message: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    textAlign: 'center',
    color: AppColors.text,
  },
});
