import { NavigatorScreenParams } from '@react-navigation/native';
import type { TourSchedule } from '@services/api/tourSchedules.api';
import type {
  BookingPaymentBookingStatus,
  BookingPaymentStatus,
} from '../types';

// ─── Auth Stack ───────────────────────────────────────────────────────────────
export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  OtpVerify: { email: string };
  OtpVerification: { email: string; flow: 'register' | 'forgot-password' };
  PasswordResetSuccess: undefined;
};

// ─── Main Tabs ────────────────────────────────────────────────────────────────
export type MainTabParamList = {
  Home: undefined;
  Discover: undefined;
  BookTour: undefined;
  Community: undefined;
  Saved: undefined;
  OfflineRoutes: undefined;
  Trips: undefined;
  Profile: undefined;
};

// ─── Root Stack ───────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Main: NavigatorScreenParams<MainTabParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
  Notifications: undefined;
  // Tour & Booking
  TourDetail: { tourId: string };
  RouteMap: { routeId: number };
  Booking: { tourId: string };
  MyBookings: undefined;
  ProviderBookings: undefined;
  BookingDetail: { bookingId: string };
  OfflineRoutes: undefined;
  TrackingMap: {
    mode?: 'ONLINE' | 'OFFLINE' | 'PREVIEW';
    routeRunMode?: 'FULL_ROUTE_PREVIEW' | 'OUTBOUND_TRACKING' | 'RETURN_TRACKING';
    cachedRouteId?: string;
    bookingId: number;
    trackingSessionId?: number | string;
    localTrackingSessionId?: string;
    routeId?: number;
    tourTitle?: string;
    direction?: 'OUTBOUND' | 'RETURN';
    status?: 'ACTIVE' | 'PAUSED';
    offlineOnly?: boolean;
  };
  ReviewForm: { bookingId: number; tourId: number; tourTitle?: string };
  BookingStatus: { status: 'success' | 'rejected' };
  // AI & Trip
  AIChat: undefined;
  TripMap: { tripId: string };
  TripDetail: { tripId: string };
  // Emergency
  SOS: undefined;
  ProviderSos: undefined;
  ProviderSosMap: {
    sosId: string;
  };
  // Profile
  Settings: undefined;
  EditProfile: undefined;
  // Payment
  PaymentMethod: {
    bookingId?: number | string;
    orderCode?: number | string;
    checkoutUrl?: string;
    amount?: number;
    paymentStatus?: BookingPaymentStatus;
    bookingStatus?: BookingPaymentBookingStatus;
    tourName?: string;
    scheduleDate?: string;
    numberOfPeople?: number;
  };
  PaymentSuccess: {
    bookingId: number | string;
    orderCode?: number | string;
    paymentId?: number | string;
    amount?: number;
    paymentStatus: 'PAID';
    bookingStatus: BookingPaymentBookingStatus;
    tourName?: string;
    tourTitle?: string;
    scheduleDate?: string;
    numberOfPeople?: number;
    paidAt?: string;
    awaitingConfirmation?: boolean;
    confirmationMessage?: string;
  };
  PaymentPendingConfirmation: {
    bookingId?: number | string;
    orderCode?: number | string;
    paymentId?: number | string;
    amount?: number;
    paymentStatus?: BookingPaymentStatus;
    bookingStatus?: BookingPaymentBookingStatus;
    tourName?: string;
    tourTitle?: string;
    scheduleDate?: string;
    numberOfPeople?: number;
    paidAt?: string;
    confirmationMessage?: string;
  };
  TrekkPass: undefined;
  // Tour Management (Provider)
  ManageTours: undefined;
  CreateTour: {
    tourId?: string;
    routeId?: number;
    routeName?: string;
    routePoints?: { latitude: number; longitude: number }[];
  };
  CreateRouteMap: {
    tourId?: string;
    routeId?: number;
    routeName?: string;
    points?: { latitude: number; longitude: number }[];
    difficulty?: string;
  };
  PricingPolicy: { tourId: string };
  ManageSchedules: { tourId: string; tourTitle: string };
  ScheduleForm: {
    tourId: string;
    tourTitle: string;
    scheduleId?: string;
    schedule?: TourSchedule;
  };
  // Post Management (Provider)
  ManagePosts: undefined;
  CreatePost: { postId?: string };
  UploadSuccess: { type: 'tour' | 'post'; title: string };
};

// ─── Typed navigation declaration ─────────────────────────────────────────────
declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
