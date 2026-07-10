import apiClient from './axios';
import {
  Achievement,
  ApiResponse,
  AuthTokens,
  LoginRequest,
  RegisterRequest,
  TrekkingExperience,
  User,
  UserRole,
} from '@/types';
import { API_ENDPOINTS } from '@constants/index';

interface BackendLoginUser {
  userId: number | string;
  email: string;
  fullName?: string | null;
  name?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  avatar?: string | null;
  profilePicture?: string | null;
  phone?: string | null;
  roles?: string[] | null;
  trekkingExperience?: string | null;
  treksExperience?: string | null;
}

type BackendNestedUser = {
  fullName?: string | null;
  name?: string | null;
  displayName?: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  roles?: string[] | null;
};

interface BackendLoginUser {
  user?: BackendNestedUser | null;
  trekkerProfile?: {
    fullName?: string | null;
    displayName?: string | null;
    trekkingExperience?: string | null;
    level?: string | null;
    avatarUrl?: string | null;
  } | null;
}

interface BackendLoginResponse {
  accessToken: string;
  user: BackendLoginUser;
}

type BackendProfileResponse = Partial<BackendLoginUser> & {
  id?: string | number | null;
  fullName?: string | null;
  name?: string | null;
  displayName?: string | null;
  avatar?: string | null;
  profilePicture?: string | null;
  imageUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  level?: string | null;
  totalDistance?: number | string | null;
  totalElevation?: number | string | null;
  totalTreks?: number | string | null;
  achievements?: unknown;
  joinedAt?: string | null;
  createdAt?: string | null;
  emergencyContact?: unknown;
  treksExperience?: string | null;
  trekkingExperience?: string | null;
  user?: BackendNestedUser | null;
  trekkerProfile?: {
    fullName?: string | null;
    displayName?: string | null;
    trekkingExperience?: string | null;
    level?: string | null;
    avatarUrl?: string | null;
  } | null;
};

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export interface AuthActionResponse {
  success: boolean;
  message: string;
  data?: unknown;
}

type OtpPurpose = 'REGISTER_VERIFY' | 'FORGOT_PASSWORD';

const VALID_ROLES: UserRole[] = ['TREKKER', 'TOUR_PROVIDER', 'ADMIN'];
const VALID_LEVELS: User['level'][] = ['Beginner', 'Intermediate', 'Advanced', 'Expert', 'Legend'];
const VALID_TREKKING_EXPERIENCES: TrekkingExperience[] = ['OCCASIONAL', 'EXPERIENCED'];

const toNumber = (value: unknown): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : 0;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmedValue = value.trim();
  return trimmedValue ? trimmedValue : undefined;
};

const normalizeLevel = (value: unknown): User['level'] => {
  const level = String(value ?? '').trim();
  return VALID_LEVELS.includes(level as User['level']) ? (level as User['level']) : 'Beginner';
};

const normalizeAchievement = (achievement: unknown, index: number): Achievement => {
  const item = (achievement ?? {}) as Partial<Achievement> & {
    achievementId?: string | number | null;
    title?: string | null;
  };

  return {
    id: String(item.id ?? item.achievementId ?? index),
    name: String(item.name ?? item.title ?? 'Achievement'),
    description: String(item.description ?? ''),
    iconName: String(item.iconName ?? 'trophy'),
    unlockedAt: item.unlockedAt ?? undefined,
    isUnlocked: Boolean(item.isUnlocked ?? item.unlockedAt),
  };
};

const normalizeAchievements = (value: unknown): Achievement[] => {
  const safeList = Array.isArray(value) ? value : [];
  return safeList.map(normalizeAchievement);
};

const getDisplayName = (backendUser: BackendProfileResponse): string => {
  return (
    toOptionalString(backendUser.fullName) ??
    toOptionalString(backendUser.user?.fullName) ??
    toOptionalString(backendUser.displayName) ??
    toOptionalString(backendUser.user?.displayName) ??
    toOptionalString(backendUser.name) ??
    toOptionalString(backendUser.user?.name) ??
    toOptionalString(backendUser.trekkerProfile?.fullName) ??
    toOptionalString(backendUser.trekkerProfile?.displayName) ??
    toOptionalString(backendUser.email) ??
    toOptionalString(backendUser.user?.email) ??
    'Tai khoan Chektrek'
  );
};

const getAvatarUrl = (backendUser: BackendProfileResponse): string | undefined => {
  return (
    backendUser.avatarUrl ??
    backendUser.user?.avatarUrl ??
    backendUser.avatar ??
    backendUser.profilePicture ??
    backendUser.imageUrl ??
    backendUser.trekkerProfile?.avatarUrl ??
    undefined
  );
};

const getExperience = (backendUser: BackendProfileResponse): string | undefined => {
  return (
    toOptionalString(backendUser.trekkerProfile?.trekkingExperience) ??
    toOptionalString(backendUser.trekkingExperience) ??
    toOptionalString(backendUser.treksExperience) ??
    undefined
  );
};

const mapRole = (roles?: string[] | null): UserRole => {
  const role = roles?.[0];
  return VALID_ROLES.includes(role as UserRole) ? (role as UserRole) : 'TREKKER';
};

const mapBackendUser = (backendUser: BackendProfileResponse): User => {
  const email = String(backendUser.email ?? backendUser.user?.email ?? '');
  const displayName = getDisplayName(backendUser);
  const trekkingExperience = getExperience(backendUser);
  const roleSource = backendUser.roles ?? backendUser.user?.roles ?? null;
  const levelSource = backendUser.level ?? backendUser.trekkerProfile?.level;

  return {
    id: String(backendUser.userId ?? backendUser.id ?? email ?? ''),
    name: displayName,
    fullName:
      backendUser.fullName ??
      backendUser.user?.fullName ??
      backendUser.trekkerProfile?.fullName ??
      undefined,
    displayName:
      backendUser.displayName ??
      backendUser.user?.displayName ??
      backendUser.trekkerProfile?.displayName ??
      displayName,
    email,
    phone: backendUser.phone ?? undefined,
    avatarUrl: getAvatarUrl(backendUser),
    coverUrl: backendUser.coverUrl ?? undefined,
    bio: backendUser.bio ?? undefined,
    role: mapRole(roleSource),
    level: normalizeLevel(levelSource),
    totalDistance: toNumber(backendUser.totalDistance),
    totalElevation: toNumber(backendUser.totalElevation),
    totalTreks: toNumber(backendUser.totalTreks),
    achievements: normalizeAchievements(backendUser.achievements),
    joinedAt: String(backendUser.joinedAt ?? backendUser.createdAt ?? ''),
    emergencyContact:
      backendUser.emergencyContact && typeof backendUser.emergencyContact === 'object'
        ? (backendUser.emergencyContact as User['emergencyContact'])
        : undefined,
    treksExperience: backendUser.treksExperience ?? trekkingExperience,
    trekkingExperience,
    user: backendUser.user
      ? {
          fullName: backendUser.user.fullName ?? undefined,
          name: backendUser.user.name ?? undefined,
          email: backendUser.user.email ?? undefined,
          avatarUrl: backendUser.user.avatarUrl ?? undefined,
        }
      : undefined,
    trekkerProfile: backendUser.trekkerProfile
      ? {
          fullName: backendUser.trekkerProfile.fullName ?? undefined,
          displayName: backendUser.trekkerProfile.displayName ?? undefined,
          trekkingExperience: backendUser.trekkerProfile.trekkingExperience ?? undefined,
          level: backendUser.trekkerProfile.level ?? undefined,
          avatarUrl: backendUser.trekkerProfile.avatarUrl ?? undefined,
        }
      : undefined,
  };
};

const mapBackendLoginResponse = (response: BackendLoginResponse): AuthResponse => ({
  user: mapBackendUser(response.user),
  tokens: {
    accessToken: response.accessToken,
    refreshToken: '',
    expiresAt: Date.now() + 86400000,
  },
});

const getResponseMessage = (payload: unknown, fallback: string): string => {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const message = (payload as { message?: unknown }).message;
  return typeof message === 'string' && message.trim() ? message : fallback;
};

export const extractApiErrorMessage = (
  error: unknown,
  fallback: string = 'Yeu cau that bai. Vui long thu lai.',
): string => {
  if (!error || typeof error !== 'object') {
    return fallback;
  }

  const candidate = error as {
    response?: {
      data?: {
        message?: unknown;
        error?: unknown;
      };
      status?: number;
    };
    message?: unknown;
  };

  const backendMessage =
    candidate.response?.data?.message ?? candidate.response?.data?.error ?? candidate.message;

  return typeof backendMessage === 'string' && backendMessage.trim() ? backendMessage : fallback;
};

const mapAuthActionResponse = (payload: unknown, fallbackMessage: string): AuthActionResponse => {
  const root = (payload ?? {}) as {
    success?: unknown;
    message?: unknown;
    data?: unknown;
  };

  return {
    success: root.success === undefined ? true : Boolean(root.success),
    message: getResponseMessage(root, fallbackMessage),
    data: root.data,
  };
};

const normalizeTrekkingExperience = (value: string): TrekkingExperience => {
  return VALID_TREKKING_EXPERIENCES.includes(value as TrekkingExperience)
    ? (value as TrekkingExperience)
    : 'OCCASIONAL';
};

export const authApi = {
  login: async (credentials: LoginRequest): Promise<AuthResponse> => {
    const { data } = await apiClient.post<ApiResponse<BackendLoginResponse>>(
      API_ENDPOINTS.AUTH_LOGIN,
      credentials,
    );

    if (__DEV__) {
      console.log('[Auth] login raw response:', data);
    }

    if (!data?.data?.accessToken || !data?.data?.user) {
      throw new Error(getResponseMessage(data, 'Dang nhap that bai. Vui long thu lai.'));
    }

    return mapBackendLoginResponse(data.data);
  },

  register: async (
    payload: RegisterRequest,
    accountType: 'trekker' | 'provider' = 'trekker',
  ): Promise<AuthActionResponse> => {
    const endpoint =
      accountType === 'provider'
        ? API_ENDPOINTS.AUTH_REGISTER_PROVIDER
        : API_ENDPOINTS.AUTH_REGISTER_TREKKER;

    const requestPayload = {
      ...payload,
      trekkingExperience: normalizeTrekkingExperience(payload.trekkingExperience),
      role: payload.role ?? (accountType === 'provider' ? 'TOUR_PROVIDER' : 'TREKKER'),
    };

    const { data } = await apiClient.post(endpoint, requestPayload);
    return mapAuthActionResponse(data, 'Dang ky thanh cong. Vui long kiem tra email de nhap OTP.');
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  refreshToken: async (refreshToken: string): Promise<AuthTokens> => {
    const { data } = await apiClient.post<ApiResponse<AuthTokens>>('/auth/refresh', {
      refreshToken,
    });
    return data.data;
  },

  forgotPassword: async (email: string): Promise<void> => {
    await apiClient.post('/auth/forgot-password', { email });
  },

  verifyOtp: async (
    email: string,
    otp: string,
    purpose: OtpPurpose,
  ): Promise<AuthActionResponse> => {
    const requestBody = {
      email,
      otp,
      purpose,
    };

    if (__DEV__) {
      console.log('[Auth] verify-otp request body:', requestBody);
    }

    const { data } = await apiClient.post(API_ENDPOINTS.AUTH_VERIFY_OTP, requestBody);
    return mapAuthActionResponse(data, 'Xac thuc OTP thanh cong.');
  },

  resendOtp: async (email: string, purpose: OtpPurpose): Promise<AuthActionResponse> => {
    const { data } = await apiClient.post(API_ENDPOINTS.AUTH_RESEND_OTP, {
      email,
      purpose,
    });
    return mapAuthActionResponse(data, 'Da gui lai OTP.');
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await apiClient.post('/auth/reset-password', { token, password });
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', { currentPassword, newPassword });
  },

  getProfile: async (): Promise<User> => {
    const { data } = await apiClient.get<unknown>('/auth/me');

    if (__DEV__) {
      console.log('[Profile] GET /auth/me raw response:', data);
    }

    const root = (data ?? {}) as { data?: unknown };
    const payload = (root.data ?? data) as BackendProfileResponse | null | undefined;
    const mappedUser = mapBackendUser(payload ?? {});

    if (__DEV__) {
      console.log('[Profile] mapped profile user:', mappedUser);
    }

    return mappedUser;
  },
};

