import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { UserAvatar } from '@components/common/UserAvatar';
import { EmptyState } from '@components/common/EmptyState';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { useAuthStore } from '@store/authStore';
import { RootStackParamList } from '@navigation/types';
import { Achievement, User } from '@/types';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

type NavProp = NativeStackNavigationProp<RootStackParamList>;
type ProfileLike = Partial<User> & {
  fullName?: string;
  displayName?: string;
  user?: {
    fullName?: string | null;
    name?: string | null;
    email?: string | null;
  };
  trekkerProfile?: {
    trekkingExperience?: string | null;
    displayName?: string | null;
    fullName?: string | null;
    level?: string | null;
  };
  trekkingExperience?: string | null;
};

const SETTINGS_ITEMS = [
  {
    icon: 'calendar-outline',
    label: 'Tour đã đặt',
    value: '',
    color: Colors.primary,
    route: 'MyBookings' as const,
  },
  {
    icon: 'cloud-offline-outline',
    label: 'Lộ trình đã tải',
    value: '',
    color: Colors.warningAmber,
    route: 'OfflineRoutes' as const,
  },
  {
    icon: 'person-outline',
    label: 'Chỉnh sửa thông tin',
    value: '',
    color: Colors.primary,
    route: 'EditProfile' as const,
  },
  {
    icon: 'card-outline',
    label: 'Phương thức thanh toán',
    value: '',
    color: Colors.successGreen,
    route: 'PaymentMethod' as const,
  },
  { icon: 'notifications-outline', label: 'Thông báo', value: 'Bật', color: Colors.warningAmber, route: null },
  { icon: 'lock-closed-outline', label: 'Đổi mật khẩu', value: '', color: Colors.onSurfaceVariant, route: null },
  { icon: 'shield-checkmark-outline', label: 'Bảo mật', value: '', color: Colors.primary, route: null },
  { icon: 'help-circle-outline', label: 'Trợ giúp & Hỗ trợ', value: '', color: Colors.onSurfaceVariant, route: null },
];

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation<NavProp>();
  const { logout, isOfflineMode } = useAuthStore();
  const authUser = useAuthStore(state => state.user);
  const profile = authUser as ProfileLike | null;

  const fallbackUser: User = {
    id: 'guest',
    name: 'Tài khoản Chektrek',
    email: '',
    level: 'Beginner',
    role: 'TREKKER',
    totalDistance: 0,
    totalElevation: 0,
    totalTreks: 0,
    achievements: [],
    joinedAt: '',
    bio: 'Tính năng đang phát triển',
    avatarUrl: undefined,
    coverUrl: undefined,
  };
  const safeAchievements: Achievement[] = Array.isArray(authUser?.achievements)
    ? authUser.achievements
    : [];
  const cachedUser: User = {
    ...fallbackUser,
    ...(authUser ?? {}),
    name: authUser?.name ?? fallbackUser.name,
    email: authUser?.email ?? fallbackUser.email,
    level: authUser?.level ?? fallbackUser.level,
    role: authUser?.role ?? fallbackUser.role,
    totalDistance: Number.isFinite(Number(authUser?.totalDistance))
      ? Number(authUser?.totalDistance)
      : fallbackUser.totalDistance,
    totalElevation: Number.isFinite(Number(authUser?.totalElevation))
      ? Number(authUser?.totalElevation)
      : fallbackUser.totalElevation,
    totalTreks: Number.isFinite(Number(authUser?.totalTreks))
      ? Number(authUser?.totalTreks)
      : fallbackUser.totalTreks,
    achievements: safeAchievements,
    bio: authUser?.bio ?? fallbackUser.bio,
    joinedAt: authUser?.joinedAt ?? fallbackUser.joinedAt,
  };
  const displayName =
    [
      profile?.fullName,
      profile?.user?.fullName,
      profile?.displayName,
      profile?.trekkerProfile?.fullName,
      profile?.trekkerProfile?.displayName,
      authUser?.fullName,
      authUser?.displayName,
      authUser?.name,
      authUser?.email,
    ].find(value => typeof value === 'string' && value.trim()) ?? 'TÃ i khoáº£n Chektrek';
  const experienceBadge =
    [
      profile?.trekkerProfile?.trekkingExperience,
      profile?.trekkingExperience,
      authUser?.trekkingExperience,
      authUser?.treksExperience,
      cachedUser.level,
    ].find(value => typeof value === 'string' && value.trim()) ?? cachedUser.level;
  const currentRole = cachedUser.role ?? 'TREKKER';
  const unlockedAchievements = safeAchievements.filter(ach => ach?.isUnlocked);
  const visibleSettingsItems = SETTINGS_ITEMS.filter(
    item => item.route !== 'MyBookings' || currentRole === 'TREKKER',
  );

  const handleLogout = () => {
    Alert.alert('Đăng xuất', 'Bạn có chắc chắn muốn đăng xuất?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: logout,
      },
    ]);
  };

  return (
    <SafeScreen backgroundColor="transparent">
      <View style={StyleSheet.absoluteFill}>
        <Svg height="100%" width="100%">
          <Defs>
            <SvgLinearGradient id="bgGrad" x1="100%" y1="0%" x2="0%" y2="100%">
              <Stop offset="0%" stopColor="#E5F9CE" />
              <Stop offset="100%" stopColor="#A2EDB4" />
            </SvgLinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#bgGrad)" />
        </Svg>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.coverContainer}>
          <Image
            source={{
              uri:
                cachedUser.coverUrl ??
                'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200',
            }}
            style={styles.coverImage}
            resizeMode="cover"
          />
          <View style={styles.coverOverlay} />
          <TouchableOpacity style={styles.editBtn} activeOpacity={0.8}>
            <Ionicons name="pencil" size={16} color={Colors.onPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.profileSection}>
          <View style={styles.avatarWrapper}>
            <UserAvatar
              avatarUrl={cachedUser.avatarUrl}
              name={displayName}
              size={88}
              showBorder
            />
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{experienceBadge}</Text>
            </View>
          </View>
          <Text style={styles.userName}>{displayName}</Text>
          <Text style={styles.userBio}>{cachedUser.bio ?? 'Tính năng đang phát triển'}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{cachedUser.totalTreks}</Text>
              <Text style={styles.statLabel}>Treks</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{cachedUser.totalDistance}</Text>
              <Text style={styles.statLabel}>km</Text>
            </View>
            <View style={styles.statDiv} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{unlockedAchievements.length}</Text>
              <Text style={styles.statLabel}>Thành tựu</Text>
            </View>
          </View>
        </View>

        {isOfflineMode ? (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color={Colors.warningAmber} />
            <Text style={styles.offlineBannerText}>Bạn đang ở chế độ Offline</Text>
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thành Tựu</Text>
          {safeAchievements.length > 0 ? (
            <View style={styles.achievementsGrid}>
              {safeAchievements.map(ach => (
                <View
                  key={ach.id}
                  style={[styles.achievementItem, !ach.isUnlocked && styles.achievementLocked]}
                >
                  <View
                    style={[
                      styles.achievementIcon,
                      {
                        backgroundColor: ach.isUnlocked
                          ? Colors.warningAmber + '20'
                          : Colors.surfaceContainer,
                      },
                    ]}
                  >
                    <Ionicons
                      name="trophy"
                      size={24}
                      color={ach.isUnlocked ? Colors.warningAmber : Colors.outlineVariant}
                    />
                  </View>
                  <Text style={[styles.achName, !ach.isUnlocked && styles.achNameLocked]}>
                    {ach.name}
                  </Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyState
              iconName="construct-outline"
              title="Tính năng đang phát triển"
              message="Hồ sơ thành tích sẽ được cập nhật khi backend dữ liệu hoàn thiện."
            />
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Lịch Sử Trekking</Text>
          <View style={styles.historyStats}>
            <View style={styles.historyItem}>
              <MaterialCommunityIcons name="map-marker-path" size={20} color={Colors.primary} />
              <View>
                <Text style={styles.historyValue}>{cachedUser.totalDistance} km</Text>
                <Text style={styles.historyLabel}>Tổng quãng đường</Text>
              </View>
            </View>
            <View style={styles.historyItem}>
              <Ionicons name="trending-up" size={20} color={Colors.successGreen} />
              <View>
                <Text style={styles.historyValue}>
                  {cachedUser.totalElevation.toLocaleString()} m
                </Text>
                <Text style={styles.historyLabel}>Tổng độ cao</Text>
              </View>
            </View>
            <View style={styles.historyItem}>
              <Ionicons name="calendar" size={20} color={Colors.warningAmber} />
              <View>
                <Text style={styles.historyValue}>{cachedUser.totalTreks} chuyến</Text>
                <Text style={styles.historyLabel}>Tổng số chuyến</Text>
              </View>
            </View>
          </View>
        </View>

        {currentRole === 'TOUR_PROVIDER' && (
          <View style={styles.card}>
            <View style={styles.providerHeader}>
              <View style={styles.providerBadge}>
                <Ionicons name="briefcase" size={14} color={Colors.onPrimary} />
                <Text style={styles.providerBadgeText}>Nhà cung cấp</Text>
              </View>
              <Text style={styles.cardTitle}>Quản lý Nội dung</Text>
            </View>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => navigation.navigate('ProviderBookings')}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: Colors.warningAmber + '15' }]}>
                <Ionicons name="receipt-outline" size={20} color={Colors.warningAmber} />
              </View>
              <Text style={styles.settingsLabel}>Quản lý booking</Text>
              <View style={styles.settingsRight}>
                <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsItem, styles.settingsItemBorder]}
              onPress={() => navigation.navigate('ProviderSos')}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: Colors.error + '15' }]}>
                <Ionicons name="warning-outline" size={20} color={Colors.error} />
              </View>
              <Text style={styles.settingsLabel}>Cảnh báo SOS</Text>
              <View style={styles.settingsRight}>
                <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsItem, styles.settingsItemBorder]}
              onPress={() => navigation.navigate('ManageTours')}
              activeOpacity={0.7}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons name="map-outline" size={20} color={Colors.primary} />
              </View>
              <Text style={styles.settingsLabel}>Quản lý Tours</Text>
              <View style={styles.settingsRight}>
                <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.settingsItem, styles.settingsItemBorder]}
              onPress={() => navigation.navigate('ManagePosts')}
              activeOpacity={0.7}
            >
              <View
                style={[styles.settingsIconBg, { backgroundColor: Colors.successGreen + '15' }]}
              >
                <Ionicons name="newspaper-outline" size={20} color={Colors.successGreen} />
              </View>
              <Text style={styles.settingsLabel}>Quản lý Bài đăng</Text>
              <View style={styles.settingsRight}>
                <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Cài Đặt</Text>
          {visibleSettingsItems.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.settingsItem,
                i < visibleSettingsItems.length - 1 && styles.settingsItemBorder,
              ]}
              activeOpacity={0.7}
              onPress={() => {
                if (item.route === 'MyBookings') navigation.navigate('MyBookings');
                else if (item.route === 'EditProfile') navigation.navigate('EditProfile');
                else if (item.route === 'PaymentMethod') navigation.navigate('PaymentMethod', {});
                else if (item.route === 'OfflineRoutes') navigation.navigate('OfflineRoutes');
              }}
            >
              <View style={[styles.settingsIconBg, { backgroundColor: item.color + '15' }]}>
                <Ionicons name={item.icon as never} size={20} color={item.color} />
              </View>
              <Text style={styles.settingsLabel}>{item.label}</Text>
              <View style={styles.settingsRight}>
                {item.value ? <Text style={styles.settingsValue}>{item.value}</Text> : null}
                <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={Colors.dangerRed} />
          <Text style={styles.logoutText}>Đăng Xuất</Text>
        </TouchableOpacity>

        <Text style={styles.version}>Chektrek v1.0.0</Text>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  coverContainer: {
    height: 200,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  editBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: Spacing[4],
    backgroundColor: 'transparent',
    marginBottom: Spacing[3],
  },
  avatarWrapper: {
    marginTop: -44,
    position: 'relative',
    marginBottom: Spacing[3],
  },
  levelBadge: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.chip,
    borderWidth: 2,
    borderColor: Colors.surfaceWhite,
  },
  levelText: {
    fontFamily: FontFamily.bold,
    fontSize: 9,
    color: Colors.onPrimary,
  },
  userName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.onSurface,
    marginBottom: 4,
  },
  userBio: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: Spacing[8],
    marginBottom: Spacing[4],
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing[8],
    justifyContent: 'center',
    gap: Spacing[6],
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  statDiv: {
    width: 1,
    height: 28,
    backgroundColor: Colors.outlineVariant,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: Colors.surfaceWhite,
    marginHorizontal: Spacing[4],
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[3],
    ...(Shadows.sm as object),
  },
  offlineBanner: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    padding: Spacing[3],
    borderRadius: Radius.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.warningAmber + '14',
    borderWidth: 1,
    borderColor: Colors.warningAmber + '45',
  },
  offlineBannerText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
    marginBottom: Spacing[3],
  },
  providerHeader: {
    marginBottom: Spacing[3],
    gap: Spacing[2],
  },
  providerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.chip,
  },
  providerBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.onPrimary,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[3],
  },
  achievementItem: {
    width: '22%',
    alignItems: 'center',
    gap: 6,
  },
  achievementLocked: {
    opacity: 0.45,
  },
  achievementIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achName: {
    fontFamily: FontFamily.semiBold,
    fontSize: 10,
    color: Colors.onSurface,
    textAlign: 'center',
  },
  achNameLocked: {
    color: Colors.outlineVariant,
  },
  historyStats: {
    gap: Spacing[3],
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[1],
  },
  historyValue: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  historyLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[3],
  },
  settingsItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '30',
  },
  settingsIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: {
    flex: 1,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  settingsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingsValue: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[2],
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    paddingVertical: Spacing[4],
    borderRadius: Radius.xl,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: Colors.dangerRed + '30',
  },
  logoutText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: Colors.dangerRed,
  },
  version: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.outline,
    textAlign: 'center',
    marginBottom: Spacing[4],
  },
});
