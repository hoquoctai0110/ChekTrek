import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { AIMessage } from '@/types';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Radius } from '@theme/radius';
import { Spacing } from '@theme/spacing';
import { format } from 'date-fns';

interface AIMessageBubbleProps {
  message: AIMessage;
  style?: ViewStyle;
}

export const AIMessageBubble: React.FC<AIMessageBubbleProps> = ({ message, style }) => {
  const isUser = message.role === 'user';
  const time = format(new Date(message.timestamp), 'HH:mm');

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.aiContainer, style]}>
      <View
        style={[
          styles.bubble,
          isUser ? styles.userBubble : styles.aiBubble,
        ]}
      >
        <Text style={[styles.content, isUser ? styles.userContent : styles.aiContent]}>
          {message.content}
        </Text>
      </View>
      <Text style={[styles.time, isUser && { alignSelf: 'flex-end' }]}>{time}</Text>

      {/* Suggested actions from AI */}
      {!isUser && message.suggestions && message.suggestions.length > 0 && (
        <View style={styles.suggestions}>
          {message.suggestions.map((s, i) => (
            <View key={i} style={styles.suggestionChip}>
              <Text style={styles.suggestionText}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    maxWidth: '80%',
    gap: 4,
  },
  userContainer: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  aiContainer: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2] + 2,
    borderRadius: Radius.xl,
  },
  userBubble: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: Colors.surfaceWhite,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '40',
  },
  content: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    lineHeight: 22,
  },
  userContent: {
    color: Colors.onPrimary,
  },
  aiContent: {
    color: Colors.onSurface,
  },
  time: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.outline,
    marginHorizontal: 4,
  },
  suggestions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  suggestionChip: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  suggestionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
});

