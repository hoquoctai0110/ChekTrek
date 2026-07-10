import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { SafeScreen } from '@components/common/SafeScreen';
import { AIMessageBubble } from '@components/chat/AIMessageBubble';
import { UserAvatar } from '@components/common/UserAvatar';
import { Colors } from '@theme/colors';
import { FontFamily, FontSize } from '@theme/typography';
import { Spacing } from '@theme/spacing';
import { Radius } from '@theme/radius';
import { Shadows } from '@theme/shadows';
import { MOCK_AI_MESSAGES } from '@utils/mockData';
import { AIMessage } from '@/types';

const SUGGESTED_QUESTIONS = [
  'Tour leo Fansipan phù hợp không?',
  'Thời tiết Sapa tháng 6?',
  'Chuẩn bị gì khi leo núi?',
  'Tour nào đang hot nhất?',
];

export const AIChatScreen: React.FC = () => {
  const navigation = useNavigation();
  const [messages, setMessages] = useState<AIMessage[]>(MOCK_AI_MESSAGES);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: AIMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiReply: AIMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getMockAIResponse(text),
        timestamp: new Date().toISOString(),
        suggestions: ['Xem tour phù hợp', 'Hỏi thêm về thiết bị', 'Tìm tuyến dễ hơn'],
      };
      setMessages(prev => [...prev, aiReply]);
      setIsLoading(false);
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 1200);
  };

  return (
    <SafeScreen>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarEmoji}>🤖</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Chektrek</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <AIMessageBubble message={item} style={styles.messageBubble} />}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={
            isLoading ? (
              <View style={styles.typingIndicator}>
                <Text style={styles.typingText}>AI đang trả lời</Text>
                <View style={styles.typingDots}>
                  {[0, 1, 2].map(i => (
                    <View key={i} style={styles.typingDot} />
                  ))}
                </View>
              </View>
            ) : null
          }
        />

        {/* Suggested Questions */}
        {messages.length <= 2 && (
          <View style={styles.suggestions}>
            <Text style={styles.suggestionsTitle}>Câu hỏi gợi ý</Text>
            <View style={styles.suggestionsRow}>
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.suggestionChip}
                  onPress={() => sendMessage(q)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.suggestionText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Input */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.voiceBtn} activeOpacity={0.7}>
            <Ionicons name="mic-outline" size={22} color={Colors.onSurfaceVariant} />
          </TouchableOpacity>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Nhập câu hỏi của bạn..."
            placeholderTextColor={Colors.outline}
            style={styles.input}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={() => sendMessage(input)}
          />
          <TouchableOpacity
            style={[styles.sendBtn, input.trim() && styles.sendBtnActive]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            activeOpacity={0.8}
          >
            <Ionicons
              name="send"
              size={18}
              color={input.trim() ? Colors.onPrimary : Colors.outline}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeScreen>
  );
};

function getMockAIResponse(query: string): string {
  const q = query.toLowerCase();
  if (q.includes('fansipan')) {
    return 'Fansipan (3143m) là đỉnh núi cao nhất Đông Dương! 🏔️ Chektrek có tour leo Fansipan 2 ngày 1 đêm từ 1.500.000đ/người. Đây là tour dành cho trekker trung cấp trở lên, cần thể lực tốt. Thời điểm lý tưởng là tháng 3-5 hoặc tháng 9-11.';
  }
  if (q.includes('thời tiết') || q.includes('weather')) {
    return 'Thời tiết tháng 6 tại Sapa thường có mưa vào buổi chiều tối, sáng sớm trời mát và quang đãng. Nhiệt độ dao động 18-25°C. Nên chuẩn bị áo mưa và giày chống nước nhé! ☁️🌧️';
  }
  if (q.includes('chuẩn bị') || q.includes('thiết bị')) {
    return 'Thiết bị cần thiết khi leo núi:\n• Giày leo núi có đế chống trơn\n• Áo khoác chống gió/nước\n• Balo 30-40L\n• Đèn đầu + pin dự phòng\n• Nước uống 2L/ngày\n• Thuốc cơ bản\n• Gậy leo núi (tùy chọn)\n\nBạn muốn tôi gợi ý tour phù hợp không? 🎒';
  }
  return 'Cảm ơn câu hỏi của bạn! Tôi có thể giúp bạn tìm tour phù hợp, thông tin về các tuyến đường, thời tiết, hoặc thiết bị leo núi. Hãy cho tôi biết bạn cần gì nhé! 🏔️';
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[4],
    paddingTop: Spacing[2],
    paddingBottom: Spacing[3],
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineVariant + '20',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    justifyContent: 'center',
  },
  aiAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primaryFixed,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarEmoji: {
    fontSize: 20,
  },
  headerTitle: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.base,
    color: Colors.onSurface,
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.successGreen,
  },
  onlineText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.successGreen,
  },
  messagesList: {
    padding: Spacing[4],
    gap: Spacing[3],
    paddingBottom: Spacing[4],
  },
  messageBubble: {},
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    paddingVertical: Spacing[2],
  },
  typingText: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.xs,
    color: Colors.outline,
    fontStyle: 'italic',
  },
  typingDots: {
    flexDirection: 'row',
    gap: 3,
  },
  typingDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.outline,
  },
  suggestions: {
    paddingHorizontal: Spacing[4],
    paddingBottom: Spacing[3],
    gap: Spacing[2],
  },
  suggestionsTitle: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.outline,
  },
  suggestionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
  },
  suggestionChip: {
    backgroundColor: Colors.primaryFixed,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.chip,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  suggestionText: {
    fontFamily: FontFamily.medium,
    fontSize: FontSize.xs,
    color: Colors.primary,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing[2],
    paddingHorizontal: Spacing[4],
    paddingVertical: Spacing[3],
    backgroundColor: Colors.surfaceWhite,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineVariant + '20',
  },
  voiceBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.outlineVariant + '50',
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing[3],
    paddingVertical: 10,
    fontFamily: FontFamily.regular,
    fontSize: FontSize.md,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: {
    backgroundColor: Colors.primary,
  },
});

