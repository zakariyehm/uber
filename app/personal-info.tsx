import { LoadingOverlay } from '@/components/ui/loading-overlay';
import { SOMALIA_STATES } from '@/constants/somalia';
import { AppColors } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { completeRiderProfile } from '@/utils/auth';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PersonalInfoScreen() {
  const insets = useSafeAreaInsets();
  const { signIn } = useAuth();
  const params = useLocalSearchParams<{ verificationToken?: string; phone?: string }>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [stateName, setStateName] = useState('');
  const [gender, setGender] = useState<'MALE' | 'FEMALE' | null>(null);
  const [stateOpen, setStateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(
    () => firstName.trim() && lastName.trim() && stateName && gender && params.verificationToken,
    [firstName, lastName, stateName, gender, params.verificationToken]
  );

  const handleSubmit = async () => {
    if (!canSubmit || !gender || !params.verificationToken) return;
    setBusy(true);
    try {
      const result = await completeRiderProfile({
        verificationToken: params.verificationToken,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        state: stateName,
        gender,
      });
      await signIn(result.token, result.user);
    } catch (error: any) {
      Alert.alert('Could not finish signup', error.message || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>What is your name?</Text>
          <Text style={styles.subtitle}>Let us know how to address you, then choose your state and gender.</Text>

          <TextInput
            style={styles.field}
            placeholder="First name"
            placeholderTextColor="#9A9A9A"
            value={firstName}
            onChangeText={setFirstName}
            autoCapitalize="words"
          />
          <TextInput
            style={styles.field}
            placeholder="Last name"
            placeholderTextColor="#9A9A9A"
            value={lastName}
            onChangeText={setLastName}
            autoCapitalize="words"
          />

          <Pressable style={styles.field} onPress={() => setStateOpen(true)}>
            <Text style={stateName ? styles.fieldValue : styles.placeholder}>{stateName || 'State you live in'}</Text>
            <Ionicons name="chevron-down" size={16} color={AppColors.muted} />
          </Pressable>

          <Text style={styles.label}>Gender</Text>
          <View style={styles.genderRow}>
            {(['MALE', 'FEMALE'] as const).map((value) => (
              <Pressable
                key={value}
                style={[styles.genderChip, gender === value && styles.genderChipOn]}
                onPress={() => setGender(value)}>
                <Text style={[styles.genderText, gender === value && styles.genderTextOn]}>
                  {value === 'MALE' ? 'Male' : 'Female'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable
            style={[styles.continue, !canSubmit && styles.continueDisabled]}
            disabled={!canSubmit || busy}
            onPress={handleSubmit}>
            <Text style={[styles.continueText, !canSubmit && styles.continueTextDisabled]}>Continue</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={stateOpen} animationType="slide" transparent>
        <Pressable style={styles.modalBackdrop} onPress={() => setStateOpen(false)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
            <Text style={styles.sheetTitle}>Select state</Text>
            <ScrollView>
              {SOMALIA_STATES.map((item) => (
                <Pressable
                  key={item}
                  style={styles.sheetItem}
                  onPress={() => {
                    setStateName(item);
                    setStateOpen(false);
                  }}>
                  <Text style={styles.sheetItemText}>{item}</Text>
                  {stateName === item ? <Ionicons name="checkmark" size={18} color={AppColors.text} /> : null}
                </Pressable>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      <LoadingOverlay visible={busy} message="Creating account" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: AppColors.bg },
  flex: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8 },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: AppColors.text,
    letterSpacing: -0.6,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 20,
    fontSize: 15,
    lineHeight: 22,
    color: AppColors.muted,
  },
  field: {
    minHeight: 56,
    borderRadius: 12,
    backgroundColor: AppColors.surface,
    paddingHorizontal: 16,
    marginBottom: 12,
    fontSize: 16,
    color: AppColors.text,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: { fontSize: 16, color: AppColors.text },
  placeholder: { fontSize: 16, color: '#9A9A9A' },
  label: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: '600',
    color: AppColors.text,
  },
  genderRow: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  genderChip: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: AppColors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  genderChipOn: { backgroundColor: AppColors.accent },
  genderText: { fontSize: 16, fontWeight: '600', color: AppColors.text },
  genderTextOn: { color: '#fff' },
  continue: {
    backgroundColor: AppColors.accent,
    borderRadius: 10,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  continueDisabled: { backgroundColor: AppColors.disabled },
  continueText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  continueTextDisabled: { color: AppColors.disabledText },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    maxHeight: '70%',
    backgroundColor: AppColors.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    color: AppColors.text,
  },
  sheetItem: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: AppColors.border,
  },
  sheetItemText: { fontSize: 16, color: AppColors.text },
});
