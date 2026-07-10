import { create } from 'zustand';
import { AIMessage } from '@/types';

interface ChatState {
  sessionId: string | null;
  messages: AIMessage[];
  isLoading: boolean;
  suggestedQuestions: string[];

  setSessionId: (id: string) => void;
  addMessage: (message: AIMessage) => void;
  setMessages: (messages: AIMessage[]) => void;
  setLoading: (loading: boolean) => void;
  setSuggestedQuestions: (questions: string[]) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatState>(set => ({
  sessionId: null,
  messages: [],
  isLoading: false,
  suggestedQuestions: [
    'Tuyến leo núi nào phù hợp cho người mới?',
    'Thời tiết ở Sapa tuần này thế nào?',
    'Thiết bị leo núi cần chuẩn bị gì?',
    'Tour nào đang hot nhất hiện tại?',
  ],

  setSessionId: sessionId => set({ sessionId }),
  addMessage: message => set(state => ({ messages: [...state.messages, message] })),
  setMessages: messages => set({ messages }),
  setLoading: isLoading => set({ isLoading }),
  setSuggestedQuestions: suggestedQuestions => set({ suggestedQuestions }),
  clearChat: () => set({ sessionId: null, messages: [] }),
}));

