import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList } from '@navigation/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { useAuthStore } from '@store/authStore';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export const EditProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useAuthStore();

  const [name, setName] = useState(user?.name ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [bio, setBio] = useState(user?.bio ?? '');
  const [emergencyName, setEmergencyName] = useState(user?.emergencyContact?.name ?? '');
  const [emergencyPhone, setEmergencyPhone] = useState(user?.emergencyContact?.phone ?? '');
  const [emergencyRelation, setEmergencyRelation] = useState(user?.emergencyContact?.relationship ?? '');
  const [experience, setExperience] = useState(user?.treksExperience ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAvatar, setHasAvatar] = useState(!!user?.avatarUrl);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Lỗi', 'Họ tên không được để trống');
      return;
    }
    setIsLoading(true);
    try {
      await new Promise(res => setTimeout(res, 700));
      updateUser({
        name: name.trim(),
        phone: phone.trim(),
        bio: bio.trim(),
        treksExperience: experience.trim(),
        emergencyContact: {
          name: emergencyName.trim(),
          phone: emergencyPhone.trim(),
          relationship: emergencyRelation.trim(),
        },
      });
      Alert.alert('Thành công', 'Thông tin đã được cập nhật', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase();

  const FieldInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    multiline,
    keyboardType,
    icon,
  }: {
    label: string;
    value: string;
    onChangeText: (t: string) => void;
    placeholder?: string;
    multiline?: boolean;
    keyboardType?: 'default' | 'phone-pad' | 'email-address';
    icon?: keyof typeof Ionicons.glyphMap;
  }) => (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.inputRow}>
        {icon && (
          <Ionicons name={icon} size={18} color={Colors.onSurfaceVariant} style={styles.inputIcon} />
        )}
        <TextInput
          style={[styles.input, icon ? styles.inputWithIcon : null, multiline ? styles.textArea : null]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.onSurfaceVariant}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : 'center'}
          keyboardType={keyboardType ?? 'default'}
        />
      </View>
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cập nhật thông tin</Text>
        <TouchableOpacity onPress={handleSave} activeOpacity={0.7} disabled={isLoading}>
          <Text style={[styles.saveHeaderBtn, isLoading && styles.saveHeaderBtnDisabled]}>
            {isLoading ? '...' : 'Lưu'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 80 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <View style={styles.avatar}>
              <Text style={styles.avatarInitials}>{initials || 'U'}</Text>
            </View>
            <TouchableOpacity
              style={styles.avatarEditBtn}
              onPress={() => Alert.alert('Thông báo', 'Tính năng đổi ảnh đại diện đang phát triển')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={16} color={Colors.onPrimary} />
            </TouchableOpacity>
          </View>
          <Text style={styles.avatarHint}>Nhấn để thay đổi ảnh đại diện</Text>
        </View>

        {/* ── Personal Info ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIcon}>
              <Ionicons name="person-outline" size={16} color={Colors.primary} />
            </View>
            <Text style={styles.sectionTitle}>Thông tin cá nhân</Text>
          </View>

          <FieldInput
            label="Họ và tên *"
            value={name}
            onChangeText={setName}
            placeholder="Nguyễn Văn A"
            icon="person-outline"
          />
          <FieldInput
            label="Số điện thoại"
            value={phone}
            onChangeText={setPhone}
            placeholder="0901234567"
            keyboardType="phone-pad"
            icon="call-outline"
          />
          <FieldInput
            label="Giới thiệu bản thân"
            value={bio}
            onChangeText={setBio}
            placeholder="Chia sẻ đôi điều về bản thân..."
            multiline
            icon="document-text-outline"
          />
          <FieldInput
            label="Kinh nghiệm trekking"
            value={experience}
            onChangeText={setExperience}
            placeholder="VD: 3 năm trekking, đã chinh phục Fansipan, Bạch Mã..."
            multiline
            icon="trail-sign-outline"
          />
        </View>

        {/* ── Emergency Contact ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionIcon, { backgroundColor: Colors.errorContainer }]}>
              <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
            </View>
            <Text style={styles.sectionTitle}>Liên hệ khẩn cấp</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Người được liên hệ trong trường hợp khẩn cấp khi bạn đang trekking
          </Text>

          <FieldInput
            label="Họ tên người thân"
            value={emergencyName}
            onChangeText={setEmergencyName}
            placeholder="Nguyễn Thị B"
            icon="people-outline"
          />
          <FieldInput
            label="Số điện thoại"
            value={emergencyPhone}
            onChangeText={setEmergencyPhone}
            placeholder="0901234567"
            keyboardType="phone-pad"
            icon="call-outline"
          />
          <FieldInput
            label="Mối quan hệ"
            value={emergencyRelation}
            onChangeText={setEmergencyRelation}
            placeholder="VD: Bố/Mẹ, Vợ/Chồng, Anh/Chị"
            icon="heart-outline"
          />
        </View>
      </ScrollView>

      {/* ── Save Button ── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.saveBtn, isLoading && styles.saveBtnDisabled]}
          onPress={handleSave}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          <Ionicons name="checkmark-circle-outline" size={20} color={Colors.onPrimary} />
          <Text style={styles.saveBtnText}>
            {isLoading ? 'Đang cập nhật...' : 'Lưu thay đổi'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.lg, color: Colors.onSurface },
  saveHeaderBtn: { fontFamily: FontFamily.semiBold, fontSize: FontSize.base, color: Colors.primary },
  saveHeaderBtnDisabled: { opacity: 0.5 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing[5], gap: Spacing[5] },
  avatarSection: { alignItems: 'center', gap: Spacing[2], paddingVertical: Spacing[3] },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    ...(Shadows.md as object),
  },
  avatarInitials: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.onPrimary,
  },
  avatarEditBtn: {
    position: 'absolute',
    right: 0, bottom: 0,
    width: 30, height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  avatarHint: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  section: {
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    padding: Spacing[5],
    gap: Spacing[4],
    ...(Shadows.md as object),
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  sectionIcon: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center', justifyContent: 'center',
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.onSurface },
  sectionSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
  },
  field: { gap: Spacing[1] },
  fieldLabel: { fontFamily: FontFamily.medium, fontSize: FontSize.sm, color: Colors.onSurface },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  inputIcon: { position: 'absolute', left: Spacing[3], zIndex: 1 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest,
    minHeight: 50,
  },
  inputWithIcon: { paddingLeft: 40 },
  textArea: { minHeight: 90, paddingTop: Spacing[3] },
  footer: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant,
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.primary,
    borderRadius: Radius.button,
    paddingVertical: Spacing[4],
    ...(Shadows.md as object),
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveBtnText: { fontFamily: FontFamily.bold, fontSize: FontSize.base, color: Colors.onPrimary },
});
