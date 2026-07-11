import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { MainTabParamList } from './types';
import { Colors } from '@theme/colors';
import { Shadows } from '@theme/shadows';
import { FontFamily } from '@theme/typography';
import { useAuthStore } from '@store/authStore';
import { useTranslation } from '@hooks/useTranslation';

// Screen imports
import { HomeScreen } from '@features/home/screens/HomeScreen';
import { DiscoverScreen } from '@features/discover/screens/DiscoverScreen';
import { CommunityScreen } from '@features/community/screens/CommunityScreen';
import { BookTourScreen } from '@features/booking/screens/BookTourScreen';
import { ProviderTripsScreen } from '@features/booking/screens/ProviderTripsScreen';
import { ProfileScreen } from '@features/profile/screens/ProfileScreen';
import { SavedScreen } from '@features/saved/screens/SavedScreen';
import { OfflineRoutesScreen } from '@features/offline/screens/OfflineRoutesScreen';
import { ScreenErrorBoundary } from '@components/common/ScreenErrorBoundary';

// Tab icons
import { Ionicons } from '@expo/vector-icons';

const Tab = createBottomTabNavigator<MainTabParamList>();

const ProviderTripsTabScreen: React.FC = () => (
  <ScreenErrorBoundary screenName="Chuyến đi">
    <ProviderTripsScreen />
  </ScreenErrorBoundary>
);

interface TabIconProps {
  name: string;
  focused: boolean;
  focusedName?: string;
}

const TabIcon: React.FC<TabIconProps> = ({ name, focused, focusedName }) => {
  const size = 24;
  const displayName = focused && focusedName ? focusedName : name;

  if (focused) {
    return (
      <View style={styles.circularIconContainerActive}>
        <Ionicons name={displayName as never} size={22} color="#FFFFFF" />
      </View>
    );
  }

  return <Ionicons name={name as never} size={size} color={Colors.onSurfaceVariant} />;
};

// ─── Trekker Tabs ─────────────────────────────────────────────────────────────
const TrekkerTabs: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          ...(Shadows.navbar as object),
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tab_home'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" focusedName="home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="BookTour"
        component={BookTourScreen}
        options={{
          tabBarLabel: t('tab_book_tour'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="calendar-outline" focusedName="calendar" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarLabel: t('tab_community'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="chatbubbles-outline" focusedName="chatbubbles" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedScreen}
        options={{
          tabBarLabel: t('tab_saved'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="heart-outline" focusedName="heart" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="OfflineRoutes"
        component={OfflineRoutesScreen}
        options={{
          tabBarLabel: t('tab_offline'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="cloud-offline-outline" focusedName="cloud" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('tab_profile'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person-outline" focusedName="person" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ─── Tour Provider Tabs ────────────────────────────────────────────────────────
const ProviderTabs: React.FC = () => {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          ...styles.tabBar,
          ...(Shadows.navbar as object),
        },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.onSurfaceVariant,
        tabBarLabelStyle: styles.tabLabel,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('tab_home'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home-outline" focusedName="home" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Discover"
        component={DiscoverScreen}
        options={{
          tabBarLabel: t('tab_discover'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="compass-outline" focusedName="compass" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{
          tabBarLabel: t('tab_community'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="people-outline" focusedName="people" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Trips"
        component={ProviderTripsTabScreen}
        options={{
          tabBarLabel: t('tab_trips'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="map-outline" focusedName="map" focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: t('tab_profile'),
          tabBarIcon: ({ focused }) => (
            <TabIcon name="person-outline" focusedName="person" focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// ─── Root Tab Navigator (role-aware) ─────────────────────────────────────────
const OfflineTabs: React.FC = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        ...styles.tabBar,
        ...(Shadows.navbar as object),
      },
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.onSurfaceVariant,
      tabBarLabelStyle: styles.tabLabel,
      tabBarHideOnKeyboard: true,
    }}
  >
    <Tab.Screen
      name="Home"
      component={HomeScreen}
      options={{
        tabBarLabel: 'Home',
        tabBarIcon: ({ focused }) => (
          <TabIcon name="home-outline" focusedName="home" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="OfflineRoutes"
      component={OfflineRoutesScreen}
      options={{
        tabBarLabel: 'Routes',
        tabBarIcon: ({ focused }) => (
          <TabIcon name="cloud-offline-outline" focusedName="cloud" focused={focused} />
        ),
      }}
    />
    <Tab.Screen
      name="Profile"
      component={ProfileScreen}
      options={{
        tabBarLabel: 'Profile',
        tabBarIcon: ({ focused }) => (
          <TabIcon name="person-outline" focusedName="person" focused={focused} />
        ),
      }}
    />
  </Tab.Navigator>
);

export const MainTabNavigator: React.FC = () => {
  const storeUser = useAuthStore(s => s.user);
  const isOfflineMode = useAuthStore(s => s.isOfflineMode);
  const role = storeUser?.role ?? 'TREKKER';
  const content = isOfflineMode ? (
    <OfflineTabs />
  ) : role === 'TOUR_PROVIDER' ? (
    <ProviderTabs />
  ) : (
    <TrekkerTabs />
  );

  return (
    <View style={styles.root}>
      {content}
      {isOfflineMode ? (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerMessage}>
            Offline mode - Using downloaded routes
          </Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  offlineBanner: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 28,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: Colors.warningAmber,
    zIndex: 20,
  },
  offlineBannerMessage: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    color: Colors.onPrimary,
  },
  tabBar: {
    height: Platform.OS === 'ios' ? 84 : 64,
    backgroundColor: Colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '30',
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    position: 'absolute',
  },
  tabLabel: {
    fontFamily: FontFamily.medium,
    fontSize: 10,
    marginTop: 2,
  },
  circularIconContainerActive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0F291E',
    borderColor: '#0F291E',
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
});
