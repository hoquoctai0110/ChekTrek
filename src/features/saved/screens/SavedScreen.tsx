import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { LoadingSpinner } from '@components/common/LoadingSpinner';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { RootStackParamList } from '@navigation/types';
import { Tour } from '@/types';
import { useSavedStore } from '@store/savedStore';
import { toursApi } from '@services/api/tours.api';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Rect, Stop } from 'react-native-svg';

type SavedScreenNavProp = NativeStackNavigationProp<RootStackParamList>;
const { width } = Dimensions.get('window');

export const SavedScreen: React.FC = () => {
  const navigation = useNavigation<SavedScreenNavProp>();
  const [activeTab, setActiveTab] = useState<'saved' | 'downloaded'>('saved');
  const [tours, setTours] = useState<Tour[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const savedTourIds = useSavedStore(s => s.savedTourIds);
  const downloadedTourIds = useSavedStore(s => s.downloadedTourIds);
  const toggleSaved = useSavedStore(s => s.toggleSaved);

  useEffect(() => {
    let isMounted = true;

    const loadTours = async () => {
      try {
        const response = await toursApi.getAll({ limit: 50 });
        if (isMounted) {
          setTours(response.data);
        }
      } catch {
        if (isMounted) {
          setTours([]);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void loadTours();

    return () => {
      isMounted = false;
    };
  }, []);

  const savedTours = tours.filter(t => savedTourIds.includes(t.id));
  const downloadedTours = tours.filter(t => downloadedTourIds.includes(t.id));

  const handleTourDetail = (tourId: string) => {
    navigation.navigate('TourDetail', { tourId });
  };

  const handleOfflineMap = () => {
    Alert.alert('Tính năng đang phát triển', 'Tính năng đang phát triển');
  };

  const renderTourCard = ({ item: tour }: { item: Tour }) => {
    const isSaved = savedTourIds.includes(tour.id);
    const isDownloaded = downloadedTourIds.includes(tour.id);

    return (
      <View style={styles.card}>
        <View style={styles.imageContainer}>
          <Image source={{ uri: tour.thumbnailUrl }} style={styles.image} resizeMode="cover" />

          <View style={styles.cardActions}>
            {isDownloaded && (
              <View style={styles.downloadBadge}>
                <Ionicons name="cloud-done" size={14} color="#0A2518" />
                <Text style={styles.downloadBadgeText}>Đã tải</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />

            <TouchableOpacity
              style={styles.heartBtn}
              onPress={() => toggleSaved(tour.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={isSaved ? 'heart' : 'heart-outline'}
                size={20}
                color="#0A2518"
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle}>{tour.title}</Text>
          <Text style={styles.cardSubtitle}>{tour.destination}</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="star" size={13} color="#FFD700" />
              <Text style={styles.statText}>{tour.rating.toFixed(1)}</Text>
            </View>
            <Text style={styles.dot}>•</Text>

            <View style={styles.statItem}>
              <View style={styles.difficultyDot} />
              <Text style={styles.statText}>
                {tour.difficulty === 'Easy'
                  ? 'Cơ bản'
                  : tour.difficulty === 'Moderate'
                    ? 'Trung bình'
                    : 'Khó'}
              </Text>
            </View>
            <Text style={styles.dot}>•</Text>

            <Text style={styles.statText}>{tour.distance} km</Text>
            <Text style={styles.dot}>•</Text>

            <Text style={styles.statText}>{tour.duration} giờ</Text>
          </View>

          {activeTab === 'saved' ? (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleTourDetail(tour.id)}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Chi tiết</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={handleOfflineMap}
              activeOpacity={0.8}
            >
              <Text style={styles.actionBtnText}>Bản đồ ngoại tuyến</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => {
    const isSavedTab = activeTab === 'saved';
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconBg}>
          <Ionicons
            name={isSavedTab ? 'heart-dislike-outline' : 'cloud-offline-outline'}
            size={48}
            color="rgba(10,37,24,0.4)"
          />
        </View>
        <Text style={styles.emptyTitle}>
          {isSavedTab ? 'Danh sách trống' : 'Chưa tải bản đồ nào'}
        </Text>
        <Text style={styles.emptySubtitle}>
          {isSavedTab
            ? 'Hãy lưu lại những hành trình yêu thích của bạn.'
            : 'Khi tính năng offline hoàn thiện, các bản đồ đã tải sẽ hiển thị ở đây.'}
        </Text>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => navigation.navigate('Main', { screen: 'BookTour' })}
          activeOpacity={0.8}
        >
          <Text style={styles.emptyBtnText}>Khám phá tour</Text>
        </TouchableOpacity>
      </View>
    );
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
        <Text style={styles.headerTitle}>Đã lưu</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          onPress={() => setActiveTab('saved')}
          style={styles.tabButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>
            Danh sách
          </Text>
          {activeTab === 'saved' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('downloaded')}
          style={styles.tabButton}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, activeTab === 'downloaded' && styles.activeTabText]}>
            Tải xuống
          </Text>
          {activeTab === 'downloaded' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <LoadingSpinner style={styles.loadingState} />
      ) : (
        <FlatList
          data={activeTab === 'saved' ? savedTours : downloadedTours}
          keyExtractor={item => item.id}
          renderItem={renderTourCard}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeScreen>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Spacing[5],
    paddingTop: Spacing[4],
    paddingBottom: Spacing[2],
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize['4xl'],
    color: '#0A2518',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(10,37,24,0.08)',
    paddingHorizontal: Spacing[5],
    marginBottom: Spacing[4],
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing[3],
    position: 'relative',
  },
  tabText: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    color: 'rgba(10,37,24,0.4)',
  },
  activeTabText: {
    color: '#0A2518',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: '#0F291E',
    borderRadius: 1.5,
  },
  listContent: {
    paddingHorizontal: Spacing[5],
    paddingBottom: 100,
    gap: Spacing[5],
  },
  loadingState: {
    flex: 1,
  },
  card: {
    width: width - Spacing[10],
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.card,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(10, 37, 24, 0.05)',
  },
  imageContainer: {
    height: 200,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  cardActions: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  downloadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#00F582',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    elevation: 2,
  },
  downloadBadgeText: {
    fontFamily: FontFamily.bold,
    fontSize: 10,
    color: '#0A2518',
  },
  heartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#00F582',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2.5,
  },
  cardContent: {
    padding: Spacing[4],
    gap: Spacing[2],
  },
  cardTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.xl,
    color: '#0A2518',
  },
  cardSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: 'rgba(10, 37, 24, 0.6)',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    marginVertical: Spacing[1],
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[1],
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00F582',
  },
  statText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: '#0A2518',
  },
  dot: {
    color: 'rgba(10, 37, 24, 0.4)',
    fontSize: FontSize.xs,
  },
  actionBtn: {
    backgroundColor: '#00F582',
    borderRadius: Radius.button,
    paddingVertical: Spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing[2],
    elevation: 2,
  },
  actionBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: '#0A2518',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing[10],
    paddingHorizontal: Spacing[5],
    gap: Spacing[3],
  },
  emptyIconBg: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(10,37,24,0.06)',
    marginBottom: Spacing[2],
  },
  emptyTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: '#0A2518',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: 'rgba(10,37,24,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: Spacing[4],
  },
  emptyBtn: {
    backgroundColor: '#00F582',
    borderRadius: Radius.button,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[3],
    marginTop: Spacing[3],
    elevation: 2,
  },
  emptyBtnText: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.sm,
    color: '#0A2518',
  },
});
