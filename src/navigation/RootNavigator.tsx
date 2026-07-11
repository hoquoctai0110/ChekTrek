import React, { useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { RootStackParamList } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import { AuthNavigator } from './AuthNavigator';
import { useAuthStore } from '@store/authStore';
import { offlineSosQueue } from '@services/offline/offlineSosQueue';
import { offlineTrackingQueue } from '@services/offline/offlineTrackingQueue';
import { useLanguageStore } from '@store/languageStore';
import { Colors } from '@theme/colors';

// ── Phase 1: Existing screens ────────────────────────────────────────────────
import { TourDetailScreen } from '@features/tour-detail/screens/TourDetailScreen';
import { RouteMapScreen } from '@features/tours/screens/RouteMapScreen';
import { BookingScreen } from '@features/booking/screens/BookingScreen';
import { MyBookingsScreen } from '@features/booking/screens/MyBookingsScreen';
import { ProviderBookingsScreen } from '@features/booking/screens/ProviderBookingsScreen';
import { BookingDetailScreen } from '@features/booking/screens/BookingDetailScreen';
import { TrackingMapScreen } from '@features/tracking/screens/TrackingMapScreen';
import { ReviewFormScreen } from '@features/reviews/screens/ReviewFormScreen';
import { BookingStatusScreen } from '@features/booking/screens/BookingStatusScreen';
import { AIChatScreen } from '@features/ai-assistant/screens/AIChatScreen';
import { TripMapScreen } from '@features/trip-map/screens/TripMapScreen';
import { ProviderSosMapScreen } from '@features/emergency/screens/ProviderSosMapScreen';
import { ProviderSosScreen } from '@features/emergency/screens/ProviderSosScreen';
import { SOSScreen } from '@features/emergency/screens/SOSScreen';
import { TripDetailScreen } from '@features/trip-detail/screens/TripDetailScreen';
import { OfflineRoutesScreen } from '@features/offline/screens/OfflineRoutesScreen';

// ── Phase 2: Payment ─────────────────────────────────────────────────────────
import { PaymentMethodScreen } from '@features/payment/screens/PaymentMethodScreen';
import { PaymentPendingConfirmationScreen } from '@features/payment/screens/PaymentPendingConfirmationScreen';
import { PaymentSuccessScreen } from '@features/payment/screens/PaymentSuccessScreen';
import { TrekkPassScreen } from '@features/booking/screens/TrekkPassScreen';

// ── Phase 2: Tour Management ─────────────────────────────────────────────────
import { ManageToursScreen } from '@features/tour-management/screens/ManageToursScreen';
import { CreateTourScreen } from '@features/tour-management/screens/CreateTourScreen';
import { CreateRouteMapScreen } from '@features/tour-management/screens/CreateRouteMapScreen';
import { PricingPolicyScreen } from '@features/tour-management/screens/PricingPolicyScreen';
import { ManageSchedulesScreen } from '@features/tour-management/screens/ManageSchedulesScreen';
import { ScheduleFormScreen } from '@features/tour-management/screens/ScheduleFormScreen';

// ── Phase 2: Post Management ─────────────────────────────────────────────────
import { ManagePostsScreen } from '@features/post-management/screens/ManagePostsScreen';
import { CreatePostScreen } from '@features/post-management/screens/CreatePostScreen';
import { UploadSuccessScreen } from '@features/post-management/screens/UploadSuccessScreen';

// ── Phase 2: Profile ─────────────────────────────────────────────────────────
import { EditProfileScreen } from '@features/profile/screens/EditProfileScreen';

import { NotificationScreen } from '@features/discover/screens/NotificationScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, isLoading, isOfflineMode, restoreSession, setOfflineMode, resumeOnlineMode } =
    useAuthStore();
  const loadLanguage = useLanguageStore(s => s.loadLanguage);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    restoreSession();
    loadLanguage();
  }, [restoreSession, loadLanguage]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const isConnected = state.isConnected === true && state.isInternetReachable !== false;
      if (!isConnected) {
        console.log('[Offline] network disconnected');
        wasOfflineRef.current = true;
        setOfflineMode(true);
        return;
      }

      if (wasOfflineRef.current || isOfflineMode) {
        wasOfflineRef.current = false;
        void resumeOnlineMode().then(() => {
          void offlineTrackingQueue.syncPendingPoints();
          void offlineSosQueue.syncPendingSos();
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOfflineMode, resumeOnlineMode, setOfflineMode]);

  if (isLoading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isOfflineMode && isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={MainTabNavigator} />
          <Stack.Screen name="OfflineRoutes" component={OfflineRoutesScreen} />
          <Stack.Screen
            name="TrackingMap"
            component={TrackingMapScreen}
            options={{ animation: 'slide_from_right', gestureEnabled: false }}
          />
        </>
      ) : isAuthenticated ? (
        <>
          {/* ── Main Tab ── */}
          <Stack.Screen name="Main" component={MainTabNavigator} />

          <Stack.Screen
            name="Notifications"
            component={NotificationScreen}
            options={{ animation: 'slide_from_bottom' }}
          />

          {/* ── Phase 1 Screens ── */}
          <Stack.Screen
            name="TourDetail"
            component={TourDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="RouteMap"
            component={RouteMapScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="Booking"
            component={BookingScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="MyBookings"
            component={MyBookingsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ProviderBookings"
            component={ProviderBookingsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="BookingDetail"
            component={BookingDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="OfflineRoutes"
            component={OfflineRoutesScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="TrackingMap"
            component={TrackingMapScreen}
            options={{ animation: 'slide_from_right', gestureEnabled: false }}
          />
          <Stack.Screen
            name="ReviewForm"
            component={ReviewFormScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="BookingStatus"
            component={BookingStatusScreen}
            options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
          />
          <Stack.Screen
            name="AIChat"
            component={AIChatScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen name="TripMap" component={TripMapScreen} options={{ animation: 'fade' }} />
          <Stack.Screen
            name="SOS"
            component={SOSScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="ProviderSos"
            component={ProviderSosScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ProviderSosMap"
            component={ProviderSosMapScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="TripDetail"
            component={TripDetailScreen}
            options={{ animation: 'slide_from_right' }}
          />

          {/* ── Phase 2: Profile ── */}
          <Stack.Screen
            name="EditProfile"
            component={EditProfileScreen}
            options={{ animation: 'slide_from_right' }}
          />

          {/* ── Phase 2: Payment ── */}
          <Stack.Screen
            name="PaymentMethod"
            component={PaymentMethodScreen}
            options={{ animation: 'slide_from_bottom' }}
          />
          <Stack.Screen
            name="PaymentSuccess"
            component={PaymentSuccessScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="PaymentPendingConfirmation"
            component={PaymentPendingConfirmationScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />
          <Stack.Screen
            name="TrekkPass"
            component={TrekkPassScreen}
            options={{ animation: 'slide_from_bottom' }}
          />

          {/* ── Phase 2: Tour Management ── */}
          <Stack.Screen
            name="ManageTours"
            component={ManageToursScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="CreateTour"
            component={CreateTourScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="CreateRouteMap"
            component={CreateRouteMapScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="PricingPolicy"
            component={PricingPolicyScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ManageSchedules"
            component={ManageSchedulesScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="ScheduleForm"
            component={ScheduleFormScreen}
            options={{ animation: 'slide_from_right' }}
          />

          {/* ── Phase 2: Post Management ── */}
          <Stack.Screen
            name="ManagePosts"
            component={ManagePostsScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="CreatePost"
            component={CreatePostScreen}
            options={{ animation: 'slide_from_right' }}
          />
          <Stack.Screen
            name="UploadSuccess"
            component={UploadSuccessScreen}
            options={{ animation: 'fade', gestureEnabled: false }}
          />

          {/* ── Settings (placeholder) ── */}
          <Stack.Screen name="Settings" component={EditProfileScreen} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthNavigator} />
      )}
    </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
});
