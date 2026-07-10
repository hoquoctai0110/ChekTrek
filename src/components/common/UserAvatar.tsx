import React from 'react';
import { View, Image, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '@theme/colors';
import { FontFamily } from '@theme/typography';

interface UserAvatarProps {
  avatarUrl?: string;
  name: string;
  size?: number;
  style?: ViewStyle;
  showBorder?: boolean;
}

export const UserAvatar: React.FC<UserAvatarProps> = ({
  avatarUrl,
  name,
  size = 44,
  style,
  showBorder = false,
}) => {
  const initial = name.charAt(0).toUpperCase();
  const avatarSize = Math.max(1, size);
  const initialFontSize = Math.max(1, avatarSize * 0.38);

  return (
    <View
      style={[
        styles.container,
        {
          width: avatarSize,
          height: avatarSize,
          borderRadius: avatarSize / 2,
          borderWidth: showBorder ? 2 : 0,
        },
        style,
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 },
          ]}
        >
          <Text
            style={[
              styles.initial,
              { fontSize: initialFontSize },
            ]}
          >
            {initial}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    borderColor: Colors.primaryContainer,
  },
  placeholder: {
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    fontFamily: FontFamily.bold,
    color: Colors.onPrimary,
  },
});
