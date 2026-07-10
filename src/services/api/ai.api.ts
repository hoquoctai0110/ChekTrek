import apiClient from './axios';
import { AIMessage, ChatSession, ApiResponse } from '@/types';

export const aiApi = {
  sendMessage: async (
    sessionId: string | null,
    message: string,
    context?: Record<string, unknown>,
  ): Promise<{ sessionId: string; reply: AIMessage }> => {
    const { data } = await apiClient.post<
      ApiResponse<{ sessionId: string; reply: AIMessage }>
    >('/ai/chat', {
      sessionId,
      message,
      context,
    });
    return data.data;
  },

  getSession: async (sessionId: string): Promise<ChatSession> => {
    const { data } = await apiClient.get<ApiResponse<ChatSession>>(`/ai/sessions/${sessionId}`);
    return data.data;
  },

  getSessions: async (): Promise<ChatSession[]> => {
    const { data } = await apiClient.get<ApiResponse<ChatSession[]>>('/ai/sessions');
    return data.data;
  },

  deleteSession: async (sessionId: string): Promise<void> => {
    await apiClient.delete(`/ai/sessions/${sessionId}`);
  },

  getSuggestedQuestions: async (): Promise<string[]> => {
    const { data } = await apiClient.get<ApiResponse<string[]>>('/ai/suggestions');
    return data.data;
  },
};

