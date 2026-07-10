import React, { useState, useCallback, useMemo } from 'react';
import {
  Alert,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  RefreshControl,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { SearchBar } from '@components/common/SearchBar';
import { EmptyState } from '@components/common/EmptyState';
import { TourCard } from '@components/cards/TourCard';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { RootStackParamList } from '@navigation/types';
import { Tour } from '../../../types';
import { useAuthStore } from '@store/authStore';
import { ProviderSosAlert, sosApi } from '@services/api/sos.api';
import { loadPublicTourCardModels, PublicTourListItem } from '@services/tours/publicTours';
import { usePublicTourFeedStore } from '@store/publicTourFeedStore';
import { TOUR_DISPLAY_TEXT } from '@constants/tourDisplay';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

type HomeNavProp = NativeStackNavigationProp<RootStackParamList>;

const CATEGORIES = [
  { id: 'mountain', label: 'Summit Tracks', icon: 'terrain' as const, color: Colors.primary, bg: Colors.primaryFixed },
  { id: 'forest', label: 'Forest Trails', icon: 'nature' as const, color: Colors.successGreen, bg: '#D1FAE5' },
  { id: 'heritage', label: 'Heritage', icon: 'account-balance' as const, color: Colors.warningAmber, bg: '#FEF3C7' },
  { id: 'all', label: 'Browse All', icon: 'grid' as const, color: Colors.secondary, bg: Colors.secondaryContainer },
];

const MOCK_NOTIFICATIONS = [
  { id: '1', title: 'Tour mới gần bạn', body: 'Tour leo núi Fan Si Pan khai mạc vào ngày 10/06/2026', time: '5 phút trước', unread: true, icon: 'map-outline' },
  { id: '2', title: 'Đặt tour thành công', body: 'Bạn đã đặt tour Sềo Mồ Cảo - 3 ngày 2 đêm thành công', time: '1 giờ trước', unread: true, icon: 'checkmark-circle-outline' },
  { id: '3', title: 'Nhận xét mới', body: 'Nguyễn Minh Tuấn đã đánh giá 5 sao cho tour của bạn', time: '3 giờ trước', unread: false, icon: 'star-outline' },
  { id: '4', title: 'Nhắc nhở chửᨋc', body: 'Tour của bạn khởi hành vào ngày mai lúc 6:00 sáng', time: '1 ngày trước', unread: false, icon: 'alarm-outline' },
  { id: '5', title: 'Khuyến mãi đặc biệt', body: 'Giảm 20% cho gói SAFETY PASS trong tuần này', time: '2 ngày trước', unread: false, icon: 'pricetag-outline' },
];

const LANGUAGES = [
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳', native: 'Vietnamese' },
  { code: 'en', label: 'Tiếng Anh', flag: '🇬🇧', native: 'English' },
  { code: 'zh', label: 'Tiếng Trung', flag: '🇨🇳', native: '中文' },
];

const SOS_POLL_INTERVAL_MS = 15000;

const isNetworkError = (error: unknown): boolean => {
  const maybeAxios = error as { code?: string; message?: string; response?: unknown };
  const message = String(maybeAxios.message ?? '').toLowerCase();
  return (
    !maybeAxios.response &&
    (maybeAxios.code === 'ERR_NETWORK' ||
      maybeAxios.code === 'ECONNABORTED' ||
      message.includes('network') ||
      message.includes('offline') ||
      message.includes('timeout') ||
      message.includes('offline_mode'))
  );
};

const formatDateTime = (value?: string): string => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const pad = (numberValue: number) => String(numberValue).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

export const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeNavProp>();
  const previousPendingSosIdsRef = React.useRef<string[]>([]);
  const hasInitializedProviderSosRef = React.useRef(false);
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showLang, setShowLang] = useState(false);
  const user = useAuthStore(s => s.user);
  const isOfflineMode = useAuthStore(s => s.isOfflineMode);
  const setOfflineMode = useAuthStore(s => s.setOfflineMode);
  const publicTourFeedVersion = usePublicTourFeedStore(s => s.version);
  const role = user?.role ?? 'TREKKER';
  const [selectedLang, setSelectedLang] = useState('vi');
  const [notifications, setNotifications] = useState<
    Array<{ id: string; title: string; body: string; time: string; unread: boolean; icon: string }>
  >([]);
  const [tours, setTours] = useState<PublicTourListItem[]>([]);
  const [isToursLoading, setIsToursLoading] = useState(true);
  const [toursError, setToursError] = useState<string | null>(null);
  const [providerSosAlerts, setProviderSosAlerts] = useState<ProviderSosAlert[]>([]);

  const unreadCount = notifications.filter(n => n.unread).length;
  const filteredTours = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return tours;

    return tours.filter(({ tour }) =>
      [
        tour.title,
        tour.description,
        tour.destination,
        tour.province,
        tour.difficulty,
        tour.guideName,
        ...tour.tags,
      ]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
  }, [search, tours]);
  const pendingSosAlerts = useMemo(
    () => providerSosAlerts.filter(alert => alert.status === 'PENDING'),
    [providerSosAlerts],
  );
  const latestPendingSos = useMemo(
    () =>
      pendingSosAlerts
        .slice()
        .sort(
          (first, second) =>
            new Date(second.createdAt ?? 0).getTime() - new Date(first.createdAt ?? 0).getTime(),
        )[0],
    [pendingSosAlerts],
  );
  const pendingSosCount = pendingSosAlerts.length;

  const fetchTours = useCallback(async ({ showLoading = false, forceRefresh = false } = {}) => {
    if (isOfflineMode) {
      setIsToursLoading(false);
      setToursError('Bạn đang ở chế độ Offline');
      return;
    }

    if (showLoading) {
      setIsToursLoading(true);
    }
    setToursError(null);

    try {
      const mappedTours = await loadPublicTourCardModels({ forceRefresh, limit: 20 });
      setTours(mappedTours);
    } catch (error) {
      console.log('[HomeScreen] failed to fetch tours:', error);
      if (isNetworkError(error)) {
        setOfflineMode(true);
        setToursError('Bạn đang ở chế độ Offline');
      } else {
        setToursError('Không thể tải danh sách tour. Vui lòng thử lại.');
      }
    } finally {
      setIsToursLoading(false);
    }
  }, [isOfflineMode, setOfflineMode]);

  const openProviderSosMap = useCallback(
    (alert: ProviderSosAlert) => {
      console.log('[ProviderSOS] open map', alert.sosId);
      navigation.navigate('ProviderSosMap', {
        sosId: alert.sosId,
      });
    },
    [navigation],
  );

  const fetchProviderSos = useCallback(async () => {
    if (role !== 'TOUR_PROVIDER' || isOfflineMode) {
      return;
    }

    console.log('[ProviderSOS] polling');
    try {
      const alerts = await sosApi.getProviderSos();
      const pendingAlerts = alerts.filter(alert => alert.status === 'PENDING');
      console.log('[ProviderSOS] pending count', pendingAlerts.length);
      setProviderSosAlerts(alerts);

      const pendingIds = pendingAlerts.map(alert => alert.sosId);
      if (!hasInitializedProviderSosRef.current) {
        hasInitializedProviderSosRef.current = true;
        previousPendingSosIdsRef.current = pendingIds;
        return;
      }

      const previousIds = previousPendingSosIdsRef.current;
      const newAlert = pendingAlerts.find(alert => !previousIds.includes(alert.sosId));
      previousPendingSosIdsRef.current = pendingIds;

      if (newAlert) {
        console.log('[ProviderSOS] new alert detected', newAlert.sosId);
        Alert.alert(
          '🚨 SOS khẩn cấp',
          `${newAlert.trekkerName ?? 'Trekker'} cần hỗ trợ tại tour ${
            newAlert.tourTitle ?? 'Chektrek'
          }`,
          [
            { text: 'Đóng', style: 'cancel' },
            {
              text: 'Xem bản đồ',
              onPress: () => {
                openProviderSosMap(newAlert);
              },
            },
          ],
        );
      }
    } catch (error) {
      console.error('[ProviderSOS] polling failed:', error);
    }
  }, [isOfflineMode, openProviderSosMap, role]);

  useFocusEffect(
    useCallback(() => {
      void fetchTours({
        showLoading: tours.length === 0,
        forceRefresh: publicTourFeedVersion > 0,
      });
    }, [fetchTours, publicTourFeedVersion, tours.length]),
  );

  useFocusEffect(
    useCallback(() => {
      if (role !== 'TOUR_PROVIDER') {
        return undefined;
      }

      void fetchProviderSos();
      const timer = setInterval(() => {
        void fetchProviderSos();
      }, SOS_POLL_INTERVAL_MS);

      return () => {
        clearInterval(timer);
      };
    }, [fetchProviderSos, role]),
  );

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, unread: false })));

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    Promise.all([
      fetchTours({ forceRefresh: true }),
      role === 'TOUR_PROVIDER' ? fetchProviderSos() : Promise.resolve(),
    ]).finally(() => setRefreshing(false));
  }, [fetchProviderSos, fetchTours, role]);

  const handleTourPress = (tour: Tour) => {
    navigation.navigate('TourDetail', { tourId: tour.id });
  };

  return (
    <SafeScreen backgroundColor="transparent">
      {/* ── Gradient Background ── */}
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

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.menuBtn} activeOpacity={0.7}>
            <Ionicons name="menu" size={24} color={Colors.primary} />
          </TouchableOpacity>
          <Text style={styles.appName}>Chektrek</Text>
        </View>
        <View style={styles.headerRight}>
          {role === 'TOUR_PROVIDER' ? (
            <TouchableOpacity
              style={[styles.iconBtn, styles.sosHeaderButton]}
              onPress={() => navigation.navigate('ProviderSos')}
              activeOpacity={0.7}
            >
              <Ionicons name="warning" size={20} color={Colors.sosRed} />
              {pendingSosCount > 0 ? (
                <View style={[styles.badge, styles.sosHeaderBadge]}>
                  <Text style={styles.badgeText}>{pendingSosCount}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          ) : null}
          {/* Bell notification */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowNotif(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={22} color="#0A2518" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Globe language */}
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => setShowLang(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="globe-outline" size={22} color="#0A2518" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Welcome */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeTitle}>
            Xin chào, {(user?.name ?? 'Bạn').split(' ').pop()}! 👋
          </Text>
          <Text style={styles.welcomeSubtitle}>Sẵn sàng cho chuyến phiêu lưu tiếp theo?</Text>
        </View>

        {role === 'TOUR_PROVIDER' ? (
          <View style={styles.providerSosSection}>
            {pendingSosCount > 0 ? (
              <>
                <TouchableOpacity
                  style={styles.providerSosBanner}
                  onPress={() => navigation.navigate('ProviderSos')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="warning" size={20} color={Colors.surfaceWhite} />
                  <Text style={styles.providerSosBannerText}>
                    🚨 Có {pendingSosCount} cảnh báo SOS
                  </Text>
                </TouchableOpacity>
                {latestPendingSos ? (
                  <View style={styles.providerSosCard}>
                    <View style={styles.providerSosCardHeader}>
                      <View style={styles.providerSosTitleBlock}>
                        <Text style={styles.providerSosName}>
                          {latestPendingSos.trekkerName ?? 'Trekker'}
                        </Text>
                        <Text style={styles.providerSosTour}>
                          {latestPendingSos.tourTitle ?? 'Chektrek'}
                        </Text>
                      </View>
                      <View style={styles.providerSosStatusBadge}>
                        <Text style={styles.providerSosStatusText}>Khẩn cấp</Text>
                      </View>
                    </View>
                    <Text style={styles.providerSosTime}>
                      {formatDateTime(latestPendingSos.createdAt)}
                    </Text>
                    <TouchableOpacity
                      style={styles.providerSosAction}
                      onPress={() => openProviderSosMap(latestPendingSos)}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.providerSosActionText}>Xem ngay</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </>
            ) : (
              <TouchableOpacity
                style={styles.providerSosQuietCard}
                onPress={() => navigation.navigate('ProviderSos')}
                activeOpacity={0.85}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.successGreen} />
                <Text style={styles.providerSosQuietText}>Chưa có cảnh báo SOS</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null}

        {isOfflineMode ? (
          <View style={styles.offlineBanner}>
            <Ionicons name="cloud-offline-outline" size={18} color={Colors.warningAmber} />
            <Text style={styles.offlineBannerText}>Bạn đang ở chế độ Offline</Text>
          </View>
        ) : null}

        {/* Search */}
        <SearchBar
          value={search}
          onChangeText={setSearch}
          placeholder={TOUR_DISPLAY_TEXT.searchPlaceholder}
          style={styles.searchBar}
        />

        {/* Quick Stats Banner */}
        <View style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.totalTreks ?? 0}</Text>
            <Text style={styles.statLabel}>Treks</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{user?.totalDistance ?? 0} km</Text>
            <Text style={styles.statLabel}>{TOUR_DISPLAY_TEXT.distance}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{((user?.totalElevation ?? 0) / 1000).toFixed(1)} km</Text>
            <Text style={styles.statLabel}>{TOUR_DISPLAY_TEXT.elevation}</Text>
          </View>
        </View>

        {/* Categories Grid */}
        <View style={styles.categoriesGrid}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.categoryCard, { backgroundColor: cat.bg, borderColor: cat.color + '30' }]}
              activeOpacity={0.8}
            >
              <View style={[styles.categoryIconCircle, { backgroundColor: cat.color }]}>
                <Ionicons name={'compass' as never} size={22} color={Colors.surfaceWhite} />
              </View>
              <Text style={[styles.categoryLabel, { color: cat.color }]}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Featured Tours */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{TOUR_DISPLAY_TEXT.featuredTours}</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Discover' as never)} activeOpacity={0.7}>
              <Text style={styles.seeAll}>{TOUR_DISPLAY_TEXT.seeAll}</Text>
            </TouchableOpacity>
          </View>
          {isToursLoading ? (
            <View style={styles.toursState}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.toursStateText}>{TOUR_DISPLAY_TEXT.loadingTours}</Text>
            </View>
          ) : toursError ? (
            <View style={styles.toursState}>
              <Text style={styles.toursStateText}>{toursError}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => fetchTours({ showLoading: true })}
                activeOpacity={0.8}
                disabled={isOfflineMode}
              >
                <Text style={styles.retryBtnText}>{TOUR_DISPLAY_TEXT.retry}</Text>
              </TouchableOpacity>
            </View>
          ) : filteredTours.length === 0 ? (
            <View style={styles.toursState}>
              <Text style={styles.toursStateText}>{TOUR_DISPLAY_TEXT.noTours}</Text>
            </View>
          ) : (
            <FlatList
              data={filteredTours}
              keyExtractor={item => item.tour.id}
              renderItem={({ item }) => (
                <TourCard
                  tour={item.tour}
                  display={item.card}
                  onPress={handleTourPress}
                  style={styles.tourCard}
                />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
              snapToAlignment="start"
              decelerationRate="fast"
            />
          )}
        </View>

        {/* Upcoming Trips */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{TOUR_DISPLAY_TEXT.upcomingTrips}</Text>
            <TouchableOpacity
              onPress={() => {
                if (role === 'TOUR_PROVIDER') {
                  navigation.navigate('Main', { screen: 'Trips' });
                } else {
                  navigation.navigate('Main', { screen: 'Saved' });
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAll}>{TOUR_DISPLAY_TEXT.seeAll}</Text>
            </TouchableOpacity>
          </View>

          <EmptyState
            iconName="trail-sign-outline"
            title={TOUR_DISPLAY_TEXT.featureInProgress}
            message={TOUR_DISPLAY_TEXT.upcomingTripsMessage}
          />
        </View>

        {/* Nearby Destinations */}
        <View style={[styles.section, styles.lastSection]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{TOUR_DISPLAY_TEXT.nearbyDestinations}</Text>
          </View>
          <EmptyState
            iconName="location-outline"
            title={TOUR_DISPLAY_TEXT.featureInProgress}
            message={TOUR_DISPLAY_TEXT.nearbyDestinationMessage}
          />
        </View>
      </ScrollView>

      {role !== 'TOUR_PROVIDER' ? (
        <TouchableOpacity
          style={styles.sosButton}
          onPress={() => navigation.navigate('SOS')}
          activeOpacity={0.85}
        >
          <Ionicons name="warning" size={20} color={Colors.surfaceWhite} />
        </TouchableOpacity>
      ) : null}

      {/* ── Notification Modal ── */}
      <Modal
        visible={showNotif}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNotif(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowNotif(false)} />
        <View style={styles.modalSheet}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Thông báo</Text>
            <TouchableOpacity onPress={markAllRead} activeOpacity={0.7}>
              <Text style={styles.markAllBtn}>Đánh dấu tất cả đã đọc</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.modalDivider} />
          <ScrollView showsVerticalScrollIndicator={false}>
            {notifications.length > 0 ? (
              notifications.map(notif => (
                <TouchableOpacity
                  key={notif.id}
                  style={[styles.notifItem, notif.unread && styles.notifItemUnread]}
                  activeOpacity={0.8}
                  onPress={() =>
                    setNotifications(prev =>
                      prev.map(n => (n.id === notif.id ? { ...n, unread: false } : n)),
                    )
                  }
                >
                  <View style={[styles.notifIconBg, notif.unread && styles.notifIconBgUnread]}>
                    <Ionicons
                      name={notif.icon as never}
                      size={20}
                      color={notif.unread ? '#0A2518' : 'rgba(10,37,24,0.5)'}
                    />
                  </View>
                  <View style={styles.notifTextCol}>
                    <View style={styles.notifTitleRow}>
                      <Text style={[styles.notifTitle, notif.unread && styles.notifTitleUnread]}>
                        {notif.title}
                      </Text>
                      {notif.unread && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.notifBody} numberOfLines={2}>
                      {notif.body}
                    </Text>
                    <Text style={styles.notifTime}>{notif.time}</Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyNotificationState}>
                <Text style={styles.notifBody}>Chưa có thông báo để hiển thị.</Text>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Language Modal ── */}
      <Modal
        visible={showLang}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLang(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowLang(false)} />
        <View style={styles.langModalCard}>
          <Text style={styles.modalTitle}>Chọn ngôn ngữ</Text>
          <View style={styles.modalDivider} />
          {LANGUAGES.map(lang => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langOption, selectedLang === lang.code && styles.langOptionSelected]}
              onPress={() => { setSelectedLang(lang.code); setShowLang(false); }}
              activeOpacity={0.8}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <View style={styles.langTextCol}>
                <Text style={[styles.langLabel, selectedLang === lang.code && styles.langLabelSelected]}>
                  {lang.label}
                </Text>
                <Text style={styles.langNative}>{lang.native}</Text>
              </View>
              {selectedLang === lang.code && (
                <Ionicons name="checkmark-circle" size={22} color="#0A7A4A" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </Modal>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  menuBtn: {
    padding: 6,
    borderRadius: 20,
  },
  appName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.primary,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    position: 'relative',
  },
  sosHeaderButton: {
    borderColor: Colors.error + '30',
  },
  sosHeaderBadge: {
    borderColor: Colors.surfaceWhite,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#E53935',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: '#E5F9CE',
  },
  badgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#FFFFFF',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  welcomeSection: {
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[5],
    paddingBottom: Spacing[2],
    gap: 4,
  },
  welcomeTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['3xl'],
    color: Colors.onSurface,
  },
  welcomeSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.onSurfaceVariant,
  },
  providerSosSection: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
    marginBottom: Spacing[3],
  },
  providerSosBanner: {
    minHeight: 52,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.sosRed,
    ...(Shadows.md as object),
  },
  providerSosBannerText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.surfaceWhite,
  },
  providerSosCard: {
    padding: Spacing[4],
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Colors.error + '25',
    ...(Shadows.sm as object),
  },
  providerSosCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing[3],
  },
  providerSosTitleBlock: {
    flex: 1,
  },
  providerSosName: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.onSurface,
  },
  providerSosTour: {
    marginTop: 3,
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  providerSosStatusBadge: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[1],
    borderRadius: Radius.full,
    backgroundColor: Colors.errorContainer,
  },
  providerSosStatusText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.error,
  },
  providerSosTime: {
    marginTop: Spacing[3],
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
  },
  providerSosAction: {
    marginTop: Spacing[4],
    alignSelf: 'flex-start',
    minHeight: 42,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
  },
  providerSosActionText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
  },
  providerSosQuietCard: {
    minHeight: 48,
    paddingHorizontal: Spacing[4],
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    backgroundColor: Colors.surfaceWhite,
    borderWidth: 1,
    borderColor: Colors.successGreen + '25',
  },
  providerSosQuietText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onSurface,
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
  searchBar: {
    marginHorizontal: Spacing[4],
    marginVertical: Spacing[3],
  },
  statsBanner: {
    marginHorizontal: Spacing[4],
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[5],
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing[4],
    ...(Shadows.md as object),
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onPrimary,
  },
  statLabel: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onPrimary + 'CC',
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.onPrimary + '40',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[4],
  },
  categoryCard: {
    width: '47.5%',
    padding: Spacing[3],
    borderRadius: Radius.xl,
    alignItems: 'center',
    gap: Spacing[2],
    borderWidth: 1,
  },
  categoryIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
  },
  section: {
    marginBottom: Spacing[5],
  },
  lastSection: {
    marginBottom: Spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: Colors.onSurface,
  },
  seeAll: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.primary,
  },
  horizontalList: {
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
  },
  toursState: {
    minHeight: 120,
    marginHorizontal: Spacing[4],
    padding: Spacing[4],
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceWhite,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '20',
  },
  toursStateText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
  },
  retryBtn: {
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[2],
    borderRadius: Radius.button,
    backgroundColor: Colors.primary,
  },
  retryBtnText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.onPrimary,
  },
  emptyNotificationState: {
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[6],
  },
  tourCard: {
    marginRight: 0,
  },
  upcomingCard: {
    marginHorizontal: Spacing[4],
    flexDirection: 'row',
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '20',
    alignItems: 'center',
    ...(Shadows.sm as object),
  },
  upcomingImage: {
    width: 80,
    height: 80,
  },
  upcomingContent: {
    flex: 1,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    gap: 4,
  },
  upcomingTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  upcomingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upcomingDate: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  upcomingPeoplRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  upcomingPeople: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  upcomingArrow: {
    paddingRight: Spacing[3],
  },
  nearbyCard: {
    marginHorizontal: Spacing[4],
    backgroundColor: Colors.surfaceWhite,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    padding: Spacing[3],
    marginBottom: Spacing[2],
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '20',
    ...(Shadows.sm as object),
  },
  nearbyImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  nearbyImage: {
    width: '100%',
    height: '100%',
  },
  nearbyInfo: {
    flex: 1,
    gap: 3,
  },
  nearbyName: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onSurface,
  },
  nearbyProvince: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onSurfaceVariant,
  },
  nearbyTrails: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  nearbyBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.chip,
  },
  nearbyBadgeText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.successGreen,
  },
  sosButton: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.sosRed,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Shadows.lg as object),
  },

  // ── Modals ─────────────────────────────────────────────────────────────────
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: Spacing[5],
    paddingBottom: 40,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[5],
    paddingBottom: Spacing[3],
  },
  modalTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A2518',
  },
  markAllBtn: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: '#0A7A4A',
  },
  modalDivider: {
    height: 1,
    backgroundColor: 'rgba(10,37,24,0.08)',
    marginBottom: Spacing[2],
  },

  // Notification items
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing[3],
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10,37,24,0.05)',
  },
  notifItemUnread: {
    backgroundColor: 'rgba(0,200,83,0.06)',
  },
  notifIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(10,37,24,0.07)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  notifIconBgUnread: {
    backgroundColor: '#E3F53C',
  },
  notifTextCol: {
    flex: 1,
    gap: 3,
  },
  notifTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  notifTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.sm,
    color: 'rgba(10,37,24,0.65)',
    flex: 1,
  },
  notifTitleUnread: {
    fontFamily: FontFamily.bold,
    color: '#0A2518',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#0A7A4A',
    flexShrink: 0,
  },
  notifBody: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(10,37,24,0.6)',
    lineHeight: 18,
  },
  notifTime: {
    fontFamily: FontFamily.regular,
    fontSize: 10,
    color: 'rgba(10,37,24,0.4)',
    marginTop: 2,
  },

  // Language modal
  langModalCard: {
    position: 'absolute',
    top: '30%',
    left: Spacing[5],
    right: Spacing[5],
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingVertical: Spacing[5],
    paddingHorizontal: Spacing[5],
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    gap: Spacing[2],
  },
  langOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
    paddingVertical: Spacing[4],
    paddingHorizontal: Spacing[3],
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: 'rgba(10,37,24,0.08)',
    marginTop: Spacing[2],
  },
  langOptionSelected: {
    backgroundColor: 'rgba(0,200,83,0.08)',
    borderColor: '#0A7A4A',
  },
  langFlag: {
    fontSize: 28,
  },
  langTextCol: {
    flex: 1,
    gap: 2,
  },
  langLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: '#0A2518',
  },
  langLabelSelected: {
    color: '#0A7A4A',
  },
  langNative: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(10,37,24,0.5)',
  },
});
