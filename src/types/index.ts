/**
 * Chektrek Domain Types
 */

// ─── User Roles ────────────────────────────────────────────────────────────────
export type UserRole = 'TREKKER' | 'TOUR_PROVIDER' | 'ADMIN';

// ─── User ─────────────────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  fullName?: string;
  displayName?: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  coverUrl?: string;
  bio?: string;
  level: TrekkerLevel;
  role: UserRole;
  totalDistance: number; // km
  totalElevation: number; // m
  totalTreks: number;
  achievements: Achievement[];
  joinedAt: string;
  emergencyContact?: EmergencyContactInfo;
  treksExperience?: string;
  trekkingExperience?: string;
  user?: {
    fullName?: string;
    name?: string;
    email?: string;
    avatarUrl?: string;
  };
  trekkerProfile?: {
    fullName?: string;
    displayName?: string;
    trekkingExperience?: string;
    level?: string;
    avatarUrl?: string;
  };
}

export type TrekkerLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Legend';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  iconName: string;
  unlockedAt?: string;
  isUnlocked: boolean;
}

// ─── Tour ─────────────────────────────────────────────────────────────────────
export interface Tour {
  id: string;
  title: string;
  description: string;
  destination: string;
  province: string;
  imageUrls: string[];
  thumbnailUrl: string;
  difficulty: TourDifficulty;
  distance: number; // km
  duration: number; // hours
  elevation: number; // m
  maxParticipants: number;
  currentParticipants: number;
  pricePerPerson: number;
  currency: string;
  rating: number;
  reviewCount: number;
  highlights: string[];
  itinerary: ItineraryItem[];
  reviews: Review[];
  guideId: string;
  guideName: string;
  guideAvatarUrl?: string;
  tags: string[];
  isFeatured: boolean;
  availableDates: string[];
  status: TourStatus;
  createdAt: string;
}

export type TourDifficulty = 'Easy' | 'Moderate' | 'Hard' | 'Extreme';
export type TourStatus = 'active' | 'draft' | 'archived';

export interface ItineraryItem {
  day: number;
  title: string;
  description: string;
  distance?: number;
  elevation?: number;
  duration?: number;
}

export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatarUrl?: string;
  rating: number;
  comment: string;
  createdAt: string;
  images?: string[];
}

// ─── Destination ──────────────────────────────────────────────────────────────
export interface Destination {
  id: string;
  name: string;
  province: string;
  country: string;
  imageUrl: string;
  description: string;
  trailCount: number;
  tourCount: number;
  latitude: number;
  longitude: number;
  category: DestinationCategory;
  isFeatured: boolean;
}

export type DestinationCategory =
  | 'mountain'
  | 'forest'
  | 'heritage'
  | 'waterfall'
  | 'beach'
  | 'valley';

// ─── Trip ─────────────────────────────────────────────────────────────────────
export interface Trip {
  id: string;
  title: string;
  tourId?: string;
  tourName?: string;
  startDate: string;
  endDate?: string;
  status: TripStatus;
  participants: TripParticipant[];
  checkpoints: Checkpoint[];
  route?: GeoLocation[];
  notes: string;
  coverImageUrl?: string;
  totalDistance?: number;
  weatherInfo?: WeatherInfo;
  createdAt: string;
}

export type TripStatus = 'planned' | 'active' | 'completed' | 'cancelled';

export interface TripParticipant {
  userId: string;
  name: string;
  avatarUrl?: string;
  role: 'leader' | 'member';
  joinedAt: string;
}

export interface Checkpoint {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  location: GeoLocation;
  reachedAt?: string;
  isReached: boolean;
  order: number;
  type: CheckpointType;
}

export type CheckpointType = 'start' | 'waypoint' | 'rest' | 'summit' | 'end';

export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  timestamp?: number;
}

export interface WeatherInfo {
  temperature: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  icon: string;
  forecast: WeatherForecast[];
}

export interface WeatherForecast {
  time: string;
  temperature: number;
  condition: string;
}

// ─── Booking ──────────────────────────────────────────────────────────────────
export interface Booking {
  id: string;
  tourId: string;
  tourTitle: string;
  tourImageUrl: string;
  userId: string;
  participants: number;
  date: string;
  totalPrice: number;
  currency: string;
  status: BookingStatus;
  notes?: string;
  paymentMethod?: PaymentMethod;
  paymentStatus: PaymentStatus;
  createdAt: string;
}

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
export type PaymentMethod = 'card' | 'banking' | 'momo' | 'vnpay' | 'cash';

export type BookingPaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
export type BookingPaymentBookingStatus =
  | 'PENDING_PAYMENT'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export interface CreateBookingResponse {
  bookingId: number;
  orderCode: number;
  checkoutUrl: string;
  amount?: number;
  tourName?: string;
  paymentId?: number | string;
  paidAt?: string;
  paymentStatus: BookingPaymentStatus;
  bookingStatus: BookingPaymentBookingStatus;
}

export interface PaymentStatusResponse {
  bookingId?: number;
  orderCode?: number;
  amount?: number;
  localPaymentStatus?: string;
  localBookingStatus?: string;
  remoteStatus?: string;
  paymentStatus?: BookingPaymentStatus | string;
  bookingStatus?: BookingPaymentBookingStatus | string;
  status?: string;
  success?: boolean;
  paymentId?: number | string;
  paidAt?: string;
  tourTitle?: string;
}

// ─── Community ────────────────────────────────────────────────────────────────
export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorLevel: TrekkerLevel;
  content: string;
  imageUrls: string[];
  location?: string;
  destination?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  isLiked: boolean;
  comments: PostComment[];
  tags: string[];
  createdAt: string;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatarUrl?: string;
  content: string;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

// ─── AI Chat ──────────────────────────────────────────────────────────────────
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestions?: string[];
  tourRecommendations?: Pick<Tour, 'id' | 'title' | 'thumbnailUrl' | 'difficulty'>[];
}

export interface ChatSession {
  id: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

// ─── Emergency ────────────────────────────────────────────────────────────────
export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship: string;
}

export interface EmergencyAlert {
  id: string;
  userId: string;
  location: GeoLocation;
  status: 'active' | 'cancelled' | 'resolved';
  contacts: EmergencyContact[];
  activatedAt: string;
  cancelledAt?: string;
}

// ─── API Common ───────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, string[]>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export type TrekkingExperience = 'OCCASIONAL' | 'EXPERIENCED';

export interface RegisterRequest {
  fullName: string;
  dateOfBirth: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  trekkingExperience: TrekkingExperience;
  citizenIdImageUrl?: string;
  role?: UserRole;
}

// ─── Filters ──────────────────────────────────────────────────────────────────
export interface TourFilters {
  search?: string;
  difficulty?: TourDifficulty;
  minPrice?: number;
  maxPrice?: number;
  minDuration?: number;
  maxDuration?: number;
  destination?: string;
  category?: DestinationCategory;
  page?: number;
  limit?: number;
}

// ─── Emergency Contact Info (User Profile) ────────────────────────────────────
export interface EmergencyContactInfo {
  name: string;
  phone: string;
  relationship: string;
}

// ─── Payment ──────────────────────────────────────────────────────────────────
export type PaymentMethodType = 'credit_card' | 'debit_card' | 'momo' | 'vnpay' | 'zalopay' | 'bank_transfer' | 'cash' | 'google_pay';

export interface PaymentProvider {
  id: PaymentMethodType;
  name: string;
  logoIcon: string;
  color: string;
  description: string;
}

export interface PaymentTransaction {
  id: string;
  bookingId: string;
  tourTitle: string;
  amount: number;
  currency: string;
  method: PaymentMethodType;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  transactionCode: string;
  createdAt: string;
}

// ─── Post Management ──────────────────────────────────────────────────────────
export type PostStatus = 'draft' | 'published' | 'archived';

export interface ManagedPost {
  id: string;
  title: string;
  content: string;
  coverImageUrl?: string;
  galleryImageUrls: string[];
  tags: string[];
  status: PostStatus;
  publishDate?: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface PostFilter {
  search?: string;
  status?: PostStatus;
}

// ─── Tour Management (Provider) ───────────────────────────────────────────────
export type ManagedTourStatus = 'draft' | 'published' | 'archived';

export interface ManagedTour {
  id: string;
  title: string;
  destination: string;
  thumbnailUrl: string;
  status: ManagedTourStatus;
  price: number;
  bookingCount: number;
  rating: number;
  createdAt: string;
  updatedAt: string;
}

export interface TourManagementFilter {
  search?: string;
  status?: ManagedTourStatus;
}

// ─── Pricing & Policy ─────────────────────────────────────────────────────────
export interface Discount {
  id: string;
  label: string;
  type: 'percentage' | 'fixed';
  value: number;
  minParticipants?: number;
  validUntil?: string;
}

export interface RefundPolicy {
  daysBefore: number;
  refundPercentage: number;
  description: string;
}

export interface PricingPolicy {
  tourId: string;
  basePrice: number;
  currency: string;
  discounts: Discount[];
  cancellationDeadlineDays: number;
  refundPolicies: RefundPolicy[];
  additionalNotes: string;
}

// ─── Edit Profile ─────────────────────────────────────────────────────────────
export interface UpdateProfileRequest {
  name: string;
  phone: string;
  bio?: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRelationship: string;
  treksExperience: string;
}
