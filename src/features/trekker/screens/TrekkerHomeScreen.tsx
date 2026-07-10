import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  FlatList,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { TourCard } from '@components/cards/TourCard';
import { EmptyState } from '@components/common/EmptyState';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { RootStackParamList } from '@navigation/types';
import { Tour } from '@/types';
import { toursApi } from '@services/api/tours.api';
import { useAuthStore } from '@store/authStore';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

type TrekkerNavProp = NativeStackNavigationProp<RootStackParamList>;

export const TrekkerHomeScreen: React.FC = () => {
  const navigation = useNavigation<TrekkerNavProp>();
  const user = useAuthStore(state => state.user);
  const [recommendedTours, setRecommendedTours] = useState<Tour[]>([]);
  const [isLoadingTours, setIsLoadingTours] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadTours = async () => {
      try {
        const response = await toursApi.getAll({ limit: 10 });
        if (isMounted) {
          setRecommendedTours(response.data.slice(0, 3));
        }
      } catch {
        if (isMounted) {
          setRecommendedTours([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingTours(false);
        }
      }
    };

    void loadTours();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleTourPress = (tour: Tour) => {
    navigation.navigate('TourDetail', { tourId: tour.id });
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

      <View style={styles.header}>
        <Text style={styles.headerTitle}>Chuyến đi của tôi</Text>
        <TouchableOpacity style={styles.addBtn} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#0A2518" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.statsCard}>
          <Text style={styles.statsGreeting}>Thống kê của bạn</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statBlock}>
              <View style={[styles.statIconBg, { backgroundColor: Colors.primaryFixed }]}>
                <MaterialCommunityIcons name="map-marker-distance" size={22} color={Colors.primary} />
              </View>
              <Text style={styles.statNumber}>{user?.totalDistance ?? 0}</Text>
              <Text style={styles.statUnit}>km</Text>
              <Text style={styles.statDesc}>Tổng khoảng cách</Text>
            </View>
            <View style={styles.statBlock}>
              <View style={[styles.statIconBg, { backgroundColor: '#D1FAE5' }]}>
                <MaterialCommunityIcons name="trending-up" size={22} color={Colors.successGreen} />
              </View>
              <Text style={styles.statNumber}>{((user?.totalElevation ?? 0) / 1000).toFixed(1)}</Text>
              <Text style={styles.statUnit}>km</Text>
              <Text style={styles.statDesc}>Tổng độ cao</Text>
            </View>
            <View style={styles.statBlock}>
              <View style={[styles.statIconBg, { backgroundColor: '#FEF3C7' }]}>
                <Ionicons name="trail-sign" size={22} color={Colors.warningAmber} />
              </View>
              <Text style={styles.statNumber}>{user?.totalTreks ?? 0}</Text>
              <Text style={styles.statUnit}>lần</Text>
              <Text style={styles.statDesc}>Số chuyến đi</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Chuyến Đi Của Tôi</Text>
          </View>
          <EmptyState
            iconName="trail-sign-outline"
            title="Tính năng đang phát triển"
            message="Lịch sử chuyến đi sẽ hiển thị khi dữ liệu theo dõi được kết nối."
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tuyến Đề Xuất</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Discover' as never)}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAll}>Xem tất cả</Text>
            </TouchableOpacity>
          </View>
          {isLoadingTours ? (
            <LoadingSpinner />
          ) : recommendedTours.length > 0 ? (
            <FlatList
              data={recommendedTours}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TourCard tour={item} onPress={handleTourPress} style={{ marginRight: 0 }} />
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            />
          ) : (
            <EmptyState
              title="Chưa có tour đề xuất"
              message="Hiện chưa có tour phù hợp để gợi ý cho bạn."
            />
          )}
        </View>

        <View style={[styles.section, styles.lastSection]}>
          <Text style={styles.sectionTitle}>Hành Động Nhanh</Text>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('SOS')}
              activeOpacity={0.85}
            >
              <View style={[styles.qaIcon, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="warning" size={24} color={Colors.sosRed} />
              </View>
              <Text style={[styles.qaLabel, { color: Colors.sosRed }]}>SOS</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} activeOpacity={0.85}>
              <View style={[styles.qaIcon, { backgroundColor: Colors.primaryFixed }]}>
                <Ionicons name="map" size={24} color={Colors.primary} />
              </View>
              <Text style={styles.qaLabel}>Bản đồ</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickAction}
              onPress={() => navigation.navigate('AIChat')}
              activeOpacity={0.85}
            >
              <View style={[styles.qaIcon, { backgroundColor: '#EDE9FE' }]}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#7C3AED" />
              </View>
              <Text style={[styles.qaLabel, { color: '#7C3AED' }]}>AI Chat</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickAction} activeOpacity={0.85}>
              <View style={[styles.qaIcon, { backgroundColor: '#D1FAE5' }]}>
                <Ionicons name="checkbox" size={24} color={Colors.successGreen} />
              </View>
              <Text style={[styles.qaLabel, { color: Colors.successGreen }]}>Check-in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[3],
    paddingBottom: Spacing[3],
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: '#0A2518',
  },
  addBtn: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(10, 37, 24, 0.08)',
  },
  scroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  statsCard: {
    margin: Spacing[4],
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    ...(Shadows.md as object),
  },
  statsGreeting: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.onPrimary + 'CC',
    marginBottom: Spacing[3],
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statNumber: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['2xl'],
    color: Colors.onPrimary,
  },
  statUnit: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.onPrimary + 'CC',
    marginTop: -4,
  },
  statDesc: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.onPrimary + 'CC',
    textAlign: 'center',
  },
  section: {
    marginBottom: Spacing[5],
  },
  lastSection: {
    marginBottom: Spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3],
  },
  sectionTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A2518',
    paddingHorizontal: Spacing[4],
    marginBottom: Spacing[3],
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
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing[4],
    marginTop: -Spacing[2],
  },
  quickAction: {
    alignItems: 'center',
    gap: 8,
  },
  qaIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: '#0A2518',
  },
});
